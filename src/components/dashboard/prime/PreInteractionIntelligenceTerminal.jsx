import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveLayerLaunch } from '@/components/dashboard/prime/primeIntelligenceLayerActions.js'
import { motion } from 'framer-motion'
import { ArrowRight, Radar, Search, Shield } from 'lucide-react'
import { isLiveLunarCrushStatus } from '@/data/lunarCrushScenarioShowcase.js'
import { buildPrimeWalletSnapshot } from '@/components/dashboard/prime/primeWalletRiskSnapshot.js'
import PrimeEvidenceLayers from '@/components/dashboard/prime/PrimeEvidenceLayers.jsx'
import PrimeContractAnalyzerPanel from '@/components/dashboard/prime/PrimeContractAnalyzerPanel.jsx'
import PrimeIntelligenceLayersGrid from '@/components/dashboard/prime/PrimeIntelligenceLayersGrid.jsx'
import {
  computeCompositeRisk,
  compositeScoreToRiskLevel,
} from '@/components/dashboard/prime/compositeRiskEngine.js'
import { buildInstitutionalTokenVerdict } from '@/components/dashboard/prime/primeInstitutionalVerdict.js'
import {
  buildRecommendation,
  deriveOverallRisk,
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
  { label: 'Sample wallet', query: '0xd8dA6BF26964aF9D7eEd9e03E53402D6A1C8c104', modeId: 'wallet' },
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
export function resolveActiveMode(query, forcedModeId, connectedWalletAddress = null) {
  const forced = forcedModeId && ANALYSIS_MODES[forcedModeId] ? ANALYSIS_MODES[forcedModeId] : null
  if (forced) return { ...forced }
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

function buildTokenNarrativeContext(primeTrends, targetSymbol) {
  const display = formatTokenDisplayLabel(targetSymbol)
  const live = isLiveLunarCrushStatus(primeTrends?.status)
  if (live && primeTrends?.summary) {
    return narrativeSummarySentence(primeTrends.summary, 260)
  }
  const fallback = buildCategoryNarrativeFallback(targetSymbol, display)
  return narrativeSummarySentence(fallback.narrativeText, 280)
}

/** Category-aware scenario label for token reports (non-live LunarCrush). */
function buildTokenScenarioTitle(targetSymbol) {
  return buildCategoryNarrativeFallback(targetSymbol).scenarioTitle
}

function buildFallbackScanReport({ query, chain, mode, canonicalWallet, primeTrends, errorMessage }) {
  const safeMode = mode?.id ? mode : ANALYSIS_MODES.token
  const trimmed = String(query || '').trim()
  const isToken = safeMode.id === 'token'
  const target = trimmed || 'token target'
  return {
    query: trimmed || target,
    target,
    displayTarget: isToken ? formatTokenDisplayLabel(trimmed) : trimmed,
    chain: CHAINS.find((c) => c.id === chain)?.label || chain || 'Ethereum',
    modeId: safeMode.id,
    modeLabel: safeMode.label,
    modeTone: safeMode.tone,
    interactionType: safeMode.interactionType,
    overallRisk: 'Moderate',
    overallRiskDisplay: 'Moderate',
    confidence: isToken ? 'Scenario / provider-prepared' : 'Preliminary',
    scannerValidation: isToken ? 'Scenario only' : 'Pending',
    isPreliminary: false,
    isFallback: true,
    fallbackMessage: isToken
      ? 'Token intelligence fallback active. Scenario intelligence is available; live provider feeds are pending.'
      : errorMessage ||
        'Intelligence scan could not complete. Provider fallback is active. Try again or run Contract Analyzer.',
    modeVerdict: modeVerdictLead(safeMode.id),
    evidencePreview: MODE_EVIDENCE_PREVIEW[safeMode.id] || MODE_EVIDENCE_PREVIEW.default,
    lunarLive: isLiveLunarCrushStatus(primeTrends?.status),
    birdeyeLive: false,
    providersPending: true,
    narrativeContext: isToken ? buildTokenNarrativeContext(primeTrends, trimmed) : null,
    behaviorContext: isToken ? 'Behavior Engine Ready — live Birdeye activation pending.' : null,
    scenarioTitle: isToken ? buildTokenScenarioTitle(trimmed) : null,
    scannerSignals: {},
    scannerMostlyClean: false,
    contractsUnderReview: 0,
    approvalsAtRisk: 0,
    walletSnapshot: canonicalWallet || { compact: 'Awaiting snapshot', hasWallet: false },
    recommendation: isToken
      ? 'Proceed with scenario narrative context; cross-check behavior and contract trust before exposure decisions.'
      : 'Retry the intelligence scan or open Contract Analyzer when a contract address is in scope.',
    analyst: {
      summary: isToken
        ? `${formatTokenDisplayLabel(trimmed) || 'Token'} intelligence uses scenario showcase narrative while live feeds are pending.`
        : 'Provider fallback is active for this scan.',
      keyConcern: isToken
        ? 'Live narrative and behavior feeds may be partial until provider activation.'
        : 'Full verdict synthesis did not complete — review evidence layers and retry.',
      nextMove: isToken
        ? 'Expand Narrative and Behavior evidence layers, then re-run scan when providers are live.'
        : 'Run Intelligence Scan again or use Contract Analyzer for contract-backed proof.',
    },
    threats: [
      { label: isToken ? 'Scenario narrative' : 'Fallback active', level: 'LOW' },
      { label: 'Behavior partial', level: 'LOW' },
    ],
    actions: [],
  }
}

/**
 * Adaptive analysis mode from search input (frontend-only).
 * EVM addresses are contract trust unless they exactly match the connected wallet.
 * Wallet mode is not inferred from EIP-55 casing or the word "wallet".
 */
export function detectAnalysisMode(raw, connectedWalletAddress = null) {
  const input = String(raw || '').trim()
  const lower = input.toLowerCase()

  if (!input) return { ...ANALYSIS_MODES.default }

  const looksLikeUrl =
    /^https?:\/\//i.test(input) ||
    /^www\./i.test(input) ||
    /^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(\/|$|\?)/i.test(lower)

  if (looksLikeUrl) return { ...ANALYSIS_MODES.protocol }

  if (lower.includes('permit') || lower.includes('spender') || lower.includes('approval')) {
    return { ...ANALYSIS_MODES.approval }
  }

  if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
    const inputNorm = normalizeEthAddress(input)
    const walletNorm = normalizeEthAddress(connectedWalletAddress)
    if (inputNorm && walletNorm && inputNorm === walletNorm) {
      return { ...ANALYSIS_MODES.wallet }
    }
    return { ...ANALYSIS_MODES.contract }
  }

  if (input.startsWith('0x')) {
    return { ...ANALYSIS_MODES.contract }
  }

  return { ...ANALYSIS_MODES.token }
}


function modeVerdictLead(modeId, { tokenResolution, tokenContractConfirmed, protocolProfile, scannerSignals } = {}) {
  switch (modeId) {
    case 'contract':
      return scannerSignals?.hasScan
        ? 'Contract trust validated via Contract Intelligence Engine — review Contract Trust Evidence.'
        : 'Contract Trust Analysis — Contract Analyzer is the primary proof path before interaction.'
    case 'token':
      if (tokenContractConfirmed) {
        return scannerSignals?.hasScan
          ? 'Token contract scanned — trust proof is scanner-backed via Contract Intelligence Engine.'
          : 'Token contract confirmed — run Contract Analyzer for scanner-backed bytecode and honeypot proof.'
      }
      if (tokenResolution?.confirmationRequired && tokenResolution.candidates?.length) {
        return tokenResolution.ambiguousNative
          ? `${tokenResolution.symbol || 'Token'} may be native or wrapped on multiple chains — confirm the exact contract before scanning.`
          : 'Candidate contract found — confirm the address before Contract Analyzer can provide scanner-backed proof.'
      }
      if (isTokenAutoResolved(tokenResolution) || scannerSignals?.hasScan) {
        return scannerSignals?.hasScan
          ? 'Token contract scanned — trust proof is scanner-backed via Contract Intelligence Engine.'
          : 'Token contract resolved — run Contract Analyzer for scanner-backed bytecode and honeypot proof.'
      }
      return 'Scenario and provider-prepared token intelligence only — contract proof unavailable until the token contract is resolved.'
    case 'approval':
      return 'Approval-based interaction requires explicit allowance review before signing.'
    case 'wallet':
      return 'Wallet exposure verdict reflects current connected-wallet risk posture.'
    case 'protocol':
      if (protocolProfile?.matched) {
        return `${protocolProfile.name} — verified domain profile. Scan recommended contract surfaces before signing.`
      }
      return 'Protocol Trust Review — preliminary until official contract surfaces are scanned.'
    default:
      return 'Pre-interaction risk check across token, contract, approval, wallet, and protocol surfaces.'
  }
}


function buildAnalystCopy(report, aiBrief, scannerReport) {
  if (report.isPreliminary) {
    return {
      summary: 'Preliminary intelligence posture — scanner validation has not completed.',
      keyConcern: 'Deep contract validation has not yet been executed.',
      nextMove: 'Run Deep Contract Scan in Contract Analyzer to unlock scanner-backed verdict and proof.',
    }
  }

  if (report.modeId === 'token' && report.narrativeElevated && report.scannerSignals?.hasScan) {
    const contractWord = report.contractRisk || 'Moderate'
    const summary =
      report.narrativeCategory === 'meme'
        ? `Contract scanner ${contractWord} — meme narrative volatility is elevated versus bytecode trust alone.`
        : `Contract scanner ${contractWord} — narrative risk exceeds contract-trust baseline.`
    const keyConcern =
      report.narrativeCategory === 'meme'
        ? 'Elevated narrative risk — speculative exposure velocity; not a scanner malice signal.'
        : 'Narrative category risk elevated — cross-check social and behavior evidence.'
    return {
      summary,
      keyConcern,
      nextMove:
        report.narrativeCategory === 'meme'
          ? 'Review approvals, liquidity depth, and position sizing; treat narrative velocity as speculative risk.'
          : 'Cross-check narrative and behavior panels before discretionary exposure.',
    }
  }

  if (report.scannerSignals?.hasScan && scannerReport) {
    const findings = (scannerReport.findings || []).filter((f) => f.severity === 'HIGH' || f.severity === 'MEDIUM')
    const top = findings[0] || (scannerReport.findings || [])[0]
    const summary = top
      ? `Scanner finding: ${top.title}${top.detail ? ` — ${top.detail}` : ''}`
      : report.scannerMostlyClean
        ? 'Scanner validation complete — contract surfaces mostly clean; confirm in Contract Trust Evidence.'
        : 'Scanner validation complete — review Contract Trust Evidence before interacting.'

    const keyConcern = top
      ? top.title
      : report.scannerSignals.honeypotDetected
        ? 'Honeypot or malicious token signal detected by scanner.'
        : report.scannerSignals.unlimitedApproval
          ? 'Unlimited or elevated approval risk flagged.'
          : report.narrativeCategory === 'meme' && !report.lunarLive
            ? 'Speculative narrative risk — scenario meme velocity active while LunarCrush live feed is pending.'
            : 'No severe scanner findings — maintain standard signing hygiene.'

    const nextMove =
      report.overallRisk === 'Critical' || report.overallRisk === 'High'
        ? 'Defer interaction until Contract Trust Evidence and approval inventory are reviewed.'
        : report.modeId === 'token' && report.narrativeCategory === 'meme'
          ? 'Review approvals, liquidity depth, and position sizing before exposure; treat narrative velocity as speculative risk.'
          : 'Proceed with caution; expand Contract Trust Evidence for bytecode and admin proof.'

    return { summary, keyConcern, nextMove }
  }

  const riskWord =
    report.overallRisk === 'Critical'
      ? 'Critical'
      : report.overallRisk === 'High'
        ? 'Elevated'
        : report.overallRisk === 'Moderate'
          ? 'Moderate'
          : 'Contained'

  const targetLabel =
    report.modeId === 'token'
      ? report.displayTarget || formatTokenDisplayLabel(report.target || report.query)
      : report.target || report.query
  const modeSummary = {
    token: report.narrativeElevated
      ? `${riskWord} token risk for ${targetLabel} — contract trust ${report.contractRisk || 'Moderate'}, narrative and wallet fit elevated composite.`
      : `${riskWord} token risk for ${targetLabel} — wallet fit and provider readiness applied.`,
    contract: `${riskWord} contract trust signals from wallet and provider context.`,
    approval: `${riskWord} approval risk — spender and allowance scope need review.`,
    wallet: `${riskWord} wallet exposure relative to connected-wallet baseline.`,
    protocol: `${riskWord} protocol trust — URL and contract surfaces require validation.`,
    default: `${riskWord} operational risk detected for this target.`,
  }

  const summary =
    aiBrief?.summary?.length > 20 && report.modeId === 'default'
      ? aiBrief.summary.split('.')[0].trim() + '.'
      : modeSummary[report.modeId] || modeSummary.default

  const keyConcern =
    report.approvalsAtRisk > 0
      ? 'Approval surface exceeds healthy baseline for verified wallet.'
      : report.contractsUnderReview > 0
        ? 'Contract trust signals require review before new interactions.'
        : report.modeId === 'token'
          ? 'Live narrative and behavior feeds may be partial until provider activation.'
          : aiBrief?.recommendation?.length > 20
            ? aiBrief.recommendation.split('.')[0].trim() + '.'
            : 'No critical drivers flagged — maintain disciplined signing posture.'

  const nextMove =
    report.overallRisk === 'Critical' || report.overallRisk === 'High'
      ? 'Review active spenders and revoke unnecessary allowances before proceeding.'
      : report.modeId === 'token'
        ? 'Cross-check narrative and behavior panels before discretionary exposure.'
        : 'Run Contract Analyzer when a contract address is in scope.'

  return { summary, keyConcern, nextMove }
}

function threatPills(report) {
  const pills = []
  if (report.isPreliminary && SCANNER_MODES.has(report.modeId)) {
    pills.push({ label: 'Scanner pending', level: 'LOW' })
    if (!report.lunarLive) pills.push({ label: 'Narrative partial', level: 'LOW' })
    if (!report.birdeyeLive) pills.push({ label: 'Behavior partial', level: 'LOW' })
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

function narrativeSubtitle(primeTrends, targetSymbol) {
  if (isLiveLunarCrushStatus(primeTrends?.status)) return 'LunarCrush live feed active'
  const cat = getTokenNarrativeCategory(targetSymbol)
  if (cat === 'meme') return 'Scenario Intelligence Active (live feed upgrade available)'
  if (cat !== 'unknown') return 'Category narrative fallback (live provider upgrade available)'
  return 'Narrative intelligence pending live provider'
}

function behaviorSubtitle(watchlist) {
  if (watchlist?.status === 'live') return 'Birdeye live feed active'
  return 'Behavior Engine Ready (live provider activation pending)'
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
}) {
  const trimmed = String(query || '').trim()
  const tokenContractConfirmed = hasTokenContractProof(tokenResolution, confirmedTokenContract)
  const lunarLive = isLiveLunarCrushStatus(primeTrends?.status)
  const birdeyeLive = watchlist?.status === 'live'
  const providersPending = !lunarLive || !birdeyeLive
  const approvalsAtRisk = approvalsOverride ?? intel?.approvalsAtRisk ?? 0
  const sig = scannerSignals || {}

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

  const tokenContractConfirmedEarly = hasTokenContractProof(tokenResolution, confirmedTokenContract)
  const narrativeCategoryEarly =
    mode.id === 'token' ? getTokenNarrativeCategory(trimmed) : null
  const narrativeRiskLevelEarly =
    mode.id === 'token'
      ? resolveNarrativeRiskLevel(narrativeCategoryEarly, { lunarLive })
      : null

  const composite = computeCompositeRisk({
    contractRiskLevel: contractRisk,
    narrativeRiskLevel: narrativeRiskLevelEarly || 'Moderate',
    behaviorInputs: {
      birdeyeLive,
      activityAnomalies: intel?.activityAnomalies ?? 0,
      watchlistLive: birdeyeLive,
    },
    walletInputs: {
      band: canonicalWallet.band,
      score: canonicalWallet.score,
      assessmentPending: canonicalWallet.assessmentPending,
      exposureIntelligence: intel?.riskData?.exposureIntelligence ?? intel?.exposureIntelligence,
    },
  })

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
      tokenUnresolved: !tokenContractConfirmedEarly,
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
        tokenUnresolved: !tokenContractConfirmedEarly,
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
    tokenContractConfirmed,
    scannerSignals: sig,
    presentation,
    lunarLive,
    birdeyeLive,
    riskFromApi: intel?.riskFromApi,
    providersPending,
  })

  const scannerValidation = resolveScannerValidationLabel({
    modeId: mode.id,
    tokenResolution,
    tokenContractConfirmed,
    scannerSignals: sig,
    presentation,
  })

  const draft = {
    query: trimmed || '(workspace baseline)',
    chain: CHAINS.find((c) => c.id === chain)?.label || chain,
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
    isPreliminary:
      mode.id === 'token'
        ? !tokenContractConfirmed || !sig.hasScan
        : mode.id === 'protocol'
          ? !sig.hasScan
          : presentation.isPreliminary,
    modeVerdict: modeVerdictLead(mode.id, {
      tokenResolution,
      tokenContractConfirmed,
      protocolProfile,
      scannerSignals: sig,
    }),
    tokenResolution: tokenResolution || null,
    tokenContractConfirmed,
    confirmedTokenContract: confirmedTokenContract || null,
    protocolProfile: protocolProfile || null,
    resolvedContractAddress: tokenContractConfirmed
      ? confirmedTokenContract?.address || tokenResolution?.address
      : null,
    evidencePreview: MODE_EVIDENCE_PREVIEW[mode.id] || MODE_EVIDENCE_PREVIEW.default,
    lunarLive,
    birdeyeLive,
    providersPending,
    scannerSignals: sig,
    scannerMostlyClean: Boolean(sig.mostlyClean),
    contractsUnderReview: intel?.contractsUnderReview ?? 0,
    approvalsAtRisk,
    walletSnapshot: canonicalWallet,
    composite: composite || null,
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
  draft.displayTarget = mode.id === 'token' ? formatTokenDisplayLabel(trimmed) : trimmed

  if (mode.id === 'token') {
    draft.narrativeCategory = getTokenNarrativeCategory(trimmed)
    if (tokenContractConfirmed) {
      draft.contractProofNote = 'Contract proof available'
      const catPanel = buildCategoryNarrativeFallback(trimmed)
      draft.scenarioTitle = lunarLive ? null : catPanel.scenarioTitle
      draft.narrativeContext =
        lunarLive
          ? null
          : catPanel.narrativeText ||
            buildTokenNarrativeContext(primeTrends, trimmed)
      draft.behaviorContext = sig.hasScan
        ? birdeyeLive
          ? 'Scanner-backed contract trust plus Birdeye behavior feed — narrative layer may still use scenario fallback.'
          : 'Scanner-backed contract trust — behavior feed partial; narrative may use category scenario fallback.'
        : 'Contract confirmed — run Contract Analyzer for scanner-backed proof; narrative uses category fallback until live feeds.'
    } else if (tokenResolution?.confirmationRequired && tokenResolution.candidates?.length) {
      draft.contractProofNote = tokenResolution.message
      draft.narrativeContext = buildTokenNarrativeContext(primeTrends, trimmed)
      draft.behaviorContext = birdeyeLive
        ? 'Birdeye behavior feed active — contract scan remains preliminary until you confirm a candidate.'
        : 'Behavior Engine Ready — confirm contract candidate before scanner-backed proof.'
      draft.scenarioTitle = lunarLive ? null : buildTokenScenarioTitle(trimmed)
    } else {
      draft.narrativeContext = buildTokenNarrativeContext(primeTrends, trimmed)
      draft.behaviorContext = birdeyeLive
        ? 'Birdeye behavior feed active for watchlist context.'
        : 'Behavior Engine Ready — live Birdeye activation pending.'
      draft.scenarioTitle = lunarLive ? null : buildTokenScenarioTitle(trimmed)
      draft.contractProofNote =
        tokenResolution?.message ||
        'Contract proof unavailable until token contract is resolved.'
    }
  }

  if (mode.id === 'protocol' && protocolProfile) {
    draft.narrativeContext = null
    draft.behaviorContext = null
    draft.scenarioTitle = null
  }

  return draft
}

function safeBuildScanReport(params) {
  try {
    const report = buildScanReport(params)
    if (!isValidReport(report)) {
      return {
        report: buildFallbackScanReport({
          query: params.query,
          chain: params.chain,
          mode: params.mode,
          canonicalWallet: params.canonicalWallet,
          primeTrends: params.primeTrends,
        }),
        failed: true,
      }
    }
    return { report, failed: false }
  } catch {
    return {
      report: buildFallbackScanReport({
        query: params.query,
        chain: params.chain,
        mode: params.mode,
        canonicalWallet: params.canonicalWallet,
        primeTrends: params.primeTrends,
      }),
      failed: true,
    }
  }
}

/**
 * Adaptive multi-mode threat intelligence terminal (frontend-only).
 */
export default function PreInteractionIntelligenceTerminal({
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
  const searchInputRef = useRef(null)
  const searchZoneRef = useRef(null)

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
    () => resolveActiveMode(query, forcedModeId, connectedWalletAddress),
    [query, forcedModeId, connectedWalletAddress],
  )
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
    (reportQuery, mode) => ({
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
      scannerReport,
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
    ],
  )

  const handleAnalyze = useCallback(async () => {
    const trimmed = String(query || '').trim()
    if (!trimmed) return

    const mode = resolveActiveMode(query, forcedModeId, connectedWalletAddress)
    setResolveBusy(true)
    setConfirmedTokenContract(null)
    resetScannerTargetState()
    let tokenResolution = null
    let protocolProfile = null

    try {
      if (mode.id === 'token') {
        tokenResolution = await resolveTokenSymbol(trimmed, chain)
      } else if (mode.id === 'protocol') {
        protocolProfile = resolveProtocolUrl(trimmed)
      }

      const { report: nextReport, failed } = safeBuildScanReport({
        ...reportBuildParams(trimmed, mode),
        tokenResolution,
        protocolProfile,
        confirmedTokenContract: null,
      })
      setReport(nextReport)
      setScanFailed(failed)
    } catch {
      const { report: nextReport, failed } = safeBuildScanReport({
        ...reportBuildParams(trimmed, mode),
        tokenResolution: null,
        protocolProfile: null,
      })
      setReport(nextReport)
      setScanFailed(failed)
    } finally {
      setResolveBusy(false)
    }
  }, [query, forcedModeId, chain, connectedWalletAddress, reportBuildParams, resetScannerTargetState])

  useEffect(() => {
    if (!report || report.isFallback) return
    const modeKey = report.modeId && ANALYSIS_MODES[report.modeId] ? report.modeId : forcedModeId
    const mode = modeKey
      ? { ...ANALYSIS_MODES[modeKey] }
      : resolveActiveMode(report.query, forcedModeId, connectedWalletAddress)
    const reportQuery = report.query === '(workspace baseline)' ? query : report.query
    const { report: nextReport, failed } = safeBuildScanReport({
      ...reportBuildParams(reportQuery, mode),
      tokenResolution: report.tokenResolution,
      protocolProfile: report.protocolProfile,
      confirmedTokenContract,
    })
    if (isValidReport(nextReport)) {
      setReport(nextReport)
      setScanFailed(failed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh verdict when scanner completes
  }, [scannerSignals, scannerReport, connectedWalletAddress, confirmedTokenContract])

  const applyModeChip = (modeId) => {
    const sample = EXAMPLE_CHIPS.find((c) => c.modeId === modeId)
    setForcedModeId(modeId)
    setPreparedInvestigation(null)
    setScanFailed(false)
    setConfirmedTokenContract(null)
    resetScannerTargetState()
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
      if (!launch.skipQueryPrefill && launch.query) setQuery(launch.query)
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

  const lunarLivePreview = isLiveLunarCrushStatus(primeTrends?.status)
  const birdeyeLivePreview = watchlist?.status === 'live'

  const tokenContractConfirmed = hasTokenContractProof(
    report?.tokenResolution,
    confirmedTokenContract,
  )

  const showContractAnalyzer =
    report?.modeId === 'contract' ||
    (report?.modeId === 'token' && tokenContractConfirmed) ||
    (report?.modeId === 'protocol' && protocolActiveScanAddress && scannerSignals?.hasScan)

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
    const { report: nextReport, failed } = safeBuildScanReport({
      ...reportBuildParams(report.query, mode),
      tokenResolution: report.tokenResolution,
      protocolProfile: report.protocolProfile,
      confirmedTokenContract,
    })
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
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="prime-preinteract-chain-select"
            aria-label="Chain"
          >
            {CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
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
            Enter a token, contract, wallet, spender, or protocol URL first.
          </p>
        ) : null}

        {query.trim() || forcedModeId ? (
          <div className="prime-terminal-mode-detect mt-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
              {modeFromModule || forcedModeId ? 'Selected mode' : 'Detected mode'}
            </span>
            <span className={modeBadgeClass(activeMode.tone)}>{activeMode.label}</span>
          </div>
        ) : null}

        {preparedInvestigation ? (
          <div className="prime-investigation-prepared" role="status">
            <p className="prime-investigation-prepared__eyebrow">Investigation prepared</p>
            <p className="prime-investigation-prepared__message">{preparedInvestigation.previewMessage}</p>
            {preparedInvestigation.target ? (
              <p className="prime-investigation-prepared__target">
                Target · <span className="font-mono">{preparedInvestigation.target}</span>
              </p>
            ) : null}
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
            Load example threat
          </button>
        </div>

        {!report ? (
          <div className="prime-provider-compact-preview mt-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-2">
              Provider-ready snapshot
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="prime-provider-compact-preview__chip">
                Narrative · {lunarLivePreview ? 'Live' : 'Scenario showcase'}
              </span>
              <span className="prime-provider-compact-preview__chip">
                Behavior · {birdeyeLivePreview ? 'Live' : 'Engine ready'}
              </span>
              <span className="prime-provider-compact-preview__chip">
                Scanner · {showRiskScanner ? 'Available' : 'Verify wallet'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Run an intelligence scan to open executive verdict, AI analyst interpretation, and evidence proof layers.
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
          {report.isFallback || scanFailed ? (
            <div className="prime-scan-fallback" role="alert">
              <p className="prime-scan-fallback__title">
                {report.modeId === 'token' ? 'Token intelligence fallback active' : 'Scan fallback active'}
              </p>
              <p className="prime-scan-fallback__copy">
                {report.fallbackMessage ||
                  'Intelligence scan could not complete. Provider fallback is active. Try again or run Contract Analyzer.'}
              </p>
            </div>
          ) : null}

          {report.modeId === 'token' && report.contractProofNote ? (
            <div
              className={`prime-token-resolution-banner ${
                tokenContractConfirmed
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
                {tokenContractConfirmed
                  ? 'Contract proof available'
                  : report.tokenResolution?.manualOnly && !report.tokenResolution?.candidates?.length
                    ? report.tokenResolution.bannerTitle || 'Manual contract required'
                    : report.tokenResolution?.confirmationRequired
                      ? report.tokenResolution.bannerTitle || 'Candidate contract found'
                      : 'Scenario-only token analysis'}
              </p>
              <p className="prime-token-resolution-banner__copy">{report.contractProofNote}</p>

              {tokenContractConfirmed ? (
                <>
                  <p className="prime-token-resolution-banner__address font-mono text-xs mt-1">
                    {confirmedTokenContract?.address || report.tokenResolution?.address}
                    <span className="text-slate-500">
                      {' '}
                      · via {confirmedTokenContract?.source || report.tokenResolution?.source || 'registry'}
                    </span>
                  </p>
                  {showRiskScanner && !scannerSignals?.hasScan ? (
                    <button
                      type="button"
                      className="prime-token-resolution-banner__cta"
                      onClick={handleRunResolvedContractScan}
                      disabled={scannerBusy}
                    >
                      Run Contract Analyzer
                    </button>
                  ) : null}
                </>
              ) : null}

              {report.tokenResolution?.confirmationRequired &&
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
                  {report.narrativeCategory === 'meme' ? 'Scenario' : 'Narrative'} · {report.scenarioTitle}
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

          <p className="prime-terminal-mode-lead">{report.modeVerdict}</p>

          <div className="prime-terminal-evidence-preview">
            <p className="prime-terminal-evidence-preview__label">What we checked</p>
            <ul className="prime-terminal-evidence-preview__list">
              {report.evidencePreview.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className={`prime-verdict-panel ${panelToneClass(report.overallRisk, report.isPreliminary)}`}>
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
                        className={`prime-verdict-panel__risk ${riskClass(report.overallRisk, report.isPreliminary)}`}
                      >
                        {report.overallRiskDisplay || report.overallRisk}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Confidence</p>
                        <p className="text-xs text-white font-medium mt-1 leading-snug">{report.confidence}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
                          Scanner validation
                        </p>
                        <p className="text-xs text-white font-medium mt-1 leading-snug">{report.scannerValidation}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Target type</p>
                        <p className="text-xs text-white font-medium mt-1">{report.interactionType}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Wallet index</p>
                      <p className="text-sm font-mono text-violet-200 mt-1">
                        {report.walletSnapshot?.compact || 'Awaiting snapshot'}
                      </p>
                    </div>
                    {report.composite ? (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
                          Composite risk
                        </p>
                        <p className="text-xs font-mono text-slate-300">
                          {report.composite.score}/100 · {report.composite.verdictLabel}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
                          Contract {report.composite.subscores.contractRisk}/100 · Narrative{' '}
                          {report.composite.subscores.narrativeRisk}/100 · Behavior{' '}
                          {report.composite.subscores.behaviorRisk}/100
                          {report.composite.subscores.walletExposureRisk != null
                            ? ` · Wallet exposure ${report.composite.subscores.walletExposureRisk}/100`
                            : ''}
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
                <p className="text-sm text-slate-100 leading-relaxed">{report.recommendation}</p>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mt-4 mb-2">
                  Threat indicators
                </p>
                <div className="flex flex-wrap gap-2">
                  {report.threats.map((t) => (
                    <span key={t.label} className="prime-verdict-panel__pill">
                      {t.label}
                      <PriorityBadge level={t.level} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="prime-analyst-panel mt-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-violet-200/90 mb-3">AI analyst</p>
            <dl className="prime-analyst-panel__grid">
              <div>
                <dt>Summary</dt>
                <dd>{report.analyst?.summary || 'Intelligence synthesis available in evidence layers.'}</dd>
              </div>
              <div>
                <dt>Key concern</dt>
                <dd>{report.analyst?.keyConcern || 'Review provider readiness before exposure decisions.'}</dd>
              </div>
              <div>
                <dt>Recommended next move</dt>
                <dd>{report.analyst?.nextMove || 'Run Intelligence Scan again or expand evidence layers.'}</dd>
              </div>
            </dl>
          </div>

          {showContractAnalyzer ? (
            <div className="mt-5">
              <PrimeContractAnalyzerPanel
                scanTarget={contractScanTarget}
                terminalChain={chain}
                scannerReport={scannerReport}
                approvalRows={approvalRows}
                showRiskScanner={showRiskScanner}
                onRunDeepScan={onRunDeepScan}
                busy={scannerBusy}
                scanError={scanError}
              />
            </div>
          ) : null}

          <div className="prime-evidence-proof-header mt-6">
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-slate-400">Evidence proof layers</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Wallet, narrative, behavior, and timeline proof — contract trust evidence when in contract mode.
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
              narrativeSubtitle={narrativeSubtitle(primeTrends, report.query)}
              narrativeTargetSymbol={
                report.query &&
                report.query !== '(workspace baseline)' &&
                !/^0x[a-fA-F0-9]{40}$/i.test(String(report.query).trim())
                  ? report.query
                  : null
              }
              behaviorSubtitle={behaviorSubtitle(watchlist)}
              analysisModeId={
                report.modeId === 'token' && tokenContractConfirmed ? 'contract' : report.modeId
              }
              primeTrends={primeTrends}
              watchlist={watchlist}
              birdeyeAssets={birdeyeAssets}
            />
          </div>

          <p className="prime-preinteract-compliance mt-5">
            <Shield size={14} className="shrink-0 text-violet-300/80" aria-hidden />
            {COMPLIANCE}
          </p>
        </motion.div>
      ) : null}
    </motion.section>
  )
}
