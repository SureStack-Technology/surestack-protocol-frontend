const API_BASE = 'https://lunarcrush.com/api4'
const CACHE_TTL_MS = 90_000
const FETCH_TIMEOUT_MS = 12_000
const SUBSCRIPTION_COOLDOWN_MS = 10 * 60 * 1000

/** @type {Map<string, { at: number, payload: unknown }>} */
const cache = new Map()

let subscriptionCooldownUntil = 0

function isSubscriptionCooldownActive() {
  return Date.now() < subscriptionCooldownUntil
}

function markSubscriptionRequired() {
  subscriptionCooldownUntil = Date.now() + SUBSCRIPTION_COOLDOWN_MS
  cache.clear()
  console.info('[lunarCrush] subscription_required — 10m cooldown, using scenario fallback')
}

function subscriptionFallbackPayload(kind) {
  const base = kind === 'prime' ? FALLBACK_PRIME : FALLBACK_EXPLORER
  return {
    ...base,
    status: 'fallback',
    providerStatus: 'subscription_required',
    updatedAt: new Date().toISOString(),
  }
}

const FALLBACK_EXPLORER = {
  source: 'lunarcrush',
  status: 'fallback',
  marketMood: 'neutral',
  sentimentScore: null,
  socialVolume: null,
  summary:
    'Social market mood is temporarily unavailable. Reference price telemetry and wallet risk signals remain active.',
  updatedAt: new Date().toISOString(),
}

const FALLBACK_PRIME = {
  source: 'lunarcrush',
  status: 'fallback',
  marketMood: 'neutral',
  sentimentScore: null,
  socialVolume: null,
  trendingNarratives: [],
  trendingAssets: [],
  anomalySignals: [],
  summary:
    'Full social intelligence is temporarily unavailable. Prime wallet and contract intelligence modules remain operational.',
  updatedAt: new Date().toISOString(),
}

function hasApiKey() {
  const key = process.env.LUNARCRUSH_API_KEY
  return Boolean(key && String(key).trim())
}

function moodFromSentiment(score) {
  if (score == null || !Number.isFinite(Number(score))) return 'neutral'
  const n = Number(score)
  if (n >= 62) return 'bullish'
  if (n <= 42) return 'bearish'
  return 'neutral'
}

function moodFromTrend(trend) {
  const t = String(trend || '').toLowerCase()
  if (t === 'up') return 'bullish'
  if (t === 'down') return 'bearish'
  return 'neutral'
}

async function fetchJson(path, searchParams = {}) {
  if (isSubscriptionCooldownActive()) {
    return { __subscriptionRequired: true }
  }

  const key = process.env.LUNARCRUSH_API_KEY?.trim()
  if (!key) return null

  const url = new URL(`${API_BASE}${path}`)
  for (const [k, v] of Object.entries(searchParams)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: controller.signal,
    })
    if (res.status === 402) {
      const text = await res.text().catch(() => '')
      let body = {}
      try {
        body = JSON.parse(text)
      } catch {
        body = {}
      }
      const subscriptionRequired =
        text.includes('subscription_required') ||
        body?.error === 'subscription_required' ||
        body?.message?.includes?.('subscription')
      if (subscriptionRequired) {
        markSubscriptionRequired()
      } else {
        console.warn('[lunarCrush] HTTP 402', path, text.slice(0, 120))
      }
      return { __subscriptionRequired: true }
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[lunarCrush] HTTP', res.status, path, text.slice(0, 120))
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn('[lunarCrush] fetch failed', path, err?.message || err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function cachedFetch(cacheKey, loader) {
  if (isSubscriptionCooldownActive()) {
    return { __subscriptionRequired: true }
  }
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.payload
  }
  const payload = await loader()
  if (payload != null && !payload?.__subscriptionRequired) {
    cache.set(cacheKey, { at: Date.now(), payload })
  }
  return payload
}

async function loadMarketBundle() {
  if (isSubscriptionCooldownActive()) {
    return { __subscriptionRequired: true }
  }

  const [btcTopic, topics, coins] = await Promise.all([
    cachedFetch('topic:bitcoin', () => fetchJson('/public/topic/bitcoin/v1')),
    cachedFetch('topics:list', () => fetchJson('/public/topics/list/v1')),
    cachedFetch('coins:interactions', () =>
      fetchJson('/public/coins/list/v2', { sort: 'interactions_24h', limit: 8, desc: 'true' }),
    ),
  ])

  if (
    btcTopic?.__subscriptionRequired ||
    topics?.__subscriptionRequired ||
    coins?.__subscriptionRequired
  ) {
    return { __subscriptionRequired: true }
  }

  return { btcTopic, topics, coins }
}

function aggregateSentiment(btcData) {
  const detail = btcData?.types_sentiment
  if (!detail || typeof detail !== 'object') {
    return btcData?.types_sentiment?.tweet ?? null
  }
  const vals = Object.values(detail).map(Number).filter((n) => Number.isFinite(n))
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function buildExplorerFromBundle(bundle, status) {
  const btc = bundle?.btcTopic?.data
  const sentimentScore = aggregateSentiment(btc)
  const socialVolume = btc?.interactions_24h ?? btc?.num_posts ?? null
  const marketMood = moodFromSentiment(sentimentScore) !== 'neutral'
    ? moodFromSentiment(sentimentScore)
    : moodFromTrend(btc?.trend)

  const moodLabel = marketMood === 'bullish' ? 'constructive' : marketMood === 'bearish' ? 'cautious' : 'mixed'
  const vol =
    socialVolume != null && Number.isFinite(Number(socialVolume))
      ? `${Math.round(Number(socialVolume) / 1_000_000)}M+ social interactions (24h)`
      : 'social volume stabilizing'

  return {
    source: 'lunarcrush',
    status,
    marketMood,
    sentimentScore: sentimentScore != null ? Number(sentimentScore) : null,
    socialVolume: socialVolume != null ? Number(socialVolume) : null,
    summary: `Crypto social mood looks ${moodLabel} on aggregate BTC discourse — ${vol}. Upgrade to Prime for narrative trends and anomaly signals.`,
    updatedAt: new Date().toISOString(),
  }
}

function mapTrendingNarratives(topicsJson) {
  const rows = Array.isArray(topicsJson?.data) ? topicsJson.data : []
  return rows.slice(0, 6).map((row) => ({
    topic: row.topic,
    title: row.title || row.topic,
    rank: row.topic_rank ?? null,
    interactions24h: row.interactions_24h ?? null,
    contributors: row.num_contributors ?? null,
  }))
}

function mapTrendingAssets(coinsJson) {
  const rows = Array.isArray(coinsJson?.data) ? coinsJson.data : []
  return rows.slice(0, 6).map((row) => ({
    symbol: row.symbol,
    name: row.name,
    sentiment: row.sentiment ?? null,
    interactions24h: row.interactions_24h ?? null,
    socialVolume24h: row.social_volume_24h ?? null,
    galaxyScore: row.galaxy_score ?? null,
    percentChange24h: row.percent_change_24h ?? null,
  }))
}

function buildAnomalySignals(btc, coins) {
  const signals = []
  const trend = String(btc?.trend || '').toLowerCase()
  if (trend === 'up') {
    signals.push({ type: 'social_momentum', label: 'BTC discourse accelerating', severity: 'WATCH' })
  } else if (trend === 'down') {
    signals.push({ type: 'social_momentum', label: 'BTC discourse cooling', severity: 'WATCH' })
  }

  const coinsRows = Array.isArray(coins?.data) ? coins.data : []
  for (const c of coinsRows.slice(0, 4)) {
    const prev = c.alt_rank_previous
    const cur = c.alt_rank
    if (Number.isFinite(prev) && Number.isFinite(cur) && cur < prev - 40) {
      signals.push({
        type: 'alt_rank_spike',
        label: `${c.symbol} social rank improving (${prev} → ${cur})`,
        severity: 'INFO',
      })
    }
    if (Number.isFinite(c.sentiment) && c.sentiment >= 78) {
      signals.push({
        type: 'sentiment_extreme',
        label: `${c.symbol} elevated positive sentiment (${Math.round(c.sentiment)}%)`,
        severity: 'WATCH',
      })
    }
  }

  return signals.slice(0, 5)
}

function buildPrimeFromBundle(bundle, status) {
  const btc = bundle?.btcTopic?.data
  const sentimentScore = aggregateSentiment(btc)
  const socialVolume = btc?.interactions_24h ?? null
  const marketMood = moodFromSentiment(sentimentScore) !== 'neutral'
    ? moodFromSentiment(sentimentScore)
    : moodFromTrend(btc?.trend)

  const trendingNarratives = mapTrendingNarratives(bundle?.topics)
  const trendingAssets = mapTrendingAssets(bundle?.coins)
  const anomalySignals = buildAnomalySignals(btc, bundle?.coins)

  const topNarrative = trendingNarratives[0]?.title
  const topAsset = trendingAssets[0]?.symbol
  const summary = [
    `Market mood: ${marketMood}.`,
    sentimentScore != null ? `Weighted social sentiment ~${Math.round(sentimentScore)}%.` : null,
    topNarrative ? `Leading narrative: ${topNarrative}.` : null,
    topAsset ? `Top social activity: ${topAsset}.` : null,
    anomalySignals.length ? `${anomalySignals.length} anomaly signal(s) flagged.` : null,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    source: 'lunarcrush',
    status,
    marketMood,
    sentimentScore: sentimentScore != null ? Number(sentimentScore) : null,
    socialVolume: socialVolume != null ? Number(socialVolume) : null,
    trendingNarratives,
    trendingAssets,
    anomalySignals,
    summary: summary || 'Social intelligence snapshot ready.',
    updatedAt: new Date().toISOString(),
  }
}

export async function getExplorerMarketSentiment() {
  if (!hasApiKey()) {
    return { ...FALLBACK_EXPLORER, status: 'unavailable', updatedAt: new Date().toISOString() }
  }

  if (isSubscriptionCooldownActive()) {
    return subscriptionFallbackPayload('explorer')
  }

  try {
    const bundle = await loadMarketBundle()
    if (bundle?.__subscriptionRequired) {
      return subscriptionFallbackPayload('explorer')
    }
    if (!bundle?.btcTopic?.data) {
      return { ...FALLBACK_EXPLORER, updatedAt: new Date().toISOString() }
    }
    return buildExplorerFromBundle(bundle, 'live')
  } catch (err) {
    console.warn('[lunarCrush] explorer sentiment failed', err?.message || err)
    return { ...FALLBACK_EXPLORER, updatedAt: new Date().toISOString() }
  }
}

export async function getPrimeSocialTrends() {
  if (!hasApiKey()) {
    return { ...FALLBACK_PRIME, status: 'unavailable', updatedAt: new Date().toISOString() }
  }

  if (isSubscriptionCooldownActive()) {
    return subscriptionFallbackPayload('prime')
  }

  try {
    const bundle = await loadMarketBundle()
    if (bundle?.__subscriptionRequired) {
      return subscriptionFallbackPayload('prime')
    }
    if (!bundle?.btcTopic?.data && !bundle?.topics?.data?.length) {
      return { ...FALLBACK_PRIME, updatedAt: new Date().toISOString() }
    }
    return buildPrimeFromBundle(bundle, 'live')
  } catch (err) {
    console.warn('[lunarCrush] prime trends failed', err?.message || err)
    return { ...FALLBACK_PRIME, updatedAt: new Date().toISOString() }
  }
}
