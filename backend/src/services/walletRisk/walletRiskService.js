import { prisma } from '../../lib/prisma.js'
import { scoreWalletRisk } from './walletRiskScoring.js'
import { fetchWalletSignals } from './walletRiskProviders.js'
import { computeWalletExposureIntelligence } from '../walletExposure/walletExposureIntelligence.js'
import { buildWalletExposureProfile } from '../walletExposure/walletExposureProfileEngine.js'
import { buildExposureMetrics, exposureInputSummary } from '../walletExposure/walletExposureMetrics.js'
import { resolvePrimeApprovalChainId } from './alchemyChainResolver.js'
import { SEPOLIA_CHAIN_ID } from './walletRiskTypes.js'
import { buildNarrative } from './walletRiskNarrative.js'
import { riskCacheGet, riskCacheSet } from './walletRiskCache.js'
import { persistWalletRiskTimeline } from '../prime/walletRiskIntelPersistence.js'
import { enrichPortfolioHoldings } from '../../../../shared/lib/walletExposure/enrichPortfolioHoldings.mjs'
import { WALLET_HOLDINGS_CATALOG_VERSION } from '../../../../shared/lib/walletExposure/walletHoldingsCatalog.mjs'

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
    nftTransferCount: 0,
    erc1155TransferCount: 0,
    dexTransferCount: 0,
    dexInteractionCount: 0,
    nftMarketplaceInteractions: 0,
    nftHoldingsCount: 0,
    nftCollectionCount: 0,
    stableSharePct: 0,
    stablecoinBalanceCount: 0,
    stablecoinPresenceCount: 0,
    stableTransferCount: 0,
    stableSymbolsHeld: [],
    protocolCounterparties: [],
    topSpenderApprovalSharePct: 0,
    approvalInventoryRows: [],
    probeDexApproval: 0,
    hasBalances: false,
    hasTransfers: false,
    hasApprovals: false,
    hasNftScan: false,
    hasNftHoldings: false,
    providerLive: false,
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
  const exposureChainId = resolvePrimeApprovalChainId(null, chainId)
  const cacheKey = `risk:v3:${userId}:${wallet}:${chainId}:${exposureChainId}:${WALLET_HOLDINGS_CATALOG_VERSION}:${hasAlchemy ? 'live' : 'ref'}`

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
      signals = await fetchWalletSignals(wallet, exposureChainId, alchemyKey.trim())
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

  if (hasAlchemy && Array.isArray(signals.portfolioHoldings)) {
    signals.portfolioHoldings = enrichPortfolioHoldings(signals.portfolioHoldings)
    const priced = signals.portfolioHoldings.filter((h) => h.hasReliablePrice && h.usdValue > 0)
    console.info(
      '[walletExposure] holdings:',
      JSON.stringify({
        wallet,
        total: signals.portfolioHoldings.length,
        priced: priced.length,
        symbols: signals.portfolioHoldings.slice(0, 12).map((h) => ({
          symbol: h.symbol,
          contract: h.contract,
          coingeckoId: h.coingeckoId,
          usd: h.usdValue,
          reliable: h.hasReliablePrice,
          source: h.resolutionSource,
        })),
      }),
    )
  }

  let { score, band, findings } = scoreWalletRisk(signals)

  const approvalRowsForExposure = signals.approvalInventoryRows || []
  const exposureIntelligence = hasAlchemy
    ? computeWalletExposureIntelligence(signals, approvalRowsForExposure)
    : {
        provenance: 'PROVIDER_PENDING',
        subtitle: 'Exposure bands pending — configure ALCHEMY_API_KEY for live wallet intelligence.',
        sources: [],
        bands: [],
      }

  const exposurePending = exposureIntelligence?.provenance === 'PROVIDER_PENDING'
  const noOnChainSlices =
    !signals.hasBalances && !signals.hasTransfers && !signals.hasApprovals
  const assessmentPending =
    exposurePending || (hasAlchemy && noOnChainSlices)

  if (assessmentPending) {
    score = null
    band = 'PENDING'
    findings = [
      {
        code: 'ASSESSMENT_PENDING',
        severity: 'INFO',
        message:
          'Risk assessment pending — provider or on-chain exposure data not yet available.',
      },
      ...findings.filter((f) => f.code !== 'INSUFFICIENT_HISTORY'),
    ]
  }

  let walletExposureProfile = null
  let metricsForProfile = null
  if (hasAlchemy) {
    metricsForProfile =
      exposureIntelligence.metrics || buildExposureMetrics(signals, approvalRowsForExposure)
    walletExposureProfile = buildWalletExposureProfile(
      signals,
      approvalRowsForExposure,
      exposureIntelligence,
      {
        score,
        assessmentPending,
        exposureHints: {
          exposureChainId,
          volatileSharePct: Number(signals.volatileSharePct) || 0,
          stableSharePct: Number(signals.stableSharePct) || 0,
          stablecoinBalanceCount: Number(signals.stablecoinBalanceCount) || 0,
          topTokenSharePct: Number(signals.topTokenSharePct) || 0,
          topAssetSymbol: signals.topAssetSymbol || null,
          topAssetContract: signals.topAssetContract || null,
          portfolioHoldings: signals.portfolioHoldings || [],
          uniqueCounterparties: Number(signals.uniqueCounterparties) || 0,
          unlimitedApprovalUnknownCount: Number(signals.unlimitedApprovalUnknownCount) || 0,
          transferCount: Number(signals.transferCount) || 0,
          dexInteractionCount: Number(signals.dexInteractionCount) || 0,
          nftHoldingsCount: Number(signals.nftHoldingsCount) || 0,
          approvalCount: approvalRowsForExposure.length,
          hasBalances: Boolean(signals.hasBalances),
          hasTransfers: Boolean(signals.hasTransfers),
          hasApprovals: Boolean(signals.hasApprovals),
          hasNftScan: Boolean(signals.hasNftScan),
        },
      },
    )
    walletExposureProfile.metrics = undefined
  }

  let exposureInputSummaryPayload = null
  if (hasAlchemy) {
    const metrics =
      exposureIntelligence.metrics || metricsForProfile || buildExposureMetrics(signals, approvalRowsForExposure)
    exposureInputSummaryPayload = exposureInputSummary(metrics)
    console.info(
      '[walletExposure] inputs:',
      JSON.stringify({
        wallet,
        walletChainId: chainId,
        exposureChainId,
        ...exposureInputSummaryPayload,
        bandLevels: exposureIntelligence.bands?.map((b) => `${b.id}:${b.level}`),
      }),
    )
    delete exposureIntelligence.metrics
  }

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
  delete signalsSnapshotJson.approvalInventoryRows

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
    exposureHints: {
      exposureChainId,
      volatileSharePct: Number(signals.volatileSharePct) || 0,
      stableSharePct: Number(signals.stableSharePct) || 0,
      stablecoinBalanceCount: Number(signals.stablecoinBalanceCount) || 0,
      topTokenSharePct: Number(signals.topTokenSharePct) || 0,
      topAssetSymbol: signals.topAssetSymbol || null,
      topAssetContract: signals.topAssetContract || null,
      portfolioHoldings: signals.portfolioHoldings || [],
      uniqueCounterparties: Number(signals.uniqueCounterparties) || 0,
      unlimitedApprovalUnknownCount: Number(signals.unlimitedApprovalUnknownCount) || 0,
      transferCount: Number(signals.transferCount) || 0,
      dexInteractionCount: Number(signals.dexInteractionCount) || 0,
      nftTransferCount: Number(signals.nftTransferCount) || 0,
      nftHoldingsCount: Number(signals.nftHoldingsCount) || 0,
      approvalCount: approvalRowsForExposure.length,
      hasBalances: Boolean(signals.hasBalances),
      hasTransfers: Boolean(signals.hasTransfers),
      hasApprovals: Boolean(signals.hasApprovals),
      hasNftScan: Boolean(signals.hasNftScan),
    },
    exposureInputSummary: exposureInputSummaryPayload,
    exposureIntelligence,
    assessmentPending,
    walletExposureProfile,
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
