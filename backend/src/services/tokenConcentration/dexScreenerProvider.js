const CHAIN_SLUG = {
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum',
  10: 'optimism',
  137: 'polygon',
}

/**
 * @param {object} p — raw DexScreener pair
 */
function normalizePair(p) {
  const txns = p.txns?.h24 || {}
  const buys = Number(txns.buys || 0)
  const sells = Number(txns.sells || 0)
  return {
    liquidityUsd: Number(p.liquidity?.usd || 0),
    fdv: p.fdv != null ? Number(p.fdv) : null,
    marketCap: p.marketCap != null ? Number(p.marketCap) : null,
    volume24hUsd: Number(p.volume?.h24 || 0),
    txns24h: buys + sells,
    txnsBuys24h: buys,
    txnsSells24h: sells,
    pairCreatedAt: p.pairCreatedAt ? Number(p.pairCreatedAt) : null,
    dexId: p.dexId || null,
    labels: Array.isArray(p.labels) ? p.labels : [],
    priceUsd: p.priceUsd != null ? Number(p.priceUsd) : null,
    url: p.url || null,
    pairAddress: p.pairAddress || null,
    baseToken: p.baseToken || null,
    quoteToken: p.quoteToken || null,
    chainId: p.chainId || null,
  }
}

/**
 * @param {object[]} pairs
 * @param {'solana' | string | null} slug
 */
function filterPairsForChain(pairs, slug) {
  if (!slug) return pairs
  let filtered = pairs.filter((p) => {
    const cid = String(p.chainId || '').toLowerCase()
    return cid === slug || cid === 'solana' || cid.includes('sol')
  })
  if (slug === 'solana' && filtered.length === 0 && pairs.length > 0) {
    filtered = pairs
  }
  return filtered
}

/**
 * @param {string} address
 * @param {number | 'solana'} chainId
 */
async function fetchDexScreenerRaw(address, chainId) {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`,
    { headers: { Accept: 'application/json' } },
  )
  if (!res.ok) return { error: true }
  const json = await res.json()
  if (json?.pairs == null) return { ranked: [], slug }
  const pairs = Array.isArray(json.pairs) ? json.pairs : []
  const slug = chainId === 'solana' ? 'solana' : CHAIN_SLUG[Number(chainId)] || null
  const filtered = filterPairsForChain(pairs, slug)
  const ranked = filtered.map(normalizePair).sort((a, b) => b.liquidityUsd - a.liquidityUsd)
  return { ranked, slug }
}

/**
 * Solana-primary market intelligence (DexScreener public API).
 * @param {string} mint
 */
export async function fetchDexScreenerSolanaMarket(mint) {
  try {
    const raw = await fetchDexScreenerRaw(mint, 'solana')
    if (raw.error) return { status: 'error', source: 'DEXSCREENER' }
    if (raw.malformed) return { status: 'malformed', source: 'DEXSCREENER' }

    const ranked = raw.ranked || []
    if (ranked.length === 0) {
      return {
        status: 'empty',
        source: 'DEXSCREENER',
        confirmed: true,
        hasLiquidity: false,
        totalLiquidityUsd: 0,
        pairCount: 0,
        primaryPool: null,
        pools: [],
        dexIds: [],
      }
    }

    const primary = ranked[0]
    const totalLiquidityUsd = ranked.reduce((s, p) => s + (p.liquidityUsd || 0), 0)
    const oldest = ranked
      .map((p) => p.pairCreatedAt)
      .filter(Boolean)
      .sort((a, b) => a - b)[0]

    return {
      status: 'indexed',
      source: 'DEXSCREENER',
      confirmed: true,
      hasLiquidity: totalLiquidityUsd > 0,
      totalLiquidityUsd,
      topPairLiquidityUsd: primary.liquidityUsd,
      pairCount: ranked.length,
      primaryPool: primary,
      pools: ranked,
      primaryDex: primary.dexId,
      pairCreatedAt: oldest || primary.pairCreatedAt,
      dexIds: [...new Set(ranked.map((p) => p.dexId).filter(Boolean))],
      volume24hUsd: ranked.reduce((s, p) => s + (p.volume24hUsd || 0), 0),
      marketCapUsd: primary.marketCap,
      fdvUsd: primary.fdv,
      priceUsd: primary.priceUsd,
      txns24h: ranked.reduce((s, p) => s + (p.txns24h || 0), 0),
      labels: primary.labels,
      pairUrl: primary.url,
    }
  } catch {
    return { status: 'error', source: 'DEXSCREENER' }
  }
}

/**
 * EVM + legacy Solana shape (backward compatible).
 * @param {string} address
 * @param {number | 'solana'} chainId
 */
export async function fetchDexScreenerToken(address, chainId) {
  if (chainId === 'solana') {
    const market = await fetchDexScreenerSolanaMarket(address)
    if (market.status === 'error' || market.status === 'malformed') return null
    return {
      hasLiquidity: market.hasLiquidity,
      confirmed: market.confirmed,
      totalLiquidityUsd: market.totalLiquidityUsd,
      pairCount: market.pairCount,
      primaryDex: market.primaryDex,
      pairCreatedAt: market.pairCreatedAt,
      topPairLiquidityUsd: market.topPairLiquidityUsd,
      dexIds: market.dexIds,
    }
  }

  try {
    const raw = await fetchDexScreenerRaw(address, chainId)
    if (raw.error || raw.malformed) return null
    const ranked = raw.ranked || []
    const top = ranked[0]
    if (!top) {
      return {
        hasLiquidity: false,
        confirmed: true,
        totalLiquidityUsd: 0,
        pairCount: 0,
        primaryDex: null,
        pairCreatedAt: null,
      }
    }
    const totalLiquidityUsd = ranked.reduce((s, p) => s + (p.liquidityUsd || 0), 0)
    const oldest = ranked
      .map((p) => p.pairCreatedAt)
      .filter(Boolean)
      .sort((a, b) => a - b)[0]
    return {
      hasLiquidity: totalLiquidityUsd > 0,
      confirmed: true,
      totalLiquidityUsd,
      pairCount: ranked.length,
      primaryDex: top.dexId,
      pairCreatedAt: oldest || top.pairCreatedAt,
      topPairLiquidityUsd: top.liquidityUsd,
      dexIds: [...new Set(ranked.map((p) => p.dexId).filter(Boolean))],
    }
  } catch {
    return null
  }
}
