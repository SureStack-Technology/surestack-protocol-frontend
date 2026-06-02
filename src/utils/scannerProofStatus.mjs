/**
 * Institutional scanner proof status — consistent labels when evidence exists vs pending.
 */

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {object} [report]
 * @param {object} [scannerReport]
 */
export function hasScannerBackedProof(report, scannerReport = null) {
  const sr = scannerReport || report?.scannerReport || null
  if (!sr || sr.success === false) return false
  return Boolean(
    sr.success === true ||
    (sr.success !== false && sr.product === 'surestack_solana_risk_scanner') ||
    report?.scannerSignals?.hasScan ||
    sr.scannerValidation === 'Complete' ||
    num(sr.trustScore) != null ||
    num(sr.compositeTrustScore) != null ||
    num(sr.technicalTrustScore) != null ||
    sr.liquidityIntelligence != null ||
    sr.addressType != null,
  )
}

/** @param {object} [report] @param {object} [scannerReport] */
export function scannerEvidenceBadge(report, scannerReport = null) {
  if (hasScannerBackedProof(report, scannerReport)) return 'Evidence verified'
  return 'Coverage pending'
}

/** @param {object} [report] @param {object} [scannerReport] */
export function scannerProofBannerTitle(report, scannerReport = null) {
  if (hasScannerBackedProof(report, scannerReport)) return 'Scanner evidence available'
  if (report?.isSolanaToken && report?.solanaMintResolved) return 'Mint resolved — run scan for evidence'
  return 'Partial provider coverage'
}

/** @param {boolean} hasScan @param {string} [fallback='Coverage pending'] */
export function scannerFieldPending(hasScan, fallback = 'Coverage pending') {
  return hasScan ? false : true
}

/** @param {boolean} hasScan @param {string} value @param {string} [pendingLabel='Coverage pending'] */
export function scannerFieldValue(hasScan, value, pendingLabel = 'Coverage pending') {
  if (hasScan) return value || '—'
  return pendingLabel
}

export const INSTITUTIONAL_PROOF_LABELS = {
  verified: 'Evidence verified',
  available: 'Scanner evidence available',
  ready: 'Proof ready',
  pending: 'Coverage pending',
}
