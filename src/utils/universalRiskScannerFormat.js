import {
  formatHoneypotLabel,
  formatOwnershipLabel,
  formatProxyLabel,
} from '@/utils/contractIntelDisplay.js'
import { buildSolanaRiskScanView } from '@/utils/solanaRiskScannerFormat.js'
import {
  buildTokenConcentrationIntelligenceRows,
  verdictSubtitleFromReport,
} from '@/utils/tokenConcentrationFormat.js'
import { buildConfidenceView } from '@/utils/scannerConfidenceFormat.js'

/** @typedef {'contract' | 'token' | 'spender' | 'protocol'} ScanMode */

/**
 * @param {string | null | undefined} trustBand
 */
export function verdictFromTrustBand(trustBand) {
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
      return null
  }
}

/**
 * @param {string | null | undefined} trustBand
 * @param {boolean} isContract
 */
export function recommendationFromTrustBand(trustBand, isContract = true) {
  if (!isContract) return 'USE WALLET INTELLIGENCE'
  switch (String(trustBand || '').toUpperCase()) {
    case 'TRUSTED':
      return 'SAFE TO REVIEW'
    case 'MODERATE':
      return 'PROCEED WITH CAUTION'
    case 'ELEVATED':
      return 'HIGH RISK — AVOID APPROVAL'
    case 'HIGH_RISK':
      return 'DO NOT INTERACT'
    default:
      return 'PROCEED WITH CAUTION'
  }
}

/**
 * @param {string} verdict
 */
export function verdictToneClass(verdict) {
  if (verdict === 'LOW RISK') return 'prime-scanner-verdict--low'
  if (verdict === 'MODERATE WATCH') return 'prime-scanner-verdict--moderate'
  if (verdict === 'MODERATE RISK') return 'prime-scanner-verdict--moderate'
  if (verdict === 'HIGH RISK') return 'prime-scanner-verdict--high'
  if (verdict === 'CRITICAL RISK') return 'prime-scanner-verdict--critical'
  return 'prime-scanner-verdict--neutral'
}

/**
 * @param {object} report — contract intel API payload
 * @param {ScanMode} scanMode
 * @param {object} [opts]
 * @param {object[]} [opts.approvalRows]
 * @param {string} [opts.scannedAddress]
 */
export function buildUniversalRiskScanView(report, scanMode, opts = {}) {
  if (report?.chain === 'solana') {
    return buildSolanaRiskScanView(report)
  }

  const { approvalRows = [], scannedAddress = '' } = opts
  const addr = String(scannedAddress || report?.address || '').toLowerCase()
  const isContract = report?.isContract !== false

  if (!isContract) {
    return {
      isContract: false,
      verdict: 'WALLET / EOA',
      verdictTone: 'prime-scanner-verdict--neutral',
      trustScore: null,
      recommendation: recommendationFromTrustBand(null, false),
      contractType: 'Externally owned account (wallet)',
      narrative:
        report?.aiSummary ||
        report?.interpretationSummary ||
        'This address is a wallet (EOA), not a deployed smart contract. Use wallet intelligence modules for exposure review.',
      findings: report?.findings || [],
      intelligence: [
        { label: 'Address type', value: 'Externally owned account' },
        { label: 'Contract trust score', value: 'Not applicable' },
        { label: 'Approval risk', value: resolveApprovalRiskLabel(addr, approvalRows) },
        { label: 'Honeypot', value: 'Not applicable' },
        { label: 'Ownership', value: 'Not applicable' },
        { label: 'Proxy', value: 'Not applicable' },
        { label: 'Source verification', value: 'Not applicable' },
        { label: 'Liquidity signals', value: 'Not applicable' },
        { label: 'Behavioral heuristics', value: 'Use wallet activity intelligence' },
      ],
    }
  }

  const verdict = verdictFromTrustBand(report.trustBand)
  const findings = report.findings || []
  const verified = findings.some((f) => f.code === 'VERIFIED_SOURCE')
  const unverified = findings.some((f) => f.code === 'UNVERIFIED_SOURCE')
  const hasHighFinding = findings.some((f) => f.severity === 'HIGH')
  const exploitScore = report.exploitSimilarityHeuristics?.score
  const tokenIntel = buildTokenConcentrationIntelligenceRows(report)
  const isTokenSurface =
    Boolean(report.tokenConcentration) ||
    scanMode === 'token' ||
    report.addressType === 'TOKEN' ||
    /token/i.test(String(report.archetypeId || ''))

  const structuralRows = [
    { label: 'Honeypot', value: formatHoneypotLabel(report.honeypotRisk) },
    { label: 'Ownership', value: formatOwnershipLabel(report.ownershipConcentration) },
    { label: 'Proxy', value: formatProxyLabel(report.upgradeableProxy) },
    {
      label: 'Source verification',
      value: verified
        ? 'Verified on block explorer'
        : unverified
          ? 'Source not verified'
          : 'Verification status unavailable',
    },
    { label: 'Approval risk', value: resolveApprovalRiskLabel(addr, approvalRows) },
  ]

  const tailRows = isTokenSurface
    ? tokenIntel
    : [
        { label: 'Liquidity signals', value: resolveLiquidityLabel(report) },
        {
          label: 'Behavioral heuristics',
          value: resolveBehavioralLabel(report, hasHighFinding, exploitScore),
        },
      ]

  return {
    isContract: true,
    verdict,
    verdictTone: verdictToneClass(verdict),
    verdictSubtitle: verdictSubtitleFromReport(report),
    trustScore: report.trustScore,
    confidence: buildConfidenceView(report),
    recommendation: recommendationFromTrustBand(report.trustBand, true),
    contractType: inferContractType(report, scanMode),
    narrative:
      report.aiSummary ||
      report.interpretationSummary ||
      'Structured intelligence summary is unavailable for this scan.',
    findings,
    intelligence: [...structuralRows, ...tailRows, { label: 'Contract type', value: inferContractType(report, scanMode) }],
  }
}

/**
 * @param {object} report
 * @param {ScanMode} scanMode
 */
function inferContractType(report, scanMode) {
  if (report.archetypeLabel) return report.archetypeLabel
  const id = String(report.archetypeId || '')
  if (/uniswap|router|swap/i.test(id)) return 'DEX router'
  if (/permit2/i.test(id)) return 'Protocol allowance contract'
  if (/usdc|weth|token/i.test(id)) return 'Token contract'
  if (scanMode === 'token') return 'Token contract'
  if (scanMode === 'spender') return 'Wallet / spender address'
  if (scanMode === 'protocol') return 'Protocol contract'
  const p = report.privilegedFunctions || {}
  if (p.mint || p.blacklist) return 'Token contract'
  if (report.upgradeableProxy) return 'Upgradeable protocol contract'
  return 'Smart contract'
}

/**
 * @param {string} addr
 * @param {object[]} rows
 */
function resolveApprovalRiskLabel(addr, rows) {
  if (!addr || !rows?.length) return 'No approval risk detected for connected wallet'
  const match = rows.find(
    (r) =>
      String(r.spender || '').toLowerCase() === addr || String(r.token || '').toLowerCase() === addr,
  )
  if (!match) return 'No active approval to this address on connected wallet'
  if (match.unlimited) return 'Unlimited spender approval detected'
  if (match.riskLevel === 'HIGH' || match.riskLevel === 'ELEVATED') return 'Elevated approval surface'
  return 'Limited approval exposure'
}

function resolveLiquidityLabel(report) {
  if (report.dataSources?.goPlus === 'skipped') return 'Liquidity classification unavailable'
  if (report.archetypeId) return 'Established market liquidity profile (heuristic)'
  if (report.trustBand === 'HIGH_RISK') return 'Thin or unverified liquidity signals'
  return 'Standard liquidity heuristics — confirm on explorer'
}

function resolveBehavioralLabel(report, hasHighFinding, exploitScore) {
  if (report.honeypotRisk === 'HIGH') return 'Suspicious — honeypot heuristics triggered'
  if (hasHighFinding) return 'Suspicious privilege or trap patterns detected'
  if (exploitScore != null && exploitScore >= 65) return 'Elevated exploit-pattern similarity'
  if (report.trustBand === 'TRUSTED') return 'Normal production contract behavior'
  if (report.deployerHeuristics?.includes('Extensive')) return 'Normal — extensive production usage'
  return 'Mixed signals — review findings before signing'
}
