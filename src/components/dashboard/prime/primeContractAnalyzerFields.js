import { buildUniversalRiskScanView } from '@/utils/universalRiskScannerFormat.js'
import { formatOwnershipLabel, formatProxyLabel } from '@/utils/contractIntelDisplay.js'

export const CONTRACT_ANALYZER_FIELDS = [
  'Source verification',
  'Honeypot',
  'Proxy / upgradeability',
  'Ownership/admin surface',
  'Approval risk',
  'Liquidity status',
  'Holder concentration',
  'Whale risk',
  'Deployment age',
]

export const TERMINAL_CHAIN_TO_SCAN_ID = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  polygon: 137,
  solana: 'solana',
}

const INTEL_LABEL_MAP = {
  'Source verification': 'Source verification',
  Honeypot: 'Honeypot',
  Proxy: 'Proxy / upgradeability',
  Ownership: 'Ownership/admin surface',
  'Approval risk': 'Approval risk',
  'Liquidity signals': 'Liquidity status',
  'Holder concentration': 'Holder concentration',
  'Whale risk': 'Whale risk',
  'Behavioral heuristics': 'Whale risk',
  'Deployment age': 'Deployment age',
}

export function toneFromAnalyzerValue(value) {
  const v = String(value || '').toLowerCase()
  if (/malicious|unlimited|critical|high risk|upgradeable proxy|not verified|elevated|suspicious/i.test(v)) {
    return 'warn'
  }
  if (/verified|non-upgradeable|no approval|no honeypot|low|clear|normal|dispersed|not applicable/i.test(v)) {
    return 'ok'
  }
  return 'neutral'
}

function mapIntelToFields(view) {
  const byLabel = new Map()
  for (const item of view?.intelligence || []) {
    const mapped = INTEL_LABEL_MAP[item.label] || item.label
    if (!CONTRACT_ANALYZER_FIELDS.includes(mapped)) continue
    if (!byLabel.has(mapped)) byLabel.set(mapped, item.value)
  }
  return CONTRACT_ANALYZER_FIELDS.map((label) => ({
    label,
    value: byLabel.get(label) || null,
    pending: false,
    tone: toneFromAnalyzerValue(byLabel.get(label)),
  }))
}

/**
 * Build contract analyzer summary rows from scanner report (frontend-only).
 */
export function buildContractAnalyzerSummary(report, scanTarget, approvalRows = []) {
  if (!report) {
    return {
      hasScan: false,
      fields: CONTRACT_ANALYZER_FIELDS.map((label) => ({
        label,
        value: null,
        pending: true,
        tone: 'pending',
      })),
      trustScore: null,
      scannerVerdict: null,
      view: null,
    }
  }

  const view = buildUniversalRiskScanView(report, 'contract', {
    approvalRows,
    scannedAddress: scanTarget || report.address,
  })

  return {
    hasScan: true,
    fields: mapIntelToFields(view),
    trustScore: view.trustScore ?? null,
    scannerVerdict: view.verdict ?? null,
    view,
  }
}

/** Concise proof rows for Contract Trust Evidence accordion. */
export function buildContractTrustProof(report, scanTarget, approvalRows = []) {
  if (!report) {
    return {
      hasScan: false,
      rows: [
        { label: 'Verified source', value: 'Pending scan' },
        { label: 'Admin surface', value: 'Pending scan' },
        { label: 'Proxy', value: 'Pending scan' },
        { label: 'Bytecode fingerprint', value: 'Pending scan' },
        { label: 'Key findings', value: 'Run Contract Analyzer to populate proof.' },
      ],
      findings: [],
    }
  }

  const summary = buildContractAnalyzerSummary(report, scanTarget, approvalRows)
  const view = summary.view
  const intel = view?.intelligence || []
  const row = (label) => intel.find((r) => r.label === label)?.value || ''

  const addr = report.address || scanTarget || ''
  const fingerprint = addr
    ? `${addr.slice(0, 10)}…${addr.slice(-8)} · ${view?.contractType || report.archetypeLabel || 'Contract'}`
    : 'Unavailable'

  const findings = (report.findings || []).slice(0, 5)

  return {
    hasScan: true,
    rows: [
      { label: 'Verified source', value: row('Source verification') || 'Status unavailable' },
      { label: 'Admin surface', value: formatOwnershipLabel(report.ownershipConcentration) || row('Ownership') },
      { label: 'Proxy', value: formatProxyLabel(report.upgradeableProxy) || row('Proxy') },
      { label: 'Bytecode fingerprint', value: fingerprint },
      {
        label: 'Key findings',
        value: findings.length
          ? `${findings.length} signal(s) — expand list below`
          : 'No elevated findings in latest scan',
      },
    ],
    findings,
  }
}

/** Extract EVM contract address from terminal search query. */
export function contractAddressFromQuery(query) {
  const trimmed = String(query || '').trim()
  if (/^0x[a-fA-F0-9]{40}$/i.test(trimmed)) return trimmed
  const match = trimmed.match(/0x[a-fA-F0-9]{40}/i)
  return match ? match[0] : ''
}
