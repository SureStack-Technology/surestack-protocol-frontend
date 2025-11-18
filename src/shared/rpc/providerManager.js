import { ethers } from 'ethers'

const NETWORK = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 11155111),
  name: import.meta.env.VITE_CHAIN_NAME ?? 'sepolia',
}

const RATE_LIMIT_CODES = new Set([-32005, 429])
const RATE_LIMIT_REGEX = /rate limit|too many requests|exceed/i
const NETWORK_ERROR_REGEX = /timeout|network|ECONNRESET|ENOTFOUND|disconnect/i
const BLOCK_CACHE_TTL = Number(import.meta.env.VITE_RPC_BLOCK_CACHE_MS ?? 400)

const HTTP_ENDPOINTS = [
  { name: 'Infura', url: import.meta.env.VITE_SEPOLIA_RPC },
  { name: 'Alchemy', url: import.meta.env.VITE_ALCHEMY_RPC },
  {
    name: 'Public',
    url: import.meta.env.VITE_PUBLIC_RPC || 'https://rpc.sepolia.org',
  },
  { name: 'Static', url: import.meta.env.VITE_STATIC_RPC },
]
  .filter((entry) => Boolean(entry.url))
  .filter((entry, index, self) =>
    self.findIndex((candidate) => candidate.url === entry.url) === index
  )

if (HTTP_ENDPOINTS.length === 0) {
  console.warn('[providerManager] ⚠️ No RPC endpoints configured; defaulting to public Sepolia RPC.')
  HTTP_ENDPOINTS.push({ name: 'Public', url: 'https://rpc.sepolia.org' })
}

const PROVIDERS = HTTP_ENDPOINTS.map((endpoint) => {
  const provider = new ethers.JsonRpcProvider(endpoint.url, NETWORK)
  provider._surestackName = endpoint.name
  provider._surestackUrl = endpoint.url
  return provider
})

let activeIndex = 0
let blockCache = { value: null, timestamp: 0 }

const providerStates = HTTP_ENDPOINTS.map(() => ({
  status: 'idle',
  lastError: null,
  lastSuccess: 0,
}))

function markSuccess(index) {
  providerStates[index] = {
    status: 'healthy',
    lastError: null,
    lastSuccess: Date.now(),
  }
  activeIndex = index
}

function markFailure(index, error, rateLimited) {
  providerStates[index] = {
    status: rateLimited ? 'rate_limited' : 'error',
    lastError: error?.message ?? String(error ?? 'Unknown error'),
    lastSuccess: providerStates[index]?.lastSuccess ?? 0,
  }
}

function isRateLimitError(error) {
  if (!error) return false
  if (RATE_LIMIT_CODES.has(error.code) || RATE_LIMIT_CODES.has(error?.error?.code)) {
    return true
  }
  const message = (error?.message || error?.error?.message || '').toLowerCase()
  return RATE_LIMIT_REGEX.test(message)
}

function isNetworkError(error) {
  if (!error) return false
  const message = (error?.message || '').toLowerCase()
  return NETWORK_ERROR_REGEX.test(message)
}

async function executeWithRotation(callback) {
  let attempts = 0
  let lastError = null

  while (attempts < PROVIDERS.length) {
    const index = (activeIndex + attempts) % PROVIDERS.length
    const provider = PROVIDERS[index]

    try {
      const result = await callback(provider, index)
      markSuccess(index)
      return result
    } catch (error) {
      lastError = error
      const rateLimited = isRateLimitError(error)
      const networkIssue = isNetworkError(error)
      markFailure(index, error, rateLimited)

      if (rateLimited || networkIssue) {
        attempts += 1
        continue
      }

      throw error
    }
  }

  throw lastError ?? new Error('All RPC providers failed')
}

const HYBRID_PROVIDER = new Proxy(PROVIDERS[activeIndex], {
  get(_target, prop, receiver) {
    if (prop === '_isHybridProvider') return true
    if (prop === '_activeIndex') return activeIndex

    if (prop === 'getBlockNumber') {
      return async () => {
        const now = Date.now()
        if (blockCache.value !== null && now - blockCache.timestamp < BLOCK_CACHE_TTL) {
          return blockCache.value
        }
        const value = await executeWithRotation((provider) => provider.getBlockNumber())
        blockCache = { value, timestamp: now }
        return value
      }
    }

    if (prop === 'send') {
      return async (method, params) => {
        if (method === 'eth_blockNumber') {
          return (await HYBRID_PROVIDER.getBlockNumber()).toString(16)
        }

        return executeWithRotation((provider) => provider.send(method, params ?? []))
      }
    }

    const value = PROVIDERS[activeIndex][prop]

    if (typeof value === 'function') {
      return (...args) => executeWithRotation((provider) => provider[prop](...args))
    }

    return Reflect.get(receiver ?? PROVIDERS[activeIndex], prop)
  },
})

let wsProvider = null
let wsEndpointMeta = { url: null, name: null }

const WS_ENDPOINTS = [
  { name: 'Infura', url: import.meta.env.VITE_INFURA_WS },
  { name: 'Alchemy', url: import.meta.env.VITE_ALCHEMY_WS },
  { name: 'Public', url: import.meta.env.VITE_PUBLIC_WS },
  { name: 'Static', url: import.meta.env.VITE_STATIC_WS },
]
  .map((entry) => ({ ...entry, url: normalizeWsUrl(entry.url) }))
  .filter((entry) => Boolean(entry.url))

function normalizeWsUrl(url) {
  if (!url) return null
  if (url.startsWith('ws')) return url
  if (url.includes('infura.io')) {
    return url.replace('https://', 'wss://').replace('/v3/', '/ws/v3/')
  }
  if (url.startsWith('https://')) {
    return url.replace('https://', 'wss://')
  }
  if (url.startsWith('http://')) {
    return url.replace('http://', 'ws://')
  }
  return null
}

function buildWebSocketProvider() {
  for (const endpoint of WS_ENDPOINTS) {
    try {
      const provider = new ethers.WebSocketProvider(endpoint.url, NETWORK)
      attachWsDiagnostics(provider, endpoint)
      wsEndpointMeta = endpoint
      console.info(`[providerManager] 🔌 Using ${endpoint.name} WebSocket provider`)
      return provider
    } catch (error) {
      console.warn(`[providerManager] Failed to initialise ${endpoint.name} WS provider:`, error)
    }
  }

  console.warn('[providerManager] Falling back to hybrid HTTP provider for WS operations')
  wsEndpointMeta = { name: 'HybridHTTP', url: HYBRID_PROVIDER?._ss_url ?? 'n/a' }
  return HYBRID_PROVIDER
}

function attachWsDiagnostics(provider, endpoint) {
  if (!provider || typeof provider.on !== 'function') return

  provider.on('error', (error) => {
    console.warn(`[providerManager] WS error on ${endpoint.name}:`, error)
  })

  provider.on('close', () => {
    console.warn(`[providerManager] WS closed on ${endpoint.name}; rebuilding in 3s`)
    setTimeout(() => {
      wsProvider?.destroy?.()
      wsProvider = null
      getHybridWebSocketProvider()
    }, 3000)
  })
}

export function getHybridProvider() {
  return HYBRID_PROVIDER
}

export function getHybridWebSocketProvider() {
  if (!wsProvider) {
    wsProvider = buildWebSocketProvider()
  }
  return wsProvider
}

export function getSignerOrHybridProvider(signer) {
  if (signer) {
    return signer
  }
  return getHybridProvider()
}

export function getProviderHealth() {
  return {
    activeIndex,
    endpoints: HTTP_ENDPOINTS.map((endpoint, index) => ({
      name: endpoint.name,
      url: endpoint.url,
      status: providerStates[index]?.status ?? 'idle',
      lastError: providerStates[index]?.lastError ?? null,
      lastSuccess: providerStates[index]?.lastSuccess ?? 0,
      isActive: index === activeIndex,
    })),
    ws: {
      name: wsEndpointMeta.name,
      url: wsEndpointMeta.url,
      connected: Boolean(wsProvider),
    },
  }
}

