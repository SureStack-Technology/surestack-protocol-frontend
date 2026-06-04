/** @typedef {'LOW IMPACT'|'MODERATE IMPACT'|'ELEVATED IMPACT'|'HIGH IMPACT'} MarketImpactLevel */
/** @typedef {'HEALTHY'|'ELEVATED'|'CRITICAL'} LiquidityConcentrationLevel */
/** @typedef {'EXCELLENT'|'GOOD'|'LIMITED'|'POOR'} VenueDiversityLevel */
/** @typedef {'STABLE'|'VOLATILE'|'UNSTABLE'} LiquidityStabilityLevel */

export const LIQUIDITY_INTEL_DISCLAIMER =
  'Liquidity Intelligence is generated from publicly observable market data and routing conditions. It does not guarantee liquidity, execution quality, slippage outcomes, or transaction completion.'

export const MARKET_IMPACT_DISCLAIMER =
  'Estimates are generated from available liquidity and routing data. Actual execution conditions may vary.'

export const TRADE_SIZE_USD = [1_000, 10_000, 100_000, 1_000_000]

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {number} depthScore 0–100 (higher = deeper liquidity)
 */
export function liquidityDepthClassification(depthScore) {
  const s = Number(depthScore)
  if (!Number.isFinite(s)) return { label: 'Unknown', band: 'unknown' }
  if (s >= 90) return { label: 'Exceptional', band: 'exceptional' }
  if (s >= 75) return { label: 'Strong', band: 'strong' }
  if (s >= 60) return { label: 'Healthy', band: 'healthy' }
  if (s >= 40) return { label: 'Limited', band: 'limited' }
  return { label: 'Thin', band: 'thin' }
}

/**
 * @param {number} riskScore 0–100 (higher = more observed liquidity risk)
 */
export function liquidityIntelligenceRiskBand(riskScore) {
  const s = Number(riskScore)
  if (!Number.isFinite(s)) return { label: 'Assessment pending', band: 'pending' }
  if (s <= 25) return { label: 'Lower Observed Liquidity Risk', band: 'lower' }
  if (s <= 50) return { label: 'Moderate Liquidity Risk', band: 'moderate' }
  if (s <= 75) return { label: 'Elevated Liquidity Risk', band: 'elevated' }
  return { label: 'High Liquidity Risk', band: 'high' }
}

/**
 * @param {number} tradeUsd
 * @param {number|null} liquidityUsd
 * @param {number|null} volume24hUsd
 * @returns {MarketImpactLevel}
 */
export function estimateMarketImpactLevel(tradeUsd, liquidityUsd, volume24hUsd) {
  const trade = num(tradeUsd) ?? 0
  const liq = num(liquidityUsd)
  const vol = num(volume24hUsd)

  if (!liq || liq <= 0) {
    if (trade <= 10_000) return 'MODERATE IMPACT'
    return 'HIGH IMPACT'
  }

  const liqShare = trade / liq
  const volShare = vol && vol > 0 ? trade / vol : null

  if (liqShare <= 0.002 && (volShare == null || volShare <= 0.02)) return 'LOW IMPACT'
  if (liqShare <= 0.01 && (volShare == null || volShare <= 0.08)) return 'LOW IMPACT'
  if (liqShare <= 0.05 && (volShare == null || volShare <= 0.25)) return 'MODERATE IMPACT'
  if (liqShare <= 0.12) return 'ELEVATED IMPACT'
  return 'HIGH IMPACT'
}

/**
 * @param {object} input
 * @returns {number} 0–100 depth score (higher = deeper)
 */
export function computeLiquidityDepthScore(input) {
  if (input?.isStablecoin) return 92
  if (input?.isCanonical || input?.isMajorAsset) {
    const liquidityUsd = num(input.liquidityUsd) ?? 0
    const volume24hUsd = num(input.volume24hUsd) ?? 0
    if (liquidityUsd <= 0 && volume24hUsd <= 0) return 88
  }
  const liquidityUsd = num(input.liquidityUsd) ?? 0
  const cexLiquidityUsd = num(input.cexLiquidityUsd) ?? 0
  const totalLiq = liquidityUsd + cexLiquidityUsd
  const marketCapUsd = num(input.marketCapUsd)
  const fdvUsd = num(input.fdvUsd) ?? marketCapUsd
  const volume24hUsd = num(input.volume24hUsd) ?? 0
  const pairCount = num(input.pairCount) ?? 0

  if (totalLiq <= 0 && volume24hUsd <= 0) {
    if (input?.isCanonical || input?.isMajorAsset) return 88
    return null
  }

  let score = 35
  if (totalLiq >= 50_000_000) score = 96
  else if (totalLiq >= 20_000_000) score = 92
  else if (totalLiq >= 10_000_000) score = 88
  else if (totalLiq >= 5_000_000) score = 82
  else if (totalLiq >= 2_000_000) score = 76
  else if (totalLiq >= 1_000_000) score = 70
  else if (totalLiq >= 500_000) score = 64
  else if (totalLiq >= 250_000) score = 58
  else if (totalLiq >= 100_000) score = 52
  else if (totalLiq >= 50_000) score = 45
  else if (totalLiq >= 10_000) score = 36
  else if (totalLiq > 0) score = 28

  if (volume24hUsd >= 1_000_000 && totalLiq >= 100_000) score += 4
  if (pairCount >= 3) score += 3
  if (pairCount >= 5) score += 2
  if (cexLiquidityUsd > 0) score += 3

  const capRef = fdvUsd || marketCapUsd
  if (capRef && totalLiq > 0) {
    const mcapToLiq = capRef / totalLiq
    if (mcapToLiq > 80) score -= 14
    else if (mcapToLiq > 40) score -= 8
    else if (mcapToLiq > 20) score -= 4
    else if (mcapToLiq < 8 && totalLiq >= 500_000) score += 3
  }

  if (totalLiq > 0 && volume24hUsd > 0) {
    const volToLiq = volume24hUsd / totalLiq
    if (volToLiq > 12) score -= 6
    else if (volToLiq >= 0.08 && volToLiq <= 4) score += 2
    else if (volToLiq < 0.03 && totalLiq < 500_000) score -= 5
  }

  return clamp(Math.round(score), 0, 100)
}

/**
 * @param {object} input
 * @returns {{ level: LiquidityConcentrationLevel, reason: string }}
 */
export function computeLiquidityConcentration(input) {
  const totalLiq = (num(input.liquidityUsd) ?? 0) + (num(input.cexLiquidityUsd) ?? 0)
  const topPair = num(input.topPairLiquidityUsd)
  const pairCount = num(input.pairCount) ?? 0

  if (totalLiq <= 0) {
    if (input?.isCanonical || input?.isMajorAsset) {
      return {
        level: 'HEALTHY',
        reason: 'Institutional asset — global liquidity primarily off indexed DEX sample (CEX / protocol depth).',
      }
    }
    return {
      level: 'CRITICAL',
      reason: 'Indexed liquidity appears minimal or unavailable across observed venues.',
    }
  }

  const topShare = topPair != null && totalLiq > 0 ? topPair / totalLiq : pairCount <= 1 ? 1 : 0.65

  if (topShare >= 0.9 || pairCount <= 1) {
    return {
      level: 'CRITICAL',
      reason: 'Most liquidity resides in a single pool or venue, which may increase dependency risk.',
    }
  }
  if (topShare >= 0.72 || pairCount <= 2) {
    return {
      level: 'ELEVATED',
      reason: 'Most liquidity resides in a small number of pools.',
    }
  }
  return {
    level: 'HEALTHY',
    reason: 'Liquidity appears distributed across multiple indexed pools.',
  }
}

/**
 * @param {object} input
 * @returns {{ level: VenueDiversityLevel, evidence: string[] }}
 */
export function computeVenueDiversity(input) {
  const dexList = String(input.dexListings || '')
    .split(/[,·|]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const dexCount = dexList.length || num(input.pairCount) || 0
  const cexCount = num(input.cexListingCount) ?? 0
  const jupiterRoutable =
    input.jupiterClassification === 'ROUTABLE' || input.jupiterRoutable === true
  const routingLimited = input.jupiterClassification === 'LIMITED_ROUTING'

  const evidence = [...dexList]
  if (jupiterRoutable) evidence.push('Jupiter routing')
  else if (routingLimited) evidence.push('Jupiter routing (limited)')
  if (cexCount > 0) evidence.push(`${cexCount} CEX listing(s) observed`)

  let score = 0
  if (dexCount >= 4) score += 3
  else if (dexCount >= 2) score += 2
  else if (dexCount >= 1) score += 1
  if (jupiterRoutable) score += 2
  else if (routingLimited) score += 1
  if (cexCount >= 2) score += 2
  else if (cexCount >= 1) score += 1

  let level = 'POOR'
  if (input?.isCanonical || input?.isMajorAsset) {
    if (dexCount >= 2 || score >= 2) level = 'GOOD'
    else level = 'GOOD'
  } else if (score >= 6) level = 'EXCELLENT'
  else if (score >= 4) level = 'GOOD'
  else if (score >= 2) level = 'LIMITED'

  if (!evidence.length) {
    if (input?.isCanonical || input?.isMajorAsset) {
      evidence.push('Institutional asset — multi-venue liquidity expected off indexed sample')
    } else {
      evidence.push('Venue coverage not fully indexed')
    }
  }

  return { level, evidence: evidence.slice(0, 6) }
}

/**
 * @param {object} input
 * @returns {{ level: LiquidityStabilityLevel, note: string }}
 */
export function computeLiquidityStability(input) {
  const change24h = num(input.liquidityChange24hPct)
  const volume24h = num(input.volume24hUsd) ?? 0
  const liquidityUsd = num(input.liquidityUsd) ?? 0
  const volToLiq = liquidityUsd > 0 ? volume24h / liquidityUsd : null

  if (change24h != null) {
    const abs = Math.abs(change24h)
    if (abs >= 45) {
      return {
        level: 'UNSTABLE',
        note: 'Observed liquidity change over 24h appears abrupt relative to indexed depth.',
      }
    }
    if (abs >= 18) {
      return {
        level: 'VOLATILE',
        note: 'Liquidity levels show material movement over the last 24h.',
      }
    }
    return {
      level: 'STABLE',
      note: 'Liquidity depth changes over 24h appear within a typical range.',
    }
  }

  if (volToLiq != null && volToLiq > 8 && liquidityUsd < 2_000_000) {
    return {
      level: 'VOLATILE',
      note: 'Volume relative to liquidity appears elevated, which may coincide with unstable depth.',
    }
  }

  if (liquidityUsd >= 1_000_000 && volToLiq != null && volToLiq <= 3) {
    return {
      level: 'STABLE',
      note: 'Volume and liquidity observations suggest relatively steady market depth.',
    }
  }

  return {
    level: 'VOLATILE',
    note: '24h liquidity change data is limited; stability inferred from volume and depth ratios.',
  }
}

function impactSeverityRank(level) {
  switch (level) {
    case 'LOW IMPACT':
      return 1
    case 'MODERATE IMPACT':
      return 2
    case 'ELEVATED IMPACT':
      return 3
    default:
      return 4
  }
}

function concentrationRisk(level) {
  if (level === 'HEALTHY') return 22
  if (level === 'ELEVATED') return 52
  return 82
}

function venueRisk(level) {
  if (level === 'EXCELLENT') return 18
  if (level === 'GOOD') return 32
  if (level === 'LIMITED') return 55
  return 78
}

function stabilityRisk(level) {
  if (level === 'STABLE') return 20
  if (level === 'VOLATILE') return 48
  return 76
}

/**
 * @param {object} input — normalized market fields
 */
export function computeLiquidityIntelligence(input = {}) {
  const depthScoreRaw = computeLiquidityDepthScore(input)
  const pending = depthScoreRaw == null
  const depthScore = pending ? null : depthScoreRaw
  const depth = pending ? { label: 'Awaiting scan', band: 'pending' } : liquidityDepthClassification(depthScore)
  const concentration = computeLiquidityConcentration(input)
  const venue = computeVenueDiversity(input)
  const stability = computeLiquidityStability(input)

  const liquidityUsd = num(input.liquidityUsd)
  const volume24hUsd = num(input.volume24hUsd)
  const impactLiq =
    liquidityUsd ??
    (input?.isCanonical || input?.isMajorAsset || input?.isStablecoin ? 50_000_000 : null)

  const marketImpact = TRADE_SIZE_USD.map((usd) => ({
    tradeUsd: usd,
    tradeLabel: usd >= 1_000_000 ? '$1,000,000' : `$${usd.toLocaleString('en-US')}`,
    level: estimateMarketImpactLevel(usd, impactLiq, volume24hUsd),
  }))

  const impactRanks = marketImpact.map((r) => impactSeverityRank(r.level))
  const avgImpact =
    impactRanks.reduce((s, r) => s + r, 0) / Math.max(impactRanks.length, 1)
  const marketImpactSummary =
    avgImpact <= 1.4
      ? 'Low'
      : avgImpact <= 2.2
        ? 'Moderate'
        : avgImpact <= 3
          ? 'Elevated'
          : 'High'

  const depthRisk = pending ? null : clamp(100 - depthScore, 0, 100)
  const liqRisk = pending
    ? null
    : Math.round(
        depthRisk * 0.34 +
          concentrationRisk(concentration.level) * 0.22 +
          venueRisk(venue.level) * 0.2 +
          stabilityRisk(stability.level) * 0.14 +
          ((avgImpact - 1) / 3) * 100 * 0.1,
      )
  const intelligenceScore = pending ? null : clamp(liqRisk, 0, 100)
  const intelligenceBand = pending
    ? { label: 'Assessment pending', band: 'pending' }
    : liquidityIntelligenceRiskBand(intelligenceScore)

  const commentary = buildLiquidityAnalystCommentary({
    pending,
    depth,
    depthScore,
    concentration,
    venue,
    stability,
    marketImpactSummary,
    intelligenceBand,
    liquidityUsd,
  })

  return {
    intelligenceScore,
    intelligenceBand: intelligenceBand.label,
    intelligenceBandId: intelligenceBand.band,
    liquidityDepthScore: depthScore,
    liquidityDepthLabel: depth.label,
    pending,
    estimatedMarketImpact: marketImpact,
    estimatedMarketImpactSummary: marketImpactSummary,
    liquidityConcentration: concentration.level,
    liquidityConcentrationReason: concentration.reason,
    venueDiversity: venue.level,
    venueEvidence: venue.evidence,
    liquidityStability: stability.level,
    liquidityStabilityNote: stability.note,
    analystCommentary: commentary,
    disclaimers: {
      global: LIQUIDITY_INTEL_DISCLAIMER,
      marketImpact: MARKET_IMPACT_DISCLAIMER,
    },
    dataQuality:
      pending ? 'pending' : liquidityUsd != null || volume24hUsd != null ? 'observed' : 'limited',
  }
}

function buildLiquidityAnalystCommentary(ctx) {
  if (ctx.pending) {
    return 'Liquidity intelligence will populate after scanner-backed market indexing. Registry-tier assets typically exhibit deep global liquidity — run Intelligence Scan for indexed depth, venue diversity, and market impact estimates.'
  }
  const parts = []
  parts.push(
    `Observed liquidity depth is classified as ${ctx.depth.label.toLowerCase()} based on indexed DEX liquidity, volume, and capitalization ratios.`,
  )

  if (ctx.marketImpactSummary === 'Low' || ctx.marketImpactSummary === 'Moderate') {
    parts.push(
      'Current liquidity conditions may suggest lower expected market impact for smaller notional sizes compared with thinly traded assets, though outcomes remain uncertain.',
    )
  } else {
    parts.push(
      'Estimated market impact appears more sensitive at larger notional sizes relative to observed depth, which may warrant additional review before interaction.',
    )
  }

  if (ctx.concentration.level !== 'HEALTHY') {
    parts.push(
      `Liquidity concentration is ${ctx.concentration.level.toLowerCase()}: ${ctx.concentration.reason}`,
    )
  }

  if (ctx.venue.level === 'LIMITED' || ctx.venue.level === 'POOR') {
    parts.push(
      'Trading venue diversity appears limited across indexed DEX and routing sources, which may increase sensitivity during volatile periods.',
    )
  } else {
    parts.push(
      `Venue diversity is classified as ${ctx.venue.level.toLowerCase()} across indexed listings and routing signals.`,
    )
  }

  parts.push(
    `Liquidity stability is observed as ${ctx.stability.level.toLowerCase()}; ${ctx.stability.note}`,
  )

  parts.push(
    'These estimates reflect publicly observable conditions only and may not capture private venues, OTC liquidity, or future market shifts.',
  )

  return parts.join(' ')
}

/**
 * Map scanner tokenConcentration / market blob to engine input.
 * @param {object} tc
 */
export function marketInputFromTokenConcentration(tc = {}) {
  if (!tc || typeof tc !== 'object') return {}
  return {
    isStablecoin: Boolean(tc.isStablecoin),
    isCanonical: Boolean(tc.isCanonical),
    isMajorAsset: Boolean(tc.isMajorAsset || tc.isCanonical),
    liquidityUsd: tc.liquidityUsd ?? null,
    cexLiquidityUsd: tc.cexLiquidityUsd ?? null,
    marketCapUsd: tc.marketCapUsd ?? null,
    fdvUsd: tc.fdvUsd ?? null,
    volume24hUsd: tc.volume24hUsd ?? null,
    pairCount: tc.pairCount ?? null,
    topPairLiquidityUsd: tc.topPairLiquidityUsd ?? null,
    liquidityChange24hPct: tc.liquidityChange24hPct ?? null,
    jupiterClassification: tc.jupiterClassification ?? null,
    jupiterRoutable: tc.jupiterRoutable ?? null,
    dexListings: tc.dexListings ?? tc.activeDex ?? null,
    cexListingCount: tc.cexListingCount ?? null,
  }
}
