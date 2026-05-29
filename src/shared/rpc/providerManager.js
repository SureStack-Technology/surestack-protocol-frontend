import { AbstractProvider, JsonRpcProvider, Network, WebSocketProvider } from 'ethers'
import { listBrowserSepoliaHttpRpcs, warnNoReadOnlyRpcOnce } from './sepoliaRpcEnv.js'

const NETWORK = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 11155111),
  name: import.meta.env.VITE_CHAIN_NAME ?? 'sepolia',
}

const STATIC_NET = Network.from(NETWORK.chainId)

const RATE_LIMIT_CODES = new Set([-32005, 429])
const RATE_LIMIT_REGEX = /rate limit|too many requests|exceed/i
const NETWORK_ERROR_REGEX = /timeout|network|ECONNRESET|ENOTFOUND|disconnect|failed to fetch|cors|load failed/i
const BLOCK_CACHE_TTL = Number(import.meta.env.VITE_RPC_BLOCK_CACHE_MS ?? 400)

const RPC_CANDIDATES = listBrowserSepoliaHttpRpcs()

if (RPC_CANDIDATES.length === 0) {
  warnNoReadOnlyRpcOnce()
}

const HTTP_ENDPOINTS = RPC_CANDIDATES.map(({ key, url }) => ({
  name: key.replace(/^VITE_/, ''),
  url,
}))

/**
 * When no browser-safe HTTP RPC is configured, expose a static-network provider that rejects
 * RPC calls immediately (no JsonRpcProvider / no CORS / no ethers "retry in 1s" detect loop).
 */
class ReadOnlyRpcDisabledProvider extends AbstractProvider {
  constructor() {
    super(STATIC_NET, { staticNetwork: true })
  }

  async _perform() {
    const err = new Error('read_only_rpc_unconfigured')
    err.code = 'UNSUPPORTED_OPERATION'
    throw err
  }
}

const PROVIDERS =
  HTTP_ENDPOINTS.length > 0
    ? HTTP_ENDPOINTS.map((endpoint) => {
        const provider = new JsonRpcProvider(endpoint.url, STATIC_NET, { staticNetwork: true })
        provider._surestackName = endpoint.name
        provider._surestackUrl = endpoint.url
        return provider
      })
    : (() => {
        const p = new ReadOnlyRpcDisabledProvider()
        p._surestackName = 'ReadOnlyDisabled'
        p._surestackUrl = ''
        return [p]
      })()

const providerStates = PROVIDERS.map(() => ({
  status: HTTP_ENDPOINTS.length > 0 ? 'idle' : 'disabled',
  lastError: HTTP_ENDPOINTS.length > 0 ? null : 'read_only_rpc_unconfigured',
  lastSuccess: 0,
}))

let activeIndex = 0
let blockCache = { value: null, timestamp: 0 }

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

/** Firefox-safe: avoid Proxy get trap re-entry (stack overflow on hybrid.foo chains). */
let hybridProxyGetDepth = 0
const HYBRID_PROXY_MAX_DEPTH = 48

async function hybridGetBlockNumber() {
  const now = Date.now()
  if (blockCache.value !== null && now - blockCache.timestamp < BLOCK_CACHE_TTL) {
    return blockCache.value
  }
  const value = await executeWithRotation((provider) => provider.getBlockNumber())
  blockCache = { value, timestamp: now }
  return value
}

const HYBRID_PROVIDER = new Proxy(PROVIDERS[activeIndex], {
  get(_target, prop, _receiver) {
    if (hybridProxyGetDepth >= HYBRID_PROXY_MAX_DEPTH) {
      console.warn('[providerManager] hybrid provider get depth exceeded:', String(prop))
      return undefined
    }
    hybridProxyGetDepth += 1
    try {
      if (prop === '_isHybridProvider') return true
      if (prop === '_activeIndex') return activeIndex

      if (prop === 'getBlockNumber') {
        return hybridGetBlockNumber
      }

      if (prop === 'send') {
        return async (method, params) => {
          if (method === 'eth_blockNumber') {
            const block = await hybridGetBlockNumber()
            return block.toString(16)
          }
          return executeWithRotation((provider) => provider.send(method, params ?? []))
        }
      }

      const concrete = PROVIDERS[activeIndex]
      const value = concrete[prop]

      if (typeof value === 'function') {
        return (...args) => executeWithRotation((provider) => provider[prop](...args))
      }

      // Never use `receiver` here — it is the Proxy when callers use hybrid.foo, and
      // Reflect.get(proxy, prop, proxy) re-enters this trap → stack overflow.
      return Reflect.get(concrete, prop, concrete)
    } finally {
      hybridProxyGetDepth -= 1
    }
  },
})

let wsProvider = null
let wsEndpointMeta = { url: null, name: null }
let wsRebuildAttempts = 0
let wsDisabled = false
const WS_MAX_REBUILD_ATTEMPTS = 5

function isUsableWsUrl(url) {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed.startsWith('ws')) return false
  if (/YOUR_KEY|YOUR_PROJECT|placeholder|\.\.\./i.test(trimmed)) return false
  return true
}

const WS_ENDPOINTS = [
  { name: 'Infura', url: import.meta.env.VITE_INFURA_WS },
  { name: 'Alchemy', url: import.meta.env.VITE_ALCHEMY_WS },
  { name: 'Public', url: import.meta.env.VITE_PUBLIC_WS },
  { name: 'Static', url: import.meta.env.VITE_STATIC_WS },
]
  .map((entry) => ({ ...entry, url: normalizeWsUrl(entry.url) }))
  .filter((entry) => isUsableWsUrl(entry.url))

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
      const provider = new WebSocketProvider(endpoint.url, STATIC_NET)
      attachWsDiagnostics(provider, endpoint)
      wsEndpointMeta = endpoint
      console.info(`[providerManager] 🔌 Using ${endpoint.name} WebSocket provider`)
      return provider
    } catch (error) {
      console.warn(`[providerManager] Failed to initialise ${endpoint.name} WS provider:`, error)
    }
  }

  console.warn('[providerManager] No WebSocket endpoint available — use HTTP RPC / REST oracle fallback')
  wsEndpointMeta = { name: 'Disabled', url: null }
  return null
}

function scheduleWsProviderRebuild(endpoint) {
  if (wsDisabled || WS_ENDPOINTS.length === 0) return
  if (wsRebuildAttempts >= WS_MAX_REBUILD_ATTEMPTS) {
    wsDisabled = true
    wsProvider = null
    console.warn('[providerManager] WS rebuild limit reached; disabling WebSocket until reload')
    return
  }
  wsRebuildAttempts += 1
  const delayMs = Math.min(30_000, 3000 * wsRebuildAttempts)
  try {
    console.warn(`[providerManager] WS closed on ${endpoint?.name ?? 'unknown'}; rebuild ${wsRebuildAttempts}/${WS_MAX_REBUILD_ATTEMPTS} in ${delayMs}ms`)
    setTimeout(() => {
      try {
        wsProvider?.destroy?.()
      } catch (_) {
        /* ignore */
      }
      wsProvider = null
      try {
        getHybridWebSocketProvider()
      } catch (e) {
        console.warn('[providerManager] WS rebuild failed:', e)
      }
    }, delayMs)
  } catch (_) {
    /* diagnostics must not break boot */
  }
}

/**
 * Ethers v6 only allows certain string events on provider.on() (block, error, …).
 * "close" is not valid — attach close handling to the underlying WebSocket instead.
 */
function getUnderlyingWebSocket(provider) {
  if (!provider) return null
  try {
    const w = provider.websocket
    if (w) return w
  } catch (_) {
    /* getter throws if socket already torn down */
  }
  try {
    if (provider._websocket) return provider._websocket
  } catch (_) {
    /* ignore */
  }
  return null
}

function attachNativeWebSocketCloseHandler(ws, endpoint) {
  if (!ws) return
  const onClose = () => scheduleWsProviderRebuild(endpoint)
  try {
    if (typeof ws.addEventListener === 'function') {
      ws.addEventListener('close', onClose)
    } else if (typeof ws.on === 'function') {
      ws.on('close', onClose)
    }
  } catch (e) {
    console.warn('[providerManager] WS diagnostics: could not attach native close listener', e)
  }
}

function attachWsDiagnostics(provider, endpoint) {
  if (!provider) return

  try {
    if (typeof provider.on === 'function') {
      provider.on('error', (error) => {
        console.warn(`[providerManager] WS error on ${endpoint.name}:`, error)
      })
    }
  } catch (e) {
    console.warn('[providerManager] WS diagnostics: provider error listener failed', e)
  }

  try {
    attachNativeWebSocketCloseHandler(getUnderlyingWebSocket(provider), endpoint)
  } catch (e) {
    console.warn('[providerManager] WS diagnostics: native close handler skipped', e)
  }
}

export function getHybridProvider() {
  return HYBRID_PROVIDER
}

export function getHybridWebSocketProvider() {
  if (wsDisabled) return null
  if (!wsProvider) {
    wsProvider = buildWebSocketProvider()
    if (wsProvider) {
      wsRebuildAttempts = 0
    }
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
  const endpoints =
    HTTP_ENDPOINTS.length > 0
      ? HTTP_ENDPOINTS.map((endpoint, index) => ({
          name: endpoint.name,
          url: endpoint.url,
          status: providerStates[index]?.status ?? 'idle',
          lastError: providerStates[index]?.lastError ?? null,
          lastSuccess: providerStates[index]?.lastSuccess ?? 0,
          isActive: index === activeIndex,
        }))
      : [
          {
            name: 'read-only',
            url: '(not configured — set VITE_SEPOLIA_RPC_URL or VITE_ALCHEMY_SEPOLIA_RPC_URL)',
            status: 'disabled',
            lastError: providerStates[0]?.lastError ?? 'read_only_rpc_unconfigured',
            lastSuccess: 0,
            isActive: true,
          },
        ]

  return {
    activeIndex: HTTP_ENDPOINTS.length > 0 ? activeIndex : 0,
    endpoints,
    ws: {
      name: wsEndpointMeta.name,
      url: wsEndpointMeta.url,
      connected: Boolean(wsProvider),
    },
  }
}

