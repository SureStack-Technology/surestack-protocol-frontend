import { formatDeploymentAge } from './tokenConcentrationTypes.js'
import { computeWhaleRisk } from './tokenConcentrationScoring.js'
import {
  DATA_CONFIDENCE,
  confidencePenaltyFromFields,
  resolveFieldConfidence,
} from '../solanaRiskScanner/solanaDataConfidence.js'

function formatUsd(n) {
  if (n == null || !Number.isFinite(n) || n <= 0) return null
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${Math.round(n).toLocaleString('en-US')}`
  return `$${n.toFixed(0)}`
}

function formatCount(n) {
  if (n == null || !Number.isFinite(n) || n <= 0) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${Math.round(n).toLocaleString('en-US')}`
  return String(Math.round(n))
}

function tag(value, provenance) {
  if (!value || value === 'Unavailable' || value === 'Unknown') return value
  if (!provenance) return value
  return `${value} · ${provenance}`
}

function dexListingLabel(dexMarket) {
  if (!dexMarket?.dexIds?.length) return null
  return dexMarket.dexIds.slice(0, 5).join(', ')
}

function lpStatusFromMarket(dexMarket, goPlusParsed) {
  if (goPlusParsed?.lpBurned) return { status: 'burned', label: 'LP burned (GoPlus)' }
  if (goPlusParsed?.lpLocked) return { status: 'locked', label: 'LP locked (GoPlus)' }
  const labels = dexMarket?.labels || dexMarket?.primaryPool?.labels || []
  if (labels.some((l) => /burn/i.test(l))) return { status: 'burned', label: 'LP burned (DEX label)' }
  if (labels.some((l) => /lock/i.test(l))) return { status: 'locked', label: 'LP locked (DEX label)' }
  if (dexMarket?.status === 'indexed' && dexMarket?.hasLiquidity) {
    return { status: 'active', label: 'Active pools — lock status not confirmed' }
  }
  return { status: 'unknown', label: 'Unknown' }
}

/**
 * @param {number | null} liquidityUsd
 * @param {object} ctx
 */
export function computeLiquidityConfidence(liquidityUsd, ctx) {
  const {
    pairCount = 0,
    jupiterClassification = 'NOT_ROUTABLE',
    volume24hUsd = 0,
    txns24h = 0,
    dexIndexed = false,
  } = ctx

  if (!dexIndexed && liquidityUsd == null) return 'UNKNOWN'
  if (liquidityUsd == null || liquidityUsd <= 0) {
    if (jupiterClassification === 'ROUTABLE') return 'LOW'
    return 'UNKNOWN'
  }

  if (
    liquidityUsd >= 100_000 &&
    (jupiterClassification === 'ROUTABLE' || pairCount >= 2) &&
    (volume24hUsd >= 5_000 || txns24h >= 50)
  ) {
    return 'HIGH'
  }
  if (liquidityUsd >= 50_000 || (jupiterClassification === 'ROUTABLE' && liquidityUsd >= 10_000)) {
    return 'MODERATE'
  }
  if (liquidityUsd >= 10_000) return 'MODERATE'
  return 'LOW'
}

/**
 * @param {object} params
 */
export function buildSolanaTokenConcentrationIntel({
  holderMetrics,
  holderProvenance,
  holderCount = null,
  dexMarket,
  routing,
  goPlusParsed,
  isCanonical = false,
  isMajorAsset = false,
  providerStatus,
  birdeyeOverview = null,
}) {
  const top10Pct = holderMetrics?.top10HolderPct ?? null
  const top1Pct = holderMetrics?.top1HolderPct ?? null

  const dexStatus = dexMarket?.status || 'error'
  const dexIndexed = dexStatus === 'indexed'
  const dexEmpty = dexStatus === 'empty'

  let liquidityUsd =
    dexIndexed && dexMarket?.totalLiquidityUsd != null
      ? dexMarket.totalLiquidityUsd
      : birdeyeOverview?.liquidityUsd ?? null

  const marketCapUsd =
    dexMarket?.marketCapUsd ?? birdeyeOverview?.marketCapUsd ?? null
  const fdvUsd = dexMarket?.fdvUsd ?? birdeyeOverview?.fdvUsd ?? marketCapUsd
  const volume24hUsd = dexMarket?.volume24hUsd ?? birdeyeOverview?.volume24hUsd ?? null

  const pairCount = dexMarket?.pairCount ?? 0
  const primaryDex = dexMarket?.primaryDex || null
  const dexListings = dexListingLabel(dexMarket)

  const liquidityConfidence = computeLiquidityConfidence(liquidityUsd, {
    pairCount,
    jupiterClassification: routing?.classification || 'NOT_ROUTABLE',
    volume24hUsd: volume24hUsd ?? 0,
    txns24h: dexMarket?.txns24h ?? 0,
    dexIndexed,
  })

  const tokenAgeMs = dexMarket?.pairCreatedAt || null
  const deploymentAgeHours = tokenAgeMs ? (Date.now() - tokenAgeMs) / (1000 * 60 * 60) : null

  const whaleRisk = computeWhaleRisk({
    top10Pct,
    top1Pct,
    lpUnlocked: false,
    deploymentAgeHours,
    isCanonical: isCanonical || isMajorAsset,
  })

  const holderProv = holderProvenance || (holderMetrics ? 'RPC ESTIMATE' : null)
  const lpInfo = lpStatusFromMarket(dexMarket, goPlusParsed)

  const marketCapDisplay = formatUsd(marketCapUsd) || 'Unavailable'
  const fdvDisplay = formatUsd(fdvUsd) || 'Unavailable'
  const liquidityDisplay = formatUsd(liquidityUsd) || 'Unavailable'
  const volumeDisplay = formatUsd(volume24hUsd) || 'Unavailable'
  const holderCountDisplay = formatCount(holderCount) || 'Unavailable'
  const top10SamplePct = holderMetrics?.top10SamplePct ?? null
  const incompleteSample = Boolean(holderMetrics?.incompleteHolderSample)
  const top10Display =
    top10Pct != null
      ? `${top10Pct.toFixed(1)}%`
      : incompleteSample && top10SamplePct != null
        ? `Sample only (${top10SamplePct.toFixed(1)}% of top holders)`
        : 'Unavailable'
  const top1Display = top1Pct != null ? `${top1Pct.toFixed(1)}%` : 'Unavailable'

  let holderConcentration = 'Holder distribution estimate unavailable'
  if (top10Pct != null) {
    holderConcentration = tag(`Top 10 holders control ${top10Pct.toFixed(1)}%`, holderProv)
  } else if (incompleteSample && top10SamplePct != null) {
    holderConcentration = tag(
      `Top-holder RPC sample only (${top10SamplePct.toFixed(1)}% of sampled slice — not full supply)`,
      holderProv || 'RPC ESTIMATE',
    )
  } else if (top1Pct != null) {
    holderConcentration = tag(
      `Largest holder ~${top1Pct.toFixed(1)}% (top 10 sample incomplete)`,
      holderProv,
    )
  }

  const largestWallet =
    top1Pct != null ? tag(`${top1Pct.toFixed(1)}%`, holderProv) : 'Unavailable'

  let liquidityStatus = 'Limited market intelligence available'
  if (dexIndexed && liquidityUsd != null && liquidityUsd > 0) {
    liquidityStatus = tag('DEX liquidity detected', 'DEXSCREENER')
  } else if (birdeyeOverview?.liquidityUsd) {
    liquidityStatus = tag('Liquidity indexed', 'BIRDEYE')
  } else if (dexEmpty) {
    liquidityStatus = tag('No confirmed liquidity detected', 'DEXSCREENER')
  } else if (routing?.classification === 'ROUTABLE') {
    liquidityStatus = tag('Routing active — pool depth partial', 'JUPITER')
  }

  const liquidityDepth =
    liquidityUsd != null && liquidityUsd > 0
      ? tag(formatUsd(liquidityUsd), liquidityUsd === birdeyeOverview?.liquidityUsd ? 'BIRDEYE' : 'DEXSCREENER')
      : dexEmpty
        ? tag('$0', 'DEXSCREENER')
        : 'Unavailable'

  const jupiterLabel =
    routing?.routingLabel ||
    (routing?.classification === 'ROUTABLE'
      ? 'Jupiter Routing Available'
      : routing?.classification === 'LIMITED_ROUTING'
        ? 'Jupiter Routing Limited'
        : 'Jupiter Routing Unavailable')

  let marketRouting = jupiterLabel
  if (dexListings) {
    marketRouting = `${jupiterLabel} · DEX: ${dexListings}`
  }

  const vol = volume24hUsd ?? 0
  const txns = dexMarket?.txns24h ?? 0
  let tradingActivity = 'Trading activity not confidently observed'
  if (vol >= 25_000 || txns >= 200) {
    tradingActivity = tag('Active', 'DEXSCREENER')
  } else if (vol >= 2_500 || txns >= 25) {
    tradingActivity = tag('Moderate', 'DEXSCREENER')
  } else if (dexIndexed && liquidityUsd != null && liquidityUsd >= 100_000 && routing?.routable) {
    tradingActivity = tag('Active', 'DEXSCREENER')
  } else if (dexIndexed && (liquidityUsd > 0 || routing?.routable)) {
    tradingActivity = tag('Sparse', 'DEXSCREENER')
  } else if (vol === 0 && dexIndexed && !isMajorAsset) {
    tradingActivity = tag('No 24h volume observed', 'DEXSCREENER')
  }

  let tradingBehavior = tradingActivity
  if (top10Pct != null && top10Pct > 70 && !isMajorAsset) {
    tradingBehavior = 'Highly concentrated ownership — exit liquidity risk elevated'
  } else if (top1Pct != null && top1Pct > 15 && !isMajorAsset) {
    tradingBehavior = 'Single-wallet dominance detected'
  } else if (routing?.classification === 'ROUTABLE') {
    tradingBehavior = tag('Active Jupiter routing', 'JUPITER')
  }

  const tokenAge = tokenAgeMs ? formatDeploymentAge(tokenAgeMs) : 'Unknown'

  const limitedIntelligence =
    dexStatus === 'error' &&
    !birdeyeOverview &&
    !holderMetrics &&
    routing?.classification === 'NOT_ROUTABLE'

  const hasPartialIntel =
    dexIndexed ||
    dexEmpty ||
    Boolean(birdeyeOverview) ||
    routing != null ||
    holderMetrics != null ||
    goPlusParsed != null

  const dataConfidence = {
    marketCap: resolveFieldConfidence(marketCapDisplay),
    fdv: resolveFieldConfidence(fdvDisplay),
    liquidity: resolveFieldConfidence(liquidityDisplay),
    volume24h: resolveFieldConfidence(volumeDisplay),
    holderCount: resolveFieldConfidence(holderCountDisplay),
    top10HolderPct: resolveFieldConfidence(top10Display),
    top1HolderPct: resolveFieldConfidence(top1Display),
    jupiterRouting: resolveFieldConfidence(
      routing?.classification === 'NOT_ROUTABLE' && !dexIndexed
        ? 'Unavailable'
        : jupiterLabel,
      { knownRisk: routing?.classification === 'NOT_ROUTABLE' && dexIndexed && !isMajorAsset },
    ),
    dexListings: resolveFieldConfidence(dexListings || 'Unknown'),
    lpStatus: resolveFieldConfidence(lpInfo.label),
  }

  const providerHealth = {
    birdeye: providerStatus?.birdeye ? 'Live' : process.env.BIRDEYE_API_KEY ? 'No data' : 'Not configured',
    helius: providerStatus?.rpc ? 'Live (RPC)' : process.env.SOLANA_RPC_URL ? 'Degraded' : 'Not configured',
    dexscreener: providerStatus?.dexscreener ? 'Live' : 'Unavailable',
    jupiter: providerStatus?.jupiter ? 'Live' : 'Unavailable',
  }

  return {
    platform: 'solana',
    available: hasPartialIntel,
    limitedMarketIntelligence: limitedIntelligence,
    isMajorAsset,
    holderConcentration,
    largestWallet,
    largestWalletPct: top1Pct,
    top10HolderPct: top10Pct,
    holderCount,
    holderCountDisplay,
    holderProvenance: holderProv,
    liquidityStatus,
    liquidityDepth,
    liquidityConfidence,
    liquidityConcentration:
      pairCount >= 2
        ? tag(`Multiple pools (${pairCount})`, 'DEXSCREENER')
        : pairCount === 1
          ? tag('Single-pool liquidity', 'DEXSCREENER')
          : dexEmpty
            ? tag('No pools indexed', 'DEXSCREENER')
            : 'Limited market intelligence available',
    whaleRisk,
    tradingBehavior,
    tradingActivity,
    marketRouting,
    jupiterRoutingLabel: jupiterLabel,
    deploymentAge: tokenAge,
    tokenAge,
    deploymentAgeHours,
    marketCap: marketCapDisplay,
    marketCapUsd,
    fdv: fdvDisplay,
    fdvUsd,
    volume24h: volumeDisplay,
    volume24hUsd,
    activeDex: dexListings ? tag(dexListings, 'DEXSCREENER') : dexEmpty ? 'None indexed' : 'Unknown',
    dexListings: dexListings || 'Unknown',
    pairCount: dexIndexed || dexEmpty ? pairCount : null,
    bundledWallets: 'Not detected from available sources',
    lpStatus: lpInfo.status,
    lpStatusLabel: lpInfo.label,
    liquidityUsd,
    topPairLiquidityUsd: dexMarket?.topPairLiquidityUsd ?? null,
    liquidityConfirmed: dexIndexed || dexEmpty || Boolean(birdeyeOverview?.liquidityUsd),
    jupiterRoutable: routing?.classification === 'ROUTABLE',
    jupiterClassification: routing?.classification || 'NOT_ROUTABLE',
    routingConfidence: routing?.confidence || 'LOW',
    txns24h: dexMarket?.txns24h ?? null,
    dataConfidence,
    dataConfidencePenalty: confidencePenaltyFromFields(dataConfidence),
    providerHealth,
    provenance: {
      dexscreener: dexStatus !== 'error',
      jupiter: Boolean(routing),
      rpc: holderProv === 'RPC ESTIMATE' || Boolean(providerStatus?.rpc),
      goplus: Boolean(providerStatus?.goplus),
      birdeye: Boolean(providerStatus?.birdeye),
    },
    dataSources: {
      dexscreener: dexStatus === 'indexed' || dexStatus === 'empty',
      jupiter: Boolean(routing),
      goplus: Boolean(providerStatus?.goplus),
      rpc: holderProv === 'RPC ESTIMATE',
      birdeye: Boolean(providerStatus?.birdeye),
    },
  }
}
