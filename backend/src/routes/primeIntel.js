import { Router } from 'express'
import { makeRequireClerkAuth } from '../middleware/clerkAuth.js'
import { prisma } from '../lib/prisma.js'
import { loadAuthUser } from '../services/authUser.js'
import { getWalletRiskIndexResponse } from '../services/walletRisk/walletRiskService.js'
import { isAlchemyRateLimitError } from '../services/walletRisk/alchemyRateLimit.js'
import {
  PRIME_APPROVAL_DEFAULT_CHAIN_ID,
  redactAlchemyUrl,
  resolveAlchemyRpcUrl,
  resolvePrimeApprovalChainId,
} from '../services/walletRisk/alchemyChainResolver.js'
import { fetchApprovalInventoryResilient } from '../services/walletRisk/approvalInventoryCache.js'
import {
  logApprovalInventoryFetch,
  logApprovalInventoryInit,
} from '../services/walletRisk/approvalInventoryLogger.js'
import { walletChainSupportsApprovalLogScan } from '../services/walletRisk/walletApprovalSignals.js'
import {
  EXPLORER_SCENARIO_IDS,
  PRIME_SCENARIO_IDS,
  simulateScenarioAgainstSignals,
} from '../services/prime/scenarioIntelligenceEngine.js'
import { classifyIntelligenceTarget } from '../services/prime/intelligenceTargetClassifier.js'
import { makePrimeAuthWithDevBypass } from '../middleware/primeAuthDevBypass.js'

const router = Router()
const requirePrimeAuth = makeRequireClerkAuth({ unauthorizedError: 'prime_intel_auth_missing' })
const requirePrimeAuthDev = makePrimeAuthWithDevBypass({ unauthorizedError: 'prime_intel_auth_missing' })

async function loadUser(clerkUserId) {
  return loadAuthUser(clerkUserId, {
    include: { wallets: { orderBy: { verifiedAt: 'desc' } } },
  })
}

function verifiedWalletForUser(user) {
  const v = user?.wallets?.find((w) => w.verifiedAt)
  if (!v?.address) return null
  return { address: String(v.address).toLowerCase(), chainId: Number(v.chainId) || 1 }
}

function isExplorerTier(tier) {
  return String(tier || '') === 'EXPLORER_ACCESS'
}

function buildApprovalStats(inv, rows, membershipTier) {
  const unlimitedUnknown = rows.filter(
    (r) => r.unlimited && r.spenderCategory === 'UNKNOWN_SPENDER',
  ).length
  return {
    unlimitedUnknown,
    staleFiniteUnknown: 0,
    truncated: (inv.rows?.length || 0) > rows.length,
    upgradeNote: isExplorerTier(membershipTier)
      ? 'Prime unlocks the full approval inventory and continuous refresh.'
      : null,
  }
}

function hasPlusIntelligence(tier) {
  return tier === 'INTELLIGENCE_PRO' || tier === 'STRATEGIC_ACCESS'
}

function summarizeTimelineRow(row) {
  const prev = typeof row.previousScore === 'number' ? row.previousScore : null
  const delta = typeof prev === 'number' ? row.score - prev : null
  /** @type {{ type: string; label: string; detail: string; severity: 'INFO'|'WATCH'|'HIGH' }} */
  const headline = {
    type: 'risk_score',
    label: 'Risk score reading',
    detail: `Weighted risk score ${row.score} (${row.band}).`,
    severity: 'INFO',
  }
  if (typeof delta === 'number') {
    headline.label = 'Score change'
    headline.detail = `Score moved from ${prev} → ${row.score} (${delta >= 0 ? '+' : ''}${delta}).`
    headline.severity = delta <= -12 ? 'HIGH' : delta >= 12 ? 'INFO' : 'WATCH'
  }
  /** @type {Array<{ type: string; label: string; detail: string; severity:'INFO'|'WATCH'|'HIGH' }>} */
  const events = [headline]
  const codes = Array.isArray(row.findingsCodes) ? row.findingsCodes : []
  for (const code of codes.slice(0, 4)) {
    if (
      code === 'UNLIMITED_APPROVAL_SURFACE' ||
      code === 'NETWORK_CLUSTERING' ||
      code === 'APPROVAL_EXPOSURE'
    ) {
      events.push({
        type: 'driver',
        label: 'Exposure driver',
        detail: String(code || '').replaceAll('_', ' '),
        severity: code === 'UNLIMITED_APPROVAL_SURFACE' ? 'HIGH' : 'WATCH',
      })
    }
  }
  return { at: row.createdAt, snapshotId: row.snapshotId || null, events }
}

router.post('/analyst/run', requirePrimeAuth, async (req, res) => {
  try {
    const user = await loadUser(req.clerkUserId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'user_not_found' })
    }

    const wallet = verifiedWalletForUser(user)
    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'wallet_risk_no_verified_wallet',
        message: 'Verify a wallet to run Wallet Risk Analyst.',
      })
    }

    if (isExplorerTier(user.membershipTier) && user.explorerComplimentaryPrimeAnalystConsumed) {
      return res.status(402).json({
        success: false,
        error: 'prime_analyst_explorer_quota_exhausted',
        message:
          'Your complimentary flagship analyst pass has been redeemed. Unlock Prime Intelligence for continuous refresh cadence.',
      })
    }

    const { status, json } = await getWalletRiskIndexResponse({ userId: user.id, refresh: true })
    if (status !== 200 || !json?.success) {
      return res.status(status).json(json)
    }

    if (isExplorerTier(user.membershipTier)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { explorerComplimentaryPrimeAnalystConsumed: true },
      })
    }

    const accessUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { membershipTier: true, explorerComplimentaryPrimeAnalystConsumed: true },
    })

    const report = {
      success: true,
      product: 'surestack_wallet_risk_analyst',
      analyst: {
        wallet: json.wallet,
        chainId: json.chainId,
        score: json.score,
        band: json.band,
        keyFindings: (json.findings || []).map((f) => ({
          code: f.code,
          severity: f.severity,
          title: f.title,
          detail: f.detail,
        })),
        narrative: json.summary,
        establishing: Boolean(json.establishing),
        updatedAt: json.updatedAt,
      },
      access: {
        tier: accessUser?.membershipTier || user.membershipTier,
        explorerComplimentaryConsumed: Boolean(accessUser?.explorerComplimentaryPrimeAnalystConsumed),
      },
      cta: {
        label: 'Upgrade mitigation visibility',
        destination: '/membership',
      },
    }

    return res.status(200).json(report)
  } catch (e) {
    console.error('[primeIntel] analyst failed', e?.message || e)
    return res.status(500).json({ success: false, error: 'prime_analyst_failed' })
  }
})

router.get('/timeline', requirePrimeAuth, async (req, res) => {
  try {
    const user = await loadUser(req.clerkUserId)
    if (!user) return res.status(404).json({ success: false, error: 'user_not_found' })
    const wallet = verifiedWalletForUser(user)
    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet_risk_no_verified_wallet' })
    }

    const daysParam = String(req.query.days || '30')
    const days = daysParam === '7' ? 7 : 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const rows = await prisma.walletRiskHistory.findMany({
      where: {
        userId: user.id,
        walletAddress: wallet.address,
        chainId: wallet.chainId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
      take: 240,
    })

    const series = rows.map((r) => ({
      at: r.createdAt,
      score: r.score,
      band: r.band,
      previousScore: r.previousScore,
    }))

    const feed = rows.flatMap(summarizeTimelineRow)

    return res.json({
      success: true,
      windowDays: days,
      wallet: wallet.address,
      chainId: wallet.chainId,
      series,
      feed,
    })
  } catch (e) {
    console.error('[primeIntel] timeline failed', e?.message || e)
    return res.status(500).json({ success: false, error: 'prime_timeline_failed' })
  }
})

router.get('/approvals/inventory', requirePrimeAuth, async (req, res) => {
  const started = Date.now()
  try {
    const user = await loadUser(req.clerkUserId)
    if (!user) return res.status(404).json({ success: false, error: 'user_not_found' })
    const wallet = verifiedWalletForUser(user)
    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'wallet_risk_no_verified_wallet',
        inventoryStatus: 'auth_error',
      })
    }

    const selectedChain = Number(req.query.chainId) || PRIME_APPROVAL_DEFAULT_CHAIN_ID
    const inventoryChainId = resolvePrimeApprovalChainId(selectedChain, wallet.chainId)
    const alchemyKey = process.env.ALCHEMY_API_KEY?.trim()
    const rpc = alchemyKey ? resolveAlchemyRpcUrl(inventoryChainId, alchemyKey) : null

    logApprovalInventoryInit({
      wallet: wallet.address,
      selectedChain,
      resolvedChain: inventoryChainId,
      walletChain: wallet.chainId,
      resolvedRpc: redactAlchemyUrl(rpc?.url),
      status: alchemyKey ? 'ready' : 'provider_missing',
    })

    if (!alchemyKey) {
      return res.status(503).json({
        success: false,
        error: 'wallet_risk_provider_unavailable',
        inventoryStatus: 'provider_missing',
        message: 'Ethereum approval intelligence is not configured.',
      })
    }

    if (!walletChainSupportsApprovalLogScan(inventoryChainId)) {
      return res.status(400).json({
        success: false,
        error: 'approval_inventory_unsupported_chain',
        inventoryStatus: 'unsupported_chain',
        message: 'Approval log inventory is not enabled for this chain yet.',
      })
    }

    const inv = await fetchApprovalInventoryResilient(
      wallet.address,
      inventoryChainId,
      alchemyKey,
    )

    logApprovalInventoryFetch({
      wallet: wallet.address,
      chainId: inventoryChainId,
      rpcUrl: redactAlchemyUrl(rpc?.url),
      status: inv.rateLimited ? 'rate_limited' : 'loaded',
      durationMs: Date.now() - started,
      rowCount: inv.rows?.length ?? 0,
      cacheHit: inv.cacheHit,
      skippedFetch: inv.skippedFetch,
      source: inv.source,
    })

    if (inv.rateLimited && !inv.rows?.length) {
      return res.status(429).json({
        success: false,
        error: 'alchemy_rate_limited',
        inventoryStatus: 'rate_limited',
        message:
          'Wallet exposure intelligence is temporarily rate-limited. Contract risk analysis remains available.',
      })
    }

    const limit = hasPlusIntelligence(user.membershipTier) ? 400 : 12
    const rows = inv.rows.slice(0, limit)

    return res.json({
      success: true,
      wallet: wallet.address,
      chainId: inventoryChainId,
      rows,
      inventoryStale: inv.stale || false,
      rateLimited: inv.rateLimited || false,
      inventoryStatus: inv.rateLimited && inv.stale ? 'rate_limited' : 'loaded',
      stats: buildApprovalStats(inv, rows, user.membershipTier),
    })
  } catch (e) {
    if (isAlchemyRateLimitError(e)) {
      logApprovalInventoryFetch({
        wallet: null,
        chainId: Number(req.query.chainId) || PRIME_APPROVAL_DEFAULT_CHAIN_ID,
        status: 'rate_limited',
        error: e?.message,
        durationMs: Date.now() - started,
      })
      return res.status(429).json({
        success: false,
        error: 'alchemy_rate_limited',
        inventoryStatus: 'rate_limited',
        message:
          'Wallet exposure intelligence is temporarily rate-limited. Contract risk analysis remains available.',
      })
    }
    logApprovalInventoryFetch({
      wallet: null,
      chainId: Number(req.query.chainId) || PRIME_APPROVAL_DEFAULT_CHAIN_ID,
      status: 'rpc_error',
      error: e?.message || 'prime_approvals_failed',
      durationMs: Date.now() - started,
    })
    console.error('[primeIntel] approvals failed', e?.message || e)
    return res.status(500).json({
      success: false,
      error: 'prime_approvals_failed',
      inventoryStatus: 'rpc_error',
      message: 'Ethereum approval intelligence source is unavailable.',
    })
  }
})

router.get('/findings/threat-feed', requirePrimeAuth, async (req, res) => {
  try {
    const user = await loadUser(req.clerkUserId)
    if (!user) return res.status(404).json({ success: false, error: 'user_not_found' })
    const wallet = verifiedWalletForUser(user)
    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet_risk_no_verified_wallet' })
    }

    const snap = await prisma.walletRiskSnapshot.findFirst({
      where: { userId: user.id, walletAddress: wallet.address, chainId: wallet.chainId },
      orderBy: { updatedAt: 'desc' },
      include: { findings: true },
    })

    const threatCodes = new Set([
      'UNLIMITED_APPROVAL_SURFACE',
      'NETWORK_CLUSTERING',
      'APPROVAL_EXPOSURE',
      'CONTRACT_INTERACTION',
    ])

    const items = (snap?.findings || [])
      .filter((f) => threatCodes.has(f.code))
      .filter((f) => f.severity === 'HIGH' || f.severity === 'MEDIUM' || f.severity === 'LOW')
      .map((f) => ({
        code: f.code,
        severity: f.severity,
        title: f.title,
        detail: f.detail,
        tone: 'institutional',
      }))

    return res.json({
      success: true,
      wallet: wallet.address,
      chainId: wallet.chainId,
      updatedAt: snap?.updatedAt || null,
      items,
    })
  } catch (e) {
    console.error('[primeIntel] threat feed failed', e?.message || e)
    return res.status(500).json({ success: false, error: 'prime_threat_feed_failed' })
  }
})

router.get('/alerts', requirePrimeAuth, async (req, res) => {
  try {
    const user = await loadUser(req.clerkUserId)
    if (!user) return res.status(404).json({ success: false, error: 'user_not_found' })

    const alerts = await prisma.primeAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 80,
    })

    return res.json({ success: true, alerts })
  } catch (e) {
    console.error('[primeIntel] alerts list failed', e?.message || e)
    return res.status(500).json({ success: false, error: 'prime_alerts_failed' })
  }
})

router.patch('/alerts/:id', requirePrimeAuth, async (req, res) => {
  try {
    const user = await loadUser(req.clerkUserId)
    if (!user) return res.status(404).json({ success: false, error: 'user_not_found' })
    const id = String(req.params.id || '')
    const read = Boolean(req.body?.read)

    const updated = await prisma.primeAlert.updateMany({
      where: { id, userId: user.id },
      data: { read },
    })
    if (!updated.count) {
      return res.status(404).json({ success: false, error: 'alert_not_found' })
    }
    return res.json({ success: true })
  } catch (e) {
    console.error('[primeIntel] alert patch failed', e?.message || e)
    return res.status(500).json({ success: false, error: 'prime_alert_patch_failed' })
  }
})

router.get('/simulator/scenarios', requirePrimeAuth, async (_req, res) => {
  return res.json({
    success: true,
    scenarios: PRIME_SCENARIO_IDS.map((id) => ({ id, explorerUnlocked: EXPLORER_SCENARIO_IDS.includes(id) })),
  })
})

router.post('/simulator/run', requirePrimeAuth, async (req, res) => {
  try {
    const user = await loadUser(req.clerkUserId)
    if (!user) return res.status(404).json({ success: false, error: 'user_not_found' })
    const wallet = verifiedWalletForUser(user)
    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet_risk_no_verified_wallet' })
    }

    const scenarioId = String(req.body?.scenarioId || '')
    const explorer = isExplorerTier(user.membershipTier)
    const allowedPool = explorer ? EXPLORER_SCENARIO_IDS : PRIME_SCENARIO_IDS
    if (!allowedPool.includes(scenarioId)) {
      return res.status(403).json({
        success: false,
        error: explorer ? 'simulator_explorer_quota' : 'simulator_unknown',
        message: explorer
          ? 'Explorer unlocks two fixed scenarios. Upgrade to Prime for extended scenario intelligence.'
          : 'Unknown scenario.',
      })
    }

    const snap = await prisma.walletRiskSnapshot.findFirst({
      where: { userId: user.id, walletAddress: wallet.address, chainId: wallet.chainId },
      orderBy: { updatedAt: 'desc' },
    })

    /** @type {Record<string, number>} */
    const signals = (snap?.signalsSnapshot && typeof snap.signalsSnapshot === 'object')
      /** @type {any} */
      ? (snap.signalsSnapshot)
      : {}

    if (!snap?.signalsSnapshot) {
      await getWalletRiskIndexResponse({ userId: user.id, refresh: true })
      const hydrated = await prisma.walletRiskSnapshot.findFirst({
        where: { userId: user.id, walletAddress: wallet.address, chainId: wallet.chainId },
        orderBy: { updatedAt: 'desc' },
      })
      Object.assign(
        signals,
        hydrated?.signalsSnapshot && typeof hydrated.signalsSnapshot === 'object' ? hydrated.signalsSnapshot : {},
      )
    }

    try {
      const result = simulateScenarioAgainstSignals(signals, scenarioId)
      return res.json({ success: true, wallet: wallet.address, chainId: wallet.chainId, scenario: result })
    } catch (err) {
      return res.status(400).json({ success: false, error: String(err?.message || 'scenario_unknown') })
    }
  } catch (e) {
    console.error('[primeIntel] simulator failed', e?.message || e)
    return res.status(500).json({ success: false, error: 'prime_simulator_failed' })
  }
})

router.post('/intelligence/classify', requirePrimeAuthDev, async (req, res) => {
  try {
    const input = String(req.body?.input ?? req.body?.query ?? '').trim()
    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'input_required',
        message: 'Provide a wallet, contract, token, or protocol target to classify.',
      })
    }
    const classification = await classifyIntelligenceTarget(input)
    return res.json({ success: true, classification })
  } catch (e) {
    console.error('[primeIntel] classify failed', e?.message || e)
    return res.status(500).json({ success: false, error: 'classify_failed' })
  }
})

export default router
