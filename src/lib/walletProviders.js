/**
 * Detect injected wallet providers without importing chain SDKs.
 */

export function isMetaMaskAvailable() {
  if (typeof window === 'undefined') return false
  const eth = window.ethereum
  if (!eth) return false
  if (eth.isMetaMask) return true
  const providers = eth.providers
  if (Array.isArray(providers)) {
    return providers.some((p) => p?.isMetaMask)
  }
  return false
}

export function isPhantomAvailable() {
  if (typeof window === 'undefined') return false
  return Boolean(window.solana?.isPhantom)
}

/**
 * @returns {{ evm: boolean; solana: boolean; phantom: boolean; metamask: boolean }}
 */
export function detectWalletProviders() {
  const metamask = isMetaMaskAvailable()
  const phantom = isPhantomAvailable()
  return {
    evm: Boolean(typeof window !== 'undefined' && window.ethereum),
    solana: phantom,
    metamask,
    phantom,
  }
}
