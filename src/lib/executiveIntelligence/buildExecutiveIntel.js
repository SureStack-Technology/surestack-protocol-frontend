import {
  computeExecutiveIntelligence,
  calibrateExecutiveRiskScore,
  resolveExecutiveClassification,
  resolveClassificationSecondaryDriver,
  resolveEffectiveNarrativeCategory,
} from '@/lib/executiveIntelligence/executiveIntelligenceEngine.mjs'
import { buildLiquidityIntelFromScanner } from '@/lib/liquidityIntelligence/buildLiquidityIntelFromScanner.js'
import { assessBehaviorCoverage } from '@/utils/behaviorIntelligenceStatus.js'
import { isPrimeLunarCrushLive } from '@/data/lunarCrushScenarioShowcase.js'

/**
 * Synthesize executive intelligence from Prime terminal scan context.
 * @param {object} params
 */
/** @param {object} [report] @param {object} [scannerReport] */
export function hasScannerEvidence(report, scannerReport = null) {
  const sr = scannerReport || report?.scannerReport || null
  return Boolean(
    sr?.success === true ||
    sr?.success !== false && sr?.product === 'surestack_solana_risk_scanner' ||
    report?.scannerSignals?.hasScan ||
    sr?.scannerValidation === 'Complete' ||
    sr?.trustScore != null ||
    sr?.compositeTrustScore != null ||
    sr?.technicalTrustScore != null ||
    report?.liquidityIntelligence?.score != null ||
    sr?.liquidityIntelligence?.score != null ||
    sr?.liquidityIntelligence?.intelligenceScore != null,
  )
}

/** @param {object | null | undefined} intel */
export function isExecutiveIntelPending(intel) {
  if (!intel) return true
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
  const evidence = hasScannerEvidence(report, sr)

  if (evidence) {
    const built = buildExecutiveIntelFromScan({
      report: { ...report, scannerReport: sr },
      scannerReport: sr,
      primeTrends,
      watchlist,
      birdeyeAssets,
      walletExposureProfile: walletExposureProfile ?? report?.walletExposureProfile ?? null,
    })
    if (built && !isExecutiveIntelPending(built)) {
      return built
    }

    if (sr?.executiveIntelligence && !isExecutiveIntelPending(sr.executiveIntelligence)) {
      return reconcileExecutiveIntelligence(sr.executiveIntelligence, {
        report,
        scannerReport: sr,
        walletExposureProfile: walletExposureProfile ?? report?.walletExposureProfile ?? null,
      })
    }
  }

  if (report.executiveIntelligence && !isExecutiveIntelPending(report.executiveIntelligence)) {
    return normalizeExecutiveIntel(report.executiveIntelligence)
  }

  return buildPendingExecutiveIntel(report)
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
    assetLabel: formatScanAssetLabel(symbol, tokenName, report.query, report.modeId),
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
  const behaviorCoverage = assessBehaviorCoverage(watchlist, birdeyeAssets)
  const leadAsset = birdeyeAssets?.find((a) => a.status === 'live') || birdeyeAssets?.[0]

  const symbol =
    report.targetClassification?.symbol ||
    report.tokenResolution?.symbol ||
    report.displayTarget ||
    report.query
  const tokenName = report.targetClassification?.name || report.tokenResolution?.name
  const narrativeCategory =
    report.narrativeCategory ||
    resolveEffectiveNarrativeCategory({ symbol, tokenName, query: report.query, scannerReport: sr })

  return normalizeExecutiveIntel(
    computeExecutiveIntelligence({
      modeId: report.modeId,
      query: report.query,
      symbol,
      tokenName,
      assetLabel: formatScanAssetLabel(symbol, tokenName, report.query, report.modeId),
      narrativeCategory,
      narrativeElevated: report.narrativeElevated,
      composite: report.composite,
      scannerReport: sr,
      walletExposureProfile,
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
function reconcileExecutiveIntelligence(intel, { report, scannerReport, walletExposureProfile = null }) {
  if (!intel) return null
  const symbol =
    report.targetClassification?.symbol ||
    report.tokenResolution?.symbol ||
    report.displayTarget ||
    report.query
  const tokenName = report.targetClassification?.name || report.tokenResolution?.name
  const narrativeCategory = resolveEffectiveNarrativeCategory({
    narrativeCategory: report.narrativeCategory,
    symbol,
    tokenName,
    query: report.query,
    scannerReport,
  })
  const executiveRiskScore = Number(intel.executiveRiskScore)
  const ctx = {
    modeId: report.modeId || 'token',
    executiveRiskScore,
    narrativeCategory,
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

/** @param {object | null} intel */
function normalizeExecutiveIntel(intel) {
  if (!intel) return null
  return {
    ...intel,
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

function formatScanAssetLabel(symbol, name, query, modeId) {
  if (modeId === 'wallet') {
    return query && query !== '(workspace baseline)' ? `Wallet · ${query}` : 'Linked wallet profile'
  }
  const sym = symbol ? String(symbol).trim().toUpperCase() : null
  const nm = name ? String(name).trim() : null
  if (nm && sym) {
    if (new RegExp(`\\(${sym}\\)`, 'i').test(nm)) return nm
    if (nm.toUpperCase() === sym) return sym
    return `${nm} (${sym})`
  }
  if (symbol) return String(symbol)
  if (query && query !== '(workspace baseline)') return String(query)
  return 'Intelligence target'
}
