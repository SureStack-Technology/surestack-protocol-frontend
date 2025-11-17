// IndexedDB utilities for caching oracle data with ring buffer support

const DB_NAME = 'surestack-idb'
const DB_VERSION = 1
const STORE_NAME = 'kv'

let dbPromise = null

function openDB(name = DB_NAME, store = STORE_NAME) {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(store)) {
        db.createObjectStore(store)
      }
    }
  })
  return dbPromise
}

export async function idbGet(key) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        console.warn("[IDB] get operation failed:", request.error?.message || request.error)
        reject(request.error)
      }
    })
  } catch (err) {
    console.warn("[IDB] get operation failed:", err.message || err)
    return null
  }
}

export async function idbSet(key, value) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(value, key)
      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.warn("[IDB] set operation failed:", request.error?.message || request.error)
        reject(request.error)
      }
    })
  } catch (err) {
    console.warn("[IDB] set operation failed:", err.message || err)
  }
}

/**
 * Put many items (ring buffer - keeps last N items)
 * @param {string} key - Storage key
 * @param {Array<{t:number, p:number}>} items - Array of {t: timestamp in ms, p: price}
 * @param {number} maxItems - Maximum items to keep (default: 500)
 */
export async function putMany(key = 'ethusd', items, maxItems = 500) {
  try {
    const db = await openDB()
    const existing = await idbGet(key) || []
    
    // Merge and dedupe by timestamp
    const merged = [...existing, ...items]
      .filter(item => item && typeof item.t === 'number' && typeof item.p === 'number')
      .sort((a, b) => a.t - b.t) // Sort by timestamp
    
    // Dedupe by timestamp (keep latest)
    const deduped = []
    const seen = new Set()
    for (let i = merged.length - 1; i >= 0; i--) {
      const item = merged[i]
      if (!seen.has(item.t)) {
        seen.add(item.t)
        deduped.unshift(item)
      }
    }
    
    // Keep last maxItems (ring buffer)
    const pruned = deduped.slice(-maxItems)
    
    await idbSet(key, pruned)
    return pruned
  } catch (err) {
    console.warn("[IDB] putMany operation failed:", err.message || err)
    return []
  }
}

/**
 * Get all items for a key
 * @param {string} key - Storage key
 * @returns {Array<{t:number, p:number}>} Array of {t: timestamp in ms, p: price}
 */
export async function getAll(key = 'ethusd') {
  try {
    const result = await idbGet(key)
    return Array.isArray(result) ? result : []
  } catch (err) {
    console.warn("[IDB] getAll operation failed:", err.message || err)
    return []
  }
}
