/**
 * Solana wallet verification helpers (Phantom signMessage / ed25519).
 */

import bs58 from 'bs58'
import nacl from 'tweetnacl'

export const SOLANA_WALLET_CHAINS = /** @type {const} */ (['SOLANA_MAINNET', 'SOLANA_DEVNET'])

/**
 * @returns {'SOLANA_MAINNET' | 'SOLANA_DEVNET'}
 */
export function resolveSolanaWalletChain() {
  const explicit = (process.env.SOLANA_WALLET_CHAIN || '').trim().toUpperCase()
  if (explicit === 'SOLANA_MAINNET' || explicit === 'SOLANA_DEVNET') {
    return explicit
  }
  return process.env.NODE_ENV === 'production' ? 'SOLANA_MAINNET' : 'SOLANA_DEVNET'
}

/**
 * @param {string} address
 */
export function isValidSolanaAddress(address) {
  if (!address || typeof address !== 'string') return false
  const trimmed = address.trim()
  if (trimmed.length < 32 || trimmed.length > 44) return false
  try {
    return bs58.decode(trimmed).length === 32
  } catch {
    return false
  }
}

/**
 * Canonical storage form for Solana pubkeys (base58, validated).
 * @param {string} address
 */
export function storageSolanaAddress(address) {
  const trimmed = String(address).trim()
  const decoded = (() => {
    try {
      const bytes = bs58.decode(trimmed)
      if (bytes.length !== 32) throw new Error('invalid_length')
      return bytes
    } catch {
      throw new Error('invalid_solana_address')
    }
  })()
  return bs58.encode(decoded)
}

/**
 * @param {{ nonce: string; address: string; walletChain: string }} params
 */
export function buildSolanaVerificationMessage({ nonce, address, walletChain }) {
  return [
    'SureStack Wallet Verification',
    `Nonce: ${nonce}`,
    `Address: ${address}`,
    `Wallet Chain: ${walletChain}`,
  ].join('\n')
}

/**
 * @param {{ message: string; walletAddress: string; signature: string }} params
 * signature: base64 (preferred) or base58
 */
export function verifySolanaWalletSignature({ message, walletAddress, signature }) {
  if (!message || !walletAddress || !signature) {
    return { ok: false, error: 'missing_signature_fields' }
  }

  let publicKeyBytes
  try {
    publicKeyBytes = bs58.decode(storageSolanaAddress(walletAddress))
  } catch {
    return { ok: false, error: 'invalid_solana_address' }
  }

  let signatureBytes
  try {
    if (/^[A-Za-z0-9+/=]+$/.test(String(signature).trim()) && String(signature).includes('=')) {
      signatureBytes = Buffer.from(String(signature), 'base64')
    } else if (/^[A-Za-z0-9+/]+$/.test(String(signature).trim()) && String(signature).length % 4 === 0) {
      signatureBytes = Buffer.from(String(signature), 'base64')
    } else {
      signatureBytes = bs58.decode(String(signature).trim())
    }
  } catch {
    return { ok: false, error: 'invalid_signature_encoding' }
  }

  if (signatureBytes.length !== 64) {
    return { ok: false, error: 'invalid_signature_length' }
  }

  const messageBytes = new TextEncoder().encode(String(message))
  const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
  if (!valid) {
    return { ok: false, error: 'signature_mismatch' }
  }

  return { ok: true, address: storageSolanaAddress(walletAddress) }
}

/**
 * Map Solana wallet chain to numeric chainId placeholder for legacy consumers.
 * @param {string} walletChain
 */
export function solanaChainIdPlaceholder(walletChain) {
  return walletChain === 'SOLANA_MAINNET' ? 900001 : 900002
}
