/**
 * Public macro market snapshot for Explorer Market Pulse (CoinGecko, server-side cache).
 * No auth — orientation-only data.
 */
import express from 'express'

const router = express.Router()

const TTL_MS = 90_000
let cache = { at: 0, payload: null }

const CG_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'SureStack-Explorer-Macro/1.0',
}

async function fetchMacroFromCoingecko() {
  const [priceRes, globalRes] = await Promise.all([
    fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple&vs_currencies=usd&include_24hr_change=true',
      { headers: CG_HEADERS }
    ),
    fetch('https://api.coingecko.com/api/v3/global', { headers: CG_HEADERS }),
  ])

  if (!priceRes.ok) {
    const t = await priceRes.text().catch(() => '')
    throw new Error(`coingecko_price_${priceRes.status}:${t.slice(0, 120)}`)
  }
  if (!globalRes.ok) {
    const t = await globalRes.text().catch(() => '')
    throw new Error(`coingecko_global_${globalRes.status}:${t.slice(0, 120)}`)
  }

  const priceJson = await priceRes.json()
  const globalJson = await globalRes.json()

  const btcUsd = priceJson?.bitcoin?.usd
  const btc24 = priceJson?.bitcoin?.usd_24h_change
  const ethUsd = priceJson?.ethereum?.usd
  const eth24 = priceJson?.ethereum?.usd_24h_change
  const xrpUsd = priceJson?.ripple?.usd
  const xrp24 = priceJson?.ripple?.usd_24h_change

  const totalUsd = globalJson?.data?.total_market_cap?.usd
  const total24 = globalJson?.data?.market_cap_change_percentage_24h_usd

  const updatedAt = new Date().toISOString()

  return {
    btc: {
      usd: typeof btcUsd === 'number' && Number.isFinite(btcUsd) ? btcUsd : null,
      change24h: typeof btc24 === 'number' && Number.isFinite(btc24) ? btc24 : null,
    },
    eth: {
      usd: typeof ethUsd === 'number' && Number.isFinite(ethUsd) ? ethUsd : null,
      change24h: typeof eth24 === 'number' && Number.isFinite(eth24) ? eth24 : null,
    },
    xrp: {
      usd: typeof xrpUsd === 'number' && Number.isFinite(xrpUsd) ? xrpUsd : null,
      change24h: typeof xrp24 === 'number' && Number.isFinite(xrp24) ? xrp24 : null,
    },
    total: {
      usd: typeof totalUsd === 'number' && Number.isFinite(totalUsd) ? totalUsd : null,
      change24h: typeof total24 === 'number' && Number.isFinite(total24) ? total24 : null,
    },
    updatedAt,
  }
}

router.get('/macro', async (req, res) => {
  try {
    if (cache.payload && Date.now() - cache.at < TTL_MS) {
      return res.json({ ...cache.payload, cached: true })
    }
    const payload = await fetchMacroFromCoingecko()
    cache = { at: Date.now(), payload }
    return res.json({ ...payload, cached: false })
  } catch (err) {
    console.warn('[marketMacro]', err?.message || err)
    if (cache.payload) {
      return res.json({ ...cache.payload, stale: true, error: 'refresh_failed' })
    }
    return res.status(503).json({
      error: 'macro_unavailable',
      message: err?.message || 'Could not load macro market data',
    })
  }
})

export default router
