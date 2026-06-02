/** Client-side dedupe + TTL for Prime approval inventory HTTP calls. */

export const APPROVAL_INVENTORY_TTL_MS = 90_000

/** @type {Map<string, Promise<unknown>>} */
const inFlight = new Map()

/** @type {Map<string, number>} */
const lastFetchAt = new Map()

/**
 * @param {string} walletKey
 * @param {number} chainId
 */
export function approvalInventoryRequestKey(walletKey, chainId = 1) {
  return `${walletKey}:${Number(chainId)}`
}

/**
 * @param {string} walletKey
 * @param {number} chainId
 */
export function isApprovalInventoryFetchFresh(walletKey, chainId = 1, ttlMs = APPROVAL_INVENTORY_TTL_MS) {
  const key = approvalInventoryRequestKey(walletKey, chainId)
  const last = lastFetchAt.get(key)
  return Boolean(last && Date.now() - last < ttlMs)
}

/**
 * Mark a successful fetch time (e.g. after hydrating localStorage).
 * @param {string} walletKey
 * @param {number} chainId
 * @param {number} [atMs]
 */
export function markApprovalInventoryFetched(walletKey, chainId = 1, atMs = Date.now()) {
  lastFetchAt.set(approvalInventoryRequestKey(walletKey, chainId), atMs)
}

/**
 * Run at most one in-flight inventory request per wallet+chain; respect TTL unless force.
 * @param {string} walletKey
 * @param {number} chainId
 * @param {() => Promise<T>} fetchFn
 * @param {{ force?: boolean, ttlMs?: number }} [opts]
 * @returns {Promise<{ skipped: true, reason: 'ttl' | 'in_flight' } | T>}
 * @template T
 */
export async function fetchApprovalInventoryDeduped(walletKey, chainId, fetchFn, opts = {}) {
  const { force = false, ttlMs = APPROVAL_INVENTORY_TTL_MS } = opts
  const key = approvalInventoryRequestKey(walletKey, chainId)

  if (!force && isApprovalInventoryFetchFresh(walletKey, chainId, ttlMs)) {
    return { skipped: true, reason: 'ttl' }
  }

  if (inFlight.has(key)) {
    return inFlight.get(key)
  }

  const task = (async () => {
    try {
      return await fetchFn()
    } finally {
      inFlight.delete(key)
      lastFetchAt.set(key, Date.now())
    }
  })()

  inFlight.set(key, task)
  return task
}

/**
 * @param {string} walletKey
 * @param {number} chainId
 */
export function clearApprovalInventoryClientState(walletKey, chainId = 1) {
  const key = approvalInventoryRequestKey(walletKey, chainId)
  inFlight.delete(key)
  lastFetchAt.delete(key)
}
