/**
 * Prime Intelligence — canonical symbol → chain + address registry.
 * Single source of truth for classifier, token resolver, and scanner handoff.
 *
 * @typedef {{ symbol: string, name: string, chain: string, address: string }} PrimeTokenEntry
 */

/** User-facing copy when symbol cannot be resolved. */
export const UNRESOLVED_ASSET_COPY = 'Enter a valid token symbol or contract address.'

/** @type {Record<string, PrimeTokenEntry>} */
export const PRIME_TOKEN_REGISTRY = {
  LINK: {
    symbol: 'LINK',
    name: 'Chainlink',
    chain: 'ethereum',
    address: '0x514910771af9ca656af840dff83e8264ecf986ca',
  },
  UNI: {
    symbol: 'UNI',
    name: 'Uniswap',
    chain: 'ethereum',
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  },
  AAVE: {
    symbol: 'AAVE',
    name: 'Aave',
    chain: 'ethereum',
    address: '0x7fc66500c84a76ad7e9c93481fe6c2e88f4923e6',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    chain: 'ethereum',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    chain: 'ethereum',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chain: 'ethereum',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
  PEPE: {
    symbol: 'PEPE',
    name: 'Pepe',
    chain: 'ethereum',
    address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  },
  SHIB: {
    symbol: 'SHIB',
    name: 'Shiba Inu',
    chain: 'ethereum',
    address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
  },
  ARB: {
    symbol: 'ARB',
    name: 'Arbitrum',
    chain: 'ethereum',
    address: '0xb50721bcf8d667c67912441f4d70b32f0802e3c',
  },
  OP: {
    symbol: 'OP',
    name: 'Optimism',
    chain: 'optimism',
    address: '0x4200000000000000000000000000000000000042',
  },
  FET: {
    symbol: 'FET',
    name: 'Artificial Superintelligence Alliance',
    chain: 'ethereum',
    address: '0xaea46a60368a7bd06006146a4107a6490e122342',
  },
  RNDR: {
    symbol: 'RNDR',
    name: 'Render',
    chain: 'ethereum',
    address: '0x6de037ef9ad2725eb1694d337882399c32785661',
  },
  RENDER: {
    symbol: 'RENDER',
    name: 'Render',
    chain: 'ethereum',
    address: '0x6de037ef9ad2725eb1694d337882399c32785661',
  },
  TAO: {
    symbol: 'TAO',
    name: 'Bittensor',
    chain: 'solana',
    address: 'TaoFYsbq8b45Qxig2pkMHFCKq62hvxQrU8aXZwHb1XY',
  },
  BONK: {
    symbol: 'BONK',
    name: 'Bonk',
    chain: 'solana',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  },
  WIF: {
    symbol: 'WIF',
    name: 'dogwifhat',
    chain: 'solana',
    address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  },
  JUP: {
    symbol: 'JUP',
    name: 'Jupiter',
    chain: 'solana',
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  },
}

/** @deprecated Use PRIME_TOKEN_REGISTRY — lowercase address map for EVM-only helpers */
export const ETHEREUM_REGISTRY_BY_SYMBOL = Object.fromEntries(
  Object.values(PRIME_TOKEN_REGISTRY)
    .filter((e) => e.chain === 'ethereum')
    .map((e) => [e.symbol, e.address.toLowerCase()]),
)

/**
 * @param {string | null | undefined} raw
 * @param {{ preferredChain?: string | null }} [opts]
 * @returns {PrimeTokenEntry | null}
 */
export function lookupPrimeToken(raw, opts = {}) {
  const sym = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (!sym || !PRIME_TOKEN_REGISTRY[sym]) return null
  const entry = PRIME_TOKEN_REGISTRY[sym]
  const preferred = String(opts.preferredChain || '').toLowerCase()
  if (preferred && entry.chain !== preferred) {
    return entry
  }
  return entry
}

/**
 * @param {string | null | undefined} raw
 * @returns {PrimeTokenEntry | null}
 */
export function lookupPrimeTokenByAddress(raw) {
  const addr = String(raw || '').trim()
  if (!addr) return null
  const lower = String(addr).trim().toLowerCase()
  for (const entry of Object.values(PRIME_TOKEN_REGISTRY)) {
    if (entry.chain === 'ethereum' && entry.address.toLowerCase() === lower) return entry
    if (entry.chain !== 'ethereum' && entry.address === addr) return entry
  }
  return null
}

/**
 * Resolve by display name (case-insensitive, whitespace-normalized).
 * @param {string | null | undefined} raw
 * @returns {PrimeTokenEntry | null}
 */
export function lookupPrimeTokenByName(raw) {
  const needle = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
  if (!needle || needle.length > 64) return null
  const seen = new Set()
  for (const entry of Object.values(PRIME_TOKEN_REGISTRY)) {
    if (seen.has(entry.symbol)) continue
    seen.add(entry.symbol)
    const name = String(entry.name || '').trim().toLowerCase()
    if (name === needle) return entry
  }
  return null
}

/**
 * Build classifier-compatible SYMBOL_REGISTRY map.
 * @returns {Record<string, { symbol: string, name: string, chain: string, address: string }>}
 */
export function buildSymbolRegistryMap() {
  const out = {}
  for (const entry of Object.values(PRIME_TOKEN_REGISTRY)) {
    if (!out[entry.symbol]) out[entry.symbol] = { ...entry }
  }
  return out
}

/**
 * @param {PrimeTokenEntry} entry
 */
export function toTokenResolutionPayload(entry, source = 'registry') {
  const chainSlug = entry.chain
  return {
    resolved: true,
    autoSelected: true,
    confirmationRequired: false,
    status: 'resolved',
    symbol: entry.symbol,
    name: entry.name,
    address: chainSlug === 'ethereum' ? entry.address.toLowerCase() : entry.address,
    source,
    chainSlug,
    chainLabel:
      chainSlug === 'solana'
        ? 'Solana'
        : chainSlug === 'optimism'
          ? 'Optimism'
          : chainSlug === 'arbitrum'
            ? 'Arbitrum'
            : 'Ethereum',
    candidates: [],
    ambiguousNative: false,
    manualOnly: false,
    message: 'Token identified and contract resolved.',
  }
}

/** Validation matrix symbols for tests. */
export const VALIDATION_MATRIX_SYMBOLS = [
  'LINK',
  'USDC',
  'USDT',
  'DAI',
  'UNI',
  'AAVE',
  'ARB',
  'OP',
  'TAO',
  'FET',
  'RNDR',
  'PEPE',
  'BONK',
  'WIF',
  'JUP',
]
