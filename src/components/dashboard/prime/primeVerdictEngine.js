const RISK_LEVELS = ['Low', 'Moderate', 'High', 'Critical']
const RISK_IDX = Object.fromEntries(RISK_LEVELS.map((l, i) => [l, i]))
const SCAN_REQUIRED_MODES = new Set(['contract', 'approval', 'protocol'])

/** Categories that use infrastructure/stable narrative templates — not meme escalation. */
const NON_MEME_NARRATIVE_CATEGORIES = new Set(['oracle', 'defi', 'stablecoin', 'l2'])

/** Findings that may escalate executive verdict beyond scanner band. */
const SEVERE_SCANNER_FINDING_CODES = new Set([
  'HONEYPOT_SIGNAL',
  'LP_UNLOCKED',
  'TOP10_CONCENTRATION',
  'WHALE_DOMINANCE',
  'FRESH_DEPLOY',
])

function maxRisk(a, b) {
  return RISK_IDX[a] >= RISK_IDX[b] ? a : b
}

/** Map backend trustBand to executive risk baseline when scanner report is present. */
export function executiveRiskFromTrustBand(trustBand) {
  switch (String(trustBand || '').toUpperCase()) {
    case 'TRUSTED':
      return 'Low'
    case 'MODERATE':
      return 'Moderate'
    case 'ELEVATED':
      return 'High'
    case 'HIGH_RISK':
      return 'Critical'
    default:
      return 'Moderate'
  }
}

function bumpRisk(level) {
  const i = Math.min(RISK_LEVELS.length - 1, (RISK_IDX[level] ?? 1) + 1)
  return RISK_LEVELS[i]
}

export function hasMaliciousIndicators(query, interactionType) {
  const lower = String(query || '').toLowerCase()
  return (
    lower.includes('honeypot') ||
    lower.includes('malicious') ||
    lower.includes('drainer') ||
    (interactionType === 'Spender' && lower.includes('0x000000000022'))
  )
}

/**
 * Derive severity flags from scanner report (frontend-only).
 */
export function deriveScannerSignals(report, view) {
  if (!report) {
    return {
      hasScan: false,
      mostlyClean: false,
      honeypotDetected: false,
      maliciousScanner: false,
      unlimitedApproval: false,
      severeFindings: false,
    }
  }

  const findings = report.findings || []
  const intel = view?.intelligence || []
  const row = (label) => intel.find((r) => r.label === label)?.value || ''

  const honeypotDetected =
    report.honeypotRisk === 'HIGH' ||
    /malicious token signal/i.test(row('Honeypot')) ||
    findings.some((f) => /honeypot/i.test(`${f.code}${f.title}`))

  const maliciousScanner =
    report.trustBand === 'HIGH_RISK' || view?.verdict === 'CRITICAL RISK'

  const unlimitedApproval = /unlimited/i.test(row('Approval risk'))
  const severeFindings = findings.some(
    (f) => f.severity === 'HIGH' && SEVERE_SCANNER_FINDING_CODES.has(String(f.code || '')),
  )

  const verifiedSource =
    findings.some((f) => f.code === 'VERIFIED_SOURCE') ||
    /verified on block explorer/i.test(row('Source verification'))
  const honeypotClear = !honeypotDetected
  const proxyAcceptable =
    !report.upgradeableProxy ||
    (verifiedSource && ['TRUSTED', 'MODERATE'].includes(String(report.trustBand || '')))
  const lowApprovalRisk =
    !unlimitedApproval &&
    /no approval risk|no active approval|limited approval|not applicable/i.test(row('Approval risk'))
  const whaleLow = !/elevated|high risk|concentrated|suspicious/i.test(
    `${row('Holder concentration')}${row('Whale risk')}${row('Behavioral heuristics')}`,
  )

  const mostlyClean =
    honeypotClear &&
    proxyAcceptable &&
    lowApprovalRisk &&
    !maliciousScanner &&
    !severeFindings &&
    !unlimitedApproval &&
    (verifiedSource || !findings.some((f) => f.severity === 'HIGH')) &&
    whaleLow

  return {
    hasScan: true,
    mostlyClean,
    honeypotDetected,
    maliciousScanner,
    unlimitedApproval,
    severeFindings,
  }
}

/**
 * Conservative verdict — High/Critical only after scanner validation when scan is required.
 */
export function deriveOverallRisk({
  score,
  modeId,
  interactionType,
  contractsUnderReview,
  approvalsAtRisk,
  riskDrivers,
  query,
  scannerReport,
  scannerSignals,
}) {
  const walletScore = Number.isFinite(Number(score)) ? Number(score) : 50
  const scannerClear = (contractsUnderReview ?? 0) === 0
  const approvalConcern = (approvalsAtRisk ?? 0) > 0
  const highDrivers = riskDrivers?.some((d) => d.severity === 'HIGH') ?? false
  const sig = scannerSignals || {}
  const scanRequired = SCAN_REQUIRED_MODES.has(modeId)
  const trustBand = scannerReport?.trustBand

  if (hasMaliciousIndicators(query, interactionType)) return 'Critical'

  if (scanRequired && !sig.hasScan) {
    return 'Moderate'
  }

  if (sig.hasScan && trustBand) {
    let level = executiveRiskFromTrustBand(trustBand)

    if (sig.honeypotDetected || sig.maliciousScanner) return 'Critical'
    if (sig.unlimitedApproval && (modeId === 'approval' || interactionType === 'Spender')) {
      return 'Critical'
    }

    if (sig.severeFindings && !scannerReport?.archetypeId) {
      level = maxRisk(level, 'High')
    }

    if (approvalConcern && (modeId === 'approval' || interactionType === 'Spender')) {
      level = maxRisk(level, 'Moderate')
    }

    if (trustBand === 'MODERATE' || trustBand === 'TRUSTED') {
      if (level === 'High' && !sig.severeFindings && !sig.honeypotDetected) {
        level = 'Moderate'
      }
      if (level === 'Critical' && !sig.honeypotDetected && !sig.maliciousScanner) {
        level = 'High'
      }
    }

    if (sig.mostlyClean && trustBand === 'TRUSTED') level = 'Low'
    else if (sig.mostlyClean) level = executiveRiskFromTrustBand(trustBand)

    return level
  }

  let level = 'Moderate'

  if (walletScore < 30 && scannerClear && !approvalConcern && !highDrivers) {
    level = 'Low'
  } else if (walletScore <= 60) {
    level = 'Moderate'
  } else if (modeId === 'token' && scannerClear && !approvalConcern && !highDrivers) {
    level = 'Moderate'
  }

  if (modeId === 'approval' && level === 'Low') level = 'Moderate'

  return level
}

/**
 * Narrative layer severity for TOKEN RISK INTELLIGENCE (not Contract Analyzer).
 * @param {string} narrativeCategory
 * @param {{ lunarLive?: boolean }} [opts]
 */
export function resolveNarrativeRiskLevel(narrativeCategory, { lunarLive = false } = {}) {
  const cat = String(narrativeCategory || 'unknown')
  if (cat === 'meme') return lunarLive ? 'Moderate' : 'High'
  if (cat === 'unknown') return 'Moderate'
  if (cat === 'l2') return 'Moderate'
  if (NON_MEME_NARRATIVE_CATEGORIES.has(cat)) return 'Low'
  return 'Moderate'
}

/**
 * Combine contract-scanner baseline with narrative, behavior coverage, and wallet fit.
 * Contract Analyzer trust band remains contract-only via `contractRisk`.
 */
export function deriveTokenExecutiveRisk({
  contractRisk = 'Moderate',
  narrativeCategory = 'unknown',
  lunarLive = false,
  birdeyeLive = false,
  providersPending = true,
  walletScore = 50,
  approvalsAtRisk = 0,
  scannerSignals = {},
  tokenUnresolved = false,
}) {
  let level = contractRisk || 'Moderate'
  const narrativeLevel = resolveNarrativeRiskLevel(narrativeCategory, { lunarLive })
  level = maxRisk(level, narrativeLevel)

  if (tokenUnresolved || (narrativeCategory === 'unknown' && providersPending)) {
    level = maxRisk(level, 'Moderate')
  }

  if (!birdeyeLive && narrativeCategory === 'meme') {
    level = maxRisk(level, 'Moderate')
  }

  const walletScoreN = Number(walletScore)
  if (Number.isFinite(walletScoreN) && walletScoreN >= 62) {
    level = maxRisk(level, 'Moderate')
  }
  if (approvalsAtRisk > 0 && narrativeCategory === 'meme') {
    level = maxRisk(level, 'High')
  }

  if (scannerSignals?.mostlyClean && !scannerSignals?.honeypotDetected && !scannerSignals?.maliciousScanner) {
    if (level === 'Critical') level = 'High'
  }

  return level
}

/**
 * @param {string} overallRisk
 * @param {string} narrativeCategory
 * @param {string} contractRisk
 * @param {boolean} narrativeElevated
 */
export function formatTokenExecutiveDisplay(overallRisk, narrativeCategory, contractRisk, narrativeElevated) {
  if (!narrativeElevated || narrativeCategory !== 'meme') return overallRisk
  if (overallRisk === 'High' && (contractRisk === 'Low' || contractRisk === 'Moderate')) {
    return 'High — Speculative narrative risk'
  }
  if (overallRisk === 'Moderate' && contractRisk === 'Low') {
    return 'Moderate — Elevated narrative risk'
  }
  return overallRisk
}

export function isNarrativeElevated(contractRisk, executiveRisk) {
  return (RISK_IDX[executiveRisk] ?? 0) > (RISK_IDX[contractRisk] ?? 0)
}

export function memeTokenRecommendation(scannerSignals) {
  if (scannerSignals?.honeypotDetected || scannerSignals?.maliciousScanner) {
    return 'Defer interaction until contract trust and approval inventory are validated.'
  }
  return 'Review approvals, liquidity depth, and position sizing before exposure; treat narrative velocity as speculative risk.'
}

export function deriveConfidence({ lunarLive, birdeyeLive, riskFromApi, providersPending, isPreliminary }) {
  if (isPreliminary) return 'Preliminary'
  if (lunarLive && birdeyeLive && riskFromApi) return 'High'
  if (providersPending || !riskFromApi) return 'Partial provider coverage'
  return 'Medium'
}

/**
 * Terminal-facing confidence copy — honors contract intel as source of truth.
 */
export function resolveTerminalConfidence({
  modeId,
  tokenResolution,
  tokenContractConfirmed,
  scannerSignals,
  presentation,
  lunarLive,
  birdeyeLive,
  riskFromApi,
  providersPending,
}) {
  if (modeId === 'token') {
    if (tokenResolution?.confirmationRequired && !tokenContractConfirmed) {
      return 'Preliminary — confirm contract'
    }
    if (!tokenContractConfirmed) return 'Scenario / provider-prepared'
    if (scannerSignals?.hasScan) return 'Scanner-backed'
    return 'Contract proof available — awaiting scan'
  }

  if (modeId === 'protocol') {
    if (scannerSignals?.hasScan) return 'Scanner-backed'
    return 'Preliminary until contract surfaces are scanned'
  }

  if (modeId === 'contract') {
    if (scannerSignals?.hasScan) {
      return deriveConfidence({
        lunarLive,
        birdeyeLive,
        riskFromApi,
        providersPending,
        isPreliminary: false,
      })
    }
    if (presentation?.isPreliminary) return 'Awaiting scanner validation'
    return 'Awaiting scanner validation'
  }

  if (presentation?.isPreliminary) return presentation.confidence || 'Preliminary'
  return deriveConfidence({
    lunarLive,
    birdeyeLive,
    riskFromApi,
    providersPending,
    isPreliminary: false,
  })
}

export function resolveScannerValidationLabel({
  modeId,
  tokenResolution,
  tokenContractConfirmed,
  scannerSignals,
  presentation,
}) {
  if (modeId === 'token') {
    if (tokenResolution?.confirmationRequired && !tokenContractConfirmed) return 'Confirm contract'
    if (!tokenContractConfirmed) return 'Scenario only'
    if (scannerSignals?.hasScan) return 'Complete'
    return 'Contract scan available'
  }
  if (modeId === 'protocol') {
    if (scannerSignals?.hasScan) return 'Complete'
    return 'Pending contract scans'
  }
  return presentation?.scannerValidation || (scannerSignals?.hasScan ? 'Complete' : 'Pending')
}

/** Display layer for honest pre-scan contract verdicts. */
export function resolveVerdictPresentation({
  modeId,
  scannerSignals,
  derivedRisk,
  confidenceInputs,
  overallRiskDisplay,
}) {
  const scanRequired = SCAN_REQUIRED_MODES.has(modeId)
  const pending = scanRequired && !scannerSignals?.hasScan

  if (pending) {
    return {
      overallRiskDisplay: overallRiskDisplay || 'Preliminary Moderate',
      confidence: 'Preliminary',
      scannerValidation: 'Pending',
      isPreliminary: true,
      derivedRisk,
    }
  }

  return {
    overallRiskDisplay: overallRiskDisplay || derivedRisk,
    confidence: deriveConfidence({ ...confidenceInputs, isPreliminary: false }),
    scannerValidation: scanRequired ? (scannerSignals?.hasScan ? 'Complete' : 'Pending') : 'Not required',
    isPreliminary: false,
    derivedRisk,
  }
}

export function buildRecommendation(report) {
  if (
    report.modeId === 'token' &&
    report.narrativeCategory === 'meme' &&
    report.scannerSignals?.hasScan &&
    !report.scannerSignals?.honeypotDetected &&
    !report.scannerSignals?.maliciousScanner
  ) {
    return memeTokenRecommendation(report.scannerSignals)
  }
  if (report.modeId === 'token' && report.tokenResolution?.confirmationRequired && !report.tokenContractConfirmed) {
    return 'Review candidate contracts and click Use this contract before running Contract Analyzer.'
  }
  if (report.modeId === 'token' && report.tokenContractConfirmed && !report.scannerSignals?.hasScan) {
    return 'Run Contract Analyzer on the confirmed token contract for scanner-backed trust proof before exposure decisions.'
  }
  if (report.modeId === 'token' && !report.tokenContractConfirmed) {
    return 'Contract proof unavailable until the token contract is resolved. Use scenario narrative only — do not treat as bytecode proof.'
  }
  if (report.modeId === 'protocol' && !report.scannerSignals?.hasScan) {
    return 'Confirm the official protocol URL, then run Contract Analyzer on recommended router or spender contracts before signing.'
  }
  if (report.isPreliminary) {
    return 'Run Deep Contract Scan in Contract Analyzer before relying on this verdict for signing or approvals.'
  }
  if (report.scannerMostlyClean || (report.scannerSignals?.mostlyClean && report.providersPending)) {
    return 'Proceed with caution and verify liquidity/holder distribution.'
  }
  if (report.overallRisk === 'Critical') {
    return 'Defer interaction until spender scope, contract trust, and approval inventory are validated.'
  }
  if (report.overallRisk === 'High') {
    return 'Review approval surface and contract trust before executing; cap allowances where possible.'
  }
  if (report.modeId === 'approval' || report.modeId === 'protocol') {
    return 'Confirm official protocol URL and spender permissions before signing.'
  }
  if (report.modeId === 'contract') {
    return 'Contract Analyzer validation complete — review Contract Trust Evidence before interacting.'
  }
  return 'Proceed with standard pre-interaction hygiene and evidence review.'
}
