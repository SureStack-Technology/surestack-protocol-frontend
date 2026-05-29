const CACHE_PREFIX = 'surestack_approval_inventory_v1_'
const BACKOFF_PREFIX = 'surestack_alchemy_backoff_v1_'

/** Align with server success TTL (7 min). */
export const APPROVAL_LOCAL_CACHE_MS = 7 * 60 * 1000

/** Align with server backoff (3 min). */
export const APPROVAL_LOCAL_BACKOFF_MS = 3 * 60 * 1000

function cacheKey(walletKey, chainId = 1) {
  return `${CACHE_PREFIX}${walletKey}:${Number(chainId)}`
}

function backoffKey(walletKey, chainId = 1) {
  return `${BACKOFF_PREFIX}${walletKey}:${Number(chainId)}`
}

/**
 * @param {string} walletKey
 * @param {number} [chainId]
 */
export function readLocalApprovalCache(walletKey, chainId = 1) {
  if (!walletKey || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(cacheKey(walletKey, chainId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.body?.rows) return null
    const age = Date.now() - (parsed.savedAt || 0)
    if (age > APPROVAL_LOCAL_CACHE_MS * 2) {
      localStorage.removeItem(cacheKey(walletKey, chainId))
      return null
    }
    return {
      body: parsed.body,
      savedAt: parsed.savedAt,
      stale: age > APPROVAL_LOCAL_CACHE_MS,
    }
  } catch {
    return null
  }
}

/**
 * @param {string} walletKey
 * @param {object} body
 * @param {number} [chainId]
 */
export function writeLocalApprovalCache(walletKey, body, chainId = 1) {
  if (!walletKey || typeof localStorage === 'undefined' || !body?.rows) return
  try {
    localStorage.setItem(
      cacheKey(walletKey, chainId),
      JSON.stringify({ body: { ...body, chainId: body.chainId ?? chainId }, savedAt: Date.now() }),
    )
  } catch {
    /* quota */
  }
}

/**
 * @param {string} walletKey
 * @param {number} [chainId]
 */
export function isLocalAlchemyBackoff(walletKey, chainId = 1) {
  if (!walletKey || typeof localStorage === 'undefined') return false
  try {
    const until = Number(localStorage.getItem(backoffKey(walletKey, chainId)) || 0)
    return Date.now() < until
  } catch {
    return false
  }
}

/**
 * @param {string} walletKey
 * @param {number} [chainId]
 */
export function markLocalAlchemyBackoff(walletKey, chainId = 1) {
  if (!walletKey || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      backoffKey(walletKey, chainId),
      String(Date.now() + APPROVAL_LOCAL_BACKOFF_MS),
    )
  } catch {
    /* ignore */
  }
}

/**
 * @param {object} body
 * @param {number} [status]
 */
export function isApprovalsRateLimitedResponse(body, status) {
  if (status === 429) return true
  return body?.error === 'alchemy_rate_limited' || body?.rateLimited === true
}
