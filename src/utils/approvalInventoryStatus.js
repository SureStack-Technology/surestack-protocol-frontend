export const APPROVAL_STATUS_COPY = {
  provider_missing: 'Ethereum approval intelligence is not configured.',
  rpc_error: 'Ethereum approval intelligence source is unavailable.',
  auth_error: 'Session validation required.',
  rate_limited:
    'Wallet exposure intelligence is temporarily rate-limited. Contract risk analysis remains available.',
}

/**
 * @param {object | null | undefined} body
 * @param {number} [httpStatus]
 */
export function mapApprovalsResponseStatus(body, httpStatus) {
  if (body?.inventoryStatus) return body.inventoryStatus
  if (httpStatus === 401 || httpStatus === 403) return 'auth_error'
  if (httpStatus === 429 || body?.error === 'alchemy_rate_limited') return 'rate_limited'
  if (httpStatus === 503 || body?.error === 'wallet_risk_provider_unavailable') {
    return 'provider_missing'
  }
  if (httpStatus >= 500) return 'rpc_error'
  if (body?.success && Array.isArray(body?.rows)) return 'loaded'
  return 'rpc_error'
}

/**
 * @param {object | null | undefined} walletExposure
 */
export function mapWalletExposurePanelStatus(walletExposure) {
  const status = walletExposure?.status
  if (status === 'clear' || status === 'exposed') return status
  if (status === 'rate_limited') return 'rate_limited'
  if (status === 'provider_missing') return 'provider_missing'
  if (status === 'rpc_error') return 'rpc_error'
  if (status === 'unavailable') {
    const reason = walletExposure?.unavailableReason
    if (reason === 'provider_missing') return 'provider_missing'
    if (reason === 'rate_limited') return 'rate_limited'
    if (reason === 'no_verified_wallet') return 'auth_error'
    return 'rpc_error'
  }
  return null
}
