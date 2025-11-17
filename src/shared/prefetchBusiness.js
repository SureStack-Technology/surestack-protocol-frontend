import { prefetchValidatorStats, prefetchGovernanceData, prefetchPolicyStats } from "./prefetch";
import { saveCache, loadCache } from "./cache/indexedDB";

/**
 * 🏢 Business Data Prefetch
 * Prefetches all data needed for business routes to ensure instant load times
 */
export async function prefetchBusinessAll() {
  try {
    console.log("[Business Prefetch] 🚀 Starting business data prefetch...");
    
    // Run all prefetches in parallel for maximum speed
    const results = await Promise.allSettled([
      prefetchValidatorStats(),
      prefetchGovernanceData(),
      prefetchPolicyStats(),
    ]);

    // Collect successful results
    const businessStats = {
      validatorStats: results[0].status === 'fulfilled' ? window.__surestack_cache?.validatorStats : null,
      governanceData: results[1].status === 'fulfilled' ? window.__surestack_cache?.governanceData : null,
      policyStats: results[2].status === 'fulfilled' ? window.__surestack_cache?.policyStats : null,
      prefetched: true,
      timestamp: Date.now(),
    };

    // Store completion status in memory cache
    if (typeof window !== "undefined") {
      window.__surestack_cache = window.__surestack_cache || {};
      window.__surestack_cache.business = businessStats;
    }

    // Persist to IndexedDB
    try {
      await saveCache('businessStats', businessStats);
      console.log("[Business Prefetch] ✅ Saved to IndexedDB");
    } catch (dbErr) {
      console.warn("[Business Prefetch] ⚠️ Failed to save to IndexedDB:", dbErr);
    }

    console.log("[Business Prefetch] ✅ Completed successfully");
  } catch (err) {
    console.warn("[Business Prefetch] ⚠️ Failed:", err);
    
    // Store error status
    if (typeof window !== "undefined") {
      window.__surestack_cache = window.__surestack_cache || {};
      window.__surestack_cache.business = {
        prefetched: false,
        error: err.message,
        timestamp: Date.now(),
      };
    }
    
    // Try to load from IndexedDB as fallback
    try {
      const cached = await loadCache('businessStats');
      if (cached) {
        console.log("[Business Prefetch] 🔄 Loaded fallback from IndexedDB");
        if (typeof window !== "undefined") {
          window.__surestack_cache = window.__surestack_cache || {};
          window.__surestack_cache.business = cached;
        }
      }
    } catch (loadErr) {
      console.warn("[Business Prefetch] ⚠️ Failed to load fallback:", loadErr);
    }
    
    throw err;
  }
}

/**
 * Load business stats from IndexedDB cache
 */
export async function loadBusinessCache() {
  try {
    const cached = await loadCache('businessStats');
    if (cached) {
      // Populate memory cache
      if (typeof window !== "undefined") {
        window.__surestack_cache = window.__surestack_cache || {};
        window.__surestack_cache.business = cached;
        
        // Also populate individual caches if available
        if (cached.validatorStats) {
          window.__surestack_cache.validatorStats = cached.validatorStats;
        }
        if (cached.governanceData) {
          window.__surestack_cache.governanceData = cached.governanceData;
        }
        if (cached.policyStats) {
          window.__surestack_cache.policyStats = cached.policyStats;
        }
      }
      
      console.log("[BusinessCache] ✅ Loaded from IndexedDB (timestamp:", new Date(cached.timestamp).toLocaleString() + ")");
      return cached;
    }
    
    console.log("[BusinessCache] ℹ️ No cache found");
    return null;
  } catch (err) {
    console.warn("[BusinessCache] ⚠️ Failed to load:", err);
    return null;
  }
}

/**
 * Check if business data has been prefetched
 */
export function isBusinessPrefetched() {
  if (typeof window === "undefined") return false;
  const cache = window.__surestack_cache?.business;
  if (!cache) return false;
  
  // Consider prefetched if done within last 5 minutes
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return cache.prefetched && cache.timestamp > fiveMinutesAgo;
}

