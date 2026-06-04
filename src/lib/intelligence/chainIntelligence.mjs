/**
 * Chain-aware intelligence helpers — gate Solana vs EVM terminology and providers.
 */

/**
 * @param {object} [scannerReport]
 * @param {object} [report]
 */
export function isSolanaScannerReport(scannerReport, report = null) {
  const sr = scannerReport || report?.scannerReport || null
  if (!sr) {
    return Boolean(report?.isSolanaToken || report?.chainId === 'solana' || report?.analysisModeId === 'solana_token')
  }
  return Boolean(
    sr.chain === 'solana' ||
    sr.product === 'surestack_solana_risk_scanner' ||
    sr.addressType === 'SPL_TOKEN_MINT' ||
    report?.isSolanaToken ||
    report?.analysisModeId === 'solana_token',
  )
}

/**
 * @param {object} [scannerReport]
 * @param {object} [report]
 */
export function isEvmScannerReport(scannerReport, report = null) {
  if (isSolanaScannerReport(scannerReport, report)) return false
  const sr = scannerReport || report?.scannerReport || null
  return Boolean(
    sr?.chain === 'ethereum' ||
    sr?.chainId != null ||
    report?.chainId === 'ethereum' ||
    /^0x[a-fA-F0-9]{40}$/i.test(String(sr?.address || report?.query || '')) ||
    report?.modeId === 'contract' ||
    report?.modeId === 'token',
  )
}

/**
 * @param {object} [report]
 * @param {object} [scannerReport]
 * @returns {'solana'|'ethereum'|'unknown'}
 */
export function resolveIntelligenceChain(report, scannerReport = null) {
  if (isSolanaScannerReport(scannerReport, report)) return 'solana'
  if (isEvmScannerReport(scannerReport, report)) return 'ethereum'
  if (report?.chainId === 'solana' || report?.isSolanaToken) return 'solana'
  if (report?.chainId === 'ethereum' || report?.chain === 'Ethereum') return 'ethereum'
  return 'unknown'
}

/**
 * @param {object} [scannerReport]
 */
export function hasEvmAuthorityFields(scannerReport) {
  const sr = scannerReport || null
  if (!sr) return false
  return Boolean(
    sr.mintAuthority != null ||
    sr.freezeAuthority != null ||
    sr.addressType === 'SPL_TOKEN_MINT',
  )
}
