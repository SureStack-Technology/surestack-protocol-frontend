const BASE = 'https://public-api.birdeye.so'

function birdeyeHeaders() {
  const key = process.env.BIRDEYE_API_KEY
  if (!key) return null
  return {
    Accept: 'application/json',
    'X-API-KEY': key,
    'x-chain': 'solana',
  }
}

/**
 * @param {string} mint
 */
export async function fetchBirdeyeTokenOverview(mint) {
  const headers = birdeyeHeaders()
  if (!headers) return null

  try {
    const res = await fetch(
      `${BASE}/defi/token_overview?address=${encodeURIComponent(mint)}`,
      { headers },
    )
    if (!res.ok) return null
    const json = await res.json()
    if (!json?.success || !json?.data) return null
    const d = json.data
    return {
      liquidityUsd: Number(d.liquidity || 0) || null,
      marketCapUsd: Number(d.marketCap || d.fdv || 0) || null,
      priceUsd: Number(d.price || 0) || null,
      holderCount: Number(d.holder || 0) || null,
      totalSupply: Number(d.totalSupply || d.circulatingSupply || 0) || null,
      volume24hUsd: Number(d.v24hUSD || 0) || null,
      trade24h: Number(d.trade24h || 0) || null,
      lastTradeUnixTime: d.lastTradeUnixTime ? Number(d.lastTradeUnixTime) : null,
      symbol: d.symbol || null,
      name: d.name || null,
    }
  } catch {
    return null
  }
}

/**
 * @param {string} mint
 * @param {number} [limit]
 */
export async function fetchBirdeyeTokenHolders(mint, limit = 20) {
  const headers = birdeyeHeaders()
  if (!headers) return null

  try {
    const res = await fetch(
      `${BASE}/defi/v3/token/holder?address=${encodeURIComponent(mint)}&limit=${Math.min(limit, 100)}`,
      { headers },
    )
    if (!res.ok) return null
    const json = await res.json()
    const items = json?.data?.items
    if (!json?.success || !Array.isArray(items)) return null
    return items.map((h) => ({
      owner: h.owner,
      uiAmount: Number(h.ui_amount || 0),
    }))
  } catch {
    return null
  }
}

/**
 * @param {string} mint
 */
export async function fetchBirdeyeTokenCreation(mint) {
  const headers = birdeyeHeaders()
  if (!headers) return null

  try {
    const res = await fetch(
      `${BASE}/defi/token_creation_info?address=${encodeURIComponent(mint)}`,
      { headers },
    )
    if (!res.ok) return null
    const json = await res.json()
    if (!json?.success || !json?.data) return null
    const blockUnixTime = Number(json.data.blockUnixTime || 0)
    return {
      blockUnixTime: blockUnixTime > 0 ? blockUnixTime * 1000 : null,
      owner: json.data.owner || null,
    }
  } catch {
    return null
  }
}

/**
 * @param {Array<{ uiAmount?: number }>} holders
 * @param {number | null} totalSupply
 */
export function holderMetricsFromBirdeyeHolders(holders, totalSupply) {
  const rows = holders || []
  const amounts = rows.map((h) => Number(h.uiAmount || 0)).filter((n) => n > 0)
  if (!amounts.length) return null

  const sampledTotal = amounts.reduce((s, n) => s + n, 0)
  const supply = totalSupply && totalSupply > 0 ? totalSupply : sampledTotal
  if (supply <= 0) return null

  const top1 = (amounts[0] / supply) * 100
  const top10 = (amounts.slice(0, 10).reduce((s, n) => s + n, 0) / supply) * 100
  const top5 = (amounts.slice(0, 5).reduce((s, n) => s + n, 0) / supply) * 100

  return {
    top1HolderPct: top1,
    top10HolderPct: top10,
    top5HolderPct: top5,
    holderSampleSize: rows.length,
  }
}
