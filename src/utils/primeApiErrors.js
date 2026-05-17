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
