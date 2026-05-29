/** @type {Map<string, { payload: object, expires: number }>} */
const store = new Map()

const DEFAULT_TTL_MS = 10 * 60 * 1000

export function riskCacheGet(key) {
  const row = store.get(key)
  if (!row) return null
  if (Date.now() > row.expires) {
    store.delete(key)
    return null
  }
  return row.payload
}

export function riskCacheSet(key, payload, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { payload, expires: Date.now() + ttlMs })
}
