/** @typedef {'LIVE' | 'PARTIAL_DATA' | 'LATEST_SNAPSHOT' | 'ESTIMATED' | 'MODEL_GENERATED' | 'DEMO_MODE' | 'PROVIDER_PENDING'} DataProvenance */

/**
 * @param {DataProvenance} status
 * @returns {string}
 */
export function formatDataStatusLabel(status) {
  if (status === 'LIVE') return 'LIVE'
  if (status === 'PARTIAL_DATA') return 'PARTIAL DATA'
  if (status === 'LATEST_SNAPSHOT') return 'LATEST SNAPSHOT'
  if (status === 'ESTIMATED') return 'ESTIMATED'
  if (status === 'MODEL_GENERATED' || status === 'INTELLIGENCE_SNAPSHOT') return 'INTELLIGENCE SNAPSHOT'
  if (status === 'PROVIDER_PENDING') return 'PROVIDER PENDING'
  return 'DEMO MODE'
}

/**
 * @param {DataProvenance} status
 */
export function dataStatusClass(status) {
  if (status === 'LIVE') return 'prime-data-status prime-data-status--live'
  if (status === 'PARTIAL_DATA') return 'prime-data-status prime-data-status--partial'
  if (status === 'LATEST_SNAPSHOT') return 'prime-data-status prime-data-status--snapshot'
  if (status === 'ESTIMATED') return 'prime-data-status prime-data-status--estimated'
  if (status === 'MODEL_GENERATED') return 'prime-data-status prime-data-status--model'
  if (status === 'PROVIDER_PENDING') return 'prime-data-status prime-data-status--pending'
  return 'prime-data-status prime-data-status--demo'
}

/**
 * @param {object} opts
 * @returns {DataProvenance}
 */
export function resolveProvenance({
  hasWallet = false,
  hasApiData = false,
  isFreshSnapshot = false,
  isModelGenerated = false,
  isCachedOrDerived = false,
} = {}) {
  if (!hasWallet && !hasApiData) return 'DEMO_MODE'
  if (isFreshSnapshot && hasApiData) return 'LATEST_SNAPSHOT'
  if (isModelGenerated) return 'MODEL_GENERATED'
  if (isCachedOrDerived || hasApiData) return 'ESTIMATED'
  if (hasWallet) return 'MODEL_GENERATED'
  return 'DEMO_MODE'
}

/** Pick the strongest (most “live”) provenance for a section header. */
export function mergeProvenance(...statuses) {
  const rank = {
    LIVE: 6,
    LATEST_SNAPSHOT: 5,
    PARTIAL_DATA: 4,
    ESTIMATED: 3,
    MODEL_GENERATED: 3,
    PROVIDER_PENDING: 2,
    DEMO_MODE: 1,
  }
  return statuses.reduce((best, s) => (rank[s] > rank[best] ? s : best), 'DEMO_MODE')
}

/**
 * @param {string} title
 * @returns {string}
 */
export function formatMachineRiskDriver(title) {
  const t = String(title || '').trim()
  if (!t) return 'Exposure signal detected'
  const map = [
    [/moderate volatility sensitivity/i, 'Volatility sensitivity elevated'],
    [/volatility exposure moderate/i, 'Volatility sensitivity elevated'],
    [/volatility exposure high/i, 'Volatility sensitivity elevated'],
    [/unlimited approval/i, 'Approval surface exceeds healthy threshold'],
    [/approval/i, 'Approval surface exceeds healthy threshold'],
    [/concentration/i, 'Concentration exposure elevated'],
    [/interaction density/i, 'Contract interaction clustering detected'],
    [/clustering/i, 'Contract interaction clustering detected'],
    [/contract/i, 'Contract interaction clustering detected'],
  ]
  for (const [re, out] of map) {
    if (re.test(t)) return out
  }
  if (/detected|elevated|exceeds|clustering/i.test(t)) return t
  return `${t.replace(/\.$/, '')} detected`
}

/**
 * @param {string} headline
 * @returns {string}
 */
export function formatMarketBiasLabel(headline) {
  const h = String(headline || '')
  if (/Risk-On Expansion/i.test(h)) return 'Risk-On Bias'
  if (/Momentum Expansion/i.test(h)) return 'Momentum Expansion'
  if (/Defensive Regime/i.test(h)) return 'Defensive Bias'
  if (/Elevated Risk/i.test(h)) return 'Elevated Risk Regime'
  if (/Liquidity Stress/i.test(h)) return 'Liquidity Stress'
  if (/Volatility Compression/i.test(h)) return 'Volatility Compression'
  return 'Neutral Bias'
}

/**
 * Intelligence feed line aligned to shared macro headline.
 * @param {string} headline
 */
export function macroRegimeFeedLine(headline) {
  const bias = formatMarketBiasLabel(headline)
  return `Macro regime unchanged — ${bias.toLowerCase()}`
}

/**
 * @param {string} headline
 * @param {string} [actionVerb]
 */
export function macroRegimeActionDetail(headline, actionVerb = 'Align') {
  const bias = formatMarketBiasLabel(headline)
  return `${actionVerb} discretionary signing with ${bias.toLowerCase()} posture.`
}

/**
 * @param {object} params
 * @returns {'Low' | 'Moderate' | 'High'}
 */
export function analysisCertaintyLevel({ band, fromAnalyst, fromRisk }) {
  if (fromAnalyst) return 'High'
  if (fromRisk && (band === 'HIGH' || band === 'ELEVATED')) return 'High'
  if (band === 'MODERATE') return 'Moderate'
  if (fromRisk) return 'Moderate'
  return 'Low'
}

/**
 * Operator-grade exposure state from wallet risk band (hero chips + index panel).
 * @param {string} [band]
 * @returns {string}
 */
export function walletExposureStateLabel(band) {
  switch (String(band || '').toUpperCase()) {
    case 'PENDING':
      return 'ASSESSMENT PENDING'
    case 'LOW':
      return 'LOW EXPOSURE'
    case 'MODERATE':
      return 'MODERATE EXPOSURE'
    case 'ELEVATED':
      return 'HIGH EXPOSURE'
    case 'HIGH':
      return 'CRITICAL EXPOSURE'
    default:
      return 'EXPOSURE PENDING'
  }
}

/** Short band label for command metric chips only (not Wallet Risk Index panel). */
export function walletRiskBandChipLabel(band) {
  switch (String(band || '').toUpperCase()) {
    case 'PENDING':
      return 'ASSESSMENT PENDING'
    case 'LOW':
      return 'LOW RISK'
    case 'MODERATE':
      return 'MODERATE RISK'
    case 'ELEVATED':
      return 'HIGH RISK'
    case 'HIGH':
      return 'CRITICAL RISK'
    default:
      return 'RISK PENDING'
  }
}

/**
 * Display label for Market Regime provenance badge (Prime macro strip only).
 * @param {DataProvenance} provenance
 */
export function formatMacroRegimeProvenanceLabel(provenance) {
  if (provenance === 'LATEST_SNAPSHOT') return 'LATEST SNAPSHOT'
  if (provenance === 'ESTIMATED') return 'AI CLASSIFIED'
  if (provenance === 'MODEL_GENERATED' || provenance === 'INTELLIGENCE_SNAPSHOT') return 'INTELLIGENCE SNAPSHOT'
  return 'DEMO MODE'
}

/**
 * @param {string} band
 * @returns {'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'}
 */
export function exposureSeverityFromBand(band) {
  switch (String(band || '').toUpperCase()) {
    case 'PENDING':
      return 'MODERATE'
    case 'LOW':
      return 'LOW'
    case 'HIGH':
      return 'HIGH'
    case 'ELEVATED':
      return 'CRITICAL'
    case 'MODERATE':
    default:
      return 'MODERATE'
  }
}

/**
 * @param {number[]} points
 * @param {number} scoreDelta
 * @param {string} band
 * @returns {'Stable' | 'Improving' | 'Elevating' | 'Critical'}
 */
export function computeExposureTrendLabel(points, scoreDelta, band) {
  if (band === 'HIGH' || band === 'ELEVATED') return 'Critical'
  const pts = points || []
  if (pts.length >= 2) {
    const delta = pts[pts.length - 1] - pts[pts.length - 2]
    if (Math.abs(delta) <= 1) return 'Stable'
    if (delta < -2) return 'Improving'
    if (delta > 2) return 'Elevating'
  }
  if (scoreDelta === 0) return 'Stable'
  if (scoreDelta <= -2) return 'Improving'
  if (scoreDelta >= 3) return 'Elevating'
  if (Math.abs(scoreDelta) <= 1) return 'Stable'
  return scoreDelta > 0 ? 'Elevating' : 'Improving'
}

/**
 * State-first command metric display: primary state (or score), secondary context.
 * @param {string} key
 * @param {number|string} raw
 * @param {string} [band] — wallet risk band for score chip
 */
export function formatHeroChipDisplay(key, raw, band) {
  const n = Number(raw)
  switch (key) {
    case 'score':
      if (band === 'PENDING' || raw == null || raw === '—') {
        return { primary: 'PENDING', sub: 'Insufficient provider data' }
      }
      return { primary: String(raw), sub: walletRiskBandChipLabel(band) }
    case 'delta':
      if (n === 0) return { primary: 'STABLE', sub: 'No movement detected' }
      if (n > 0) return { primary: 'ELEVATING', sub: `+${n} score movement` }
      return { primary: 'IMPROVING', sub: `${n} score movement` }
    case 'approvals':
      if (n === 0) return { primary: 'CLEAR', sub: 'No risky approvals' }
      return {
        primary: 'ELEVATED',
        sub: `${n} risky approval${n === 1 ? '' : 's'}`,
      }
    case 'activity':
      if (n === 0) return { primary: 'CLEAR', sub: 'No anomalous activity' }
      return {
        primary: 'ELEVATED',
        sub: `${n} unusual wallet behavior${n === 1 ? '' : 's'}`,
      }
    case 'contracts':
      if (n === 0) return { primary: 'CLEAR', sub: 'No flagged contracts' }
      return {
        primary: 'WATCH',
        sub: `${n} flagged contract${n === 1 ? '' : 's'}`,
      }
    default:
      return { primary: String(raw), sub: null }
  }
}

export { buildWalletExposureHeatmap } from '@/utils/walletExposureHeatmap.js'

/**
 * @param {string} summary
 */
export function isRedundantFeedEvent(summary) {
  const s = String(summary || '')
  const sameScore = s.match(/(\d+)\s*→\s*(\d+)/)
  if (sameScore && sameScore[1] === sameScore[2]) return true
  if (/score moved from/i.test(s) && sameScore) return true
  return false
}

/**
 * @param {string} headline — shared macro classification headline
 * @param {boolean} hasWallet
 */
export function buildContextualFallbackFeed(headline, hasWallet) {
  const macroLine = macroRegimeFeedLine(headline)
  const now = Date.now()
  const base = [
    {
      id: 'm1',
      summary: 'EXPOSURE UPDATE · Approval inventory unchanged across verified surfaces',
      severity: 'LOW',
      offset: 3600000,
      eventKind: 'EXPOSURE_UPDATE',
    },
    {
      id: 'm2',
      summary: 'SYSTEM ANALYSIS · No suspicious interactions detected in monitored window',
      severity: 'LOW',
      offset: 7200000,
      eventKind: 'SYSTEM_ANALYSIS',
    },
    {
      id: 'm3',
      summary: 'INTELLIGENCE SNAPSHOT · Contract intelligence synthesis completed',
      severity: 'MEDIUM',
      offset: 10800000,
      eventKind: 'INTELLIGENCE_SNAPSHOT',
    },
    { id: 'm4', summary: macroLine, severity: 'LOW', offset: 18000000, eventKind: 'RISK_OBSERVATION' },
    {
      id: 'm5',
      summary: hasWallet
        ? 'RISK OBSERVATION · Wallet exposure concentration under active monitoring'
        : 'INTELLIGENCE SNAPSHOT · Wallet exposure pending provider verification',
      severity: 'MEDIUM',
      offset: 25200000,
      eventKind: 'RISK_OBSERVATION',
    },
    {
      id: 'm6',
      summary: 'RISK OBSERVATION · Threat posture stable across intelligence layers',
      severity: 'LOW',
      offset: 32400000,
      eventKind: 'RISK_OBSERVATION',
    },
    {
      id: 'm7',
      summary: 'INTELLIGENCE SNAPSHOT · Intelligence cycle refreshed',
      severity: 'LOW',
      offset: 43200000,
      eventKind: 'INTELLIGENCE_SNAPSHOT',
    },
  ]
  return base.map((m) => ({
    ...m,
    at: new Date(now - m.offset).toISOString(),
    ts: now - m.offset,
    source: 'snapshot',
  }))
}
