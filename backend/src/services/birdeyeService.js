import { holderMetricsFromBirdeyeHolders } from './tokenConcentration/birdeyeProvider.js'

const BASE = 'https://public-api.birdeye.so'
const CACHE_TTL_MS = 90_000
const FETCH_TIMEOUT_MS = 12_000
const DEFAULT_BIRDEYE_CHAINS = new Set(['solana'])

function birdeyeSupportedChains() {
  const raw = process.env.BIRDEYE_SUPPORTED_CHAINS
  if (raw && String(raw).trim()) {
    return new Set(
      String(raw)
        .split(',')
        .map((c) => normalizeChain(c.trim()))
        .filter(Boolean),
    )
  }
  return DEFAULT_BIRDEYE_CHAINS
}

function isEthereumHexAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(address || '').trim())
}

function shouldSkipBirdeye(chain, address) {
  const ch = normalizeChain(chain)
  const addr = String(address || '').trim()
  if (isEthereumHexAddress(addr) && (ch === 'ethereum' || ch === 'eth' || ch === 'mainnet')) {
    return true
  }
  if (ch === 'ethereum' && addr.startsWith('0x')) {
    return true
  }
  return !birdeyeSupportedChains().has(ch)
}

/** @type {Map<string, { at: number, payload: unknown }>} */
const cache = new Map()

/** Prime watchlist — major assets via Birdeye-supported token addresses. */
export const BIRDEYE_WATCHLIST = [
  {
    symbol: 'BTC',
    name: 'Bitcoin (WBTC)',
    chain: 'ethereum',
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum (WETH)',
    chain: 'ethereum',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    chain: 'solana',
    address: 'So11111111111111111111111111111111111111112',
  },
  {
    symbol: 'XRP',
    name: 'XRP (wrapped)',
    chain: 'ethereum',
    address: '0x1d2f0da169ceb9fc7b431501acfca8924caa5d2f',
  },
]

function hasApiKey() {
  return Boolean(process.env.BIRDEYE_API_KEY && String(process.env.BIRDEYE_API_KEY).trim())
}

function normalizeChain(chain) {
  const c = String(chain || 'solana').trim().toLowerCase()
  if (c === 'eth' || c === 'mainnet') return 'ethereum'
  if (c === 'sol') return 'solana'
  return c
}

function headersForChain(chain) {
  const key = process.env.BIRDEYE_API_KEY?.trim()
  if (!key) return null
  return {
    Accept: 'application/json',
    'X-API-KEY': key,
    'x-chain': normalizeChain(chain),
  }
}

async function fetchBirdeye(path, chain) {
  const headers = headersForChain(chain)
  if (!headers) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE}${path}`, { headers, signal: controller.signal })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[birdeye] HTTP', res.status, path, text.slice(0, 100))
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn('[birdeye] fetch failed', path, err?.message || err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function cachedLoad(key, loader) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.payload
  }
  const payload = await loader()
  if (payload != null) {
    cache.set(key, { at: Date.now(), payload })
  }
  return payload
}

async function loadTokenRaw(chain, address) {
  const enc = encodeURIComponent(address)
  const ch = normalizeChain(chain)
  return cachedLoad(`token:${ch}:${enc}`, async () => {
    const [overviewJson, holdersJson] = await Promise.all([
      fetchBirdeye(`/defi/token_overview?address=${enc}`, ch),
      fetchBirdeye(`/defi/v3/token/holder?address=${enc}&limit=15`, ch),
    ])
    if (!overviewJson?.success && !holdersJson?.success) return null
    return { overviewJson, holdersJson, chain: ch, address }
  })
}

function parseOverview(json) {
  const d = json?.data
  if (!d) return null
  return {
    symbol: d.symbol || null,
    name: d.name || null,
    liquidityUsd: Number(d.liquidity || 0) || null,
    marketCapUsd: Number(d.marketCap || d.fdv || 0) || null,
    volume24hUsd: Number(d.v24hUSD || 0) || null,
    trade24h: Number(d.trade24h || 0) || null,
    holderCount: Number(d.holder || 0) || null,
    totalSupply: Number(d.totalSupply || d.circulatingSupply || 0) || null,
    priceChange24h: Number(d.priceChange24hPercent || d.priceChange24h || 0) || null,
  }
}

function parseHolders(json) {
  const items = json?.data?.items
  if (!json?.success || !Array.isArray(items)) return []
  return items
    .map((h) => ({ owner: h.owner, uiAmount: Number(h.ui_amount || 0) }))
    .filter((h) => h.uiAmount > 0)
    .sort((a, b) => b.uiAmount - a.uiAmount)
}

function liquidityHealthLabel(liquidityUsd) {
  if (liquidityUsd == null || liquidityUsd <= 0) return { label: 'Unknown', band: 'unknown' }
  if (liquidityUsd >= 5_000_000) return { label: 'Healthy depth', band: 'healthy' }
  if (liquidityUsd >= 500_000) return { label: 'Moderate depth', band: 'moderate' }
  if (liquidityUsd >= 50_000) return { label: 'Thin liquidity', band: 'thin' }
  return { label: 'Critical liquidity', band: 'critical' }
}

function tradeVelocityLabel(trade24h, volume24h) {
  const trades = Number(trade24h) || 0
  const vol = Number(volume24h) || 0
  if (trades >= 5000 || vol >= 10_000_000) return { label: 'High velocity', band: 'high' }
  if (trades >= 800 || vol >= 1_000_000) return { label: 'Normal velocity', band: 'normal' }
  if (trades > 0 || vol > 0) return { label: 'Low velocity', band: 'low' }
  return { label: 'Inactive', band: 'inactive' }
}

function holderConcentrationLabel(metrics) {
  if (!metrics) return { label: 'Insufficient holder sample', band: 'unknown', top10Pct: null }
  const top10 = metrics.top10HolderPct
  if (top10 >= 65) return { label: 'Highly concentrated', band: 'high', top10Pct: top10 }
  if (top10 >= 40) return { label: 'Moderately concentrated', band: 'moderate', top10Pct: top10 }
  return { label: 'Distributed holders', band: 'low', top10Pct: top10 }
}

function whaleActivityLabel(metrics, holderCount) {
  if (!metrics) return { label: 'No whale signal', band: 'unknown' }
  const top1 = metrics.top1HolderPct
  if (top1 >= 35) return { label: 'Dominant whale wallet detected', band: 'high' }
  if (top1 >= 15) return { label: 'Notable whale concentration', band: 'elevated' }
  if (holderCount != null && holderCount < 500) return { label: 'Thin holder base', band: 'watch' }
  return { label: 'Balanced whale footprint', band: 'normal' }
}

function smartMoneySignal(overview, liquidity, concentration, velocity) {
  const parts = []
  if (liquidity.band === 'healthy' && velocity.band === 'high') {
    parts.push('Institutional-grade liquidity with active flow')
  } else if (liquidity.band === 'thin' && velocity.band === 'high') {
    parts.push('High activity on thin liquidity — slippage risk elevated')
  } else if (concentration.band === 'high') {
    parts.push('Concentrated supply — monitor large-wallet exits')
  } else if (velocity.band === 'low') {
    parts.push('Muted on-chain activity — narrative may lead price')
  } else {
    parts.push('Mixed on-chain behavior — confirm with wallet exposure')
  }
  const priceCh = overview?.priceChange24h
  if (priceCh != null && Math.abs(priceCh) >= 8) {
    parts.push(`24h price move ${priceCh > 0 ? '+' : ''}${priceCh.toFixed(1)}%`)
  }
  return parts.join('. ')
}

function buildRiskInterpretation({ symbol, liquidity, concentration, whale, velocity }) {
  return [
    `${symbol || 'Token'} on-chain behavior:`,
    liquidity.label,
    concentration.label,
    whale.label,
    velocity.label,
    'Complements LunarCrush social signals — not a trade recommendation.',
  ].join(' ')
}

function mapTokenBehaviorDto({ address, chain, overview, holders, status }) {
  const holderRows = holders || []
  const metrics = holderMetricsFromBirdeyeHolders(holderRows, overview?.totalSupply ?? null)
  const liquidity = liquidityHealthLabel(overview?.liquidityUsd)
  const concentration = holderConcentrationLabel(metrics)
  const velocity = tradeVelocityLabel(overview?.trade24h, overview?.volume24hUsd)
  const whale = whaleActivityLabel(metrics, overview?.holderCount)
  const symbol = overview?.symbol || null

  return {
    source: 'birdeye',
    status,
    tokenAddress: address,
    chain: normalizeChain(chain),
    symbol,
    name: overview?.name || null,
    liquidityHealth: liquidity.label,
    liquidityBand: liquidity.band,
    holderConcentration: concentration.label,
    holderTop10Pct: concentration.top10Pct != null ? Math.round(concentration.top10Pct * 10) / 10 : null,
    tradeVelocity: velocity.label,
    tradeVelocityBand: velocity.band,
    whaleActivity: whale.label,
    whaleBand: whale.band,
    smartMoneySignal: smartMoneySignal(overview, liquidity, concentration, velocity),
    riskInterpretation: buildRiskInterpretation({
      symbol: symbol || address.slice(0, 8),
      liquidity,
      concentration,
      whale,
      velocity,
    }),
    updatedAt: new Date().toISOString(),
  }
}

function unavailableTokenDto(address, chain) {
  return {
    source: 'birdeye',
    status: 'unavailable',
    tokenAddress: address,
    chain: normalizeChain(chain),
    symbol: null,
    name: null,
    liquidityHealth: 'Provider not configured',
    liquidityBand: 'unknown',
    holderConcentration: '—',
    holderTop10Pct: null,
    tradeVelocity: '—',
    tradeVelocityBand: 'unknown',
    whaleActivity: '—',
    whaleBand: 'unknown',
    smartMoneySignal: 'Birdeye behavior intelligence is ready but provider access is not configured.',
    riskInterpretation:
      'On-chain behavior layer unavailable until BIRDEYE_API_KEY is set on the server. Wallet risk and contract intelligence remain active.',
    updatedAt: new Date().toISOString(),
  }
}

function fallbackTokenDto(address, chain) {
  const dto = unavailableTokenDto(address, chain)
  return {
    ...dto,
    status: 'fallback',
    smartMoneySignal: 'Limited Birdeye response — retry shortly or verify token address and chain.',
    riskInterpretation:
      'Birdeye returned incomplete data for this token. Use Universal Risk Scanner and wallet exposure for decision support.',
  }
}

function skippedChainTokenDto(address, chain, meta = {}) {
  const ch = normalizeChain(chain)
  return {
    source: 'birdeye',
    status: 'unsupported',
    tokenAddress: address,
    chain: ch,
    symbol: meta.symbol || null,
    name: meta.name || null,
    liquidityHealth: 'Pending provider coverage',
    liquidityBand: 'unknown',
    holderConcentration: 'Provider data unavailable',
    holderTop10Pct: null,
    tradeVelocity: 'Provider data unavailable',
    tradeVelocityBand: 'unknown',
    whaleActivity: 'Provider data unavailable',
    whaleBand: 'unknown',
    smartMoneySignal: 'Provider data unavailable',
    riskInterpretation:
      'Birdeye behavior intelligence is limited to supported chains. Solana assets use Birdeye; EVM assets use contract and wallet intelligence layers.',
    updatedAt: new Date().toISOString(),
  }
}

function isBehaviorFieldPopulated(value) {
  const v = String(value || '').trim()
  if (!v || v === '—') return false
  return !/^(pending|provider data unavailable|pending provider coverage|provider not configured|awaiting live feed)/i.test(
    v,
  )
}

function isBehaviorAssetComplete(asset) {
  if (!asset || asset.status !== 'live') return false
  return (
    isBehaviorFieldPopulated(asset.holderConcentration) &&
    isBehaviorFieldPopulated(asset.whaleActivity) &&
    isBehaviorFieldPopulated(asset.tradeVelocity) &&
    isBehaviorFieldPopulated(asset.smartMoneySignal)
  )
}

function resolveWatchlistStatus(assets) {
  const supported = assets.filter((a) => a.status !== 'unsupported')
  if (!supported.length) return 'fallback'

  const liveAssets = supported.filter((a) => a.status === 'live')
  const complete = supported.filter(isBehaviorAssetComplete)

  if (complete.length > 0 && complete.length === liveAssets.length && complete.length === supported.length) {
    return 'live'
  }
  if (complete.length > 0 || liveAssets.length > 0) {
    return 'partial'
  }
  return 'fallback'
}

/**
 * @param {string} address
 * @param {string} [chain]
 */
export async function getTokenBehaviorIntelligence(address, chain = 'solana') {
  const tokenAddress = String(address || '').trim()
  if (!tokenAddress) {
    return { ...fallbackTokenDto('', chain), status: 'unavailable' }
  }

  if (shouldSkipBirdeye(chain, tokenAddress)) {
    console.info('[birdeye:skip] unsupported chain', normalizeChain(chain))
    return skippedChainTokenDto(tokenAddress, chain)
  }

  if (!hasApiKey()) {
    return unavailableTokenDto(tokenAddress, chain)
  }

  const raw = await loadTokenRaw(chain, tokenAddress)
  if (!raw?.overviewJson?.data) {
    return fallbackTokenDto(tokenAddress, chain)
  }

  const overview = parseOverview(raw.overviewJson)
  const holders = parseHolders(raw.holdersJson)

  return mapTokenBehaviorDto({
    address: tokenAddress,
    chain: raw.chain,
    overview,
    holders,
    status: 'live',
  })
}

export async function getWatchlistBehaviorIntelligence() {
  if (!hasApiKey()) {
    return {
      source: 'birdeye',
      status: 'unavailable',
      updatedAt: new Date().toISOString(),
      message: 'Birdeye behavior intelligence is ready but provider access is not configured.',
      assets: BIRDEYE_WATCHLIST.map((a) => ({
        ...unavailableTokenDto(a.address, a.chain),
        symbol: a.symbol,
        name: a.name,
      })),
    }
  }

  const assets = await Promise.all(
    BIRDEYE_WATCHLIST.map(async (asset) => {
      if (shouldSkipBirdeye(asset.chain, asset.address)) {
        console.info('[birdeye:skip] unsupported chain', normalizeChain(asset.chain))
        return {
          ...skippedChainTokenDto(asset.address, asset.chain, {
            symbol: asset.symbol,
            name: asset.name,
          }),
          watchlistSymbol: asset.symbol,
        }
      }
      const intel = await getTokenBehaviorIntelligence(asset.address, asset.chain)
      return {
        ...intel,
        symbol: asset.symbol,
        name: asset.name,
        watchlistSymbol: asset.symbol,
      }
    }),
  )

  const status = resolveWatchlistStatus(assets)

  return {
    source: 'birdeye',
    status,
    updatedAt: new Date().toISOString(),
    message:
      status === 'live'
        ? 'Major asset on-chain behavior snapshot (Birdeye).'
        : status === 'partial'
          ? 'Partial Birdeye behavior coverage — some fields pending provider data.'
          : 'Watchlist returned partial Birdeye data.',
    assets,
  }
}
