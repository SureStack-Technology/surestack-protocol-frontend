import { BrowserProvider } from 'ethers'
import { postWalletVerify } from '@/utils/walletVerify'
import { formatWalletVerifyError } from '@/utils/walletVerifyErrors'

/** @typedef {'idle'|'preparing'|'awaiting_signature'|'verifying'|'success'|'error'} WalletVerifyPhase */

export const WALLET_VERIFY_PHASE_LABELS = {
  idle: '',
  preparing: 'Preparing wallet challenge…',
  awaiting_signature: 'Waiting for wallet signature…',
  verifying: 'Verifying wallet…',
  success: 'Wallet verified successfully',
  error: '',
}

/**
 * @param {string} step
 * @param {string} source
 * @param {Record<string, unknown>} [extra]
 */
export function logWalletVerify(source, step, extra) {
  if (!import.meta.env.DEV) return
  const payload = extra ? { ...extra } : undefined
  if (payload?.address && typeof payload.address === 'string') {
    payload.address = `${payload.address.slice(0, 8)}…${payload.address.slice(-4)}`
  }
  console.log(`[walletVerify:${source}] ${step}`, payload ?? '')
}

function getInjectedEthereum() {
  try {
    if (typeof window === 'undefined') return null
    const eth = window.ethereum
    if (!eth) return null
    let providers
    try {
      providers = eth.providers
    } catch {
      return eth
    }
    if (Array.isArray(providers) && providers.length > 0) {
      const metamask = providers.find((p) => p?.isMetaMask)
      return metamask ?? providers[0]
    }
    return eth
  } catch {
    return null
  }
}

/**
 * @param {unknown} err
 */
export function mapWalletVerifyError(err) {
  const code = err?.code
  const msg = String(err?.message || err || '')
  if (code === 4001 || /user rejected|user denied|rejected the request|cancelled/i.test(msg)) {
    return 'Signature rejected'
  }
  if (/challenge_not_found|expired/i.test(msg)) {
    return 'Verification challenge expired — please try again'
  }
  if (/no wallet|no injected|provider not available|Connect your wallet/i.test(msg)) {
    return msg.includes('provider') ? 'Wallet provider not available' : 'Connect your wallet first'
  }
  return formatWalletVerifyError(msg) || 'Wallet verification failed'
}

/**
 * Run EIP-191 wallet verification (GET nonce + sign + POST verify).
 *
 * @param {{
 *   source?: string
 *   api: (path: string, opts?: RequestInit) => Promise<Response>
 *   account?: string | null
 *   chainId?: number | null
 *   onPhase?: (phase: WalletVerifyPhase) => void
 * }} opts
 */
export async function runWalletVerification({ source = 'onboarding', api, account: accountIn, chainId: chainIdIn, onPhase }) {
  const log = (step, extra) => logWalletVerify(source, step, extra)

  log('click')

  const ethereum = getInjectedEthereum()
  if (!ethereum) {
    log('error', { reason: 'no_provider' })
    throw new Error('Wallet provider not available')
  }

  let account = accountIn
  if (!account) {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
    account = accounts?.[0]
  }

  log('hasWallet', { hasWallet: Boolean(account), chainId: chainIdIn ?? null })

  if (!account) {
    log('error', { reason: 'no_account' })
    throw new Error('Connect your wallet first')
  }

  const chainId = Number(chainIdIn) || 11155111
  const noncePath = `/api/auth/wallet/nonce?address=${encodeURIComponent(account)}&chainId=${chainId}`

  onPhase?.('preparing')
  log('requesting_challenge', { chainId })

  const nonceRes = await api(noncePath)
  const nonceText = await nonceRes.text()
  let nonceJson
  try {
    nonceJson = JSON.parse(nonceText)
  } catch {
    log('error', { reason: 'invalid_nonce_json', status: nonceRes.status })
    throw new Error(nonceRes.ok ? 'invalid_nonce_response' : `nonce_http_${nonceRes.status}`)
  }

  if (!nonceRes.ok) {
    log('error', { reason: 'nonce_http', status: nonceRes.status, code: nonceJson?.error })
    throw new Error(nonceJson.error || nonceJson.message || `nonce_failed_${nonceRes.status}`)
  }

  log('challenge_received', { hasMessage: Boolean(nonceJson?.message), hasNonce: Boolean(nonceJson?.nonce) })

  const message = nonceJson.message
  if (!message || !nonceJson.nonce) {
    throw new Error('invalid_nonce_response')
  }

  onPhase?.('awaiting_signature')
  log('requesting_signature')

  const browserProvider = new BrowserProvider(ethereum, 'any')
  const signer = await browserProvider.getSigner()
  const signerAddress = await signer.getAddress()

  let signature
  try {
    signature = await signer.signMessage(message)
  } catch (signErr) {
    log('error', { reason: 'sign_message_failed', code: signErr?.code })
    throw signErr
  }

  log('signature_received', { signerAddress })

  onPhase?.('verifying')
  log('posting_verify')

  const verifyJson = await postWalletVerify(api, {
    address: account,
    signature,
    chainId,
    nonce: nonceJson.nonce,
  })

  log('success', { verifiedAt: verifyJson?.wallet?.verifiedAt })
  onPhase?.('success')

  return verifyJson
}
