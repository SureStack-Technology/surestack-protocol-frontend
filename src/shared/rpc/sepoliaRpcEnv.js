/**
 * Browser-safe Sepolia HTTP RPC resolution.
 * Never uses https://rpc.sepolia.org (no CORS from browser origins).
 */

const RPC_SEPOLIA_ORG = /rpc\.sepolia\.org/i

/** MetaMask `wallet_addEthereumChain` needs a public HTTPS RPC; not used for JsonRpc polling. */
export const SEPOLIA_WALLET_ADD_CHAIN_RPC_FALLBACK = 'https://ethereum-sepolia-rpc.publicnode.com'

const ENV_KEYS = [
  'VITE_SEPOLIA_RPC_URL',
  'VITE_ALCHEMY_SEPOLIA_RPC_URL',
  'VITE_SEPOLIA_RPC',
  'VITE_ALCHEMY_RPC',
  'VITE_PUBLIC_RPC',
  'VITE_STATIC_RPC',
]

let warnedBlockedHost = false
let warnedNoReadOnlyRpc = false

/**
 * @returns {{ key: string, url: string }[]}
 */
export function listBrowserSepoliaHttpRpcs() {
  const out = []
  const seen = new Set()
  for (const key of ENV_KEYS) {
    const raw = import.meta.env[key]
    if (typeof raw !== 'string') continue
    const url = raw.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) continue
    if (RPC_SEPOLIA_ORG.test(url)) {
      if (typeof window !== 'undefined' && !warnedBlockedHost) {
        warnedBlockedHost = true
        console.warn(
          `[SureStack] Ignoring ${key}: rpc.sepolia.org is not browser-CORS safe. Use Infura, Alchemy, or another HTTPS RPC.`,
        )
      }
      continue
    }
    if (seen.has(url)) continue
    seen.add(url)
    out.push({ key, url })
  }
  return out
}

export function hasBrowserReadOnlyRpc() {
  return listBrowserSepoliaHttpRpcs().length > 0
}

export function warnNoReadOnlyRpcOnce() {
  if (typeof window === 'undefined') return
  if (warnedNoReadOnlyRpc) return
  warnedNoReadOnlyRpc = true
  console.warn(
    '[SureStack] No browser-safe Sepolia HTTP RPC in env (set VITE_SEPOLIA_RPC_URL, VITE_ALCHEMY_SEPOLIA_RPC_URL, VITE_SEPOLIA_RPC, or VITE_ALCHEMY_RPC). Read-only JsonRpc is disabled; wallet flows still work. https://rpc.sepolia.org is never used in the browser.',
  )
}

/** First configured read RPC, or a CORS-friendly URL for MetaMask chain metadata only. */
export function getWalletAddChainRpcUrl() {
  const first = listBrowserSepoliaHttpRpcs()[0]?.url
  return first || SEPOLIA_WALLET_ADD_CHAIN_RPC_FALLBACK
}
