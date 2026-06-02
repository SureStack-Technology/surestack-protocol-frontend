import { solanaTrustBandFromScore } from './solanaTypes.js'

const MEME_NARRATIVE_CAP = 82
const HOLDER_UNKNOWN_CAP = 78
const LOW_LIQUIDITY_CAP = 76
const LOW_LIQUIDITY_USD = 5_000_000
const MEME_TECHNICAL_CEILING = 92
const DEFAULT_MEME_NARRATIVE_RISK = 78

/**
 * @param {object} report
 * @returns {'stablecoin' | 'meme_speculative' | 'defi' | 'standard'}
 */
export function resolveSolanaNarrativeCategory(report) {
  const id = report?.archetypeId
  if (report?.regulatedStablecoin || id === 'usdc_solana' || id === 'usdt_solana') {
    return 'stablecoin'
  }
  if (id === 'bonk' || id === 'wif') return 'meme_speculative'
  const sym = String(report?.requestedSymbol || '').toUpperCase()
  if (sym === 'BONK' || sym === 'WIF') return 'meme_speculative'
  if (id === 'jup_token' || id === 'pyth' || id === 'jto' || id === 'ray') return 'defi'
  return 'standard'
}

function technicalTrustLabel(score) {
  const s = Number(score)
  if (!Number.isFinite(s)) return 'Unknown'
  if (s >= 82) return 'Strong'
  if (s >= 65) return 'Moderate'
  if (s >= 45) return 'Caution'
  return 'Weak'
}

function narrativeRiskLabel(score) {
  const s = Number(score)
  if (!Number.isFinite(s)) return 'Unknown'
  if (s >= 70) return 'High'
  if (s >= 50) return 'Moderate'
  return 'Low'
}

function compositeRiskBandFromTrust(trustScore, narrativeRisk, isMeme) {
  if (isMeme && narrativeRisk >= 70) return 'MODERATE'
  const band = solanaTrustBandFromScore(trustScore)
  if (band === 'TRUSTED') return 'LOW'
  if (band === 'MODERATE') return 'MODERATE'
  if (band === 'ELEVATED') return 'HIGH'
  return 'CRITICAL'
}

function holderConcentrationUnknown(tc) {
  if (!tc || typeof tc !== 'object') return true
  if (tc.top10HolderPct != null || tc.largestWalletPct != null) return false
  if (tc.holderCount != null && Number(tc.holderCount) > 0) return false
  const hc = String(tc.holderConcentration || '').toUpperCase()
  if (hc && hc !== 'NOT_AVAILABLE' && hc !== 'UNKNOWN') return false
  return true
}

function computeMemeMaxTrust({ narrativeRisk, holderUnknown, liquidityUsd }) {
  let maxTrust = MEME_NARRATIVE_CAP
  if (narrativeRisk >= 70) maxTrust = Math.min(maxTrust, MEME_NARRATIVE_CAP)
  if (holderUnknown) maxTrust = Math.min(maxTrust, HOLDER_UNKNOWN_CAP)
  if (liquidityUsd != null && liquidityUsd < LOW_LIQUIDITY_USD) {
    maxTrust = Math.min(maxTrust, LOW_LIQUIDITY_CAP)
  }
  return maxTrust
}

/**
 * Split technical trust, narrative risk, and composite trust for Solana mint scans.
 * Meme/speculative assets never surface trust 100 or LOW RISK when narrative is elevated.
 * @param {object} report
 * @param {{ narrativeRiskScore?: number }} [options]
 */
export function applySolanaNarrativeRiskLayers(report, options = {}) {
  if (!report || report.trustScore == null) return report
  if (report.addressType && report.addressType !== 'SPL_TOKEN_MINT') return report

  const category = resolveSolanaNarrativeCategory(report)
  const rawTechnical = Number(report.trustScoreUncapped ?? report.trustScore ?? 70)
  const technicalTrustScore = Math.round(
    Math.min(category === 'meme_speculative' ? MEME_TECHNICAL_CEILING : 100, rawTechnical),
  )
  const technicalLabel = technicalTrustLabel(technicalTrustScore)

  if (category === 'stablecoin') {
    const composite = Math.round(Number(report.trustScore))
    return {
      ...report,
      narrativeCategory: category,
      technicalTrustScore,
      technicalTrustLabel: 'Operational',
      narrativeRiskScore: null,
      narrativeRiskLabel: 'Low',
      compositeTrustScore: composite,
      compositeRiskBand: compositeRiskBandFromTrust(composite, 20, false),
      riskLayers: {
        technical: 'Operational',
        narrative: 'Low',
        composite: composite >= 75 ? 'Low' : 'Moderate',
      },
    }
  }

  if (category !== 'meme_speculative') {
    const composite = Math.round(Number(report.trustScore))
    const narrativeRisk =
      options.narrativeRiskScore ??
      (category === 'defi' ? 42 : 48)
    return {
      ...report,
      narrativeCategory: category,
      technicalTrustScore,
      technicalTrustLabel: technicalLabel,
      narrativeRiskScore: Math.round(narrativeRisk),
      narrativeRiskLabel: narrativeRiskLabel(narrativeRisk),
      compositeTrustScore: composite,
      compositeRiskBand: compositeRiskBandFromTrust(composite, narrativeRisk, false),
      riskLayers: {
        technical: technicalLabel,
        narrative: narrativeRiskLabel(narrativeRisk),
        composite: compositeRiskBandFromTrust(composite, narrativeRisk, false),
      },
    }
  }

  const tc = report.tokenConcentration || {}
  const narrativeRisk = options.narrativeRiskScore ?? DEFAULT_MEME_NARRATIVE_RISK
  const holderUnknown = holderConcentrationUnknown(tc)
  const maxTrust = computeMemeMaxTrust({
    narrativeRisk,
    holderUnknown,
    liquidityUsd: tc.liquidityUsd,
  })

  let composite = Math.min(technicalTrustScore, maxTrust)
  const archetypeFloor = report.archetypeId === 'bonk' || report.archetypeId === 'wif' ? 68 : 60
  composite = Math.max(archetypeFloor, composite)

  const trustBand = narrativeRisk >= 70 ? 'MODERATE' : solanaTrustBandFromScore(composite)
  const scannerVerdict = narrativeRisk >= 70 ? 'MODERATE WATCH' : verdictFromTrustBandBackend(trustBand)
  const scannerVerdictDetail =
    narrativeRisk >= 70 ? 'TECHNICALLY CLEAN · SPECULATIVE NARRATIVE RISK' : null

  const capFinding = {
    code: 'MEME_NARRATIVE_VOLATILITY',
    severity: 'WATCH',
    title: 'Speculative narrative risk',
    detail: `Meme/speculative asset — composite trust capped at ${maxTrust} (technical ${technicalTrustScore}/100). Mint safety does not remove narrative volatility.`,
  }
  const findings = [...(report.findings || [])]
  if (!findings.some((f) => f.code === 'MEME_NARRATIVE_VOLATILITY')) {
    findings.push(capFinding)
  }

  return {
    ...report,
    trustScoreUncapped: report.trustScoreUncapped ?? rawTechnical,
    technicalTrustScore,
    technicalTrustLabel: technicalLabel,
    narrativeRiskScore: Math.round(narrativeRisk),
    narrativeRiskLabel: narrativeRiskLabel(narrativeRisk),
    compositeTrustScore: Math.round(composite),
    trustScore: Math.round(composite),
    trustBand,
    scannerVerdict,
    scannerVerdictDetail,
    compositeRiskBand: 'MODERATE',
    narrativeCategory: category,
    riskLayers: {
      technical: technicalLabel,
      narrative: narrativeRiskLabel(narrativeRisk),
      composite: 'Moderate',
    },
    findings: findings.slice(0, 20),
  }
}

function verdictFromTrustBandBackend(trustBand) {
  switch (String(trustBand || '').toUpperCase()) {
    case 'TRUSTED':
      return 'LOW RISK'
    case 'MODERATE':
      return 'MODERATE RISK'
    case 'ELEVATED':
      return 'HIGH RISK'
    case 'HIGH_RISK':
      return 'CRITICAL RISK'
    default:
      return 'MODERATE RISK'
  }
}
