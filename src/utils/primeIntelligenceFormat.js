/** @typedef {'LATEST_SNAPSHOT' | 'ESTIMATED' | 'MODEL_GENERATED' | 'DEMO_MODE'} DataProvenance */

/**
 * @param {DataProvenance} status
 * @returns {string}
 */
export function formatDataStatusLabel(status) {
  if (status === 'LATEST_SNAPSHOT') return 'LATEST SNAPSHOT'
  if (status === 'ESTIMATED') return 'ESTIMATED'
  if (status === 'MODEL_GENERATED') return 'MODEL GENERATED'
  return 'DEMO MODE'
}

/**
 * @param {DataProvenance} status
 */
export function dataStatusClass(status) {
  if (status === 'LATEST_SNAPSHOT') return 'prime-data-status prime-data-status--snapshot'
  if (status === 'ESTIMATED') return 'prime-data-status prime-data-status--estimated'
  if (status === 'MODEL_GENERATED') return 'prime-data-status prime-data-status--model'
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
  const rank = { LATEST_SNAPSHOT: 4, MODEL_GENERATED: 3, ESTIMATED: 2, DEMO_MODE: 1 }
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
  if (provenance === 'MODEL_GENERATED') return 'MODEL GENERATED'
  return 'DEMO MODE'
}

/**
 * @param {string} band
 * @returns {'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'}
 */
export function exposureSeverityFromBand(band) {
  switch (String(band || '').toUpperCase()) {
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

/**
 * @param {object} params
 * @returns {{ label: string, level: number, max: number }[]}
 */
export function buildWalletExposureHeatmap({ findings = [], approvals, band, score }) {
  const rows = approvals?.rows || []
  const unlimited = rows.filter((r) => r.unlimited).length
  const highRiskApprovals = rows.filter((r) => r.riskLevel === 'HIGH' || r.riskLevel === 'ELEVATED').length
  const contractFindings = findings.filter((f) =>
    /contract|approval|proxy|spender|protocol/i.test(`${f.code} ${f.title}`),
  ).length

  const bandBoost =
    band === 'ELEVATED' ? 2 : band === 'HIGH' ? 1.5 : band === 'MODERATE' ? 0.5 : 0
  const scoreNorm = Math.min(7, Math.max(1, Math.round((Number(score) || 50) / 14)))

  const dex = Math.min(7, Math.round(scoreNorm * 0.85 + highRiskApprovals * 0.4 + bandBoost))
  const stable = Math.min(7, Math.max(1, Math.round(3 + (findings.length ? 1 : 0))))
  const nft = Math.min(7, Math.max(1, findings.some((f) => /nft/i.test(f.title)) ? 3 : 1))
  const unknown = Math.min(7, Math.round(1 + contractFindings * 0.5 + unlimited * 0.3))
  const protocol = Math.min(7, Math.round(2 + highRiskApprovals * 0.6 + contractFindings * 0.4))

  return [
    { label: 'DEX exposure', level: dex, max: 7 },
    { label: 'Stablecoins', level: stable, max: 7 },
    { label: 'NFT exposure', level: nft, max: 7 },
    { label: 'Unknown contracts', level: unknown, max: 7 },
    { label: 'Protocol dependency', level: protocol, max: 7 },
  ]
}

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
    { id: 'm1', summary: 'Approval exposure unchanged', severity: 'LOW', offset: 3600000 },
    { id: 'm2', summary: 'No suspicious interactions detected', severity: 'LOW', offset: 7200000 },
    { id: 'm3', summary: 'Contract intelligence report completed', severity: 'MEDIUM', offset: 10800000 },
    { id: 'm4', summary: macroLine, severity: 'LOW', offset: 18000000 },
    {
      id: 'm5',
      summary: hasWallet ? 'Wallet exposure remains concentrated' : 'Wallet exposure model pending verification',
      severity: 'MEDIUM',
      offset: 25200000,
    },
    { id: 'm6', summary: 'Threat posture stable', severity: 'LOW', offset: 32400000 },
    { id: 'm7', summary: 'Intelligence cycle refreshed', severity: 'LOW', offset: 43200000 },
  ]
  return base.map((m) => ({
    ...m,
    at: new Date(now - m.offset).toISOString(),
    ts: now - m.offset,
    source: 'model',
  }))
}
