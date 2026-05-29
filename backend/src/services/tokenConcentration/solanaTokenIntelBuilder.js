import { formatDeploymentAge } from './tokenConcentrationTypes.js'
import { computeWhaleRisk } from './tokenConcentrationScoring.js'

function formatUsd(n) {
  if (n == null || !Number.isFinite(n) || n <= 0) return null
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${Math.round(n).toLocaleString('en-US')}`
  return `$${n.toFixed(0)}`
}

function tag(value, provenance) {
  if (!value || value === 'Unavailable' || value === 'Unknown') return value
  if (!provenance) return value
  return `${value} · ${provenance}`
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
  dexMarket,
  routing,
  goPlusParsed,
  isCanonical = false,
  providerStatus,
}) {
  const top10Pct = holderMetrics?.top10HolderPct ?? null
  const top1Pct = holderMetrics?.top1HolderPct ?? null

  const dexStatus = dexMarket?.status || 'error'
  const dexIndexed = dexStatus === 'indexed'
  const dexEmpty = dexStatus === 'empty'

  const liquidityUsd =
    dexIndexed && dexMarket?.totalLiquidityUsd != null
      ? dexMarket.totalLiquidityUsd
      : null
  const pairCount = dexMarket?.pairCount ?? 0
  const primaryDex = dexMarket?.primaryDex || null

  const liquidityConfidence = computeLiquidityConfidence(liquidityUsd, {
    pairCount,
    jupiterClassification: routing?.classification || 'NOT_ROUTABLE',
    volume24hUsd: dexMarket?.volume24hUsd ?? 0,
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
    isCanonical,
  })

  const holderProv = holderProvenance || (holderMetrics ? 'RPC ESTIMATE' : null)

  let holderConcentration = 'Holder distribution estimate unavailable'
  if (top10Pct != null) {
    holderConcentration = tag(`Top 10 holders control ${top10Pct.toFixed(1)}%`, holderProv)
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
  } else if (dexEmpty) {
    liquidityStatus = tag('No confirmed liquidity detected', 'DEXSCREENER')
  } else if (routing?.classification === 'ROUTABLE') {
    liquidityStatus = tag('Routing active — pool depth not indexed', 'JUPITER')
  } else if (dexStatus === 'malformed' || dexStatus === 'error') {
    liquidityStatus = 'Limited market intelligence available'
  }

  const liquidityDepth =
    liquidityUsd != null && liquidityUsd > 0
      ? tag(formatUsd(liquidityUsd), 'DEXSCREENER')
      : dexEmpty
        ? tag('$0', 'DEXSCREENER')
        : 'Unavailable'

  let marketRouting = 'Limited market intelligence available'
  if (routing?.classification === 'ROUTABLE') {
    const venues = routing.venues?.length ? routing.venues : ['Jupiter']
    marketRouting = tag(`Tradable via ${venues.join(' / ')}`, 'JUPITER')
  } else if (routing?.classification === 'LIMITED_ROUTING') {
    const side = routing.solToToken ? 'SOL→token' : 'token→USDC'
    marketRouting = tag(`Limited routing (${side} only)`, 'JUPITER')
  } else if (dexIndexed && primaryDex) {
    marketRouting = tag(`Pool on ${primaryDex}`, 'DEXSCREENER')
  } else if (dexEmpty) {
    marketRouting = tag('Not routable on Jupiter', 'JUPITER')
  }

  const vol = dexMarket?.volume24hUsd ?? 0
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
  } else if (dexEmpty && routing?.classification === 'NOT_ROUTABLE') {
    tradingActivity = tag('Inactive', 'DEXSCREENER')
  } else if (vol === 0 && dexIndexed) {
    tradingActivity = tag('No 24h volume observed', 'DEXSCREENER')
  }

  let tradingBehavior = tradingActivity
  if (top10Pct != null && top10Pct > 70) {
    tradingBehavior = 'Highly concentrated ownership — exit liquidity risk elevated'
  } else if (top1Pct != null && top1Pct > 15) {
    tradingBehavior = 'Single-wallet dominance detected'
  } else if (deploymentAgeHours != null && deploymentAgeHours < 48) {
    tradingBehavior = 'Recently launched — early transfer clustering possible'
  } else if (routing?.classification === 'ROUTABLE') {
    tradingBehavior = tag('Active Jupiter routing', 'JUPITER')
  } else if (vol === 0 && dexIndexed) {
    tradingBehavior = 'Zero 24h volume — suspicious thin market'
  }

  const tokenAge = tokenAgeMs ? formatDeploymentAge(tokenAgeMs) : 'Unknown'

  const limitedIntelligence =
    (dexStatus === 'error' || dexStatus === 'malformed') &&
    !holderMetrics &&
    routing?.classification === 'NOT_ROUTABLE'

  const hasPartialIntel =
    dexIndexed ||
    dexEmpty ||
    dexStatus === 'malformed' ||
    routing != null ||
    holderMetrics != null ||
    goPlusParsed != null

  return {
    platform: 'solana',
    available: hasPartialIntel,
    limitedMarketIntelligence: limitedIntelligence,
    holderConcentration,
    largestWallet,
    largestWalletPct: top1Pct,
    top10HolderPct: top10Pct,
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
    deploymentAge: tokenAge,
    tokenAge,
    deploymentAgeHours,
    marketCap: dexMarket?.marketCapUsd != null ? formatUsd(dexMarket.marketCapUsd) : 'Unavailable',
    marketCapUsd: dexMarket?.marketCapUsd ?? null,
    fdv: dexMarket?.fdvUsd != null ? formatUsd(dexMarket.fdvUsd) : 'Unavailable',
    fdvUsd: dexMarket?.fdvUsd ?? null,
    activeDex: primaryDex ? tag(primaryDex, 'DEXSCREENER') : dexEmpty ? 'None indexed' : 'Unknown',
    pairCount: dexIndexed || dexEmpty ? pairCount : null,
    bundledWallets: 'Not detected from available sources',
    lpStatus: 'unknown',
    liquidityUsd,
    liquidityConfirmed: dexIndexed || dexEmpty,
    jupiterRoutable: routing?.classification === 'ROUTABLE',
    jupiterClassification: routing?.classification || 'NOT_ROUTABLE',
    routingConfidence: routing?.confidence || 'LOW',
    volume24hUsd: dexMarket?.volume24hUsd ?? null,
    txns24h: dexMarket?.txns24h ?? null,
    provenance: {
      dexscreener: dexStatus !== 'error',
      jupiter: Boolean(routing),
      rpc: holderProv === 'RPC ESTIMATE',
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
