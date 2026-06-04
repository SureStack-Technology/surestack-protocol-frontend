import {
  computeExecutiveIntelligence,
  calibrateExecutiveRiskScore,
  resolveExecutiveClassification,
  resolveClassificationSecondaryDriver,
  resolveEffectiveNarrativeCategory,
} from '@/lib/executiveIntelligence/executiveIntelligenceEngine.mjs'
import { buildLiquidityIntelFromScanner } from '@/lib/liquidityIntelligence/buildLiquidityIntelFromScanner.js'
import { assessBehaviorCoverage, buildBehaviorContextMessage } from '@/utils/behaviorIntelligenceStatus.js'
import { isPrimeLunarCrushLive } from '@/data/lunarCrushScenarioShowcase.js'
import {
  buildPreliminaryExecutiveIntel,
  canBuildPreliminaryExecutiveIntel,
  resolveAssessmentStage,
  ASSESSMENT_STAGES,
} from '@/lib/executiveIntelligence/preliminaryExecutiveIntel.mjs'
import { buildUnverifiedAssetExecutiveIntel } from '@/lib/executiveIntelligence/buildUnverifiedAssetIntel.mjs'
import {
  allowsExecutiveRisk,
  hasVerifiedMetadata,
  hasScannerValidation,
  resolveAssetIntelligenceState,
} from '@/lib/intelligence/assetIntelligenceState.mjs'
import { getAssetDisplayName } from '@/lib/intelligence/assetDisplayLabel.mjs'

/**
 * Synthesize executive intelligence from Prime terminal scan context.
 * @param {object} params
 */
/** @param {object} [report] @param {object} [scannerReport] */
export function hasScannerEvidence(report, scannerReport = null) {
  return hasScannerValidation(report, scannerReport)
}

/** @param {object | null | undefined} intel */
export function isExecutiveIntelPending(intel) {
  if (!intel) return true
  if (intel.preliminary || intel.assessmentStage === ASSESSMENT_STAGES.PRELIMINARY) return false
  return Boolean(
    intel.pending ||
    intel.classification === 'Assessment pending' ||
    intel.executiveRiskBandId === 'pending' ||
    intel.confidenceInterpretation === 'Pending scanner evidence' ||
    intel.executiveConclusion === 'Pending scanner evidence',
  )
}

/**
 * Prefer scanner-backed executive synthesis over stale pending placeholders.
 * @param {object} params
 */
export function resolveExecutiveIntelligence({
  report,
  scannerReport = null,
  primeTrends = null,
  watchlist = null,
  birdeyeAssets = [],
  walletExposureProfile = null,
}) {
  if (!report) return null

  const sr = scannerReport || report?.scannerReport || null
  const assetState = resolveAssetIntelligenceState({
    report,
    scannerReport: sr,
    primeTrends,
    watchlist,
  })

  if (
    (report.modeId === 'token' || report.modeId === 'contract') &&
    !allowsExecutiveRisk(assetState)
  ) {
    return buildUnverifiedAssetExecutiveIntel(report, { state: assetState })
  }

  const evidence = hasScannerEvidence(report, sr)

  if (evidence) {
    if (
      (report.modeId === 'token' || report.modeId === 'contract') &&
      !hasVerifiedMetadata(report, sr)
    ) {
      return buildUnverifiedAssetExecutiveIntel(report, { state: assetState })
    }

    const built = buildExecutiveIntelFromScan({
      report: { ...report, scannerReport: sr, assetIntelligenceState: assetState },
      scannerReport: sr,
      primeTrends,
      watchlist,
      birdeyeAssets,
      walletExposureProfile: walletExposureProfile ?? report?.walletExposureProfile ?? null,
    })
    if (built && !isExecutiveIntelPending(built)) {
      return { ...built, assetIntelligenceState: assetState }
    }

    if (sr?.executiveIntelligence && !isExecutiveIntelPending(sr.executiveIntelligence)) {
      return reconcileExecutiveIntelligence(sr.executiveIntelligence, {
        report,
        scannerReport: sr,
        walletExposureProfile: walletExposureProfile ?? report?.walletExposureProfile ?? null,
        assetIntelligenceState: assetState,
      })
    }
  }

  if (report.executiveIntelligence && !isExecutiveIntelPending(report.executiveIntelligence)) {
    return normalizeExecutiveIntel(report.executiveIntelligence)
  }

  if (canBuildPreliminaryExecutiveIntel(report)) {
    return {
      ...buildPreliminaryExecutiveIntel(report, { primeTrends, watchlist, birdeyeAssets }),
      assetIntelligenceState: assetState,
    }
  }

  return buildUnverifiedAssetExecutiveIntel(report, { state: assetState })
}

/** Pre-scan / partial-coverage executive placeholder. */
export function buildPendingExecutiveIntel(report) {
  if (!report) return null
  const symbol =
    report.targetClassification?.symbol ||
    report.tokenResolution?.symbol ||
    report.displayTarget ||
    report.query
  const tokenName = report.targetClassification?.name || report.tokenResolution?.name
  return {
    assetLabel: formatScanAssetLabel(
      symbol,
      tokenName,
      report.query,
      report.modeId,
      report.canonicalAsset || report.targetClassification?.canonicalAsset,
    ),
    classification: 'Assessment pending',
    executiveRiskScore: '—',
    executiveRiskBand: 'PENDING',
    executiveRiskBandId: 'pending',
    confidenceScore: 0,
    confidenceInterpretation: 'Pending scanner evidence',
    compositeInterpretation: null,
    keyFindings: [
      report.isSolanaToken
        ? 'Solana mint resolved — scanner-backed liquidity, holder, and authority evidence pending.'
        : 'Contract or mint scan required before executive risk synthesis.',
    ],
    executiveConclusion: 'Pending scanner evidence',
    recommendedNextInvestigation: report.isSolanaToken
      ? ['Run Solana Token Scan for scanner-backed mint, liquidity, holder, and routing evidence.']
      : ['Run Contract Analyzer or Intelligence Scan for scanner-backed proof.'],
    disclaimer:
      'Executive Intelligence will populate after a successful scanner pass. Narrative intelligence model may still be visible.',
    pending: true,
    generatedAt: new Date().toISOString(),
  }
}

export function buildExecutiveIntelFromScan({
  report,
  scannerReport = null,
  primeTrends = null,
  watchlist = null,
  birdeyeAssets = [],
  walletExposureProfile = null,
}) {
  if (!report) return null

  const sr = scannerReport || report?.scannerReport || null
  if (
    (report.modeId === 'token' || report.modeId === 'contract' || report.modeId === 'protocol') &&
    !hasScannerEvidence(report, sr)
  ) {
    return buildPendingExecutiveIntel(report)
  }

  const liquidityIntel =
    buildLiquidityIntelFromScanner(scannerReport) ||
    report?.liquidityIntelligence ||
    sr?.liquidityIntelligence ||
    null
  const behaviorCoverage = assessBehaviorCoverage(
    watchlist,
    birdeyeAssets,
    report?.chainId || report?.chain || 'ethereum',
  )
  const leadAsset = birdeyeAssets?.find((a) => a.status === 'live') || birdeyeAssets?.[0]

  const canonicalAsset = report.canonicalAsset || report.targetClassification?.canonicalAsset || null
  const symbol =
    canonicalAsset?.symbol ||
    report.targetClassification?.symbol ||
    report.tokenResolution?.symbol ||
    report.displayTarget ||
    report.query
  const tokenName =
    canonicalAsset?.name ||
    report.targetClassification?.name ||
    report.tokenResolution?.name
  const narrativeCategory =
    canonicalAsset?.narrativeCategory ||
    report.narrativeCategory ||
    resolveEffectiveNarrativeCategory({
      symbol,
      tokenName,
      query: report.query,
      address: canonicalAsset?.address,
      scannerReport: sr,
    })

  return normalizeExecutiveIntel(
    computeExecutiveIntelligence({
      modeId: report.modeId,
      query: report.query,
      symbol,
      tokenName,
      canonicalAsset,
      assetLabel: formatScanAssetLabel(
      symbol,
      tokenName,
      report.query,
      report.modeId,
      report.canonicalAsset || report.targetClassification?.canonicalAsset,
    ),
      narrativeCategory,
      narrativeElevated: report.narrativeElevated,
      composite: report.composite,
      scannerReport: sr,
      walletExposureProfile: report.modeId === 'wallet' ? walletExposureProfile : null,
      liquidityIntel,
      executiveRiskScore: deriveExecutiveRiskScore(report, sr),
      behaviorInputs: {
        holderConcentrationElevated: /high|concentrated|elevated/i.test(
          String(leadAsset?.holderConcentration || sr?.tokenConcentration?.holderConcentration || ''),
        ),
      },
      providerFlags: {
        hasScan: hasScannerEvidence(report, sr),
        lunarLive: isPrimeLunarCrushLive(primeTrends),
        narrativeFallback: !isPrimeLunarCrushLive(primeTrends),
        behaviorCoverage: behaviorCoverage.mode,
        walletLinked: Boolean(report.walletSnapshot?.hasWallet),
      },
    }),
    {
      report,
      scannerReport: sr,
      primeTrends,
      watchlist,
      birdeyeAssets,
      behaviorCoverage,
    },
  )
}

function deriveExecutiveRiskScore(report, scannerReport) {
  if (report?.composite?.score != null) {
    return calibrateExecutiveRiskScore(Number(report.composite.score), {
      scannerReport,
      composite: report.composite,
      narrativeCategory:
        report.narrativeCategory ||
        resolveEffectiveNarrativeCategory({
          narrativeCategory: report.narrativeCategory,
          symbol: report.displayTarget || report.query,
          query: report.query,
          scannerReport,
        }),
      narrativeElevated: report.narrativeElevated,
      liquidityIntel: report.liquidityIntelligence ?? scannerReport?.liquidityIntelligence,
    })
  }
  const trust =
    scannerReport?.compositeTrustScore ??
    scannerReport?.trustScore ??
    scannerReport?.technicalTrustScore
  const inverted = trust != null ? Math.max(0, Math.min(100, Math.round(100 - Number(trust)))) : null
  return calibrateExecutiveRiskScore(inverted ?? 48, {
    scannerReport,
    composite: report?.composite,
    narrativeCategory:
      report?.narrativeCategory ||
      resolveEffectiveNarrativeCategory({
        narrativeCategory: report?.narrativeCategory,
        symbol: report?.displayTarget || report?.query,
        query: report?.query,
        scannerReport,
      }),
    narrativeElevated: report?.narrativeElevated,
    liquidityIntel: report?.liquidityIntelligence ?? scannerReport?.liquidityIntelligence,
  })
}

/** Reconcile backend executive intel when meme classification was missed server-side. */
function reconcileExecutiveIntelligence(
  intel,
  { report, scannerReport, walletExposureProfile = null, assetIntelligenceState = null },
) {
  if (!intel) return null
  if (assetIntelligenceState && !allowsExecutiveRisk(assetIntelligenceState)) {
    return buildUnverifiedAssetExecutiveIntel(report, { state: assetIntelligenceState })
  }
  const canonicalAsset = report.canonicalAsset || report.targetClassification?.canonicalAsset || null
  const symbol =
    canonicalAsset?.symbol ||
    report.targetClassification?.symbol ||
    report.tokenResolution?.symbol ||
    report.displayTarget ||
    report.query
  const tokenName =
    canonicalAsset?.name ||
    report.targetClassification?.name ||
    report.tokenResolution?.name
  const narrativeCategory = resolveEffectiveNarrativeCategory({
    narrativeCategory: canonicalAsset?.narrativeCategory || report.narrativeCategory,
    symbol,
    tokenName,
    query: report.query,
    address: canonicalAsset?.address,
    scannerReport,
  })
  const executiveRiskScore = Number(intel.executiveRiskScore)
  const ctx = {
    modeId: report.modeId || 'token',
    executiveRiskScore,
    narrativeCategory,
    canonicalAsset,
    narrativeElevated: report.narrativeElevated,
    composite: report.composite,
    scannerReport,
    walletExposureProfile,
    liquidityIntel:
      report.liquidityIntelligence ??
      scannerReport?.liquidityIntelligence ??
      null,
    symbol,
    tokenName,
    query: report.query,
  }
  const classification = resolveExecutiveClassification(ctx)
  const classificationSecondaryDriver = resolveClassificationSecondaryDriver(ctx)
  return normalizeExecutiveIntel({
    ...intel,
    classification,
    classificationSecondaryDriver,
  })
}

/** @param {object | null} intel @param {object} [meta] */
function normalizeExecutiveIntel(intel, meta = {}) {
  if (!intel) return null
  const providerFlags = {
    hasScan: hasScannerEvidence(meta.report, meta.scannerReport),
    lunarLive: isPrimeLunarCrushLive(meta.primeTrends),
    behaviorCoverage: meta.behaviorCoverage?.mode,
  }
  const stage =
    intel.assessmentStage ||
    resolveAssessmentStage(meta.report, meta.scannerReport, providerFlags)
  const assessmentStatus =
    stage === ASSESSMENT_STAGES.FULLY_VALIDATED
      ? 'Fully validated'
      : stage === ASSESSMENT_STAGES.SCANNER_VALIDATED
        ? 'Scanner validated'
        : intel.assessmentStatus || 'Awaiting scanner validation'

  return {
    ...intel,
    assessmentStage: stage,
    assessmentStatus,
    keyFindings: normalizeExecutiveList(intel.keyFindings),
    recommendedNextInvestigation: normalizeExecutiveList(intel.recommendedNextInvestigation),
  }
}

/** @param {unknown} value */
export function normalizeExecutiveList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') return value ? [value] : []
  if (value && typeof value === 'object') {
    if (Array.isArray(value.items)) return value.items.filter(Boolean)
    if (Array.isArray(value.recommendations)) return value.recommendations.filter(Boolean)
    if (typeof value.label === 'string') return [value.label]
    if (typeof value.title === 'string') return [value.title]
  }
  return []
}

function formatScanAssetLabel(symbol, name, query, modeId, canonicalAsset = null) {
  if (modeId === 'wallet') {
    return query && query !== '(workspace baseline)' ? `Wallet · ${query}` : 'Linked wallet profile'
  }
  return getAssetDisplayName(
    canonicalAsset || (symbol ? { symbol, name, resolved: true } : null),
    query,
  )
}
