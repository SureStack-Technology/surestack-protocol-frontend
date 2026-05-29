/** Maps backend wallet-verify error codes to user-facing copy. */
const VERIFY_ERROR_COPY = {
  missing_bearer_token: 'Authentication session missing — please refresh and sign in again.',
  empty_token: 'Authentication session missing — please refresh and sign in again.',
  invalid_token: 'Authentication session expired — please sign in again.',
  auth_not_configured: 'Sign-in is not configured on the server. Contact support if this persists.',
  query_address_required: 'Wallet address is required. Reconnect your wallet and try again.',
  invalid_address: 'Connected wallet address is invalid. Reconnect and try again.',
  address_signature_nonce_required: 'Verification payload incomplete. Request a new challenge and sign again.',
  challenge_not_found: 'Verification challenge expired — please try again.',
  address_mismatch: 'Connected wallet does not match the signed challenge. Reconnect and try again.',
  chain_id_mismatch: 'Network mismatch — switch to the chain shown in your wallet and try again.',
  invalid_signature: 'Wallet signature rejected. Sign the exact message shown in your wallet.',
  signature_mismatch: 'Connected wallet does not match signed wallet. Reconnect and try again.',
  user_not_found: 'Account profile not found. Complete sign-up, then try again.',
  nonce_failed: 'Could not start verification. Check your connection and try again.',
  verify_failed: 'Wallet verification failed on the server. Try again in a moment.',
  database_schema_out_of_date:
    'Server database needs an update. Run backend migrations (prisma migrate deploy) and retry.',
  user_not_synced: 'Profile not synced yet. Refresh the page after sign-up, then verify again.',
}

/**
 * @param {string} rawMessage — often `code` or `code: server message`
 * @returns {string}
 */
export function formatWalletVerifyError(rawMessage) {
  const msg = String(rawMessage || '').trim()
  if (!msg) return 'Wallet verification failed'

  const code = msg.split(':')[0]?.trim()
  if (VERIFY_ERROR_COPY[code]) {
    const serverTail = msg.includes(':') ? msg.slice(msg.indexOf(':') + 1).trim() : ''
    if (serverTail && serverTail !== VERIFY_ERROR_COPY[code] && !serverTail.startsWith('Unexpected')) {
      return VERIFY_ERROR_COPY[code]
    }
    return VERIFY_ERROR_COPY[code]
  }

  if (/nonce_http_401|verify_http_401|401/.test(msg)) {
    return VERIFY_ERROR_COPY.invalid_token
  }
  if (/nonce_http_503|verify_http_503|provider_unavailable/i.test(msg)) {
    return 'API unavailable — ensure the backend is running and try again.'
  }
  if (/user rejected|denied|cancelled/i.test(msg)) {
    return 'Signature request was cancelled in your wallet.'
  }
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return 'Cannot reach the API. Check that the backend is running and VITE_BACKEND_URL is set.'
  }

  return msg.length > 160 ? `${msg.slice(0, 157)}…` : msg
}
