import { formatWalletVerifyError } from './walletVerifyErrors.js'

/**
 * Wallet EIP-191 verify — shared payload + logging for onboarding + Explorer.
 * Backend: POST /api/auth/wallet/verify (requires nonce from GET /api/auth/wallet/nonce).
 */
export async function postWalletVerify(api, { address, signature, chainId, nonce }) {
  const body = {
    address,
    signature,
    chainId: chainId ?? 11155111,
    nonce,
  }
  if (import.meta.env.DEV) {
    console.log('[walletVerify] POST /api/auth/wallet/verify', {
      address: body.address,
      chainId: body.chainId,
      nonce: body.nonce,
      signaturePrefix: typeof body.signature === 'string' ? body.signature.slice(0, 20) : typeof body.signature,
    })
  }

  const verifyRes = await api('/api/auth/wallet/verify', {
    method: 'POST',
    body,
  })

  const verifyText = await verifyRes.text()
  let verifyJson
  try {
    verifyJson = JSON.parse(verifyText)
  } catch {
    console.error('[walletVerify] verify body not JSON', verifyText?.slice(0, 400))
    throw new Error(
      verifyRes.ok
        ? 'invalid_verify_response'
        : `verify_http_${verifyRes.status}: ${verifyText?.slice(0, 120) || 'empty body'}`
    )
  }

  if (!verifyRes.ok) {
    const code = verifyJson.error || `http_${verifyRes.status}`
    const detail = verifyJson.message ? `${code}: ${verifyJson.message}` : code
    throw new Error(formatWalletVerifyError(detail))
  }

  return verifyJson
}
