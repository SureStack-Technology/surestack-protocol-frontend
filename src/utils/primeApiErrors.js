const AUTH_ERROR_CODES = new Set([
  'prime_intel_auth_missing',
  'wallet_risk_auth_missing',
  'missing_bearer_token',
  'empty_token',
  'invalid_token',
  'auth_session_missing',
  'not_authenticated',
])

/**
 * Premium-facing copy for Prime / wallet intelligence API failures.
 * @param {string | undefined} errorCode
 * @param {number} [status]
 * @param {string} [fallbackMessage]
 */
export function formatPrimeIntelUserMessage(errorCode, status, fallbackMessage) {
  const code = String(errorCode || '').toLowerCase()
  if (AUTH_ERROR_CODES.has(code) || status === 401) {
    return 'Secure session expired. Please refresh your Prime workspace and try again.'
  }
  if (status === 402 && code === 'contract_intel_tier_required') {
    return 'Contract intelligence requires Prime Intelligence or higher.'
  }
  if (code === 'contract_analyze_failed') {
    return 'Risk scan could not complete. Please try again in a moment.'
  }
  if (fallbackMessage && !AUTH_ERROR_CODES.has(String(fallbackMessage).toLowerCase())) {
    return fallbackMessage
  }
  if (fallbackMessage && AUTH_ERROR_CODES.has(String(fallbackMessage).toLowerCase())) {
    return 'Session verification required. Refresh your Prime workspace and try again.'
  }
  return 'Risk scan could not complete. Please try again.'
}

/**
 * @param {unknown} err
 */
/**
 * User-safe copy for LunarCrush / Birdeye feed errors (no raw API codes in Prime UI).
 * @param {string | null | undefined} errorCode
 * @returns {string | null} null hides the inline error row
 */
export function formatIntelProviderUserMessage(errorCode) {
  const code = String(errorCode || '').toLowerCase().trim()
  if (!code) return null
  if (code === 'invalid_token' || code.includes('invalid_token')) {
    return 'Provider authentication pending'
  }
  if (AUTH_ERROR_CODES.has(code)) {
    return 'Provider authentication pending'
  }
  if (code.includes('tier_required') || code === 'birdeye_watchlist_failed') {
    return 'Provider connection pending'
  }
  if (/^[a-z][a-z0-9_]*$/.test(code)) {
    return 'Provider connection pending'
  }
  return null
}

export function messageFromCaughtError(err) {
  if (err && typeof err === 'object' && 'friendlyMessage' in err && err.friendlyMessage) {
    return String(err.friendlyMessage)
  }
  if (err instanceof Error && err.message && !AUTH_ERROR_CODES.has(err.message)) {
    return err.message
  }
  if (err instanceof Error && AUTH_ERROR_CODES.has(err.message)) {
    return formatPrimeIntelUserMessage(err.message, 401)
  }
  return formatPrimeIntelUserMessage(undefined, undefined)
}
