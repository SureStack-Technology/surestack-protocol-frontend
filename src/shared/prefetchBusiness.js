/**
 * 🏢 Business Data Prefetch (Simplified — No IndexedDB)
 * Returns mock business data for instant page load.
 */
import {
  prefetchValidatorStats,
  prefetchGovernanceData,
  prefetchPolicyStats,
} from "./prefetch";

export async function prefetchBusinessAll() {
  console.log("[Business Prefetch] 🚀 Starting simplified business data prefetch...");

  try {
    const results = await Promise.allSettled([
      prefetchValidatorStats(),
      prefetchGovernanceData(),
      prefetchPolicyStats(),
    ]);

    const businessStats = {
      validatorStats: results[0].status === "fulfilled" ? window.__surestack_cache?.validatorStats : null,
      governanceData: results[1].status === "fulfilled" ? window.__surestack_cache?.governanceData : null,
      policyStats: results[2].status === "fulfilled" ? window.__surestack_cache?.policyStats : null,
      prefetched: true,
      timestamp: Date.now(),
    };

    // Store only in memory cache (no IndexedDB)
    if (typeof window !== "undefined") {
      window.__surestack_cache = window.__surestack_cache || {};
      window.__surestack_cache.business = businessStats;
    }

    console.log("[Business Prefetch] ✅ Completed successfully (no IndexedDB)");
  } catch (err) {
    console.warn("[Business Prefetch] ⚠️ Prefetch failed:", err);

    if (typeof window !== "undefined") {
      window.__surestack_cache = window.__surestack_cache || {};
      window.__surestack_cache.business = {
        prefetched: false,
        error: err.message,
        timestamp: Date.now(),
      };
    }

    return null;
  }
}

/**
 * Check if business data was prefetched in the last 5 minutes
 */
export function isBusinessPrefetched() {
  if (typeof window === "undefined") return false;
  const cache = window.__surestack_cache?.business;
  if (!cache) return false;
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return cache.prefetched && cache.timestamp > fiveMinutesAgo;
}


