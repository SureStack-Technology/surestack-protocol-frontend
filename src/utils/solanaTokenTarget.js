import { SOLANA_BASE58_RE } from '@/services/intelligenceTargetClassifier.js'

/**
 * @param {object} [ctx]
 */
export function isSolanaTokenTarget({
  targetClassification = null,
  tokenResolution = null,
  chain = null,
  report = null,
} = {}) {
  if (report?.isSolanaToken || report?.analysisModeId === 'solana_token') return true
  return (
    targetClassification?.chain === 'solana' ||
    tokenResolution?.chainSlug === 'solana' ||
    chain === 'solana'
  )
}

/**
 * @param {object} [ctx]
 */
export function resolveSolanaMintAddress({
  targetClassification = null,
  tokenResolution = null,
  confirmedTokenContract = null,
  query = '',
  report = null,
} = {}) {
  if (report?.solanaMintAddress) return String(report.solanaMintAddress).trim()
  const fromClassifier = targetClassification?.address
  const fromResolution = tokenResolution?.address
  const fromConfirmed = confirmedTokenContract?.address
  const q = String(query || '').trim()
  if (fromClassifier) return String(fromClassifier).trim()
  if (fromResolution) return String(fromResolution).trim()
  if (fromConfirmed) return String(fromConfirmed).trim()
  if (SOLANA_BASE58_RE.test(q) && !q.startsWith('0x')) return q
  return null
}

/**
 * Solana mint is resolved when classifier/registry returned a mint address.
 */
export function hasSolanaMintResolved(ctx) {
  if (!isSolanaTokenTarget(ctx)) return false
  return Boolean(resolveSolanaMintAddress(ctx))
}

/**
 * Canonical Solana scan routing for Prime terminal + scanner hook.
 * @param {object} [params]
 */
export function resolveSolanaScanContext({
  targetClassification = null,
  tokenResolution = null,
  query = '',
  chain = null,
} = {}) {
  const isSolana = isSolanaTokenTarget({ targetClassification, tokenResolution, chain })
  const mint = resolveSolanaMintAddress({ targetClassification, tokenResolution, query })
  const symbol =
    targetClassification?.symbol || tokenResolution?.symbol || String(query || '').trim().toUpperCase()
  return {
    isSolana,
    mint,
    symbol,
    mintResolved: Boolean(isSolana && mint),
    shouldScanSolana: Boolean(isSolana && mint),
  }
}

/**
 * @param {object} scannerReport
 */
export function solanaScannerReportActive(scannerReport) {
  return Boolean(
    scannerReport &&
      (scannerReport.chain === 'solana' ||
        scannerReport.addressType === 'SPL_TOKEN_MINT' ||
        scannerReport.product === 'surestack_solana_risk_scanner'),
  )
}
