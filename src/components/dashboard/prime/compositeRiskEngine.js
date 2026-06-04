const RISK_LEVEL_SCORE = {
  Low: 22,
  Moderate: 45,
  High: 72,
  Critical: 92,
}

const COMPOSITE_WEIGHTS = {
  contract: 0.24,
  narrative: 0.22,
  behavior: 0.12,
  liquidity: 0.22,
  walletExposure: 0.2,
}

export { COMPOSITE_WEIGHTS }

/**
 * Map qualitative risk level to 0–100 risk score (higher = riskier).
 * @param {string} level
 */
export function riskLevelToScore(level) {
  return RISK_LEVEL_SCORE[level] ?? RISK_LEVEL_SCORE.Moderate
}

/**
 * @param {number} score
 * @returns {'Low' | 'Moderate' | 'High' | 'Critical'}
 */
export function compositeScoreToRiskLevel(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return 'Moderate'
  if (n <= 30) return 'Low'
  if (n <= 48) return 'Moderate'
  if (n <= 72) return 'High'
  return 'Critical'
}

/**
 * @param {number} score
 */
export function compositeVerdictLabel(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return 'RISK ASSESSMENT PENDING'
  if (n <= 28) return 'LOW RISK'
  if (n <= 42) return 'LOW-MODERATE RISK'
  if (n <= 58) return 'MODERATE RISK'
  if (n <= 72) return 'MODERATE-HIGH RISK'
  if (n <= 85) return 'HIGH RISK'
  return 'CRITICAL RISK'
}

/**
 * Wallet exposure risk from safety index (100 = safe) or exposure bands.
 */
export function walletExposureRiskScore({
  band,
  score,
  assessmentPending,
  exposureIntelligence,
  exposureProfile,
} = {}) {
  if (Number.isFinite(Number(exposureProfile?.exposureScore))) {
    return Math.max(0, Math.min(100, Math.round(Number(exposureProfile.exposureScore))))
  }

  if (assessmentPending || band === 'PENDING') return null

  if (Number.isFinite(Number(score))) {
    return Math.max(0, Math.min(100, Math.round(100 - Number(score))))
  }

  const bands = exposureIntelligence?.bands
  if (Array.isArray(bands) && bands.length > 0) {
    const avg = bands.reduce((s, b) => s + (Number(b.level) || 0), 0) / bands.length
    return Math.round((avg / 7) * 100)
  }

  switch (String(band || '').toUpperCase()) {
    case 'LOW':
      return 25
    case 'MODERATE':
      return 45
    case 'ELEVATED':
      return 68
    case 'HIGH':
      return 88
    default:
      return null
  }
}

/**
 * Behavior layer risk from live feeds and anomaly counts.
 */
export function behaviorRiskScore({ birdeyeLive, activityAnomalies = 0, watchlistLive } = {}) {
  if (birdeyeLive || watchlistLive) {
    return Math.min(85, 18 + Number(activityAnomalies || 0) * 14)
  }
  return 38
}

/**
 * @param {object} input
 * @returns {null | {
 *   score: number,
 *   verdictLabel: string,
 *   executiveRiskLevel: string,
 *   subscores: {
 *     contractRisk: number,
 *     narrativeRisk: number,
 *     behaviorRisk: number,
 *     liquidityRisk: number,
 *     walletExposureRisk: number | null,
 *   },
 * }}
 */
export function computeCompositeRisk({
  contractRiskLevel = 'Moderate',
  narrativeRiskLevel = 'Moderate',
  behaviorInputs = {},
  liquidityRiskScore = null,
  walletInputs = {},
  exposureProfile = null,
} = {}) {
  const contractRisk = riskLevelToScore(contractRiskLevel)
  const narrativeRisk = riskLevelToScore(narrativeRiskLevel)
  const behaviorRisk = behaviorRiskScore(behaviorInputs)
  const liquidityRisk = Number.isFinite(Number(liquidityRiskScore))
    ? Math.max(0, Math.min(100, Math.round(Number(liquidityRiskScore))))
    : 48
  const walletExposureRisk = walletExposureRiskScore({ ...walletInputs, exposureProfile })

  const parts = [
    { value: contractRisk, weight: COMPOSITE_WEIGHTS.contract },
    { value: narrativeRisk, weight: COMPOSITE_WEIGHTS.narrative },
    { value: behaviorRisk, weight: COMPOSITE_WEIGHTS.behavior },
    { value: liquidityRisk, weight: COMPOSITE_WEIGHTS.liquidity },
  ]

  if (Number.isFinite(walletExposureRisk)) {
    parts.push({ value: walletExposureRisk, weight: COMPOSITE_WEIGHTS.walletExposure })
    const tokenOnlyWeight =
      COMPOSITE_WEIGHTS.contract +
      COMPOSITE_WEIGHTS.narrative +
      COMPOSITE_WEIGHTS.behavior +
      COMPOSITE_WEIGHTS.liquidity
    const scale = (1 - COMPOSITE_WEIGHTS.walletExposure) / tokenOnlyWeight
    for (const p of parts.slice(0, 4)) p.weight *= scale
  } else {
    const redistributed = parts.reduce((s, p) => s + p.weight, 0)
    for (const p of parts) p.weight = p.weight / redistributed
  }

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0)
  const score = Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight)

  return {
    score,
    verdictLabel: compositeVerdictLabel(score),
    executiveRiskLevel: compositeScoreToRiskLevel(score),
    subscores: {
      contractRisk,
      narrativeRisk,
      behaviorRisk,
      liquidityRisk,
      walletExposureRisk: Number.isFinite(walletExposureRisk) ? walletExposureRisk : null,
    },
  }
}
