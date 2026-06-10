import { postSolanaWalletVerify } from '@/utils/solanaWalletVerify'
import { formatWalletVerifyError } from '@/utils/walletVerifyErrors'
import { DEFAULT_SOLANA_WALLET_CHAIN } from '@/constants/walletTypes.js'

/** @typedef {'idle'|'preparing'|'awaiting_signature'|'verifying'|'success'|'error'} SolanaVerifyPhase */

export const SOLANA_VERIFY_PHASE_LABELS = {
  idle: '',
  preparing: 'Preparing Solana challenge…',
  awaiting_signature: 'Waiting for Phantom signature…',
  verifying: 'Verifying Solana wallet…',
  success: 'Solana wallet verified successfully',
  error: '',
}

function getPhantomProvider() {
  if (typeof window === 'undefined') return null
  return window.solana?.isPhantom ? window.solana : null
}

/**
 * @param {unknown} err
 */
export function mapSolanaWalletVerifyError(err) {
  const code = err?.code
  const msg = String(err?.message || err || '')
  if (code === 4001 || /user rejected|user denied|rejected the request|cancelled/i.test(msg)) {
    return 'Signature rejected'
  }
  if (/challenge_not_found|expired/i.test(msg)) {
    return 'Verification challenge expired — please try again'
  }
  if (/phantom|solana wallet not detected/i.test(msg)) {
    return msg
  }
  return formatWalletVerifyError(msg) || 'Solana wallet verification failed'
}

function encodeSignatureBase64(signatureBytes) {
  const bytes = signatureBytes instanceof Uint8Array ? signatureBytes : new Uint8Array(signatureBytes)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * @param {{
 *   source?: string
 *   api: (path: string, opts?: RequestInit) => Promise<Response>
 *   walletAddress: string
 *   walletChain?: string
 *   onPhase?: (phase: SolanaVerifyPhase) => void
 * }} opts
 */
export async function runSolanaWalletVerification({
  source = 'onboarding',
  api,
  walletAddress,
  walletChain = DEFAULT_SOLANA_WALLET_CHAIN,
  onPhase,
}) {
  const provider = getPhantomProvider()
  if (!provider) {
    throw new Error('Phantom wallet not detected')
  }

  onPhase?.('preparing')
  const noncePath = `/api/wallet/solana/nonce?walletAddress=${encodeURIComponent(walletAddress)}&walletChain=${encodeURIComponent(walletChain)}`
  const nonceRes = await api(noncePath)
  const nonceText = await nonceRes.text()
  let nonceJson
  try {
    nonceJson = JSON.parse(nonceText)
  } catch {
    throw new Error(nonceRes.ok ? 'invalid_nonce_response' : `nonce_http_${nonceRes.status}`)
  }

  if (!nonceRes.ok) {
    throw new Error(nonceJson.error || nonceJson.message || `nonce_failed_${nonceRes.status}`)
  }

  const message = nonceJson.message
  if (!message || !nonceJson.nonce) {
    throw new Error('invalid_nonce_response')
  }

  onPhase?.('awaiting_signature')
  const messageBytes = new TextEncoder().encode(message)
  let signed
  try {
    signed = await provider.signMessage(messageBytes, 'utf8')
  } catch (signErr) {
    if (import.meta.env.DEV) {
      console.warn(`[solanaWalletVerify:${source}] sign_failed`, signErr)
    }
    throw signErr
  }

  const signature = encodeSignatureBase64(signed.signature)

  onPhase?.('verifying')
  const verifyJson = await postSolanaWalletVerify(api, {
    walletAddress,
    signature,
    message,
    nonce: nonceJson.nonce,
  })

  onPhase?.('success')
  return verifyJson
}
