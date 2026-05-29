import { fetchApprovalSignalsFromLogs } from './walletApprovalSignals.js'
import { AlchemyRateLimitError, isAlchemyRateLimitError } from './alchemyRateLimit.js'

/** Successful inventory TTL (5–10 min window). */
export const INVENTORY_SUCCESS_TTL_MS = 7 * 60 * 1000

/** Short backoff after rate limit — avoids hammering Alchemy during one session. */
export const ALCHEMY_BACKOFF_MS = 3 * 60 * 1000

/** @typedef {{ rows: object[], approvalLogPenalty?: number, unlimitedUnknownCount?: number, staleUnknownFiniteCount?: number, fetchedAt: number }} InventoryCacheEntry */

/** @type {Map<string, InventoryCacheEntry>} */
const successCache = new Map()

/** @type {Map<string, number>} */
const backoffUntil = new Map()

/** @type {Map<string, Promise<import('./approvalInventoryCache.js').InventoryFetchResult>>} */
const inFlight = new Map()

/**
 * @param {string} wallet
 * @param {number} chainId
 */
export function inventoryCacheKey(wallet, chainId) {
  return `${String(wallet).toLowerCase()}:${Number(chainId)}`
}

/**
 * @param {string} key
 */
export function isAlchemyInBackoff(key) {
  const globalUntil = backoffUntil.get('global') || 0
  const keyUntil = backoffUntil.get(key) || 0
  return Date.now() < Math.max(globalUntil, keyUntil)
}

/**
 * @param {string} key
 */
export function markAlchemyBackoff(key) {
  const until = Date.now() + ALCHEMY_BACKOFF_MS
  backoffUntil.set('global', until)
  backoffUntil.set(key, until)
}

/**
 * @param {string} key
 * @returns {(InventoryCacheEntry & { stale: boolean }) | null}
 */
export function getCachedApprovalInventory(key) {
  const entry = successCache.get(key)
  if (!entry?.rows) return null
  const age = Date.now() - entry.fetchedAt
  return { ...entry, stale: age > INVENTORY_SUCCESS_TTL_MS }
}

/**
 * @param {string} key
 * @param {object} inv
 */
export function setCachedApprovalInventory(key, inv) {
  successCache.set(key, {
    rows: inv.rows || [],
    approvalLogPenalty: inv.approvalLogPenalty ?? 0,
    unlimitedUnknownCount: inv.unlimitedUnknownCount ?? 0,
    staleUnknownFiniteCount: inv.staleUnknownFiniteCount ?? 0,
    fetchedAt: Date.now(),
  })
}

/**
 * @typedef {object} InventoryFetchResult
 * @property {object[]} rows
 * @property {boolean} cacheHit
 * @property {boolean} stale
 * @property {boolean} rateLimited
 * @property {boolean} skippedFetch
 * @property {'live' | 'server_cache' | 'client_cache'} source
 */

/**
 * Single-flight approval inventory fetch with backoff + stale cache.
 * Never retries aggressively within one call.
 *
 * @param {string} walletAddress
 * @param {number} chainId
 * @param {string} apiKey
 * @param {{ rows?: object[], fetchedAt?: number | string } | null} [clientInventory]
 */
export async function fetchApprovalInventoryResilient(
  walletAddress,
  chainId,
  apiKey,
  clientInventory = null,
) {
  const key = inventoryCacheKey(walletAddress, chainId)

  if (inFlight.has(key)) {
    return inFlight.get(key)
  }

  const task = (async () => {
    const serverCached = getCachedApprovalInventory(key)
    const clientRows = clientInventory?.rows?.length ? clientInventory.rows : null
    const clientFresh = clientRows && isClientInventoryFresh(clientInventory.fetchedAt)

    if (clientFresh) {
      setCachedApprovalInventory(key, { rows: clientRows })
      return {
        rows: clientRows,
        cacheHit: true,
        stale: false,
        rateLimited: false,
        skippedFetch: true,
        source: 'client_cache',
      }
    }

    if (serverCached && !serverCached.stale && !isAlchemyInBackoff(key)) {
      return {
        rows: serverCached.rows,
        cacheHit: true,
        stale: false,
        rateLimited: false,
        skippedFetch: true,
        source: 'server_cache',
      }
    }

    if (isAlchemyInBackoff(key)) {
      if (serverCached?.rows?.length) {
        return {
          rows: serverCached.rows,
          cacheHit: true,
          stale: true,
          rateLimited: true,
          skippedFetch: true,
          source: 'server_cache',
        }
      }
      if (clientRows) {
        return {
          rows: clientRows,
          cacheHit: true,
          stale: true,
          rateLimited: true,
          skippedFetch: true,
          source: 'client_cache',
        }
      }
      return {
        rows: [],
        cacheHit: false,
        stale: false,
        rateLimited: true,
        skippedFetch: true,
        source: 'live',
      }
    }

    try {
      const inv = await fetchApprovalSignalsFromLogs(walletAddress, chainId, apiKey)
      setCachedApprovalInventory(key, inv)
      return {
        rows: inv.rows || [],
        cacheHit: false,
        stale: false,
        rateLimited: false,
        skippedFetch: false,
        source: 'live',
      }
    } catch (err) {
      if (isAlchemyRateLimitError(err)) {
        markAlchemyBackoff(key)
        if (serverCached?.rows?.length) {
          return {
            rows: serverCached.rows,
            cacheHit: true,
            stale: true,
            rateLimited: true,
            skippedFetch: false,
            source: 'server_cache',
          }
        }
        if (clientRows) {
          return {
            rows: clientRows,
            cacheHit: true,
            stale: true,
            rateLimited: true,
            skippedFetch: false,
            source: 'client_cache',
          }
        }
        return {
          rows: [],
          cacheHit: false,
          stale: false,
          rateLimited: true,
          skippedFetch: false,
          source: 'live',
        }
      }
      throw err
    }
  })()

  inFlight.set(key, task)
  try {
    return await task
  } finally {
    inFlight.delete(key)
  }
}

/**
 * @param {number | string | null | undefined} fetchedAt
 */
function isClientInventoryFresh(fetchedAt) {
  if (!fetchedAt) return false
  const t = typeof fetchedAt === 'number' ? fetchedAt : Date.parse(String(fetchedAt))
  if (!Number.isFinite(t)) return false
  return Date.now() - t < INVENTORY_SUCCESS_TTL_MS
}
