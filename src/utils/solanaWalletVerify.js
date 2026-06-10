/**
 * Backend: POST /api/wallet/verify-solana (requires nonce from GET /api/wallet/solana/nonce).
 *
 * @param {(path: string, opts?: RequestInit) => Promise<Response>} api
 * @param {{ walletAddress: string; signature: string; message: string; nonce: string }} body
 */
export async function postSolanaWalletVerify(api, body) {
  const verifyRes = await api('/api/wallet/verify-solana', {
    method: 'POST',
    body,
  })

  const verifyText = await verifyRes.text()
  let verifyJson
  try {
    verifyJson = JSON.parse(verifyText)
  } catch {
    throw new Error(verifyRes.ok ? 'invalid_verify_response' : `verify_http_${verifyRes.status}`)
  }

  if (!verifyRes.ok) {
    const err = new Error(verifyJson.error || verifyJson.message || `verify_failed_${verifyRes.status}`)
    err.code = verifyJson.error
    throw err
  }

  return verifyJson
}
