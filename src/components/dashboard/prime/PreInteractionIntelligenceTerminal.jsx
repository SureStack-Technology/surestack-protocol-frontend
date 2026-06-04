import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveLayerLaunch } from '@/components/dashboard/prime/primeIntelligenceLayerActions.mjs'
import { motion } from 'framer-motion'
import { ArrowRight, Radar, Search, Shield } from 'lucide-react'
import { isPrimeLunarCrushLive } from '@/data/lunarCrushScenarioShowcase.js'
import { assessBehaviorCoverage } from '@/utils/behaviorIntelligenceStatus.js'
import { buildPrimeWalletSnapshot } from '@/components/dashboard/prime/primeWalletRiskSnapshot.js'
import PrimeEvidenceLayers from '@/components/dashboard/prime/PrimeEvidenceLayers.jsx'
import PrimeContractAnalyzerPanel from '@/components/dashboard/prime/PrimeContractAnalyzerPanel.jsx'
import PrimeSolanaTokenPanel from '@/components/dashboard/prime/PrimeSolanaTokenPanel.jsx'
import ExecutiveIntelligenceCard from '@/components/dashboard/prime/ExecutiveIntelligenceCard.jsx'
import ExecutiveSummaryCard from '@/components/dashboard/prime/ExecutiveSummaryCard.jsx'
import LiquidityIntelligenceCard from '@/components/dashboard/prime/LiquidityIntelligenceCard.jsx'
import WalletExposureIntelligenceCard from '@/components/dashboard/prime/WalletExposureIntelligenceCard.jsx'
import PrimeIntelligenceLayersGrid from '@/components/dashboard/prime/PrimeIntelligenceLayersGrid.jsx'
import {
  buildExecutiveIntelFromScan,
  buildPendingExecutiveIntel,
  resolveExecutiveIntelligence,
  hasScannerEvidence,
} from '@/lib/executiveIntelligence/buildExecutiveIntel.js'
import { buildExecutiveSummary } from '@/lib/executiveIntelligence/buildExecutiveSummary.mjs'
import { buildIntelligenceCoverageSources } from '@/lib/executiveIntelligence/buildIntelligenceCoverage.mjs'
import { buildInstitutionalAnalystAssessment } from '@/lib/executiveIntelligence/buildInstitutionalAnalystAssessment.mjs'
import { buildRiskExplainability } from '@/lib/executiveIntelligence/buildRiskExplainability.mjs'
import { resolveHeroIntelligenceMetrics } from '@/lib/executiveIntelligence/resolveHeroIntelligenceMetrics.mjs'
import { resolveScanStatusBanner } from '@/lib/intelligence/partialCoverageMessaging.mjs'
import {
  buildTokenResolutionBanner,
  buildTokenResolvedVerdictLead,
  isTokenContractResolved,
  applyTokenResolutionBanner,
  PROVIDER_COVERAGE_PRELIMINARY_NOTE,
  UNRESOLVED_ASSET_COPY,
  UNRESOLVED_ASSET_TITLE,
} from '@/lib/intelligence/tokenResolutionCopy.mjs'
import { isTokenIdentified } from '@/lib/intelligence/tokenResolutionState.mjs'
import {
  allowsExecutiveRisk,
  allowsNarrativeAssessment,
  resolveAssetIntelligenceState,
} from '@/lib/intelligence/assetIntelligenceState.mjs'
import { buildBehaviorContextMessage } from '@/utils/behaviorIntelligenceStatus.js'
import { usePrimeIntelligenceHero } from '@/contexts/PrimeIntelligenceHeroContext.jsx'
import { hasScannerBackedProof, scannerProofBannerTitle } from '@/utils/scannerProofStatus.mjs'
import {
  computeCompositeRisk,
  compositeScoreToRiskLevel,
} from '@/components/dashboard/prime/compositeRiskEngine.js'
import { buildInstitutionalTokenVerdict } from '@/components/dashboard/prime/primeInstitutionalVerdict.js'
import {
  buildRecommendation,
  deriveOverallRisk,
  deriveScannerSignals,
  deriveTokenExecutiveRisk,
  formatTokenExecutiveDisplay,
  isNarrativeElevated,
  resolveNarrativeRiskLevel,
  resolveScannerValidationLabel,
  resolveTerminalConfidence,
  resolveVerdictPresentation,
} from '@/components/dashboard/prime/primeVerdictEngine.js'
import {
  buildCategoryNarrativeFallback,
  getTokenNarrativeCategory,
  resolveTokenNarrativeCategory,
} from '@/shared/services/tokenNarrativeFallback.js'
import {
  formatCandidateLiquidity,
  hasTokenContractProof,
  isTokenAutoResolved,
  resolveTokenSymbol,
} from '@/shared/services/tokenSymbolResolver.js'
import {
  computePrimeScannerScope,
  normalizeEthAddress,
} from '@/components/dashboard/prime/primeScannerScope.js'
import { resolveProtocolUrl } from '@/shared/services/protocolUrlResolver.js'
import {
  formatTokenDisplayLabel,
  narrativeSummarySentence,
} from '@/components/dashboard/prime/primeTokenDisplay.js'
import {
  classifyIntelligenceTarget,
  classifyTargetSync,
  recommendedModuleToModeId,
} from '@/services/intelligenceTargetClassifier.js'
import {
  classificationFromCanonical,
  enrichReportWithCanonical,
  resolveCanonicalAssetSync,
  tokenResolutionFromCanonical,
} from '@/lib/intelligence/canonicalAssetResolver.mjs'
import {
  getAssetDisplayName,
  getAssetShortSymbol,
  getReportCanonicalAsset,
  resolveNarrativeTargetSymbol,
  resolveReportDisplayLabels,
} from '@/lib/intelligence/assetDisplayLabel.mjs'
import { SOLANA_CHAIN_ID } from '@/hooks/useUniversalRiskScanner.js'
import {
  hasSolanaMintResolved,
  isSolanaTokenTarget,
  resolveSolanaMintAddress,
  resolveSolanaScanContext,
  solanaScannerReportActive,
} from '@/utils/solanaTokenTarget.js'
import {
  enrichSolanaScannerBackedReport,
  isSolanaScannerBacked,
} from '@/utils/solanaScannerBackedVerdict.mjs'

const COMPLIANCE =
  'SureStack provides educational digital asset risk intelligence only. It does not provide financial advice, trading recommendations, custody, brokerage, insurance, or transaction execution.'

const CHAINS = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'solana', label: 'Solana' },
  { id: 'base', label: 'Base' },
  { id: 'arbitrum', label: 'Arbitrum' },
  { id: 'polygon', label: 'Polygon' },
]

const MODE_CHIPS = [
  { id: 'token', label: 'Token Intelligence' },
  { id: 'contract', label: 'Contract Trust' },
  { id: 'approval', label: 'Approval Risk' },
  { id: 'wallet', label: 'Wallet Exposure' },
  { id: 'protocol', label: 'Protocol Review' },
]

export const ANALYSIS_MODES = {
  token: {
    id: 'token',
    label: 'TOKEN RISK INTELLIGENCE',
    chipId: 'token',
    tone: 'emerald',
    interactionType: 'Token',
  },
  contract: {
    id: 'contract',
    label: 'CONTRACT TRUST ANALYSIS',
    chipId: 'contract',
    tone: 'violet',
    interactionType: 'Contract',
  },
  approval: {
    id: 'approval',
    label: 'APPROVAL RISK ANALYSIS',
    chipId: 'approval',
    tone: 'amber',
    interactionType: 'Spender',
  },
  wallet: {
    id: 'wallet',
    label: 'WALLET EXPOSURE ANALYSIS',
    chipId: 'wallet',
    tone: 'indigo',
    interactionType: 'Wallet',
  },
  protocol: {
    id: 'protocol',
    label: 'PROTOCOL TRUST REVIEW',
    chipId: 'protocol',
    tone: 'cyan',
    interactionType: 'Protocol',
  },
  default: {
    id: 'default',
    label: 'DIGITAL ASSET RISK CHECK',
    chipId: null,
    tone: 'slate',
    interactionType: 'General',
  },
}

const MODE_EVIDENCE_PREVIEW = {
  token: ['Narrative risk', 'Holder/liquidity behavior', 'Contract trust', 'Wallet fit'],
  contract: ['Source verification', 'Proxy/upgradeability', 'Ownership/admin surface', 'Approval risk'],
  approval: ['Spender risk', 'Unlimited allowance caution', 'Wallet exposure', 'Revocation review'],
  wallet: ['Exposure concentration', 'Unknown contracts', 'Approval surface', 'Activity anomalies'],
  protocol: ['Official URL verification', 'Contract surfaces', 'Spender permissions', 'Provider signals'],
  default: ['Wallet fit', 'Contract trust', 'Provider readiness', 'Threat timeline'],
}

const EXAMPLE_CHIPS = [
  { label: 'Sample: PEPE', query: 'PEPE', modeId: 'token' },
  { label: 'Sample contract', query: '0xf280b16ef293d8e534e370794ef26bf312694126', modeId: 'contract' },
  { label: 'Sample spender', query: 'permit2 spender', modeId: 'approval' },
  { label: 'Sample wallet', query: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', modeId: 'wallet' },
  { label: 'Sample: Uniswap', query: 'https://app.uniswap.org', modeId: 'protocol' },
  { label: 'Sample: LINK', query: 'LINK', modeId: 'token' },
]

const EXAMPLE_THREAT = {
  query: 'permit2 spender 0x000000000022D473030F116dDEE9F6B43aC78B917',
  chain: 'ethereum',
}

const SCANNER_MODES = new Set(['contract', 'approval', 'protocol'])

function riskClass(level, isPreliminary) {
  if (isPreliminary) return 'prime-verdict-panel__risk--preliminary'
  if (level === 'Critical') return 'prime-verdict-panel__risk--critical'
  if (level === 'High') return 'prime-verdict-panel__risk--high'
  if (level === 'Moderate') return 'prime-verdict-panel__risk--moderate'
  return 'prime-verdict-panel__risk--low'
}

function panelToneClass(level, isPreliminary) {
  if (isPreliminary) return 'prime-verdict-panel--preliminary'
  const safe = String(level || 'moderate').toLowerCase()
  return `prime-verdict-panel--${safe}`
}

function modeBadgeClass(tone) {
  return `prime-terminal-mode-badge prime-terminal-mode-badge--${tone || 'slate'}`
}

/** Verified wallet used for exact-match wallet detection (not EIP-55 casing). */
export function getConnectedWalletAddress(profile) {
  const verified = profile?.wallets?.find((w) => w.verifiedAt && w.address)
  return verified?.address ? String(verified.address).trim() : null
}

/** Module launch overrides query heuristics until the user edits the target. */
export function resolveActiveMode(
  query,
  forcedModeId,
  connectedWalletAddress = null,
  classification = null,
) {
  const forced = forcedModeId && ANALYSIS_MODES[forcedModeId] ? ANALYSIS_MODES[forcedModeId] : null
  if (forced) return { ...forced }
  const modeId = recommendedModuleToModeId(classification)
  if (modeId && ANALYSIS_MODES[modeId]) return { ...ANALYSIS_MODES[modeId] }
  return detectAnalysisMode(query, connectedWalletAddress)
}

function isValidReport(report) {
  return Boolean(
    report &&
      report.modeId &&
      report.modeLabel &&
      (report.overallRisk || report.overallRiskDisplay) &&
      report.confidence &&
      report.analyst?.summary &&
      Array.isArray(report.evidencePreview) &&
      report.evidencePreview.length > 0 &&
      Array.isArray(report.threats),
  )
}

function buildTokenNarrativeContext(primeTrends, targetSymbol, canonicalAsset = null) {
  const display = formatTokenDisplayLabel(targetSymbol, canonicalAsset)
  const live = isPrimeLunarCrushLive(primeTrends)
  if (live && primeTrends?.summary) {
    return narrativeSummarySentence(primeTrends.summary, 260)
  }
  const fallback = buildCategoryNarrativeFallback(targetSymbol, display)
  return narrativeSummarySentence(fallback.narrativeText, 280)
}

/** Category-aware scenario label for token reports (non-live LunarCrush). */
function buildTokenScenarioTitle(targetSymbol, canonicalAsset = null) {
  const sym =
    getAssetShortSymbol(canonicalAsset, '') ||
    (typeof targetSymbol === 'string' ? targetSymbol : '')
  return buildCategoryNarrativeFallback(sym || targetSymbol).scenarioTitle
}

function buildFallbackScanReport({
  query,
  chain,
  mode,
  canonicalWallet,
  primeTrends,
  errorMessage,
  targetClassification = null,
  tokenResolution = null,
}) {
  const safeMode = mode?.id ? mode : ANALYSIS_MODES.token
  const trimmed = String(query || '').trim()
  const isToken = safeMode.id === 'token'
  const target = trimmed || 'token target'
  const solanaCtx = resolveSolanaScanContext({
    targetClassification,
    tokenResolution,
    query: trimmed,
    chain,
  })
  const isSolana = solanaCtx.isSolana
  const mintResolved = solanaCtx.mintResolved
  const stubReport = {
    modeId: safeMode.id,
    tokenResolution,
    targetClassification,
    isSolanaToken: isSolana,
    solanaMintResolved: mintResolved,
    solanaMintAddress: solanaCtx.mint,
  }
  const tokenIdentified = isToken && isTokenIdentified(stubReport)
  const resolvedBanner = isToken
    ? buildTokenResolutionBanner({
        report: stubReport,
        hasScan: false,
        isSolana,
        solanaMintResolved: mintResolved,
      })
    : null

  return {
    query: trimmed || target,
    target,
    displayTarget: isToken
      ? getAssetDisplayName(
          tokenResolution?.canonicalAsset ||
            targetClassification?.canonicalAsset ||
            resolveCanonicalAssetSync(trimmed),
          trimmed,
        )
      : trimmed,
    chain: isSolana ? 'Solana' : CHAINS.find((c) => c.id === chain)?.label || chain || 'Ethereum',
    chainId: isSolana ? 'solana' : chain || 'ethereum',
    modeId: safeMode.id,
    modeLabel: safeMode.label,
    modeTone: safeMode.tone,
    interactionType: safeMode.interactionType,
    isSolanaToken: isSolana,
    solanaMintResolved: mintResolved,
    solanaMintAddress: solanaCtx.mint,
    analysisModeId: isSolana ? 'solana_token' : safeMode.id,
    targetClassification: targetClassification || null,
    tokenResolution: tokenResolution || null,
    overallRisk: 'Moderate',
    overallRiskDisplay: 'Moderate',
    confidence: isToken ? (tokenIdentified ? 'Category intelligence' : 'Preliminary') : 'Preliminary',
    scannerValidation: isToken ? (tokenIdentified ? 'Registry validated' : 'Pending') : 'Pending',
    isPreliminary: Boolean(tokenIdentified),
    isFallback: !tokenIdentified,
    partialProviderCoverage: !tokenIdentified,
    fallbackMessage: tokenIdentified
      ? PROVIDER_COVERAGE_PRELIMINARY_NOTE
      : isToken
        ? errorMessage || UNRESOLVED_ASSET_COPY
        : errorMessage ||
          'Intelligence synthesis could not complete with current provider coverage. Retry the scan or open Contract Analyzer.',
    modeVerdict: modeVerdictLead(safeMode.id, {
      tokenResolution,
      tokenContractConfirmed: tokenIdentified && !isSolana,
      tokenIdentified,
      isSolanaToken: isSolana,
      scannerSignals: {},
    }),
    evidencePreview: MODE_EVIDENCE_PREVIEW[safeMode.id] || MODE_EVIDENCE_PREVIEW.default,
    lunarLive: isPrimeLunarCrushLive(primeTrends),
    birdeyeLive: false,
    providersPending: true,
    narrativeContext: isToken
      ? buildTokenNarrativeContext(
          primeTrends,
          trimmed,
          tokenResolution?.canonicalAsset ||
            targetClassification?.canonicalAsset ||
            resolveCanonicalAssetSync(trimmed),
        )
      : null,
    behaviorContext: isToken
      ? buildBehaviorContextMessage({ chain: isSolana ? 'solana' : chain, hasScan: false })
      : null,
    scenarioTitle: isToken
      ? buildTokenScenarioTitle(
          trimmed,
          tokenResolution?.canonicalAsset ||
            targetClassification?.canonicalAsset ||
            resolveCanonicalAssetSync(trimmed),
        )
      : null,
    scannerSignals: {},
    scannerMostlyClean: false,
    contractsUnderReview: 0,
    approvalsAtRisk: 0,
    walletSnapshot: canonicalWallet || { compact: 'Awaiting snapshot', hasWallet: false },
    recommendation: isToken
      ? 'Proceed with indexed narrative context; cross-check behavior and contract trust before exposure decisions.'
      : 'Retry the intelligence scan or open Contract Analyzer when a contract address is in scope.',
    analyst: {
      summary: isToken
        ? tokenIdentified
          ? `${getAssetDisplayName(getReportCanonicalAsset({ query: trimmed, tokenResolution, targetClassification }), trimmed) || 'Token'} preliminary profile generated from registry and category intelligence.`
          : `${getAssetDisplayName(getReportCanonicalAsset({ query: trimmed, tokenResolution, targetClassification }), trimmed) || 'Token'} could not be identified from the current symbol.`
        : PROVIDER_COVERAGE_PRELIMINARY_NOTE,
      keyConcern: isToken
        ? tokenIdentified
          ? 'Scanner validation pending for contract trust, liquidity, and security evidence.'
          : UNRESOLVED_ASSET_COPY
        : 'Review scanner-backed contract trust evidence; narrative and behavior layers may be partial.',
      nextMove: isToken
        ? tokenIdentified
          ? 'Run Intelligence Scan for scanner-backed contract, liquidity, and trust analysis.'
          : UNRESOLVED_ASSET_COPY
        : 'Review Contract Trust evidence layers and re-run scan when additional providers are available.',
    },
    contractProofNote: resolvedBanner?.copy || null,
    contractProofSubtitle: resolvedBanner?.subtitle || null,
    contractProofChainLine: resolvedBanner?.chainLine || null,
    mintProofTitle: resolvedBanner?.title || null,
    providerCoverageNote: tokenIdentified ? PROVIDER_COVERAGE_PRELIMINARY_NOTE : null,
    threats: tokenIdentified
      ? []
      : [{ label: isToken ? 'Identification pending' : 'Scan pending', level: 'LOW' }],
    actions: [],
  }
}

function mergeScannerSignals(scannerSignals, scannerReport) {
  if (!scannerReport) return scannerSignals || { hasScan: false }
  return {
    hasScan: false,
    mostlyClean: false,
    honeypotDetected: false,
    maliciousScanner: false,
    unlimitedApproval: false,
    severeFindings: false,
    ...(scannerSignals || {}),
    ...deriveScannerSignals(scannerReport),
  }
}

/** @param {object} draft @param {object} scannerReport */
function applySolanaScannerBackedVerdict(draft, scannerReport) {
  if (!isSolanaScannerBacked(draft, scannerReport)) return
  Object.assign(draft, enrichSolanaScannerBackedReport(draft, scannerReport))
}

/**
 * Adaptive analysis mode from search input — uses target classifier (sync); full scan refines via API.
 */
export function detectAnalysisMode(raw, connectedWalletAddress = null) {
  const input = String(raw || '').trim()
  if (!input) return { ...ANALYSIS_MODES.default }
  const modeId = recommendedModuleToModeId(classifyTargetSync(input, connectedWalletAddress))
  if (modeId && ANALYSIS_MODES[modeId]) return { ...ANALYSIS_MODES[modeId] }
  return { ...ANALYSIS_MODES.token }
}


function modeVerdictLead(
  modeId,
  {
    tokenResolution,
    tokenContractConfirmed,
    tokenIdentified = false,
    protocolProfile,
    scannerSignals,
    isSolanaToken = false,
  } = {},
) {
  switch (modeId) {
    case 'contract':
      return scannerSignals?.hasScan
        ? 'Contract trust validated via Contract Intelligence Engine — review Contract Trust Evidence.'
        : 'Contract Trust Analysis — Contract Analyzer is the primary proof path before interaction.'
    case 'token':
      if (isSolanaToken) {
        return scannerSignals?.hasScan
          ? 'Solana mint scanned — liquidity, holder concentration, and authority evidence available.'
          : tokenIdentified || isTokenAutoResolved(tokenResolution)
            ? buildTokenResolvedVerdictLead({ hasScan: false, isSolana: true })
            : UNRESOLVED_ASSET_COPY
      }
      if (tokenContractConfirmed || tokenIdentified || isTokenAutoResolved(tokenResolution)) {
        return buildTokenResolvedVerdictLead({ hasScan: scannerSignals?.hasScan, isSolana: false })
      }
      if (tokenResolution?.confirmationRequired && tokenResolution.candidates?.length) {
        return tokenResolution.ambiguousNative
          ? `${tokenResolution.symbol || 'Token'} may be native or wrapped on multiple chains — confirm the exact contract before scanning.`
          : 'Candidate contract found — confirm the address before Contract Analyzer can provide scanner-backed proof.'
      }
      return UNRESOLVED_ASSET_COPY
    case 'approval':
      return 'Approval-based interaction requires explicit allowance review before signing.'
    case 'wallet':
      return 'Wallet Exposure Analysis — exposure bands, approvals, and risk posture for the target wallet.'
    case 'protocol':
      if (protocolProfile?.matched) {
        return `${protocolProfile.name} — verified domain profile. Scan recommended contract surfaces before signing.`
      }
      return 'Protocol Trust Review — preliminary until official contract surfaces are scanned.'
    default:
      return 'Pre-interaction risk check across token, contract, approval, wallet, and protocol surfaces.'
  }
}


function buildAnalystCopy(report, aiBrief, scannerReport, executive = null) {
  const assessment = buildInstitutionalAnalystAssessment({ report, scannerReport, executive })
  if (!report.scannerSignals?.hasScan && aiBrief?.summary) {
    return { ...assessment, technicalAssessment: aiBrief.summary, summary: aiBrief.summary }
  }
  return assessment
}

function threatPills(report) {
  const pills = []
  if (report.isPreliminary && SCANNER_MODES.has(report.modeId) && !report.scannerSignals?.hasScan) {
    if (report.modeId === 'token' && isTokenContractResolved(report)) {
      return pills.slice(0, 5)
    }
    pills.push({ label: 'Scan pending', level: 'LOW' })
    return pills.slice(0, 5)
  }

  if (report.modeId === 'token') {
    if (report.scannerSignals?.hasScan) {
      if (report.scannerSignals?.honeypotDetected || report.scannerSignals?.maliciousScanner) {
        pills.push({ label: 'Malicious surface', level: 'HIGH' })
      } else if (report.scannerMostlyClean) {
        pills.push({ label: 'Scanner clean', level: 'LOW' })
      } else {
        pills.push({ label: 'Scanner watch', level: 'MEDIUM' })
      }
    }
    if (report.narrativeCategory === 'meme') {
      pills.push({
        label: 'Meme narrative',
        level: report.narrativeRiskLevel === 'High' ? 'HIGH' : 'MEDIUM',
      })
    } else if (report.narrativeCategory && report.narrativeCategory !== 'unknown') {
      pills.push({ label: 'Narrative stable', level: 'LOW' })
    } else if (!report.lunarLive) {
      pills.push({ label: 'Narrative partial', level: 'MEDIUM' })
    }
    if (!report.birdeyeLive) {
      pills.push({
        label: 'Behavior partial',
        level: report.narrativeCategory === 'meme' ? 'MEDIUM' : 'LOW',
      })
    } else {
      pills.push({ label: 'Behavior live', level: 'LOW' })
    }
    if (report.approvalsAtRisk > 0) pills.push({ label: 'Wallet approvals', level: 'HIGH' })
    if (!pills.length) pills.push({ label: 'Baseline watch', level: 'LOW' })
    return pills.slice(0, 5)
  }

  if (report.approvalsAtRisk > 0) pills.push({ label: 'Approvals', level: 'HIGH' })
  if (report.contractsUnderReview > 0) pills.push({ label: 'Contracts', level: 'MEDIUM' })
  if (report.scannerSignals?.honeypotDetected || report.scannerSignals?.maliciousScanner) {
    pills.push({ label: 'Malicious surface', level: 'HIGH' })
  } else if (report.overallRisk === 'Critical') {
    pills.push({ label: 'Critical posture', level: 'HIGH' })
  } else if (report.overallRisk === 'High' && report.scannerSignals?.hasScan) {
    pills.push({ label: 'Elevated scanner', level: 'HIGH' })
  }
  if (report.scannerSignals?.hasScan && report.scannerMostlyClean) {
    pills.push({ label: 'Scanner clean', level: 'LOW' })
  }
  if (!report.lunarLive) pills.push({ label: 'Narrative partial', level: 'LOW' })
  if (!report.birdeyeLive) pills.push({ label: 'Behavior partial', level: 'LOW' })
  if (!pills.length) pills.push({ label: 'Baseline watch', level: 'LOW' })
  return pills.slice(0, 5)
}

function narrativeSubtitle(primeTrends, targetSymbol, canonicalAsset = null) {
  if (isPrimeLunarCrushLive(primeTrends)) return 'LunarCrush live feed active'
  if (primeTrends?.providerStatus === 'subscription_required') return 'Narrative intelligence model active'
  const sym = getAssetShortSymbol(canonicalAsset, '') || targetSymbol
  const cat = getTokenNarrativeCategory(sym, canonicalAsset?.address)
  if (cat === 'meme') return 'Narrative Intelligence Active (live feed upgrade available)'
  if (cat !== 'unknown') return 'Category narrative model active'
  return 'Narrative intelligence model active'
}

function behaviorSubtitle(watchlist, assets = []) {
  return assessBehaviorCoverage(watchlist, assets).subtitle
}


function PriorityBadge({ level }) {
  const cls =
    level === 'HIGH'
      ? 'prime-priority prime-priority--high'
      : level === 'MEDIUM'
        ? 'prime-priority prime-priority--medium'
        : 'prime-priority prime-priority--low'
  return <span className={cls}>{level}</span>
}

function buildScanReport({
  query,
  chain,
  mode,
  intel,
  canonicalWallet,
  primeTrends,
  watchlist,
  riskDrivers,
  aiBrief,
  recommendedActions,
  approvalsOverride,
  scannerSignals,
  scannerReport,
  tokenResolution = null,
  protocolProfile = null,
  confirmedTokenContract = null,
  targetClassification = null,
  birdeyeAssets = [],
}) {
  const trimmed = String(query || '').trim()
  const tokenContractConfirmed = isTokenContractResolved(
    { tokenResolution, targetClassification, modeId: mode.id, isSolanaToken: isSolanaTokenEarly },
    confirmedTokenContract,
  )
  const lunarLive = isPrimeLunarCrushLive(primeTrends)
  const birdeyeLive = watchlist?.status === 'live'
  const providersPending = !lunarLive || !birdeyeLive
  const approvalsAtRisk = approvalsOverride ?? intel?.approvalsAtRisk ?? 0
  const sig = mergeScannerSignals(scannerSignals, scannerReport)

  const contractRisk = deriveOverallRisk({
    score: canonicalWallet.score,
    interactionType: mode.interactionType,
    contractsUnderReview: intel?.contractsUnderReview ?? 0,
    approvalsAtRisk,
    riskDrivers,
    query: trimmed,
    modeId: mode.id,
    scannerReport,
    scannerSignals: sig,
  })

  const isSolanaTokenEarly =
    isSolanaTokenTarget({
      targetClassification,
      tokenResolution,
      chain,
    }) || solanaScannerReportActive(scannerReport)
  const solanaCtx = resolveSolanaScanContext({
    targetClassification,
    tokenResolution,
    query: trimmed,
    chain,
  })
  const solanaMintResolvedEarly = solanaCtx.mintResolved
  const solanaMintAddressEarly = solanaCtx.mint
  const tokenIdentifiedEarly = isTokenIdentified({
    modeId: mode.id,
    tokenResolution,
    targetClassification,
    isSolanaToken: isSolanaTokenEarly,
    solanaMintResolved: solanaMintResolvedEarly,
    solanaMintAddress: solanaMintAddressEarly,
    chainId: isSolanaTokenEarly ? 'solana' : chain,
  })
  const assetIntelligenceState = resolveAssetIntelligenceState({
    report: {
      modeId: mode.id,
      query: trimmed,
      displayTarget: trimmed,
      tokenResolution,
      targetClassification,
      isSolanaToken: isSolanaTokenEarly,
      solanaMintResolved: solanaMintResolvedEarly,
      solanaMintAddress: solanaMintAddressEarly,
      chainId: isSolanaTokenEarly ? 'solana' : chain,
      scannerReport,
      lunarLive,
      birdeyeLive,
    },
    scannerReport,
  })
  const tokenContractConfirmedEarly =
    !isSolanaTokenEarly && tokenIdentifiedEarly
  const canonicalEarly =
    targetClassification?.canonicalAsset ||
    tokenResolution?.canonicalAsset ||
    resolveCanonicalAssetSync(trimmed)
  const narrativeCategoryEarly =
    mode.id === 'token' && allowsNarrativeAssessment(assetIntelligenceState)
      ? canonicalEarly?.narrativeCategory ||
        resolveTokenNarrativeCategory({
          symbol: canonicalEarly?.symbol || trimmed,
          query: trimmed,
          scannerReport,
          tokenName: canonicalEarly?.name || tokenResolution?.name || targetClassification?.name,
          address:
            canonicalEarly?.address ||
            tokenResolution?.address ||
            targetClassification?.address ||
            solanaMintAddressEarly,
        })
      : null
  const narrativeRiskLevelEarly =
    mode.id === 'token'
      ? resolveNarrativeRiskLevel(narrativeCategoryEarly, { lunarLive })
      : null

  const liquidityRiskScore = liquidityRiskScoreFromScanner(scannerReport, {
    modeId: mode.id,
    tokenResolution,
    targetClassification,
    narrativeCategory: narrativeCategoryEarly,
    query: trimmed,
  })
  const walletExposureProfile =
    intel?.walletExposureProfile ??
    intel?.riskData?.walletExposureProfile ??
    null

  const composite = allowsExecutiveRisk(assetIntelligenceState)
    ? computeCompositeRisk({
        contractRiskLevel: contractRisk,
        narrativeRiskLevel: narrativeRiskLevelEarly || 'Moderate',
        behaviorInputs: {
          birdeyeLive,
          activityAnomalies: intel?.activityAnomalies ?? 0,
          watchlistLive: birdeyeLive,
        },
        liquidityRiskScore,
        exposureProfile: walletExposureProfile,
        walletInputs: {
          band: canonicalWallet.band,
          score: canonicalWallet.score,
          assessmentPending: canonicalWallet.assessmentPending,
          exposureIntelligence: intel?.riskData?.exposureIntelligence ?? intel?.exposureIntelligence,
        },
      })
    : null

  let derivedRisk = contractRisk
  if (mode.id === 'token') {
    const tokenExecutive = deriveTokenExecutiveRisk({
      contractRisk,
      narrativeCategory: narrativeCategoryEarly,
      lunarLive,
      birdeyeLive,
      providersPending,
      walletScore: canonicalWallet.score,
      approvalsAtRisk,
      scannerSignals: sig,
      tokenUnresolved: isSolanaTokenEarly ? !solanaMintResolvedEarly : !tokenContractConfirmedEarly,
    })
    derivedRisk = composite
      ? compositeScoreToRiskLevel(composite.score)
      : tokenExecutive
    if (composite && narrativeCategoryEarly === 'meme') {
      derivedRisk = deriveTokenExecutiveRisk({
        contractRisk: compositeScoreToRiskLevel(composite.score),
        narrativeCategory: narrativeCategoryEarly,
        lunarLive,
        birdeyeLive,
        providersPending,
        walletScore: canonicalWallet.score,
        approvalsAtRisk,
        scannerSignals: sig,
        tokenUnresolved: isSolanaTokenEarly ? !solanaMintResolvedEarly : !tokenContractConfirmedEarly,
      })
    }
  } else if (composite) {
    derivedRisk = compositeScoreToRiskLevel(composite.score)
  }

  const narrativeElevated =
    mode.id === 'token' && isNarrativeElevated(contractRisk, derivedRisk)
  let tokenRiskDisplay =
    mode.id === 'token'
      ? formatTokenExecutiveDisplay(
          derivedRisk,
          narrativeCategoryEarly,
          contractRisk,
          narrativeElevated,
        )
      : undefined

  const institutionalVerdict =
    mode.id === 'token' && sig.hasScan
      ? buildInstitutionalTokenVerdict({
          narrativeCategory: narrativeCategoryEarly,
          scannerReport,
          composite,
          tokenLabel: trimmed,
        })
      : null
  if (institutionalVerdict?.overallRiskDisplay) {
    tokenRiskDisplay = institutionalVerdict.overallRiskDisplay
  }

  const presentation = resolveVerdictPresentation({
    modeId: mode.id,
    scannerSignals: sig,
    derivedRisk,
    overallRiskDisplay: tokenRiskDisplay,
    confidenceInputs: {
      lunarLive,
      birdeyeLive,
      riskFromApi: intel?.riskFromApi,
      providersPending,
    },
  })

  const confidence = resolveTerminalConfidence({
    modeId: mode.id,
    tokenResolution,
    tokenContractConfirmed: tokenContractConfirmedEarly,
    scannerSignals: sig,
    presentation,
    lunarLive,
    birdeyeLive,
    riskFromApi: intel?.riskFromApi,
    providersPending,
    isSolanaToken: isSolanaTokenEarly,
    solanaMintResolved: solanaMintResolvedEarly,
    scannerReport,
  })

  const scannerValidation = resolveScannerValidationLabel({
    modeId: mode.id,
    tokenResolution,
    tokenContractConfirmed: tokenContractConfirmedEarly,
    scannerSignals: sig,
    presentation,
    isSolanaToken: isSolanaTokenEarly,
    solanaMintResolved: solanaMintResolvedEarly,
    scannerReport,
  })

  const draft = {
    query: trimmed || '(workspace baseline)',
    chain: isSolanaTokenEarly
      ? 'Solana'
      : CHAINS.find((c) => c.id === chain)?.label || chain,
    chainId: isSolanaTokenEarly ? 'solana' : chain,
    analysisModeId: isSolanaTokenEarly ? 'solana_token' : mode.id,
    solanaMintAddress: solanaMintAddressEarly,
    modeId: mode.id,
    modeLabel: mode.label,
    modeTone: mode.tone,
    interactionType: mode.interactionType,
    contractRisk: mode.id === 'token' ? contractRisk : null,
    narrativeCategory: narrativeCategoryEarly,
    narrativeRiskLevel: narrativeRiskLevelEarly,
    narrativeElevated,
    overallRisk: presentation.derivedRisk || 'Moderate',
    overallRiskDisplay: presentation.overallRiskDisplay || presentation.derivedRisk || 'Moderate',
    confidence: confidence || 'Partial provider coverage',
    scannerValidation,
    isSolanaToken: isSolanaTokenEarly,
    solanaMintResolved: solanaMintResolvedEarly,
    isPreliminary:
      mode.id === 'token'
        ? isSolanaTokenEarly
          ? !solanaMintResolvedEarly || !sig.hasScan
          : !tokenContractConfirmed || !sig.hasScan
        : mode.id === 'protocol'
          ? !sig.hasScan
          : presentation.isPreliminary,
    modeVerdict: modeVerdictLead(mode.id, {
      tokenResolution,
      tokenContractConfirmed: tokenContractConfirmedEarly,
      tokenIdentified: tokenIdentifiedEarly,
      protocolProfile,
      scannerSignals: sig,
      isSolanaToken: isSolanaTokenEarly,
    }),
    tokenResolution: tokenResolution || null,
    tokenContractConfirmed: tokenContractConfirmedEarly,
    confirmedTokenContract: confirmedTokenContract || null,
    protocolProfile: protocolProfile || null,
    resolvedContractAddress:
      tokenContractConfirmedEarly && !isSolanaTokenEarly
        ? confirmedTokenContract?.address || tokenResolution?.address
        : null,
    evidencePreview: isSolanaTokenEarly
              ? [
                  'Narrative risk',
                  'Liquidity intelligence',
                  'Holder concentration',
                  'Mint / freeze authority',
                  'Liquidity & pools',
                ]
      : MODE_EVIDENCE_PREVIEW[mode.id] || MODE_EVIDENCE_PREVIEW.default,
    lunarLive,
    birdeyeLive,
    providersPending,
    scannerSignals: sig,
    scannerMostlyClean: Boolean(sig.mostlyClean),
    contractsUnderReview: intel?.contractsUnderReview ?? 0,
    approvalsAtRisk,
    walletSnapshot: canonicalWallet,
    targetClassification: targetClassification || null,
    analysisWalletAddress:
      mode.id === 'wallet' && targetClassification?.address ? targetClassification.address : null,
    composite: composite || null,
    assetIntelligenceState,
    walletExposureProfile: walletExposureProfile || null,
    institutionalReasoning: institutionalVerdict?.reasoning || null,
    recommendation: '',
    analyst: null,
    threats: [],
    actions: (recommendedActions || []).slice(0, 3),
  }

  draft.recommendation =
    institutionalVerdict?.recommendation ||
    buildRecommendation(draft) ||
    'Proceed with standard pre-interaction hygiene and evidence review.'
  draft.analyst = buildAnalystCopy(draft, aiBrief, scannerReport) || {
    summary: 'Intelligence synthesis complete.',
    keyConcern: 'Review evidence layers for provider context.',
    nextMove: 'Expand narrative and behavior evidence before discretionary exposure.',
  }
  draft.threats = threatPills(draft)
  draft.target = trimmed || draft.query
  const displayLabels = resolveReportDisplayLabels({
    ...draft,
    query: trimmed,
    canonicalAsset:
      draft.canonicalAsset ||
      draft.targetClassification?.canonicalAsset ||
      getReportCanonicalAsset(draft),
  })
  draft.displayTarget = mode.id === 'token' ? displayLabels.displayName : trimmed
  if (!draft.canonicalAsset && displayLabels.canonicalAsset) {
    draft.canonicalAsset = displayLabels.canonicalAsset
  }

  if (solanaScannerReportActive(scannerReport)) {
    draft.chain = 'Solana'
    draft.chainId = 'solana'
    draft.analysisModeId = 'solana_token'
    draft.isSolanaToken = true
    draft.solanaMintResolved = true
    draft.solanaMintAddress =
      scannerReport.address || solanaMintAddressEarly || draft.solanaMintAddress
    draft.liquidityIntelligence = scannerReport.liquidityIntelligence || null
    draft.scannerReport = scannerReport
    draft.isPreliminary = false
    draft.isFallback = false
    draft.partialProviderCoverage = providersPending
  } else if (hasScannerEvidence(draft, scannerReport)) {
    draft.scannerReport = scannerReport || draft.scannerReport
    draft.isFallback = false
    draft.isPreliminary = false
    draft.partialProviderCoverage = providersPending
  }

  applySolanaScannerBackedVerdict(draft, scannerReport)

  if (mode.id === 'token') {
    draft.narrativeCategory = resolveTokenNarrativeCategory({
      symbol: trimmed,
      query: trimmed,
      scannerReport,
      tokenName: draft.tokenResolution?.name || draft.targetClassification?.name,
    })
    const solanaToken = Boolean(draft.isSolanaToken || isSolanaTokenEarly)
    if (solanaToken) {
      const scanned = Boolean(scannerReport?.success === true && draft.analysisModeId === 'solana_token')
      const solanaBanner = buildTokenResolutionBanner({
        isSolana: true,
        hasScan: scanned,
        solanaMintResolved: solanaMintResolvedEarly,
      })
      applyTokenResolutionBanner(draft, solanaBanner)
      const catPanel = buildCategoryNarrativeFallback(trimmed)
      draft.scenarioTitle = lunarLive ? null : catPanel.scenarioTitle
      draft.narrativeContext =
        lunarLive ? null : catPanel.narrativeText || buildTokenNarrativeContext(primeTrends, trimmed)
      draft.behaviorContext = buildBehaviorContextMessage({
        chain: 'solana',
        hasScan: sig.hasScan,
        birdeyeLive,
        watchlist,
      })
    } else if (tokenContractConfirmed) {
      const resolvedBanner = buildTokenResolutionBanner({
        report: draft,
        confirmedTokenContract,
        hasScan: sig.hasScan,
      })
      applyTokenResolutionBanner(draft, resolvedBanner)
      const catPanel = buildCategoryNarrativeFallback(trimmed)
      draft.scenarioTitle = lunarLive ? null : catPanel.scenarioTitle
      draft.narrativeContext =
        lunarLive
          ? null
          : catPanel.narrativeText ||
            buildTokenNarrativeContext(primeTrends, trimmed)
      draft.behaviorContext = buildBehaviorContextMessage({
        chain: draft.chainId || chain,
        hasScan: sig.hasScan,
        birdeyeLive,
        watchlist,
      })
    } else if (tokenResolution?.confirmationRequired && tokenResolution.candidates?.length) {
      const pendingBanner = buildTokenResolutionBanner({ report: draft })
      applyTokenResolutionBanner(draft, {
        ...pendingBanner,
        copy: tokenResolution.message || pendingBanner.copy,
      })
      draft.narrativeContext = buildTokenNarrativeContext(primeTrends, trimmed)
      draft.behaviorContext = buildBehaviorContextMessage({
        chain: draft.chainId || chain,
        hasScan: sig.hasScan,
        birdeyeLive,
        watchlist,
      })
      draft.scenarioTitle = lunarLive ? null : buildTokenScenarioTitle(trimmed)
    } else {
      draft.narrativeContext = buildTokenNarrativeContext(primeTrends, trimmed)
      draft.behaviorContext = buildBehaviorContextMessage({
        chain: draft.chainId || chain,
        hasScan: sig.hasScan,
        birdeyeLive,
        watchlist,
      })
      draft.scenarioTitle = lunarLive ? null : buildTokenScenarioTitle(trimmed)
      if (!isSolanaScannerBacked(draft, scannerReport)) {
        const pendingBanner = buildTokenResolutionBanner({ report: draft })
        applyTokenResolutionBanner(draft, {
          ...pendingBanner,
          copy: tokenResolution?.message || pendingBanner.copy,
        })
      }
    }
  }

  if (mode.id === 'protocol' && protocolProfile) {
    draft.narrativeContext = null
    draft.behaviorContext = null
    draft.scenarioTitle = null
  }

  draft.executiveIntelligence = resolveExecutiveIntelligence({
    report: draft,
    scannerReport,
    primeTrends,
    watchlist,
    birdeyeAssets,
    walletExposureProfile,
  })
  draft.analyst = buildAnalystCopy(draft, aiBrief, scannerReport, draft.executiveIntelligence) || {
    summary: 'Intelligence synthesis complete.',
    keyConcern: 'Review evidence layers for provider context.',
    nextMove: 'Expand narrative and behavior evidence before discretionary exposure.',
  }

  if (
    mode.id === 'token' &&
    isTokenContractResolved(draft, confirmedTokenContract) &&
    !sig.hasScan
  ) {
    draft.isFallback = false
    draft.isPreliminary = true
    draft.providerCoverageNote = PROVIDER_COVERAGE_PRELIMINARY_NOTE
  }

  return enrichSolanaScannerBackedReport(draft, scannerReport)
}

function safeBuildScanReport(params) {
  const fallbackParams = {
    query: params.query,
    chain: params.chain,
    mode: params.mode,
    canonicalWallet: params.canonicalWallet,
    primeTrends: params.primeTrends,
    targetClassification: params.targetClassification,
    tokenResolution: params.tokenResolution,
  }
  try {
    const canonical =
      params.targetClassification?.canonicalAsset ||
      resolveCanonicalAssetSync(params.query)
    const report = enrichReportWithCanonical(buildScanReport(params), canonical)
    if (!isValidReport(report)) {
      const fb = buildFallbackScanReport(fallbackParams)
      fb.executiveIntelligence = buildPendingExecutiveIntel(fb)
      return {
        report: enrichSolanaScannerBackedReport(fb, params.scannerReport),
        failed: true,
      }
    }
    return { report, failed: false }
  } catch {
    const fb = buildFallbackScanReport(fallbackParams)
    fb.executiveIntelligence = buildPendingExecutiveIntel(fb)
    return {
      report: enrichSolanaScannerBackedReport(fb, params.scannerReport),
      failed: true,
    }
  }
}

/**
 * Adaptive multi-mode threat intelligence terminal (frontend-only).
 */
function buildTokenResolutionFromClassification(classification, trimmed) {
  const fromCanonical = tokenResolutionFromCanonical(
    classification?.canonicalAsset || resolveCanonicalAssetSync(trimmed),
  )
  if (fromCanonical) return fromCanonical
  if (!classification?.address || classification.recommendedModule !== 'token') return null
  const chainSlug = classification.chain === 'solana' ? 'solana' : classification.chain || 'ethereum'
  return {
    resolved: true,
    autoSelected: true,
    confirmationRequired: false,
    status: 'resolved',
    symbol: classification.symbol || trimmed,
    name: classification.name || classification.symbol || trimmed,
    address:
      chainSlug === 'ethereum'
        ? String(classification.address).toLowerCase()
        : String(classification.address),
    source: 'classifier',
    chainSlug,
    chainLabel:
      chainSlug === 'solana'
        ? 'Solana'
        : chainSlug === 'optimism'
          ? 'Optimism'
          : 'Ethereum',
    candidates: [],
    ambiguousNative: false,
    manualOnly: false,
    message: 'Token identified and contract resolved.',
  }
}

export default function PreInteractionIntelligenceTerminal({
  api,
  profile,
  walletSnapshot: walletSnapshotProp,
  intel,
  primeTrends,
  watchlist,
  birdeyeAssets = [],
  aiBrief,
  recommendedActions = [],
  intelligenceFeed,
  exposureHeatmap = [],
  exposureHeatmapSubtitle,
  exposureHeatmapSources = [],
  heatmapStatus,
  riskDrivers = [],
  showRiskScanner,
  scannerReport,
  scannerSignals,
  scannerBusy = false,
  scanError = null,
  approvalRows = [],
  onRunDeepScan,
  onClearScanner,
  onScannerScopeChange,
}) {
  const [query, setQuery] = useState('')
  const [chain, setChain] = useState('ethereum')
  const [report, setReport] = useState(null)
  const [forcedModeId, setForcedModeId] = useState(null)
  const [preparedInvestigation, setPreparedInvestigation] = useState(null)
  const [scanFailed, setScanFailed] = useState(false)
  const [resolveBusy, setResolveBusy] = useState(false)
  const [confirmedTokenContract, setConfirmedTokenContract] = useState(null)
  const [protocolActiveScanAddress, setProtocolActiveScanAddress] = useState(null)
  const [targetClassification, setTargetClassification] = useState(null)
  const [chainOverride, setChainOverride] = useState(false)
  const searchInputRef = useRef(null)
  const searchZoneRef = useRef(null)
  const classifyPreviewRef = useRef(0)

  const canonicalWallet = walletSnapshotProp?.compact
    ? walletSnapshotProp
    : buildPrimeWalletSnapshot({
        score: intel?.score,
        band: intel?.band,
        hasWallet: intel?.hasWallet,
        riskFromApi: intel?.riskFromApi,
        assessmentPending: intel?.assessmentPending,
        exposureProvenance: intel?.riskData?.exposureIntelligence?.provenance,
      })

  const connectedWalletAddress = useMemo(() => getConnectedWalletAddress(profile), [profile])

  const activeMode = useMemo(
    () => resolveActiveMode(query, forcedModeId, connectedWalletAddress, targetClassification),
    [query, forcedModeId, connectedWalletAddress, targetClassification],
  )

  useEffect(() => {
    const trimmed = String(query || '').trim()
    if (!trimmed || forcedModeId) {
      setTargetClassification(null)
      return undefined
    }
    const sync = classifyTargetSync(trimmed, connectedWalletAddress)
    setTargetClassification(sync)
    const ticket = ++classifyPreviewRef.current
    const timer = setTimeout(async () => {
      if (!api) return
      try {
        const full = await classifyIntelligenceTarget(trimmed, { api, connectedWalletAddress })
        if (classifyPreviewRef.current === ticket) setTargetClassification(full)
      } catch {
        /* keep sync */
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [query, forcedModeId, connectedWalletAddress, api])
  const activeChipId = activeMode.chipId
  const modeFromModule = Boolean(forcedModeId && query.trim())
  const canRunScan = Boolean(String(query || '').trim())

  useEffect(() => {
    const modeId = report?.modeId || activeMode.id
    const scope = computePrimeScannerScope({
      query,
      modeId,
      confirmedTokenContract,
      tokenResolution: report?.tokenResolution ?? null,
      protocolActiveScanAddress,
    })
    onScannerScopeChange?.(scope)
  }, [
    query,
    activeMode.id,
    report?.modeId,
    report?.tokenResolution,
    confirmedTokenContract,
    protocolActiveScanAddress,
    onScannerScopeChange,
  ])

  const resetScannerTargetState = useCallback(() => {
    setProtocolActiveScanAddress(null)
    onClearScanner?.()
  }, [onClearScanner])

  const reportBuildParams = useCallback(
    (reportQuery, mode, overrides = {}) => ({
      query: reportQuery,
      chain,
      mode,
      intel,
      canonicalWallet,
      primeTrends,
      watchlist,
      riskDrivers,
      aiBrief,
      recommendedActions,
      scannerSignals,
      scannerReport: overrides.scannerReport ?? scannerReport,
      birdeyeAssets,
      targetClassification: overrides.targetClassification ?? targetClassification,
      tokenResolution: overrides.tokenResolution,
      protocolProfile: overrides.protocolProfile,
      confirmedTokenContract: overrides.confirmedTokenContract,
    }),
    [
      chain,
      intel,
      canonicalWallet,
      primeTrends,
      watchlist,
      riskDrivers,
      aiBrief,
      recommendedActions,
      scannerSignals,
      scannerReport,
      birdeyeAssets,
      targetClassification,
    ],
  )

  const handleAnalyze = useCallback(async () => {
    const trimmed = String(query || '').trim()
    if (!trimmed) return

    setResolveBusy(true)
    setConfirmedTokenContract(null)
    resetScannerTargetState()

    let classification = classifyTargetSync(trimmed, connectedWalletAddress)
    const canonicalSync = resolveCanonicalAssetSync(trimmed)
    try {
      classification = await classifyIntelligenceTarget(trimmed, { api, connectedWalletAddress })
      if (canonicalSync.resolved && canonicalSync.source === 'registry') {
        classification = { ...classification, ...classificationFromCanonical(canonicalSync) }
      }
      setTargetClassification(classification)
      if (classification?.chain) {
        const supported = ['ethereum', 'solana', 'base', 'arbitrum', 'polygon', 'optimism']
        if (supported.includes(classification.chain)) setChain(classification.chain)
      }
    } catch {
      setTargetClassification(classification)
    }

    const mode = resolveActiveMode(query, forcedModeId, connectedWalletAddress, classification)
    let tokenResolution = null
    let protocolProfile = null

    try {
      if (mode.id === 'token') {
        tokenResolution =
          buildTokenResolutionFromClassification(classification, trimmed) ||
          (await resolveTokenSymbol(trimmed, classification?.chain || chain))
      } else if (mode.id === 'protocol') {
        protocolProfile = resolveProtocolUrl(classification?.url || trimmed)
      }

      const solanaCtx = resolveSolanaScanContext({
        targetClassification: classification,
        tokenResolution,
        query: trimmed,
        chain,
      })

      let scannerBody = null
      if (onRunDeepScan) {
        if (mode.id === 'wallet') {
          /* Wallet Exposure Analysis — no contract scanner */
        } else if (solanaCtx.shouldScanSolana) {
          const scanResult = await onRunDeepScan(
            solanaCtx.mint,
            SOLANA_CHAIN_ID,
            solanaCtx.symbol || classification?.symbol || trimmed,
          )
          if (scanResult?.ok && scanResult.body) scannerBody = scanResult.body
        } else if (mode.id === 'contract' && classification?.address && classification.chain === 'ethereum') {
          const scanResult = await onRunDeepScan(classification.address, 1)
          if (scanResult?.ok && scanResult.body) scannerBody = scanResult.body
        } else if (mode.id === 'token' && tokenResolution?.autoSelected && tokenResolution.address) {
          const chainKey = tokenResolution.chainSlug || classification?.chain || chain
          if (chainKey !== 'solana') {
            const chainIdMap = { ethereum: 1, base: 8453, arbitrum: 42161, polygon: 137 }
            const scanResult = await onRunDeepScan(
              tokenResolution.address,
              chainIdMap[chainKey] ?? 1,
            )
            if (scanResult?.ok && scanResult.body) scannerBody = scanResult.body
          }
        }
      }

      const { report: nextReport, failed } = safeBuildScanReport(
        reportBuildParams(trimmed, mode, {
          targetClassification: classification,
          tokenResolution,
          protocolProfile,
          confirmedTokenContract: null,
          scannerReport: scannerBody ?? scannerReport,
        }),
      )
      setReport(nextReport)
      setScanFailed(failed && !hasScannerEvidence(nextReport, scannerBody ?? scannerReport))
    } catch {
      const { report: nextReport, failed } = safeBuildScanReport(
        reportBuildParams(trimmed, mode, {
          tokenResolution,
          protocolProfile,
          targetClassification: classification,
        }),
      )
      setReport(nextReport)
      setScanFailed(failed)
    } finally {
      setResolveBusy(false)
    }
  }, [
    query,
    forcedModeId,
    chain,
    connectedWalletAddress,
    api,
    reportBuildParams,
    resetScannerTargetState,
    onRunDeepScan,
  ])

  useEffect(() => {
    if (!report) return
    const modeKey = report.modeId && ANALYSIS_MODES[report.modeId] ? report.modeId : forcedModeId
    const mode = modeKey
      ? { ...ANALYSIS_MODES[modeKey] }
      : resolveActiveMode(report.query, forcedModeId, connectedWalletAddress, report.targetClassification)
    const reportQuery = report.query === '(workspace baseline)' ? query : report.query
    const { report: nextReport, failed } = safeBuildScanReport(
      reportBuildParams(reportQuery, mode, {
        tokenResolution: report.tokenResolution,
        protocolProfile: report.protocolProfile,
        confirmedTokenContract,
        targetClassification: report.targetClassification ?? targetClassification,
      }),
    )
    if (isValidReport(nextReport)) {
      setReport(nextReport)
      setScanFailed(failed && !hasScannerEvidence(nextReport, scannerReport))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh verdict when scanner completes
  }, [scannerSignals, scannerReport, connectedWalletAddress, confirmedTokenContract])

  const applyModeChip = (modeId) => {
    setForcedModeId(modeId)
    setScanFailed(false)
    setConfirmedTokenContract(null)
    resetScannerTargetState()
    if (modeId === 'contract') {
      setQuery('')
      const launch = resolveLayerLaunch('contract', { query: '' })
      setPreparedInvestigation(
        launch.previewMessage
          ? {
              moduleId: launch.moduleId,
              moduleLabel: launch.moduleLabel,
              previewMessage: launch.previewMessage,
              target: '',
              awaitingInput: true,
              sampleContract: launch.sampleContract || null,
            }
          : null,
      )
      return
    }
    setPreparedInvestigation(null)
    const sample = EXAMPLE_CHIPS.find((c) => c.modeId === modeId)
    if (sample) setQuery(sample.query)
  }

  const clearModuleIntent = useCallback(() => {
    setForcedModeId(null)
    setPreparedInvestigation(null)
    setScanFailed(false)
    setConfirmedTokenContract(null)
    setProtocolActiveScanAddress(null)
    resetScannerTargetState()
  }, [resetScannerTargetState])

  const selectNarrativeSample = useCallback((symbol) => {
    const sym = String(symbol || '').trim().toUpperCase()
    if (!sym) return
    setQuery(sym)
    setForcedModeId('token')
    setScanFailed(false)
    setConfirmedTokenContract(null)
    setProtocolActiveScanAddress(null)
    resetScannerTargetState()
    setPreparedInvestigation((prev) =>
      prev
        ? {
            ...prev,
            target: sym,
            previewMessage: `${formatTokenDisplayLabel(sym)} narrative target selected. Run Intelligence Scan to generate verdict.`,
          }
        : null,
    )
    searchInputRef.current?.focus({ preventScroll: true })
  }, [resetScannerTargetState])

  const focusTerminalSearch = useCallback(() => {
    requestAnimationFrame(() => {
      searchZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      searchInputRef.current?.focus({ preventScroll: true })
    })
  }, [])

  const handleLayerAction = useCallback(
    (actionType) => {
      const launch = resolveLayerLaunch(actionType, {
        primeTrends,
        watchlist,
        birdeyeAssets,
        profile,
        query,
      })
      if (launch.skipQueryPrefill) {
        setQuery('')
      } else if (launch.query) {
        setQuery(launch.query)
      }
      if (launch.chain) setChain(launch.chain)
      if (launch.modeId) setForcedModeId(launch.modeId)
      setPreparedInvestigation(
        launch.previewMessage
          ? {
              moduleId: launch.moduleId || actionType,
              moduleLabel: launch.moduleLabel || actionType,
              previewMessage: launch.previewMessage,
              target: launch.skipQueryPrefill ? '' : launch.query,
              sampleAssets: launch.sampleAssets || null,
              awaitingInput: Boolean(launch.awaitingInput),
              sampleContract: launch.sampleContract || null,
            }
          : null,
      )
      setReport(null)
      setScanFailed(false)
      setConfirmedTokenContract(null)
      setProtocolActiveScanAddress(null)
      resetScannerTargetState()
      focusTerminalSearch()
    },
    [primeTrends, watchlist, birdeyeAssets, profile, query, focusTerminalSearch, resetScannerTargetState],
  )

  const loadExampleThreat = () => {
    clearModuleIntent()
    setQuery(EXAMPLE_THREAT.query)
    setChain(EXAMPLE_THREAT.chain)
    const mode = detectAnalysisMode(EXAMPLE_THREAT.query, connectedWalletAddress)
    const { report: nextReport, failed } = safeBuildScanReport({
      ...reportBuildParams(EXAMPLE_THREAT.query, mode),
      approvalsOverride: Math.max(intel?.approvalsAtRisk ?? 0, 1),
    })
    setReport(nextReport)
    setScanFailed(failed)
  }

  const lunarLivePreview = isPrimeLunarCrushLive(primeTrends)
  const birdeyeLivePreview = watchlist?.status === 'live'

  const isSolanaTokenReport = Boolean(report?.isSolanaToken)
  const verdictReport = useMemo(
    () => (report ? enrichSolanaScannerBackedReport(report, scannerReport) : null),
    [report, scannerReport],
  )
  const topVerdictReport = verdictReport || report
  const resolvedExecutive = useMemo(
    () =>
      report
        ? resolveExecutiveIntelligence({
            report,
            scannerReport,
            primeTrends,
            watchlist,
            birdeyeAssets,
            walletExposureProfile:
              report?.walletExposureProfile ??
              intel?.walletExposureProfile ??
              intel?.riskData?.walletExposureProfile ??
              null,
          })
        : null,
    [report, scannerReport, primeTrends, watchlist, birdeyeAssets, intel?.walletExposureProfile, intel?.riskData?.walletExposureProfile],
  )
  const executiveSummary = useMemo(
    () =>
      buildExecutiveSummary({
        report,
        executive: resolvedExecutive,
        scannerReport,
        topVerdictReport,
      }),
    [report, resolvedExecutive, scannerReport, topVerdictReport],
  )
  const resolvedAnalyst = useMemo(() => {
    if (!topVerdictReport) return null
    return (
      topVerdictReport.analyst ||
      buildInstitutionalAnalystAssessment({
        report: topVerdictReport,
        scannerReport,
        executive: resolvedExecutive,
      })
    )
  }, [topVerdictReport, scannerReport, resolvedExecutive])
  const intelligenceCoverage = useMemo(
    () =>
      buildIntelligenceCoverageSources({
        report,
        scannerReport,
        primeTrends,
        watchlist,
        birdeyeAssets,
      }),
    [report, scannerReport, primeTrends, watchlist, birdeyeAssets],
  )
  const riskExplainability = useMemo(
    () =>
      report
        ? buildRiskExplainability({
            report,
            composite: topVerdictReport?.composite || report?.composite,
            executive: resolvedExecutive,
            scannerReport,
          })
        : null,
    [report, topVerdictReport, resolvedExecutive, scannerReport],
  )
  const { setHeroMetrics, clearHeroMetrics } = usePrimeIntelligenceHero()
  useEffect(() => {
    if (!report) {
      clearHeroMetrics()
      return
    }
    const metrics = resolveHeroIntelligenceMetrics({
      report,
      executive: resolvedExecutive,
      scannerReport,
      birdeyeAssets,
      primeTrends,
    })
    if (metrics) setHeroMetrics(metrics)
    else clearHeroMetrics()
    return () => clearHeroMetrics()
  }, [report, resolvedExecutive, scannerReport, birdeyeAssets, primeTrends, setHeroMetrics, clearHeroMetrics])
  const tokenIdentified =
    isTokenIdentified(report) ||
    Boolean(report?.solanaMintResolved && isSolanaTokenReport)
  const tokenContractConfirmed =
    !isSolanaTokenReport && tokenIdentified
  const solanaMintResolved = Boolean(report?.solanaMintResolved)

  const solanaMintAddress = resolveSolanaMintAddress({
    targetClassification: report?.targetClassification,
    tokenResolution: report?.tokenResolution,
    confirmedTokenContract,
    query: report?.query,
  })

  const showSolanaTokenPanel =
    report?.modeId === 'token' && isSolanaTokenReport && solanaMintResolved

  const showContractAnalyzer =
    !isSolanaTokenReport &&
    (report?.modeId === 'contract' ||
      (report?.modeId === 'token' && tokenContractConfirmed) ||
      (report?.modeId === 'protocol' && protocolActiveScanAddress && scannerSignals?.hasScan))

  const contractScanTarget =
    confirmedTokenContract?.address ||
    report?.resolvedContractAddress ||
    (report?.modeId === 'protocol' && scannerReport?.address) ||
    report?.query

  const handleConfirmTokenContract = useCallback(
    (candidate) => {
      if (!candidate?.address) return
      const nextAddr = normalizeEthAddress(candidate.address)
      const prevAddr = normalizeEthAddress(confirmedTokenContract?.address)
      if (prevAddr && nextAddr && prevAddr !== nextAddr) {
        onClearScanner?.()
      }
      setProtocolActiveScanAddress(null)
      setConfirmedTokenContract({
        address: candidate.address,
        chainId: candidate.chainId,
        chainLabel: candidate.chainLabel,
        liquidityUsd: candidate.liquidityUsd,
        pairName: candidate.pairName,
        symbol: report?.tokenResolution?.symbol || report?.query,
        source: 'dexscreener',
      })
    },
    [report?.tokenResolution?.symbol, report?.query, confirmedTokenContract?.address, onClearScanner],
  )

  useEffect(() => {
    if (!report || report.modeId !== 'token' || !confirmedTokenContract) return
    const mode = ANALYSIS_MODES.token
    const { report: nextReport, failed } = safeBuildScanReport(
      reportBuildParams(report.query, mode, {
        tokenResolution: report.tokenResolution,
        protocolProfile: report.protocolProfile,
        confirmedTokenContract,
        targetClassification: report.targetClassification ?? targetClassification,
      }),
    )
    if (isValidReport(nextReport)) {
      setReport(nextReport)
      setScanFailed(failed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild verdict after contract confirmation
  }, [confirmedTokenContract])

  const handleRunResolvedContractScan = useCallback(() => {
    const addr = contractScanTarget
    if (!addr || !/^0x[a-fA-F0-9]{40}$/i.test(addr) || !onRunDeepScan) return
    const chainKey = confirmedTokenContract?.chainId || chain
    const chainId = { ethereum: 1, base: 8453, arbitrum: 42161, polygon: 137 }[chainKey] ?? 1
    onRunDeepScan(addr, chainId)
  }, [contractScanTarget, confirmedTokenContract?.chainId, chain, onRunDeepScan])

  const handleRunSolanaTokenScan = useCallback(() => {
    const addr = solanaMintAddress
    if (!addr || !onRunDeepScan) return
    const sym =
      report?.targetClassification?.symbol ||
      report?.tokenResolution?.symbol ||
      report?.displayTarget
    onRunDeepScan(addr, SOLANA_CHAIN_ID, sym)
  }, [
    solanaMintAddress,
    onRunDeepScan,
    report?.targetClassification?.symbol,
    report?.tokenResolution?.symbol,
    report?.displayTarget,
  ])

  const handleProtocolTargetScan = useCallback(
    (address) => {
      if (!address || !onRunDeepScan) return
      const norm = normalizeEthAddress(address)
      setProtocolActiveScanAddress(norm)
      onClearScanner?.()
      onRunDeepScan(address, 1)
    },
    [onRunDeepScan, onClearScanner],
  )

  return (
    <motion.section
      id="prime-preinteract-terminal"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="prime-preinteract-terminal prime-glass scroll-mt-28"
    >
      <div ref={searchZoneRef} className="prime-preinteract-terminal__search-zone">
        <div className="space-y-2 mb-5">
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-200/90 flex items-center gap-2">
            <Radar size={14} aria-hidden />
            Adaptive threat intelligence
          </p>
          <h2 className="text-xl sm:text-2xl font-heading text-white tracking-tight">
            SureStack Threat Intelligence Terminal
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Analyze tokens, contracts, approvals, wallets, and protocols before you sign or interact.
          </p>
          <p className="prime-terminal-flow-cue">Select a module below or enter your own target.</p>
        </div>

        <div className="prime-preinteract-search-row">
          <div className="prime-preinteract-search-input-wrap">
            <Search size={18} className="prime-preinteract-search-icon" aria-hidden />
            <input
              ref={searchInputRef}
              type="text"
              inputMode="search"
              name="surestack-threat-target"
              value={query}
              onChange={(e) => {
                const newQuery = e.target.value
                const confirmedAddr = normalizeEthAddress(confirmedTokenContract?.address)
                const queryAddr = normalizeEthAddress(newQuery.trim())
                const preserveScanner = Boolean(confirmedAddr && queryAddr && confirmedAddr === queryAddr)

                setQuery(newQuery)
                setReport(null)
                setScanFailed(false)
                setForcedModeId(null)
                setPreparedInvestigation(null)

                if (preserveScanner) return

                setConfirmedTokenContract(null)
                setProtocolActiveScanAddress(null)
                resetScannerTargetState()
              }}
              onKeyDown={(e) => e.key === 'Enter' && canRunScan && handleAnalyze()}
              placeholder="Token, 0x contract, wallet, spender, or protocol URL"
              className="prime-preinteract-search-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore
            />
          </div>
          <div className="prime-preinteract-chain-wrap">
            {targetClassification?.chain && !chainOverride ? (
              <div className="prime-preinteract-chain-detected" title="Auto-detected network">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">Network</span>
                <span className="text-sm font-medium text-slate-200">
                  {CHAINS.find((c) => c.id === targetClassification.chain)?.label ||
                    targetClassification.chain}
                </span>
                <button
                  type="button"
                  className="text-[10px] text-violet-300/90 underline underline-offset-2"
                  onClick={() => setChainOverride(true)}
                >
                  Override
                </button>
              </div>
            ) : (
              <select
                value={chain}
                onChange={(e) => {
                  setChain(e.target.value)
                  setChainOverride(true)
                }}
                className="prime-preinteract-chain-select"
                aria-label="Override network (optional)"
                title="Optional — target network is auto-detected when possible"
              >
                {CHAINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="prime-preinteract-analyze-wrap">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!canRunScan || resolveBusy}
              className="prime-preinteract-analyze-btn"
              aria-disabled={!canRunScan || resolveBusy}
            >
              {resolveBusy ? 'Resolving target…' : 'Run Intelligence Scan'}
              <ArrowRight size={16} aria-hidden />
            </button>
            {preparedInvestigation?.moduleLabel ? (
              <p className="prime-preinteract-analyze-helper">
                Prepared from {preparedInvestigation.moduleLabel} module
              </p>
            ) : null}
          </div>
        </div>

        <div className="prime-terminal-mode-chips" role="group" aria-label="Analysis modes">
          {MODE_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => applyModeChip(chip.id)}
              className={`prime-terminal-mode-chip ${
                activeChipId === chip.id ? 'prime-terminal-mode-chip--active' : ''
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {!canRunScan ? (
          <p className="prime-terminal-scan-validation" role="status">
            {forcedModeId === 'contract' || preparedInvestigation?.awaitingInput
              ? 'Enter a contract address (0x…) to run Contract Trust analysis, or choose Sample contract below.'
              : 'Enter a token, contract, wallet, spender, or protocol URL first.'}
          </p>
        ) : null}

        {!(preparedInvestigation?.awaitingInput) && (query.trim() || forcedModeId) ? (
          <div className="prime-terminal-mode-detect mt-3 space-y-2">
            {targetClassification && !modeFromModule && query.trim() ? (
              <div className="prime-terminal-target-classify flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
                  Detected
                </span>
                <span className="text-sm font-semibold text-white">{targetClassification.displayLabel}</span>
                {targetClassification.symbol ? (
                  <span className="text-sm font-mono text-violet-200">{targetClassification.symbol}</span>
                ) : null}
                {targetClassification.protocolName && targetClassification.type === 'protocol' ? (
                  <span className="text-sm text-cyan-200">{targetClassification.protocolName}</span>
                ) : null}
                <span className="text-[10px] font-mono text-slate-400">
                  Confidence: {targetClassification.confidence}%
                  {targetClassification.syncOnly ? ' · confirming' : ''}
                </span>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
                {modeFromModule || forcedModeId ? 'Selected module' : 'Recommended module'}
              </span>
              <span className={modeBadgeClass(activeMode.tone)}>{activeMode.label}</span>
            </div>
          </div>
        ) : null}

        {preparedInvestigation ? (
          <div className="prime-investigation-prepared" role="status">
            {preparedInvestigation.awaitingInput ? (
              <>
                <p className="prime-investigation-prepared__eyebrow">Selected module</p>
                <p className="prime-investigation-prepared__module-label">
                  {ANALYSIS_MODES.contract.label}
                </p>
                <p className="prime-investigation-prepared__status">Status · Awaiting Contract Input</p>
                <p className="prime-investigation-prepared__message">{preparedInvestigation.previewMessage}</p>
              </>
            ) : (
              <>
                <p className="prime-investigation-prepared__eyebrow">Investigation prepared</p>
                <p className="prime-investigation-prepared__message">{preparedInvestigation.previewMessage}</p>
                {preparedInvestigation.target ? (
                  <p className="prime-investigation-prepared__target">
                    Target · <span className="font-mono">{preparedInvestigation.target}</span>
                  </p>
                ) : null}
              </>
            )}
            {preparedInvestigation.sampleAssets?.length ? (
              <div className="prime-investigation-prepared__samples">
                <p className="prime-investigation-prepared__samples-label">Sample assets</p>
                <div className="prime-investigation-prepared__sample-chips">
                  {preparedInvestigation.sampleAssets.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      className={`prime-investigation-prepared__sample-chip ${
                        query.trim().toUpperCase() === sym ? 'prime-investigation-prepared__sample-chip--active' : ''
                      }`}
                      onClick={() => selectNarrativeSample(sym)}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!report ? (
          <PrimeIntelligenceLayersGrid
            primeTrends={primeTrends}
            watchlist={watchlist}
            birdeyeAssets={birdeyeAssets}
            walletSnapshot={canonicalWallet}
            intel={intel}
            showRiskScanner={showRiskScanner}
            scannerReport={scannerReport}
            approvalRows={approvalRows}
            query={query}
            riskDrivers={riskDrivers}
            analysisModeId={activeMode.id}
            onLayerAction={handleLayerAction}
          />
        ) : null}

        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                clearModuleIntent()
                setQuery(chip.query)
                setForcedModeId(chip.modeId)
                resetScannerTargetState()
              }}
              className="prime-preinteract-example-chip"
            >
              {chip.label}
            </button>
          ))}
          <button type="button" onClick={loadExampleThreat} className="prime-preinteract-example-chip">
            Reference intelligence target
          </button>
        </div>

        {!report ? (
          <div className="prime-provider-compact-preview mt-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-2">
              Intelligence coverage snapshot
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="prime-provider-compact-preview__chip">
                Narrative · {lunarLivePreview ? 'Live' : 'Model active'}
              </span>
              <span className="prime-provider-compact-preview__chip">
                Behavior · {birdeyeLivePreview ? 'Live' : report?.chainId === 'solana' ? 'Ready' : 'Coming soon'}
              </span>
              <span className="prime-provider-compact-preview__chip">
                Scanner · {showRiskScanner ? 'Available' : 'Verify wallet'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Run an intelligence scan to open executive verdict, analyst assessment, and supporting evidence.
            </p>
          </div>
        ) : null}
      </div>

      {report ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="prime-preinteract-report"
        >
          {(() => {
            const statusBanner = resolveScanStatusBanner(report, scannerReport, scanFailed)
            if (!statusBanner) return null
            const isPartial = statusBanner.type === 'partial'
            return (
              <div
                className={`prime-scan-fallback ${isPartial ? 'prime-scan-fallback--partial' : ''}`}
                role={isPartial ? 'status' : 'alert'}
              >
                <p className="prime-scan-fallback__title">{statusBanner.title}</p>
                <p className="prime-scan-fallback__copy">{statusBanner.body}</p>
              </div>
            )
          })()}

          {topVerdictReport.modeId === 'token' && topVerdictReport.contractProofNote ? (
            <div
              className={`prime-token-resolution-banner ${
                isSolanaTokenReport || isSolanaScannerBacked(topVerdictReport, scannerReport)
                  ? solanaMintResolved
                    ? 'prime-token-resolution-banner--resolved prime-token-resolution-banner--solana'
                    : 'prime-token-resolution-banner--scenario'
                  : tokenContractConfirmed
                  ? 'prime-token-resolution-banner--resolved'
                  : report.tokenResolution?.manualOnly
                    ? 'prime-token-resolution-banner--manual'
                    : report.tokenResolution?.confirmationRequired
                      ? 'prime-token-resolution-banner--candidate'
                      : 'prime-token-resolution-banner--scenario'
              }`}
              role="status"
            >
              <p className="prime-token-resolution-banner__title">
                {isSolanaScannerBacked(topVerdictReport, scannerReport)
                  ? topVerdictReport.mintProofTitle || scannerProofBannerTitle(report, scannerReport)
                  : isSolanaTokenReport
                  ? solanaMintResolved
                    ? topVerdictReport.mintProofTitle || 'Token identified'
                    : topVerdictReport.mintProofTitle || UNRESOLVED_ASSET_TITLE
                  : tokenContractConfirmed
                  ? topVerdictReport.mintProofTitle || 'Token identified'
                  : report.tokenResolution?.manualOnly && !report.tokenResolution?.candidates?.length
                    ? report.tokenResolution.bannerTitle || 'Manual contract required'
                    : report.tokenResolution?.confirmationRequired
                      ? report.tokenResolution.bannerTitle || 'Candidate contract found'
                      : topVerdictReport.mintProofTitle || UNRESOLVED_ASSET_TITLE}
              </p>
              {topVerdictReport.contractProofSubtitle ? (
                <p className="prime-token-resolution-banner__subtitle text-sm text-slate-300 mt-1">
                  {topVerdictReport.contractProofSubtitle}
                </p>
              ) : null}
              <p className="prime-token-resolution-banner__copy">{topVerdictReport.contractProofNote}</p>
              {topVerdictReport.contractProofChainLine ? (
                <p className="prime-token-resolution-banner__chain text-xs text-cyan-200/90 mt-2 leading-relaxed">
                  {topVerdictReport.contractProofChainLine}
                </p>
              ) : null}

              {(tokenContractConfirmed || (isSolanaTokenReport && solanaMintResolved)) ? (
                <>
                  <p className="prime-token-resolution-banner__address font-mono text-xs mt-1">
                    {isSolanaTokenReport
                      ? solanaMintAddress
                      : confirmedTokenContract?.address || report.tokenResolution?.address}
                    <span className="text-slate-500">
                      {' '}
                      · via{' '}
                      {isSolanaTokenReport
                        ? report.tokenResolution?.source || report.targetClassification?.type || 'classifier'
                        : confirmedTokenContract?.source || report.tokenResolution?.source || 'registry'}
                    </span>
                  </p>
                  {showRiskScanner && !scannerSignals?.hasScan ? (
                    <button
                      type="button"
                      className="prime-token-resolution-banner__cta"
                      onClick={
                        isSolanaTokenReport ? handleRunSolanaTokenScan : handleRunResolvedContractScan
                      }
                      disabled={scannerBusy}
                    >
                      {isSolanaTokenReport ? 'Run Solana Token Scan' : 'Run Contract Analyzer'}
                    </button>
                  ) : null}
                </>
              ) : null}

              {!isSolanaTokenReport &&
              report.tokenResolution?.confirmationRequired &&
              report.tokenResolution.candidates?.length &&
              !tokenContractConfirmed ? (
                <div className="prime-token-candidates">
                  <p className="prime-token-candidates__hint">
                    {report.tokenResolution.candidateHint ||
                      report.tokenResolution.message ||
                      'Confirm this is the token you want to scan.'}
                  </p>
                  <ul className="prime-token-candidates__list">
                    {report.tokenResolution.candidates.map((c) => {
                      const liq =
                        c.liquidityLabel || formatCandidateLiquidity(c.liquidityUsd) || 'Liquidity unknown'
                      return (
                        <li key={`${c.chainId}:${c.address}`} className="prime-token-candidates__item">
                          <div className="prime-token-candidates__meta">
                            <p className="prime-token-candidates__pair">{c.pairName || c.tokenName}</p>
                            <p className="prime-token-candidates__address font-mono text-[11px]">{c.address}</p>
                            <p className="prime-token-candidates__chain text-[11px] text-slate-400">
                              {c.chainLabel || c.chainId}
                              {liq ? ` · ${liq}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="prime-token-candidates__use-btn"
                            onClick={() => handleConfirmTokenContract(c)}
                          >
                            Use this contract
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {report.modeId === 'token' && (report.narrativeContext || report.behaviorContext) ? (
            <div className="prime-token-intel-context">
              {report.scenarioTitle ? (
                <p className="prime-token-intel-context__scenario">
                  {report.narrativeCategory === 'meme' ? 'Narrative' : 'Market structure'} · {report.scenarioTitle}
                </p>
              ) : null}
              {report.narrativeContext ? (
                <p className="prime-token-intel-context__line">
                  <span className="prime-token-intel-context__label">Narrative</span>
                  {report.narrativeContext}
                </p>
              ) : null}
              {report.behaviorContext ? (
                <p className="prime-token-intel-context__line">
                  <span className="prime-token-intel-context__label">Behavior</span>
                  {report.behaviorContext}
                </p>
              ) : null}
            </div>
          ) : null}

          {report.modeId === 'protocol' && report.protocolProfile ? (
            <div className="prime-protocol-profile" role="region" aria-label="Protocol verification profile">
              <p className="prime-protocol-profile__eyebrow">Protocol verification profile</p>
              <p className="prime-protocol-profile__name">{report.protocolProfile.name}</p>
              {report.protocolProfile.verifiedDomain ? (
                <p className="prime-protocol-profile__domain">
                  Verified domain ·{' '}
                  <span className="font-mono">{report.protocolProfile.verifiedDomain}</span>
                </p>
              ) : null}
              <p className="prime-protocol-profile__summary">{report.protocolProfile.summary}</p>
              {report.protocolProfile.scanTargets?.length ? (
                <div className="prime-protocol-profile__targets">
                  <p className="prime-protocol-profile__targets-label">Recommended contract scans</p>
                  <ul className="prime-protocol-profile__target-list">
                    {report.protocolProfile.scanTargets.map((t) => (
                      <li key={t.id}>
                        <span>{t.label}</span>
                        <span className="font-mono text-[11px] text-slate-400">{t.address}</span>
                        {showRiskScanner ? (
                          <button
                            type="button"
                            className="prime-protocol-profile__scan-btn"
                            onClick={() => handleProtocolTargetScan(t.address)}
                            disabled={scannerBusy}
                          >
                            Scan
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="prime-protocol-profile__hint text-[11px] text-slate-500 mt-2">
                  No curated scan targets for this protocol — paste contract addresses from the official app into
                  Contract Trust.
                </p>
              )}
            </div>
          ) : null}

          <div className="prime-terminal-verdict-header">
            <span className={modeBadgeClass(report.modeTone)}>{report.modeLabel}</span>
            {report.modeId === 'token' && report.displayTarget ? (
              <span className="prime-terminal-target-chip">{report.displayTarget}</span>
            ) : null}
            {report.modeId === 'protocol' && report.protocolProfile?.verifiedDomain ? (
              <span className="prime-terminal-target-chip font-mono text-xs">
                {report.protocolProfile.verifiedDomain}
              </span>
            ) : null}
          </div>

          <p className="prime-terminal-mode-lead">{topVerdictReport.modeVerdict}</p>

          <div className="prime-terminal-evidence-preview">
            <p className="prime-terminal-evidence-preview__label">What we checked</p>
            <ul className="prime-terminal-evidence-preview__list">
              {report.evidencePreview.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className={`prime-verdict-panel ${panelToneClass(topVerdictReport.overallRisk, topVerdictReport.isPreliminary)}`}>
            <div className="prime-verdict-panel__layout">
              <div className="prime-verdict-panel__left">
                <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-slate-400 mb-3">
                  Executive verdict
                </p>
                <div className="flex flex-wrap items-start gap-5">
                  <div className="prime-verdict-panel__ring" aria-hidden />
                  <div className="space-y-3 min-w-0">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Overall risk</p>
                      <p
                        className={`prime-verdict-panel__risk ${riskClass(topVerdictReport.overallRisk, topVerdictReport.isPreliminary)}`}
                      >
                        {topVerdictReport.overallRiskDisplay || topVerdictReport.overallRisk}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Intelligence confidence</p>
                        <p className="text-xs text-white font-medium mt-1 leading-snug">{topVerdictReport.confidence}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
                          Scanner validation
                        </p>
                        <p className="text-xs text-white font-medium mt-1 leading-snug">{topVerdictReport.scannerValidation}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Target type</p>
                        <p className="text-xs text-white font-medium mt-1">{report.interactionType}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
                        {report.modeId === 'wallet' ? 'Wallet target' : 'Wallet index'}
                      </p>
                      <p className="text-sm font-mono text-violet-200 mt-1 break-all">
                        {report.modeId === 'wallet' && report.analysisWalletAddress
                          ? report.analysisWalletAddress
                          : report.walletSnapshot?.compact || 'Awaiting snapshot'}
                      </p>
                      {report.modeId === 'wallet' ? (
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          Exposure bands and approval inventory reflect your verified wallet when linked;
                          target wallet drives module routing and verdict framing.
                        </p>
                      ) : null}
                    </div>
                    {topVerdictReport.composite ? (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
                          Composite risk
                        </p>
                        <p className="text-xs font-mono text-slate-300">
                          {topVerdictReport.composite.score}/100 · {topVerdictReport.composite.verdictLabel}
                        </p>
                      </div>
                    ) : resolvedExecutive?.executiveRiskScore != null &&
                      resolvedExecutive.executiveRiskScore !== '—' ? (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
                          Executive risk
                        </p>
                        <p className="text-xs font-mono text-slate-300">
                          {resolvedExecutive.executiveRiskScore}/100 · {resolvedExecutive.executiveRiskBand}
                        </p>
                      </div>
                    ) : null}
                    {report.institutionalReasoning?.length ? (
                      <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4 mt-2">
                        {report.institutionalReasoning.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="prime-verdict-panel__right">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-2">Recommendation</p>
                <p className="text-sm text-slate-100 leading-relaxed">{topVerdictReport.recommendation}</p>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mt-4 mb-2">
                  Threat indicators
                </p>
                <div className="flex flex-wrap gap-2">
                  {topVerdictReport.threats.map((t) => (
                    <span key={t.label} className="prime-verdict-panel__pill">
                      {t.label}
                      <PriorityBadge level={t.level} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <ExecutiveSummaryCard summary={executiveSummary} variant="embed" />
          </div>

          <div className="mt-5">
            <ExecutiveIntelligenceCard
              executive={resolvedExecutive}
              coverageSources={intelligenceCoverage}
              coverageNote={
                topVerdictReport.providerCoverageNote ||
                (hasScannerEvidence(report, scannerReport)
                  ? 'Scanner-backed evidence available. Live narrative and behavior feeds may enhance this assessment when available.'
                  : 'Preliminary intelligence from registry and category context. Run Intelligence Scan for scanner-backed validation.')
              }
              riskExplainability={riskExplainability}
              variant="embed"
            />
          </div>

          <div className="prime-analyst-panel mt-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-violet-200/90 mb-3">
              AI analyst assessment
            </p>
            <dl className="prime-analyst-panel__grid">
              <div>
                <dt>Technical assessment</dt>
                <dd>
                  {resolvedAnalyst?.technicalAssessment ||
                    resolvedAnalyst?.summary ||
                    'Intelligence synthesis available in supporting evidence.'}
                </dd>
              </div>
              <div>
                <dt>Primary risk driver</dt>
                <dd>{resolvedAnalyst?.primaryRiskDriver || resolvedAnalyst?.keyConcern || '—'}</dd>
              </div>
              <div>
                <dt>Market structure assessment</dt>
                <dd>{resolvedAnalyst?.marketStructureAssessment || '—'}</dd>
              </div>
              <div>
                <dt>Recommended monitoring action</dt>
                <dd>
                  {resolvedAnalyst?.recommendedMonitoringAction ||
                    resolvedAnalyst?.nextMove ||
                    'Run Intelligence Scan again or expand supporting evidence.'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="prime-evidence-proof-header mt-6">
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-slate-400">Supporting evidence</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Wallet, narrative, behavior, and timeline proof
              {isSolanaTokenReport
                ? ' — market structure evidence for Solana SPL targets.'
                : ' — contract trust evidence when in contract mode.'}
            </p>
          </div>

          <div className="mt-4">
            <PrimeEvidenceLayers
              profile={profile}
              walletSnapshot={canonicalWallet}
              scannerReport={scannerReport}
              scanTarget={contractScanTarget}
              approvalRows={approvalRows}
              exposureHeatmap={exposureHeatmap}
              exposureHeatmapSubtitle={exposureHeatmapSubtitle}
              exposureHeatmapSources={exposureHeatmapSources}
              heatmapStatus={heatmapStatus}
              intelligenceFeed={intelligenceFeed}
              narrativeSubtitle={narrativeSubtitle(
                primeTrends,
                report.query,
                report.canonicalAsset || getReportCanonicalAsset(report),
              )}
              narrativeTargetSymbol={resolveNarrativeTargetSymbol(report)}
              behaviorSubtitle={behaviorSubtitle(watchlist, birdeyeAssets)}
              analysisModeId={
                isSolanaTokenReport
                  ? 'solana_token'
                  : report.modeId === 'token' && tokenContractConfirmed
                    ? 'contract'
                    : report.modeId
              }
              solanaMintAddress={isSolanaTokenReport ? solanaMintAddress : null}
              solanaSymbol={
                getAssetShortSymbol(report.canonicalAsset || getReportCanonicalAsset(report), '') ||
                report.targetClassification?.symbol ||
                report.tokenResolution?.symbol ||
                report.displayTarget
              }
              solanaTokenName={
                report.canonicalAsset?.name ||
                report.targetClassification?.name ||
                report.tokenResolution?.name
              }
              primeTrends={primeTrends}
              watchlist={watchlist}
              birdeyeAssets={birdeyeAssets}
              riskData={intel?.riskData ?? null}
              walletExposureProfile={
                report.walletExposureProfile ??
                intel?.walletExposureProfile ??
                intel?.riskData?.walletExposureProfile ??
                null
              }
              approvalRowsForExposure={approvalRows}
              report={report}
            />
          </div>

          <div className="prime-evidence-proof-header mt-8">
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-slate-400">
              Detailed intelligence modules
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Liquidity, wallet exposure, and scanner modules for extended review.
            </p>
          </div>

          {(report.modeId === 'token' || isSolanaTokenReport) &&
          (scannerReport?.tokenConcentration ||
            scannerReport?.liquidityIntelligence ||
            report?.liquidityIntelligence ||
            tokenContractConfirmed ||
            solanaMintResolved) ? (
            <div className="mt-5">
              <LiquidityIntelligenceCard
                report={report}
                scannerReport={
                  scannerReport?.liquidityIntelligence
                    ? scannerReport
                    : report?.liquidityIntelligence
                      ? {
                          chain: 'solana',
                          liquidityIntelligence: report.liquidityIntelligence,
                        }
                      : scannerReport
                }
                variant="embed"
              />
            </div>
          ) : null}

          {canonicalWallet.hasWallet ? (
            <div className="mt-5">
              <WalletExposureIntelligenceCard
                riskData={intel?.riskData ?? null}
                approvalRows={approvalRows}
                hasWallet={canonicalWallet.hasWallet}
                variant="embed"
              />
            </div>
          ) : null}

          {showSolanaTokenPanel ? (
            <div className="mt-5">
              <PrimeSolanaTokenPanel
                mintAddress={solanaMintAddress}
                symbol={
                  getAssetShortSymbol(report.canonicalAsset || getReportCanonicalAsset(report), '') ||
                  report.targetClassification?.symbol ||
                  report.tokenResolution?.symbol ||
                  report.displayTarget
                }
                tokenName={report.targetClassification?.name}
                scannerReport={scannerReport?.chain === 'solana' ? scannerReport : null}
                showRiskScanner={showRiskScanner}
                onRunSolanaScan={handleRunSolanaTokenScan}
                busy={scannerBusy}
                scanError={scanError}
              />
            </div>
          ) : null}

          {showContractAnalyzer ? (
            <div className="mt-5">
              <PrimeContractAnalyzerPanel
                scanTarget={contractScanTarget}
                terminalChain={chain}
                scannerReport={scannerReport?.chain === 'solana' ? null : scannerReport}
                approvalRows={approvalRows}
                showRiskScanner={showRiskScanner}
                onRunDeepScan={onRunDeepScan}
                busy={scannerBusy}
                scanError={scanError}
              />
            </div>
          ) : null}

          <p className="prime-preinteract-compliance mt-5">
            <Shield size={14} className="shrink-0 text-violet-300/80" aria-hidden />
            {COMPLIANCE}
          </p>
        </motion.div>
      ) : null}
    </motion.section>
  )
}
