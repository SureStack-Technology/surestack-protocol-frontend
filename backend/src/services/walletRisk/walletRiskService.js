import { prisma } from '../../lib/prisma.js'
import { scoreWalletRisk } from './walletRiskScoring.js'
import { fetchWalletSignals } from './walletRiskProviders.js'
import { SEPOLIA_CHAIN_ID } from './walletRiskTypes.js'
import { buildNarrative } from './walletRiskNarrative.js'
import { riskCacheGet, riskCacheSet } from './walletRiskCache.js'
import { persistWalletRiskTimeline } from '../prime/walletRiskIntelPersistence.js'

function isReferenceSummary(text) {
  return /reference mode/i.test(String(text || ''))
}

function logWalletRiskMode(payload) {
  console.log('[walletRisk] mode:', JSON.stringify(payload))
}

/** Deterministic signals when Alchemy is not configured — Explorer still shows a score. */
function offlinePlaceholderSignals() {
  return {
    topTokenSharePct: 0,
    volatileSharePct: 0,
    transferCount: 0,
    uniqueCounterparties: 0,
    approvalPenalty: 0,
    probeApprovalPenalty: 0,
    approvalLogPenalty: 0,
    unlimitedApprovalUnknownCount: 0,
    staleFiniteUnknownApprovalCount: 0,
    interactionBreadthRatio: 0,
    insufficientHistory: true,
  }
}

/**
 * @param {{ userId: string, refresh?: boolean }} opts
 * @returns {Promise<{ status: number, json: object }>}
 */
export async function getWalletRiskIndexResponse({ userId, refresh }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallets: { orderBy: { verifiedAt: 'desc' } } },
  })

  if (!user) {
    logWalletRiskMode({
      branch: 'user_not_found',
      hasAlchemyKey: Boolean(process.env.ALCHEMY_API_KEY && String(process.env.ALCHEMY_API_KEY).trim()),
      resolvedChainId: null,
      resolvedWallet: null,
      usingReferenceMode: false,
      errorCode: 'user_not_found',
      cacheHit: false,
    })
    return { status: 404, json: { success: false, error: 'user_not_found' } }
  }

  const verified = user.wallets.find((w) => w.verifiedAt)
  if (!verified) {
    logWalletRiskMode({
      branch: 'no_verified_wallet',
      hasAlchemyKey: Boolean(process.env.ALCHEMY_API_KEY && String(process.env.ALCHEMY_API_KEY).trim()),
      resolvedChainId: null,
      resolvedWallet: null,
      usingReferenceMode: false,
      errorCode: 'wallet_risk_no_verified_wallet',
      cacheHit: false,
    })
    return {
      status: 400,
      json: {
        success: false,
        error: 'wallet_risk_no_verified_wallet',
        message: 'Verify a wallet to compute Wallet Risk Index.',
      },
    }
  }

  const wallet = String(verified.address).toLowerCase()
  const chainId = Number(verified.chainId) || SEPOLIA_CHAIN_ID

  const alchemyKey = process.env.ALCHEMY_API_KEY
  const hasAlchemy = Boolean(alchemyKey && String(alchemyKey).trim())
  /** Bust cache when switching between offline and live so reference payloads are not reused after configuring Alchemy. */
  const cacheKey = `risk:${userId}:${wallet}:${chainId}:${hasAlchemy ? 'live' : 'ref'}`

  if (!refresh) {
    const hit = riskCacheGet(cacheKey)
    if (hit) {
      logWalletRiskMode({
        branch: 'cache_hit',
        hasAlchemyKey: hasAlchemy,
        resolvedChainId: hit.chainId ?? chainId,
        resolvedWallet: hit.wallet ?? wallet,
        usingReferenceMode: isReferenceSummary(hit.summary),
        errorCode: null,
        cacheHit: true,
      })
      return {
        status: 200,
        json: { ...hit, cached: true },
      }
    }
  }

  let signals

  if (hasAlchemy) {
    try {
      signals = await fetchWalletSignals(wallet, chainId, alchemyKey.trim())
    } catch (e) {
      const msg = e?.message || String(e)
      console.warn('[walletRiskService] provider failed', msg)
      logWalletRiskMode({
        branch: 'provider_error',
        hasAlchemyKey: true,
        resolvedChainId: chainId,
        resolvedWallet: wallet,
        usingReferenceMode: false,
        errorCode: 'wallet_risk_provider_unavailable',
        cacheHit: false,
      })
      return {
        status: 503,
        json: {
          success: false,
          error: 'wallet_risk_provider_unavailable',
          message: msg || 'Upstream chain data unavailable.',
        },
      }
    }
  } else {
    signals = offlinePlaceholderSignals()
  }

  const { score, band, findings } = scoreWalletRisk(signals)

  let summary = null
  if (hasAlchemy) {
    try {
      summary = await buildNarrative(findings, process.env.OPENAI_API_KEY)
    } catch (e) {
      console.warn('[walletRiskService] narrative skipped', e?.message || e)
    }
  } else {
    summary =
      'Wallet Risk Index is running in reference mode until ALCHEMY_API_KEY is configured for live chain signals.'
  }

  const updatedAt = new Date().toISOString()

  const signalsSnapshotJson = JSON.parse(JSON.stringify(signals))

  const snap = await prisma.walletRiskSnapshot.upsert({
    where: {
      userId_walletAddress_chainId: {
        userId,
        walletAddress: wallet,
        chainId,
      },
    },
    create: {
      userId,
      walletAddress: wallet,
      chainId,
      score,
      band,
      summary,
      signalsSnapshot: signalsSnapshotJson,
    },
    update: {
      score,
      band,
      summary,
      signalsSnapshot: signalsSnapshotJson,
    },
  })

  await prisma.walletRiskFinding.deleteMany({ where: { snapshotId: snap.id } })
  if (findings.length) {
    await prisma.walletRiskFinding.createMany({
      data: findings.map((f) => ({
        snapshotId: snap.id,
        code: f.code,
        severity: f.severity,
        title: f.title,
        detail: f.detail,
      })),
    })
  }

  try {
    await persistWalletRiskTimeline({
      userId,
      wallet,
      chainId,
      snapshotId: snap.id,
      score,
      band,
      findingsCodes: findings.map((f) => f.code),
      trigger: refresh ? 'MANUAL_REFRESH' : 'API_REFRESH',
    })
  } catch (e) {
    console.warn('[walletRiskService] timeline persistence skipped', e?.message || e)
  }

  const payload = {
    success: true,
    wallet,
    chainId,
    score,
    band,
    findings,
    summary,
    cached: false,
    updatedAt,
    establishing: Boolean(signals.insufficientHistory),
  }

  riskCacheSet(cacheKey, payload)
  logWalletRiskMode({
    branch: hasAlchemy ? 'live_compute' : 'reference_compute',
    hasAlchemyKey: hasAlchemy,
    resolvedChainId: chainId,
    resolvedWallet: wallet,
    usingReferenceMode: !hasAlchemy || isReferenceSummary(payload.summary),
    errorCode: null,
    cacheHit: false,
  })
  return { status: 200, json: payload }
}
