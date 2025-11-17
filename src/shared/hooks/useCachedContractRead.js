import { useState, useEffect, useRef } from "react";
import { guard } from "@/diagnostics/hookGuard";

// Basic in-memory cache (can extend to IndexedDB or localStorage)
const cache = new Map();
const cacheTimestamps = new Map();
const FALLBACK_VALUE = null;
const FALLBACK_RESULT = {
  data: FALLBACK_VALUE,
  loading: false,
  refresh: async () => FALLBACK_VALUE,
};

/**
 * 🗄️ Cached Contract Read Hook
 * Caches contract read results to reduce RPC calls and improve performance
 * 
 * @param {string} key - Unique cache key
 * @param {Function} fetchFn - Async function that returns the data to cache
 * @param {number} refreshMs - Refresh interval in milliseconds (default: 30000)
 * @returns {{ data: any, loading: boolean, refresh: Function }}
 */
export function useCachedContractRead(key, fetchFn, refreshMs = 30000) {
  console.log(`[TRACE] useCachedContractRead → start`, { key, refreshMs });
  const [data, setData] = useState(cache.get(key) || FALLBACK_VALUE);
  const [loading, setLoading] = useState(!cache.has(key));
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    async function load() {
      try {
        if (!cancelledRef.current) {
          setLoading(true);
        }
        
        const result = await fetchFn();
        
        if (!cancelledRef.current) {
          cache.set(key, result);
          cacheTimestamps.set(key, Date.now());
          setData(result);
          setLoading(false);
          console.log(`[Cache] ✅ Loaded: ${key}`);
        }
      } catch (err) {
        console.warn(`[Cache] ⚠️ Read failed: ${key}`, err);
        if (!cancelledRef.current) {
          setData(cache.get(key) ?? FALLBACK_VALUE);
          setLoading(false);
        }
      }
    }

    // Load immediately if cache is empty
    if (!cache.has(key)) {
      load();
    }

    // Set up refresh interval
    const id = setInterval(load, refreshMs);

    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [key, fetchFn, refreshMs]);

  const refresh = async () => {
    try {
      setLoading(true);
      const result = await fetchFn();
      cache.set(key, result);
      cacheTimestamps.set(key, Date.now());
      setData(result);
      setLoading(false);
      console.log(`[Cache] 🔄 Refreshed: ${key}`);
      return result;
    } catch (err) {
      console.warn(`[Cache] ⚠️ Refresh failed: ${key}`, err);
      setData(cache.get(key) ?? FALLBACK_VALUE);
      setLoading(false);
      return cache.get(key) ?? FALLBACK_VALUE;
    }
  };

  const result = { data, loading, refresh };
  console.log(`[TRACE] useCachedContractRead → end`, { key, loading, hasData: data != null });

  return guard(`useCachedContractRead:${key}`, () => result, FALLBACK_RESULT);
}

/**
 * 🧹 Clear cache entry
 */
export function clearCache(key) {
  cache.delete(key);
  cacheTimestamps.delete(key);
  console.log(`[Cache] 🗑️ Cleared: ${key}`);
}

/**
 * 🧹 Clear all cache
 */
export function clearAllCache() {
  cache.clear();
  cacheTimestamps.clear();
  console.log("[Cache] 🗑️ Cleared all cache");
}

/**
 * 📊 Get cache stats
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
    timestamps: Object.fromEntries(cacheTimestamps),
  };
}

