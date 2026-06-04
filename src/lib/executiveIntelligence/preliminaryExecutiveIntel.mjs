import {
  resolveExecutiveClassification,
  resolveClassificationSecondaryDriver,
  resolveEffectiveNarrativeCategory,
  executiveRiskBandFromScore,
  EXECUTIVE_INTEL_DISCLAIMER,
} from './executiveIntelligenceEngine.mjs'
import { isTokenContractResolved } from '../intelligence/tokenResolutionCopy.mjs'
import { hasScannerBackedEvidence } from '../intelligence/partialCoverageMessaging.mjs'
import {
  allowsExecutiveRisk,
  hasRegistryMatch,
  hasVerifiedMetadata,
  resolveAssetIntelligenceState,
} from '../intelligence/assetIntelligenceState.mjs'
import {
  getAssetDisplayName,
  getAssetShortSymbol,
  getReportCanonicalAsset,
} from '../intelligence/assetDisplayLabel.mjs'
import {
  buildCategoryExecutiveRisks,
  buildCategoryExecutiveStrengths,
  resolveExecutiveSummaryCategoryContext,
} from './executiveSummaryStrengths.mjs'

export const ASSESSMENT_STAGES = {
  PRELIMINARY: 'PRELIMINARY',
  SCANNER_VALIDATED: 'SCANNER VALIDATED',
  FULLY_VALIDATED: 'FULLY VALIDATED',
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {object} [report]
 * @param {object} [scannerReport]
 * @param {object} [providerFlags]
 */
export function resolveAssessmentStage(report, scannerReport = null, providerFlags = {}) {
  const scanned = hasScannerBackedEvidence(report, scannerReport)
  const liveProviders =
    providerFlags.lunarLive &&
    (providerFlags.behaviorCoverage === 'full' || providerFlags.behaviorCoverage === 'partial')
  if (scanned && liveProviders) return ASSESSMENT_STAGES.FULLY_VALIDATED
  if (scanned) return ASSESSMENT_STAGES.SCANNER_VALIDATED
  return ASSESSMENT_STAGES.PRELIMINARY
}

/**
 * @param {string | null | undefined} narrativeCategory
 */
export function resolvePreliminaryRiskScore(narrativeCategory) {
  switch (narrativeCategory) {
    case 'stablecoin':
      return 28
    case 'oracle':
    case 'l2':
      return 32
    case 'defi':
      return 36
    case 'ai':
      return 42
    case 'meme':
      return 58
    default:
      return 40
  }
}

/**
 * @param {object} params
 */
export function resolveIntelligenceConfidenceBand({
  assessmentStage,
  narrativeCategory,
  tokenResolved = false,
  lunarLive = false,
  behaviorCoverage = 'pending',
  hasScan = false,
} = {}) {
  if (assessmentStage === ASSESSMENT_STAGES.FULLY_VALIDATED) {
    return { score: 93, interpretation: 'Scanner + live provider evidence' }
  }
  if (assessmentStage === ASSESSMENT_STAGES.SCANNER_VALIDATED || hasScan) {
    return { score: 87, interpretation: 'Scanner-backed evidence' }
  }
  if (tokenResolved && narrativeCategory && narrativeCategory !== 'unknown') {
    return { score: 68, interpretation: 'Category intelligence + registry validation' }
  }
  if (narrativeCategory && narrativeCategory !== 'unknown') {
    const base = lunarLive ? 62 : 58
    return {
      score: base,
      interpretation: lunarLive
        ? 'Category intelligence with live narrative feed'
        : 'Category intelligence + registry validation',
    }
  }
  if (lunarLive) {
    return { score: 52, interpretation: 'Narrative intelligence model active' }
  }
  return { score: 48, interpretation: 'Limited category context — scanner validation recommended' }
}

function buildPreliminaryKeyFindings(narrativeCategory, symbol, tokenResolved) {
  const sym = String(symbol || '').trim().toUpperCase()
  const findings = []

  if (narrativeCategory === 'stablecoin') {
    findings.push('Established stablecoin profile in indexed registry')
    findings.push('Issuer and reserve transparency are primary diligence surfaces')
  } else if (narrativeCategory === 'oracle') {
    findings.push('Established oracle network with deep protocol adoption')
    findings.push('Long deployment history in indexed registry')
  } else if (narrativeCategory === 'l2') {
    findings.push('Blockchain infrastructure asset with ecosystem adoption profile')
  } else if (narrativeCategory === 'defi') {
    findings.push('DeFi protocol token with governance and liquidity surfaces')
  } else if (narrativeCategory === 'ai') {
    findings.push('AI / compute narrative asset — verify utility claims against on-chain evidence')
  } else if (narrativeCategory === 'meme') {
    findings.push('Meme / narrative-driven asset — volatility exceeds typical blue-chip profiles')
  } else if (sym) {
    findings.push(`${sym} identified — category intelligence active`)
  }

  if (tokenResolved) {
    findings.push('Contract address resolved from registry — scanner validation pending')
  } else {
    findings.push('Scanner validation pending for contract-backed proof')
  }

  findings.push('Registry and category intelligence active')
  return findings.slice(0, 6)
}

function buildPreliminaryStrengths(narrativeCategory, classification, symbol = null) {
  const strengths = buildCategoryExecutiveStrengths(narrativeCategory, { classification, symbol })
  if (strengths.length) return strengths.slice(0, 4)
  return ['Category intelligence model active'].slice(0, 4)
}

function preliminaryScenarioTitle(narrativeCategory, symbol) {
  switch (narrativeCategory) {
    case 'oracle':
      return 'Infrastructure / Oracle Network Narrative'
    case 'stablecoin':
      return 'Stablecoin Stability Monitoring'
    case 'defi':
      return 'DeFi Governance and Protocol Activity'
    case 'meme':
      return 'Meme / Narrative Monitoring'
    case 'l2':
      return 'L2 / Ecosystem Activity Narrative'
    case 'ai':
      return 'AI / Compute Narrative Monitoring'
    default:
      return symbol ? `${String(symbol).toUpperCase()} category intelligence` : 'Category intelligence'
  }
}

function buildPreliminaryRisks(hasScan, narrativeCategory = 'unknown') {
  return buildCategoryExecutiveRisks(narrativeCategory, { hasScan })
}

/**
 * @param {object} report
 * @param {object} [options]
 */
export function canBuildPreliminaryExecutiveIntel(report) {
  if (!report) return false
  if (report.modeId !== 'token' && report.modeId !== 'contract') return false
  if (hasScannerBackedEvidence(report, report?.scannerReport)) return false

  const intelState = resolveAssetIntelligenceState({
    report,
    scannerReport: report?.scannerReport,
  })
  if (!allowsExecutiveRisk(intelState)) return false
  if (!hasRegistryMatch(report) && !hasVerifiedMetadata(report, report?.scannerReport)) {
    return false
  }

  const canonical = getReportCanonicalAsset(report)
  const symbol =
    canonical?.symbol ||
    report.targetClassification?.symbol ||
    report.tokenResolution?.symbol ||
    report.displayTarget ||
    report.query
  const narrativeCategory =
    report.narrativeCategory ||
    resolveEffectiveNarrativeCategory({
      symbol,
      tokenName:
        canonical?.name ||
        report.targetClassification?.name ||
        report.tokenResolution?.name,
      query: report.query,
      address:
        canonical?.address ||
        report.tokenResolution?.address ||
        report.targetClassification?.address,
    })

  const tokenResolved = isTokenContractResolved(report)
  return Boolean(
    hasRegistryMatch(report) ||
      hasVerifiedMetadata(report, report?.scannerReport) ||
      ((narrativeCategory && narrativeCategory !== 'unknown') && tokenResolved),
  )
}

/**
 * @param {object} report
 * @param {object} [options]
 */
export function buildPreliminaryExecutiveIntel(
  report,
  { primeTrends = null, watchlist = null, birdeyeAssets = [] } = {},
) {
  if (!report) return null

  const canonical = getReportCanonicalAsset(report)
  const symbol =
    canonical?.symbol ||
    report.targetClassification?.symbol ||
    report.tokenResolution?.symbol ||
    report.displayTarget ||
    report.query
  const tokenName =
    canonical?.name ||
    report.targetClassification?.name ||
    report.tokenResolution?.name
  const narrativeCategory =
    report.narrativeCategory ||
    resolveEffectiveNarrativeCategory({
      narrativeCategory: report.narrativeCategory,
      symbol,
      tokenName,
      query: report.query,
      address: report.tokenResolution?.address || report.targetClassification?.address,
    })

  const tokenResolved = isTokenContractResolved(report)
  const lunarLive = Boolean(
    primeTrends?.status === 'live' ||
      primeTrends?.providerStatus === 'live' ||
      primeTrends?.live === true,
  )
  const preliminaryRisk = resolvePreliminaryRiskScore(narrativeCategory)
  const riskBand = executiveRiskBandFromScore(preliminaryRisk)

  const ctx = {
    modeId: report.modeId,
    executiveRiskScore: preliminaryRisk,
    narrativeCategory,
    narrativeElevated: report.narrativeElevated,
    composite: report.composite,
    scannerReport: null,
    symbol,
    tokenName,
    query: report.query,
    report,
    canonicalAsset: canonical,
  }

  const classification = resolveExecutiveClassification(ctx)
  const classificationSecondaryDriver = resolveClassificationSecondaryDriver(ctx)
  const assessmentStage = ASSESSMENT_STAGES.PRELIMINARY
  const confidence = resolveIntelligenceConfidenceBand({
    assessmentStage,
    narrativeCategory,
    tokenResolved,
    lunarLive,
    behaviorCoverage: watchlist?.status === 'live' ? 'partial' : 'pending',
  })

  const assetLabel = getAssetDisplayName(canonical, report.query)

  return {
    assetLabel,
    classification,
    classificationSecondaryDriver,
    executiveRiskScore: preliminaryRisk,
    executiveRiskBand: riskBand.label,
    executiveRiskBandId: riskBand.band,
    confidenceScore: confidence.score,
    confidenceInterpretation: confidence.interpretation,
    assessmentStage,
    assessmentStatus: 'Awaiting scanner validation',
    compositeInterpretation: null,
    keyFindings: buildPreliminaryKeyFindings(narrativeCategory, symbol, tokenResolved),
    executiveConclusion: `${assetLabel} preliminary profile indicates ${classification.toLowerCase()} characteristics. Scanner validation will refine confidence and contract-backed evidence.`,
    recommendedNextInvestigation: [
      'Run Intelligence Scan for scanner-backed contract, liquidity, and trust analysis',
      'Review Contract Trust evidence after scan completes',
    ],
    disclaimer: EXECUTIVE_INTEL_DISCLAIMER,
    pending: false,
    preliminary: true,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Preliminary executive summary before scanner.
 * @param {object} params
 */
export function buildPreliminaryExecutiveSummary({ report = null, executive = null } = {}) {
  if (!report || !executive) return null

  const categoryCtx = resolveExecutiveSummaryCategoryContext(report, executive)
  const narrativeCategory = categoryCtx.narrativeCategory
  const riskLabel = executive.executiveRiskBand?.replace(/\s+RISK$/i, '') || 'MODERATE'

  return {
    assetLabel: executive.assetLabel || getAssetDisplayName(getReportCanonicalAsset(report), report.query),
    riskScore: executive.executiveRiskScore,
    overallRisk: String(riskLabel).toUpperCase(),
    overallRiskBand: executive.executiveRiskBandId || 'moderate',
    classification: executive.classification,
    assessmentStage: executive.assessmentStage || ASSESSMENT_STAGES.PRELIMINARY,
    assessmentStatus: executive.assessmentStatus || 'Awaiting scanner validation',
    primaryStrengths: buildPreliminaryStrengths(
      narrativeCategory,
      executive.classification,
      categoryCtx.symbol,
    ),
    primaryRisks: buildPreliminaryRisks(false, narrativeCategory),
    recommendedAction: 'Run scanner-backed intelligence review.',
    scenarioContext: preliminaryScenarioTitle(
      narrativeCategory,
      getAssetShortSymbol(getReportCanonicalAsset(report), report.query) || report.query,
    ),
    pending: false,
    preliminary: true,
  }
}
