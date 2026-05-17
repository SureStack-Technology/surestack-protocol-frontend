import { MAINNET_CHAIN_ID, SEPOLIA_CHAIN_ID } from './walletRiskTypes.js'

const APPROVAL_LOG_CHAINS = new Set([
  MAINNET_CHAIN_ID,
  10,
  8453,
  42161,
  137,
  SEPOLIA_CHAIN_ID,
])

export function walletChainSupportsApprovalLogScan(chainId) {
  return APPROVAL_LOG_CHAINS.has(Number(chainId))
}

/** Prime wallet exposure + approval inventory default (never Sepolia unless explicitly requested). */
export const PRIME_APPROVAL_DEFAULT_CHAIN_ID = MAINNET_CHAIN_ID

/**
 * @param {number | string | null | undefined} requestedChainId
 * @param {number | string | null | undefined} walletChainId
 */
export function resolvePrimeApprovalChainId(requestedChainId, walletChainId) {
  const req = Number(requestedChainId)
  if (walletChainSupportsApprovalLogScan(req)) return req

  const wallet = Number(walletChainId)
  if (walletChainSupportsApprovalLogScan(wallet) && wallet !== SEPOLIA_CHAIN_ID) {
    return wallet
  }

  return PRIME_APPROVAL_DEFAULT_CHAIN_ID
}

/**
 * @param {number | string} chainId
 * @param {string} apiKey
 * @returns {{ url: string, network: string, chainId: number } | null}
 */
export function resolveAlchemyRpcUrl(chainId, apiKey) {
  const id = Number(chainId)
  const key = String(apiKey || '').trim()
  if (!key || !Number.isFinite(id)) return null

  const map = {
    [MAINNET_CHAIN_ID]: { url: `https://eth-mainnet.g.alchemy.com/v2/${key}`, network: 'ethereum' },
    [SEPOLIA_CHAIN_ID]: { url: `https://eth-sepolia.g.alchemy.com/v2/${key}`, network: 'sepolia' },
    8453: { url: `https://base-mainnet.g.alchemy.com/v2/${key}`, network: 'base' },
    42161: { url: `https://arb-mainnet.g.alchemy.com/v2/${key}`, network: 'arbitrum' },
    137: { url: `https://polygon-mainnet.g.alchemy.com/v2/${key}`, network: 'polygon' },
    10: { url: `https://opt-mainnet.g.alchemy.com/v2/${key}`, network: 'optimism' },
  }

  const hit = map[id]
  if (!hit) return null
  return { url: hit.url, network: hit.network, chainId: id }
}

/**
 * @param {string} url
 */
export function redactAlchemyUrl(url) {
  if (!url) return null
  return String(url).replace(/\/v2\/[^/]+$/, '/v2/***')
}
