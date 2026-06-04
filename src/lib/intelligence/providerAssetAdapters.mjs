/**
 * Provider metadata → canonical market fields (P4.2).
 * @typedef {{ symbol: string | null, name: string | null, address: string | null, chain: string | null, marketCap: number | null, liquidity: number | null, holders: number | null, source: string }} NormalizedProviderAsset
 */

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v) {
  const s = String(v ?? '').trim()
  return s || null
}

/**
 * @param {object | null | undefined} row CoinGecko coin or market row
 * @returns {NormalizedProviderAsset | null}
 */
export function normalizeCoinGeckoAsset(row) {
  if (!row) return null
  return {
    symbol: str(row.symbol)?.toUpperCase() ?? null,
    name: str(row.name),
    address: str(row.contract_address || row.platforms?.ethereum),
    chain: str(row.asset_platform_id || row.chain) || 'ethereum',
    marketCap: num(row.market_cap ?? row.market_data?.market_cap?.usd),
    liquidity: null,
    holders: null,
    source: 'coingecko',
  }
}

/**
 * @param {object | null | undefined} pair DexScreener pair
 * @returns {NormalizedProviderAsset | null}
 */
export function normalizeDexScreenerAsset(pair) {
  if (!pair) return null
  const base = pair.baseToken || {}
  return {
    symbol: str(base.symbol)?.toUpperCase() ?? null,
    name: str(base.name),
    address: str(base.address),
    chain: str(pair.chainId) || 'ethereum',
    marketCap: num(pair.marketCap ?? pair.fdv),
    liquidity: num(pair.liquidity?.usd),
    holders: null,
    source: 'dexscreener',
  }
}

/**
 * @param {object | null | undefined} overview Birdeye overview payload
 * @returns {NormalizedProviderAsset | null}
 */
export function normalizeBirdeyeAsset(overview) {
  if (!overview) return null
  return {
    symbol: str(overview.symbol)?.toUpperCase() ?? null,
    name: str(overview.name),
    address: str(overview.address || overview.mint),
    chain: 'solana',
    marketCap: num(overview.marketCapUsd ?? overview.mc),
    liquidity: num(overview.liquidityUsd ?? overview.liquidity),
    holders: num(overview.holderCount ?? overview.holder),
    source: 'birdeye',
  }
}

/**
 * @param {object | null | undefined} meta Helius / RPC token metadata
 * @returns {NormalizedProviderAsset | null}
 */
export function normalizeHeliusAsset(meta) {
  if (!meta) return null
  return {
    symbol: str(meta.symbol)?.toUpperCase() ?? null,
    name: str(meta.name),
    address: str(meta.mint || meta.address),
    chain: 'solana',
    marketCap: null,
    liquidity: null,
    holders: num(meta.holderCount),
    source: 'helius',
  }
}

/**
 * @param {object | null | undefined} token Alchemy token metadata
 * @returns {NormalizedProviderAsset | null}
 */
export function normalizeAlchemyAsset(token) {
  if (!token) return null
  return {
    symbol: str(token.symbol)?.toUpperCase() ?? null,
    name: str(token.name),
    address: str(token.address),
    chain: str(token.chain) || 'ethereum',
    marketCap: null,
    liquidity: null,
    holders: null,
    source: 'alchemy',
  }
}

/**
 * Merge provider rows — first non-null field wins (registry should win before calling).
 * @param {NormalizedProviderAsset[]} rows
 * @returns {NormalizedProviderAsset | null}
 */
export function mergeProviderAssets(rows) {
  const list = (rows || []).filter(Boolean)
  if (!list.length) return null
  const out = { ...list[0] }
  for (const row of list.slice(1)) {
    for (const key of ['symbol', 'name', 'address', 'chain', 'marketCap', 'liquidity', 'holders']) {
      if (out[key] == null && row[key] != null) out[key] = row[key]
    }
  }
  return out
}
