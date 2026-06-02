import { solanaTrustBandFromScore } from './solanaTypes.js'
import { solanaVerdictActionFrame } from '../tokenConcentration/tokenConcentrationScoring.js'

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function hasStrongMarket(concentration) {
  const liq = concentration?.liquidityUsd
  const mcap = concentration?.marketCapUsd
  const vol = concentration?.volume24hUsd
  return (
    (liq != null && liq >= 100_000) ||
    (mcap != null && mcap >= 1_000_000) ||
    (vol != null && vol >= 25_000) ||
    concentration?.liquidityConfidence === 'HIGH'
  )
}

/**
 * Solana-specific merge: risk increases only with positive evidence; missing data is neutral.
 * @param {object} core
 * @param {object} concentration
 * @param {{ isCanonical?: boolean, isMajorAsset?: boolean }} opts
 */
export function mergeSolanaTokenConcentrationIntoCore(core, concentration, opts = {}) {
  if (!concentration?.available) {
    const frame = concentration?.limitedMarketIntelligence ? 'LIMITED MARKET INTELLIGENCE' : null
    return { ...core, tokenConcentration: concentration, verdictActionFrame: frame }
  }

  const isCanonical = opts.isCanonical || Boolean(core.archetypeId)
  const isMajorAsset = opts.isMajorAsset || Boolean(concentration?.isMajorAsset)
  const strongMarket = hasStrongMarket(concentration)
  const skipHolderPenalties = isCanonical || (isMajorAsset && strongMarket)

  let score = Number(core.trustScore ?? 70)
  const findings = [...(core.findings || [])]

  const top10 = concentration.top10HolderPct
  const top1 = concentration.largestWalletPct

  if (top10 != null && top10 > 70 && !skipHolderPenalties) {
    score -= 22
    findings.push({
      code: 'TOP10_CONCENTRATION',
      severity: 'HIGH',
      title: 'Top 10 holder concentration',
      detail: `Top 10 holders control ${top10.toFixed(1)}% of supply.`,
    })
  } else if (top10 != null && top10 > 50 && !skipHolderPenalties) {
    score -= 12
    findings.push({
      code: 'TOP10_CONCENTRATION',
      severity: 'WATCH',
      title: 'Elevated top 10 concentration',
      detail: `Top 10 holders control ${top10.toFixed(1)}% of supply.`,
    })
  } else if (top10 != null && top10 < 35 && !isCanonical) {
    score += 4
    findings.push({
      code: 'HEALTHY_DISTRIBUTION',
      severity: 'INFO',
      title: 'Healthy holder distribution',
      detail: 'Top 10 holders control a minority of sampled supply.',
    })
  }

  if (top1 != null && top1 > 15 && !skipHolderPenalties) {
    score -= top1 > 25 ? 18 : 8
    findings.push({
      code: 'WHALE_DOMINANCE',
      severity: top1 > 25 ? 'HIGH' : 'WATCH',
      title: top1 > 25 ? 'Single-wallet dominance' : 'Large single-holder position',
      detail: `Largest wallet holds ${top1.toFixed(1)}% of supply.`,
    })
  }

  if (concentration.lpStatus === 'unlocked' && !skipHolderPenalties) {
    score -= 18
    findings.push({
      code: 'LP_UNLOCKED',
      severity: 'HIGH',
      title: 'Liquidity not locked',
      detail: 'DEX liquidity detected without locked or burned LP signals.',
    })
  } else if (concentration.lpStatus === 'locked' || concentration.lpStatus === 'burned') {
    score += 5
    findings.push({
      code: 'LP_LOCKED',
      severity: 'INFO',
      title: 'Liquidity locked / burned',
      detail: 'LP lock or burn signal detected for primary pool.',
    })
  }

  const liq = concentration.liquidityUsd
  const vol = concentration.volume24hUsd ?? 0
  const ageHours = concentration.deploymentAgeHours
  const routing = concentration.jupiterClassification

  const jupiterConfirmedBad =
    routing === 'NOT_ROUTABLE' &&
    concentration.liquidityConfirmed &&
    (liq == null || liq < 10_000) &&
    (vol === 0 || vol == null)

  if (jupiterConfirmedBad && !isMajorAsset) {
    score -= 14
    findings.push({
      code: 'NO_JUPITER_ROUTING',
      severity: 'HIGH',
      title: 'No Jupiter routing',
      detail: 'Token did not return viable Jupiter quotes and liquidity is thin.',
    })
  } else if (routing === 'LIMITED_ROUTING' && !strongMarket) {
    score -= 4
    findings.push({
      code: 'LIMITED_JUPITER_ROUTING',
      severity: 'WATCH',
      title: 'Limited routing',
      detail: 'One-sided Jupiter routing only — exit path may be constrained.',
    })
  } else if (routing === 'ROUTABLE') {
    score += 5
    findings.push({
      code: 'JUPITER_ROUTING_ACTIVE',
      severity: 'INFO',
      title: 'Jupiter routing available',
      detail: 'Token is tradable via Jupiter aggregator.',
    })
  }

  if (vol === 0 && concentration.liquidityConfirmed && liq != null && liq > 0 && !strongMarket) {
    score -= 6
    findings.push({
      code: 'ZERO_VOLUME_24H',
      severity: 'WATCH',
      title: 'Zero 24h volume',
      detail: 'No 24h volume observed on indexed pools (DexScreener).',
    })
  } else if (vol >= 50_000) {
    score += 5
    findings.push({
      code: 'STRONG_VOLUME_24H',
      severity: 'INFO',
      title: 'Strong 24h volume',
      detail: `24h volume ~$${Math.round(vol).toLocaleString('en-US')} (DexScreener).`,
    })
  }

  if (ageHours != null && ageHours >= 30 * 24) {
    score += 5
    findings.push({
      code: 'ESTABLISHED_TOKEN_AGE',
      severity: 'INFO',
      title: 'Established token age',
      detail: `Primary pool / market age ~${concentration.tokenAge || concentration.deploymentAge}.`,
    })
  }

  if (liq != null && liq > 0 && liq < 10_000 && !isMajorAsset) {
    score -= 20
    findings.push({
      code: 'LOW_LIQUIDITY_DEPTH',
      severity: 'HIGH',
      title: 'Low liquidity depth',
      detail: `Estimated liquidity ~$${Math.round(liq).toLocaleString('en-US')} — elevated exit slippage risk.`,
    })
  } else if (liq != null && liq > 0 && liq < 50_000 && !strongMarket) {
    score -= 8
    findings.push({
      code: 'MODERATE_LIQUIDITY_DEPTH',
      severity: 'WATCH',
      title: 'Moderate liquidity depth',
      detail: `Estimated liquidity ~$${Math.round(liq).toLocaleString('en-US')}.`,
    })
  } else if (liq != null && liq >= 100_000) {
    score += 6
    findings.push({
      code: 'HEALTHY_LIQUIDITY_DEPTH',
      severity: 'INFO',
      title: 'Healthy liquidity depth',
      detail: `Estimated liquidity ~$${Math.round(liq).toLocaleString('en-US')}.`,
    })
  }

  if ((concentration.pairCount || 0) >= 2) {
    score += 4
    findings.push({
      code: 'MULTI_POOL_LIQUIDITY',
      severity: 'INFO',
      title: 'Multiple liquidity pools',
      detail: `${concentration.pairCount} pools indexed — broader exit paths.`,
    })
  }

  if (isMajorAsset && strongMarket) {
    score += 6
    findings.push({
      code: 'MAJOR_ASSET_MARKET',
      severity: 'INFO',
      title: 'Major Solana asset',
      detail: 'Established market cap and liquidity profile on indexed venues.',
    })
  }

  const trustScore = clamp(Math.round(score), 0, 100)
  const trustBand = solanaTrustBandFromScore(trustScore)
  const verdictActionFrameLabel = solanaVerdictActionFrame(trustBand, concentration, isCanonical || isMajorAsset)

  return {
    ...core,
    trustScore,
    trustBand,
    findings: findings.slice(0, 20),
    tokenConcentration: concentration,
    verdictActionFrame: verdictActionFrameLabel,
    addressType: core.addressType === 'CONTRACT' ? 'TOKEN' : core.addressType,
  }
}
