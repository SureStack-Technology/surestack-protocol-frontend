/**
 * P4.2.6 — Multi-source USD price resolution for wallet holdings.
 * Order: CoinGecko (id) → CoinGecko (contract) → DexScreener → unpriced
 */

import { normalizeContractAddress } from './normalizeContractAddress.mjs'
import { lookupWalletHoldingByContract } from './walletHoldingsCatalog.mjs'

const COINGECKO_CHUNK = 25
const COINGECKO_CONTRACT_CHUNK = 40
const USER_AGENT = 'SureStack-WalletPortfolio/1.0'

/**
 * @param {string[]} ids
 */
export async function fetchCoingeckoUsdByIds(ids) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return {}
  const out = {}
  try {
    for (let i = 0; i < unique.length; i += COINGECKO_CHUNK) {
      const chunk = unique.slice(i, i + COINGECKO_CHUNK)
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(chunk.join(','))}&vs_currencies=usd`,
        { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } },
      )
      if (!res.ok) continue
      const json = await res.json()
      for (const id of chunk) {
        const v = json?.[id]?.usd
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[id] = v
      }
    }
  } catch {
    /* ignore */
  }
  return out
}

/**
 * @param {string[]} contracts — lowercase 0x addresses
 */
export async function fetchCoingeckoUsdByContracts(contracts) {
  const unique = [...new Set(contracts.map((c) => normalizeContractAddress(c)).filter((c) => c && c !== 'native'))]
  if (!unique.length) return {}
  const out = {}
  try {
    for (let i = 0; i < unique.length; i += COINGECKO_CONTRACT_CHUNK) {
      const chunk = unique.slice(i, i + COINGECKO_CONTRACT_CHUNK)
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${encodeURIComponent(chunk.join(','))}&vs_currencies=usd`,
        { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } },
      )
      if (!res.ok) continue
      const json = await res.json()
      for (const c of chunk) {
        const v = json?.[c]?.usd ?? json?.[c.toLowerCase()]?.usd
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[c] = v
      }
    }
  } catch {
    /* ignore */
  }
  return out
}

/**
 * @param {string} contract
 */
export async function fetchDexScreenerUsdPrice(contract) {
  const c = normalizeContractAddress(contract)
  if (!c || c === 'native') return null
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(c)}`, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    })
    if (!res.ok) return null
    const json = await res.json()
    const pairs = Array.isArray(json?.pairs) ? json.pairs : []
    const ethPairs = pairs.filter((p) => {
      const cid = String(p?.chainId || '').toLowerCase()
      return cid === 'ethereum' || cid === '1' || cid === 'eth'
    })
    const ranked = (ethPairs.length ? ethPairs : pairs)
      .map((p) => ({
        liquidity: Number(p?.liquidity?.usd || 0),
        priceUsd: p?.priceUsd != null ? Number(p.priceUsd) : null,
      }))
      .filter((p) => p.priceUsd != null && Number.isFinite(p.priceUsd) && p.priceUsd > 0)
      .sort((a, b) => b.liquidity - a.liquidity)
    return ranked[0]?.priceUsd ?? null
  } catch {
    return null
  }
}

/**
 * Optional Alchemy Prices API (requires ALCHEMY_API_KEY in process.env on backend).
 * @param {string} contract
 * @param {string} [apiKey]
 */
export async function fetchAlchemyUsdPrice(contract, apiKey = null) {
  const key = apiKey || (typeof process !== 'undefined' ? process.env?.ALCHEMY_API_KEY : null)
  const c = normalizeContractAddress(contract)
  if (!key || !c || c === 'native') return null
  try {
    const res = await fetch(`https://api.g.alchemy.com/prices/v1/${encodeURIComponent(String(key).trim())}/tokens/by-address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        addresses: [{ network: 'eth-mainnet', address: c }],
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const row = json?.data?.[0]
    const v = row?.prices?.find((p) => p.currency === 'usd')?.value
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

/**
 * @param {object} params
 * @param {string} params.contract
 * @param {string | null} [params.coingeckoId]
 * @param {Record<string, number>} params.priceById
 * @param {Record<string, number>} params.priceByContract
 * @param {string | null} [params.alchemyApiKey]
 */
export async function resolveHoldingUsdPrice({ contract, coingeckoId, priceById, priceByContract, alchemyApiKey = null }) {
  const c = normalizeContractAddress(contract) || ''

  if (c === 'native') {
    const eth = priceById?.ethereum
    if (eth) return { usd: eth, priceLookupStatus: 'coingecko_native_eth', priceSource: 'coingecko' }
    return { usd: null, priceLookupStatus: 'eth_usd_missing', priceSource: null }
  }

  const id = coingeckoId || lookupWalletHoldingByContract(c)?.coingeckoId
  if (id && priceById?.[id]) {
    return { usd: priceById[id], priceLookupStatus: 'coingecko_ok', priceSource: 'coingecko' }
  }

  if (c && priceByContract?.[c]) {
    return { usd: priceByContract[c], priceLookupStatus: 'coingecko_contract_ok', priceSource: 'coingecko' }
  }

  const dex = await fetchDexScreenerUsdPrice(c)
  if (dex) {
    return { usd: dex, priceLookupStatus: 'dexscreener_ok', priceSource: 'dexscreener' }
  }

  const alchemy = await fetchAlchemyUsdPrice(c, alchemyApiKey)
  if (alchemy) {
    return { usd: alchemy, priceLookupStatus: 'alchemy_ok', priceSource: 'alchemy' }
  }

  if (!id) {
    return { usd: null, priceLookupStatus: 'no_coingecko_id', priceSource: null, exclusionReason: 'no_market_id' }
  }
  return { usd: null, priceLookupStatus: 'coingecko_miss', priceSource: null, exclusionReason: 'no_market_price' }
}

/**
 * Map price status to human exclusion reason.
 * @param {string} status
 * @param {boolean} reliable
 */
export function exclusionReasonForPriceStatus(status, reliable) {
  if (reliable) return null
  switch (status) {
    case 'zero_balance':
      return 'zero_balance'
    case 'no_coingecko_id':
      return 'no_market_id'
    case 'coingecko_miss':
    case 'identity_ok_price_missing':
      return 'no_market_price'
    case 'eth_usd_missing':
      return 'eth_usd_missing'
    default:
      return 'no_market_price'
  }
}
