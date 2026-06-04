import { resolveAssetLiquidityTier } from '../liquidityIntelligence/assetLiquidityTier.mjs'
import { resolvePreliminaryRiskScore } from './preliminaryExecutiveIntel.mjs'
import { resolveEffectiveNarrativeCategory } from './executiveIntelligenceEngine.mjs'

const COMPOSITE_WEIGHTS = {
  contract: 0.24,
  narrative: 0.22,
  behavior: 0.12,
  liquidity: 0.22,
  walletExposure: 0.2,
}

export const RISK_COMPONENT_META = [
  { id: 'technical', label: 'Technical Risk', weight: COMPOSITE_WEIGHTS.contract, subscoreKey: 'contractRisk' },
  { id: 'liquidity', label: 'Liquidity Risk', weight: COMPOSITE_WEIGHTS.liquidity, subscoreKey: 'liquidityRisk' },
  { id: 'governance', label: 'Governance Risk', weight: 0.18, derived: true },
  { id: 'narrative', label: 'Narrative Risk', weight: COMPOSITE_WEIGHTS.narrative, subscoreKey: 'narrativeRisk' },
  { id: 'behavior', label: 'Behavior Risk', weight: COMPOSITE_WEIGHTS.behavior, subscoreKey: 'behaviorRisk' },
]

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function deriveGovernanceRisk({ contractRisk = 45, scannerReport = null, executive = null } = {}) {
  let score = Math.round(Number(contractRisk) * 0.82)
  const ownership = String(scannerReport?.ownershipConcentration || '').toUpperCase()
  if (ownership === 'CONCENTRATED') score += 14
  else if (ownership === 'MODERATE') score += 6
  if (scannerReport?.upgradeableProxy === true) score += 8
  if (scannerReport?.verifiedSource === true) score -= 6
  if (executive?.classification === 'STABLECOIN ASSET') score = Math.min(score, 38)
  if (executive?.classification === 'ORACLE INFRASTRUCTURE') score = Math.min(score, 42)
  return Math.max(0, Math.min(100, score))
}

function buildPreliminarySubscores(report, executive) {
  const symbol = report?.displayTarget || report?.query
  const category = resolveEffectiveNarrativeCategory({
    symbol,
    query: report?.query,
    address: report?.tokenResolution?.address || report?.targetClassification?.address,
  })
  const tier = resolveAssetLiquidityTier({ symbol, narrativeCategory: category, query: report?.query })
  const base = resolvePreliminaryRiskScore(category)
  const technical =
    tier.tier === 'stablecoin' ? 18 : tier.tier === 'blue_chip' || category === 'oracle' ? 18 : tier.tier === 'meme' ? 52 : 38
  const liquidity =
    tier.tier === 'stablecoin' || tier.tier === 'blue_chip' ? 18 : tier.tier === 'defi' ? 24 : tier.tier === 'meme' ? 48 : 42
  const narrative =
    category === 'meme' ? 58 : category === 'oracle' || category === 'stablecoin' ? 26 : category === 'defi' ? 32 : 36
  const governance =
    tier.tier === 'stablecoin' ? 32 : tier.tier === 'blue_chip' || category === 'oracle' ? 36 : tier.tier === 'meme' ? 44 : 40
  const behavior = null
  const composite = num(executive?.executiveRiskScore) ?? base
  return { technical, liquidity, governance, narrative, behavior, composite, pendingBehavior: true }
}

/**
 * @param {object} params
 */
export function buildRiskExplainability({
  report = null,
  composite = null,
  executive = null,
  scannerReport = null,
} = {}) {
  const sub = composite?.subscores || executive?.subscores || null
  const preliminary = executive?.preliminary || executive?.assessmentStage === 'PRELIMINARY'
  const prelim =
    preliminary && !sub
      ? buildPreliminarySubscores(report, executive)
      : null

  const technical = num(sub?.contractRisk) ?? prelim?.technical ?? null
  const liquidity = num(sub?.liquidityRisk) ?? prelim?.liquidity ?? null
  const narrative = num(sub?.narrativeRisk) ?? prelim?.narrative ?? null
  const behavior = num(sub?.behaviorRisk) ?? prelim?.behavior ?? null
  const governance = deriveGovernanceRisk({
    contractRisk: technical ?? 45,
    scannerReport,
    executive,
  })
  const compositeScore =
    num(composite?.score) ?? num(executive?.executiveRiskScore) ?? prelim?.composite ?? null

  const components = [
    { id: 'technical', label: 'Technical Risk', score: technical, weight: COMPOSITE_WEIGHTS.contract, pending: false },
    { id: 'liquidity', label: 'Liquidity Risk', score: liquidity, weight: COMPOSITE_WEIGHTS.liquidity, pending: false },
    { id: 'governance', label: 'Governance Risk', score: governance, weight: 0.18, pending: false },
    { id: 'narrative', label: 'Narrative Risk', score: narrative, weight: COMPOSITE_WEIGHTS.narrative, pending: false },
    {
      id: 'behavior',
      label: 'Behavior Risk',
      score: behavior,
      weight: COMPOSITE_WEIGHTS.behavior,
      pending: behavior == null || preliminary,
    },
    {
      id: 'composite',
      label: 'Composite Risk',
      score: compositeScore,
      weight: 1,
      pending: compositeScore == null,
      highlight: true,
    },
  ]

  const sorted = components
    .filter((c) => c.id !== 'composite' && c.score != null && !c.pending)
    .sort((a, b) => b.score - a.score)
  const primaryContributor = sorted[0]
    ? { label: sorted[0].label.replace(' Risk', ''), component: sorted[0].label, score: sorted[0].score }
    : null

  const riskDrivers = buildRiskDrivers({ report, executive, scannerReport, primaryContributor })
  const positiveOffsets = buildPositiveOffsets({ report, executive, scannerReport })

  const confidenceMethodology = buildConfidenceMethodology(executive)

  return {
    components,
    primaryContributor,
    riskDrivers,
    positiveOffsets,
    confidenceMethodology,
    weights: RISK_COMPONENT_META.map(({ label, weight }) => ({ label, weight: Math.round(weight * 100) })),
  }
}

function buildRiskDrivers({ report, executive, scannerReport, primaryContributor }) {
  const drivers = []
  if (primaryContributor) {
    drivers.push(`Primary contributor: ${primaryContributor.label} (${primaryContributor.score}/100)`)
  }
  if (executive?.classificationSecondaryDriver) {
    drivers.push(executive.classificationSecondaryDriver)
  }
  const tc = scannerReport?.tokenConcentration
  if (tc?.top10HolderPct != null && tc.top10HolderPct >= 50) {
    drivers.push(`Concentrated holder distribution (~${tc.top10HolderPct.toFixed(0)}% top-10)`)
  }
  if (scannerReport?.upgradeableProxy) drivers.push('Upgradeable proxy surface detected')
  if (executive?.classification?.includes('MEME')) drivers.push('Narrative-driven volatility profile')
  if (!drivers.length && executive?.preliminary) {
    drivers.push('Scanner validation pending — preliminary category and registry context active')
  }
  return drivers.slice(0, 4)
}

function buildPositiveOffsets({ report, executive, scannerReport }) {
  const offsets = []
  if (scannerReport?.verifiedSource === true) offsets.push('Verified contract source')
  if (executive?.classification === 'ORACLE INFRASTRUCTURE') offsets.push('Long deployment history')
  if (executive?.classification === 'STABLECOIN ASSET') offsets.push('Institutional stablecoin registry profile')
  const age = scannerReport?.tokenConcentration?.deploymentAge || scannerReport?.tokenConcentration?.contractDeploymentAge
  if (age && /year|3\+|2\+/i.test(String(age))) offsets.push('Long deployment history')
  const liq = scannerReport?.liquidityIntelligence
  if (liq?.liquidityDepthLabel === 'Strong' || liq?.liquidityDepthLabel === 'Exceptional') {
    offsets.push('Deep indexed liquidity')
  } else if (executive?.classification === 'ORACLE INFRASTRUCTURE' || executive?.classification === 'STABLECOIN ASSET') {
    offsets.push('Deep global liquidity profile (registry tier)')
  }
  if (scannerReport?.honeypotRisk === 'LOW') offsets.push('No honeypot signals in security scan')
  if (!offsets.length && report?.tokenResolution?.resolved) offsets.push('Contract identity resolved from registry')
  return offsets.slice(0, 5)
}

function buildConfidenceMethodology(executive) {
  if (!executive) return null
  const stage = executive.assessmentStage || 'PRELIMINARY'
  const status = executive.assessmentStatus || 'Awaiting scanner validation'
  const interpretation = executive.confidenceInterpretation || 'Category intelligence + registry validation'
  return { stage, status, interpretation }
}
