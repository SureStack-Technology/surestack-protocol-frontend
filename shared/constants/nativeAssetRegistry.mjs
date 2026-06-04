/**
 * P4.2.3 — Native / L1 assets (checked before ERC-20 registry fallback).
 * @typedef {{ symbol: string, name: string, chain: string, assetId: string, coingeckoId: string, category: string }} NativeAssetEntry
 */

/** @type {Record<string, NativeAssetEntry>} */
export const NATIVE_ASSETS_BY_SYMBOL = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    chain: 'ethereum',
    assetId: 'ethereum',
    coingeckoId: 'ethereum',
    category: 'LAYER_1',
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    chain: 'ethereum',
    assetId: 'weth',
    coingeckoId: 'weth',
    category: 'LAYER_1',
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    chain: 'bitcoin',
    assetId: 'bitcoin',
    coingeckoId: 'bitcoin',
    category: 'STORE_OF_VALUE',
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    chain: 'ethereum',
    assetId: 'wrapped-bitcoin',
    coingeckoId: 'wrapped-bitcoin',
    category: 'STORE_OF_VALUE',
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    chain: 'solana',
    assetId: 'solana',
    coingeckoId: 'solana',
    category: 'LAYER_1',
  },
}

/** Lowercase alias → symbol */
export const NATIVE_ASSET_ALIASES = {
  eth: 'ETH',
  ethereum: 'ETH',
  ether: 'ETH',
  btc: 'BTC',
  bitcoin: 'BTC',
  sol: 'SOL',
  solana: 'SOL',
  weth: 'WETH',
  wbtc: 'WBTC',
}

/**
 * @param {string | null | undefined} raw
 * @returns {NativeAssetEntry | null}
 */
export function lookupNativeAssetBySymbol(raw) {
  const sym = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (!sym) return null
  return NATIVE_ASSETS_BY_SYMBOL[sym] || null
}

/**
 * @param {string | null | undefined} raw
 * @returns {NativeAssetEntry | null}
 */
export function lookupNativeAssetByAlias(raw) {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
  if (!key) return null
  const sym = NATIVE_ASSET_ALIASES[key]
  return sym ? NATIVE_ASSETS_BY_SYMBOL[sym] : null
}

/**
 * Exact symbol or alias only (no substring).
 * @param {string | null | undefined} raw
 */
export function resolveNativeAssetInput(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  return lookupNativeAssetBySymbol(trimmed) || lookupNativeAssetByAlias(trimmed)
}
