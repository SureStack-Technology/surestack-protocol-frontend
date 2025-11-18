import { ethers } from "ethers";

let infuraUrl = import.meta.env.VITE_SEPOLIA_RPC;
const alchemyUrl = import.meta.env.VITE_ALCHEMY_RPC;

if (!infuraUrl) {
  console.warn('[resilientProvider] Missing INFURA RPC URL.');
}

let activeIndex = 0;
const urls = [infuraUrl, alchemyUrl].filter(Boolean);

// Rotation interval reference (for cleanup if needed)
let rotationInterval = null;

// Tag helpers so UI can show which provider is active
function tagProvider(provider, name, url) {
  try {
    provider._ss_name = name;
    provider._ss_url = url;
  } catch {}
  return provider;
}

// Keep a reference to the current active provider for diagnostics
let __activeProviderRef = null;
export function getActiveProviderInfo() {
  const p = __activeProviderRef;
  return p ? { providerName: p._ss_name || "Unknown", url: p._ss_url || "n/a" } : { providerName: "Unknown", url: "n/a" };
}

/**
 * Creates a rotating RPC provider that alternates between Infura and Alchemy
 * @param {number} intervalMs - Rotation interval in milliseconds (default: 30000 = 30s)
 * @returns {ethers.JsonRpcProvider} - Rotating provider with automatic fallback
 */
export function getRotatingProvider(intervalMs = 30000) {
  const disableInfura = import.meta.env?.VITE_DISABLE_INFURA === "true";
  
  const providers = [];
  if (!disableInfura && infuraUrl) {
    const p = new ethers.JsonRpcProvider(infuraUrl);
    providers.push(tagProvider(p, "Infura", infuraUrl));
  } else if (disableInfura && !(typeof window !== 'undefined' && window.__infuraSilenced)) {
    console.warn("🚫 [RPC] Infura disabled via VITE_DISABLE_INFURA");
    if (typeof window !== 'undefined') {
      window.__infuraSilenced = true;
    }
    infuraUrl = null;
  } else if (disableInfura) {
    infuraUrl = null;
  }
  if (alchemyUrl) {
    const p = new ethers.JsonRpcProvider(alchemyUrl);
    providers.push(tagProvider(p, "Alchemy", alchemyUrl));
  }
  
  if (providers.length === 0) {
    throw new Error("No RPC URLs configured");
  }
  
  const providerNames = providers.map(p => p._ss_name || 'RPC');

  let idx = 0;
  let active = providers[idx] || null;
  __activeProviderRef = active;

  // Auto-rotate every 30s (or specified interval)
  if (providers.length > 1 && !rotationInterval) {
    rotationInterval = setInterval(() => {
      idx = (idx + 1) % providers.length;
      active = providers[idx];
      __activeProviderRef = active;
      console.info(`🔄 [RPC Rotation] Active provider switched to ${active?._ss_name || "Unknown"}`);
    }, intervalMs);
    
    console.log(`🔄 [RPC Rotation] Started rotation every ${intervalMs/1000}s between ${providerNames.join(' and ')}`);
  }

  // Proxy to always call the active provider with automatic fallback
  return new Proxy(active || {}, {
    get(_, prop) {
      const getActiveProvider = () => providers[idx] || active;
      
      if (prop === "send") {
        return async (...args) => {
          let attempts = 0;
          const maxAttempts = providers.length;
          
          while (attempts < maxAttempts) {
            const provider = getActiveProvider();
            try {
              const res = await provider.send(...args);
              __activeProviderRef = provider;
              return res;
            } catch (err) {
              const isRateLimited = 
                err?.code === -32005 || 
                err?.code === 429 ||
                /Too Many Requests/i.test(err?.message) ||
                /rate limit/i.test(err?.message);

              const isNetworkError = 
                err?.code === 'NETWORK_ERROR' ||
                err?.code === 'TIMEOUT' ||
                /network/i.test(err?.message) ||
                /timeout/i.test(err?.message);

              if (isRateLimited || isNetworkError) {
                attempts++;
                if (attempts < maxAttempts) {
                  idx = (idx + 1) % providers.length;
                  active = providers[idx];
                  __activeProviderRef = active;
                  console.warn(`⚠️ [RPC Rotation] ${providerNames[(idx - 1 + providers.length) % providers.length]} failed — trying ${providerNames[idx]}`);
                } else {
                  console.error("❌ [RPC Rotation] All providers failed");
                  throw err;
                }
              } else {
                throw err;
              }
            }
          }
          throw new Error("All RPC providers failed");
        };
      }

      // Intercept other async methods that might need fallback
      if (typeof active?.[prop] === "function") {
        return async (...args) => {
          let attempts = 0;
          const maxAttempts = providers.length;
          
          while (attempts < maxAttempts) {
            const provider = getActiveProvider();
            try {
              const res = await provider[prop](...args);
              __activeProviderRef = provider;
              return res;
            } catch (err) {
              const isRateLimited = 
                err?.code === -32005 || 
                err?.code === 429 ||
                /Too Many Requests/i.test(err?.message) ||
                /rate limit/i.test(err?.message);

              const isNetworkError = 
                err?.code === 'NETWORK_ERROR' ||
                err?.code === 'TIMEOUT' ||
                /network/i.test(err?.message) ||
                /timeout/i.test(err?.message);

              if ((isRateLimited || isNetworkError) && attempts < maxAttempts - 1) {
                attempts++;
                idx = (idx + 1) % providers.length;
                active = providers[idx];
                __activeProviderRef = active;
                console.warn(`⚠️ [RPC Rotation] ${providerNames[(idx - 1 + providers.length) % providers.length]} failed in ${prop} — trying ${providerNames[idx]}`);
              } else {
                throw err;
              }
            }
          }
          throw new Error(`All RPC providers failed in ${prop}`);
        };
      }

      return active?.[prop];
    },
  });
}

/**
 * Creates a resilient RPC provider with automatic fallback
 * Uses rotating provider if multiple RPCs are available
 * Falls back to static resilient provider if rotation fails
 */
export function getResilientProvider() {
  try {
    // Use rotating provider if multiple RPCs are available
    if (urls.length > 1) {
      return getRotatingProvider();
    }
    
    // Single provider - use it directly
    if (urls.length === 1) {
      const providerName = urls[0].includes('infura') ? 'Infura' : 
                          urls[0].includes('alchemy') ? 'Alchemy' : 'RPC';
      console.log(`🔗 [RPC] Using ${providerName} provider (single RPC configured)`);
      return new ethers.JsonRpcProvider(urls[0]);
    }
    
    throw new Error("No RPC endpoints configured");
  } catch (e) {
    console.warn("⚠️ [Provider] Rotation failed, using static resilient provider:", e.message);
    
    // Fallback to static resilient provider
    const disableInfura = import.meta.env?.VITE_DISABLE_INFURA === "true";
    const primary = (!disableInfura && infuraUrl) ? new ethers.JsonRpcProvider(infuraUrl) : null;
    const fallback = alchemyUrl ? new ethers.JsonRpcProvider(alchemyUrl) : null;
    
    if (disableInfura) {
      console.warn("🚫 [RPC] Infura disabled via VITE_DISABLE_INFURA");
    }

    if (!primary && !fallback) {
      throw new Error("No RPC endpoints configured. Please set VITE_SEPOLIA_RPC or VITE_ALCHEMY_RPC");
    }

    if (!primary && fallback) {
      console.log("🔗 [RPC] Using Alchemy provider (Infura not configured)");
      return fallback;
    }
    if (primary && !fallback) {
      console.log("🔗 [RPC] Using Infura provider (Alchemy not configured)");
      return primary;
    }

    // Both providers available - create static resilient proxy
    const taggedPrimary = tagProvider(primary, "Infura", infuraUrl);
    const taggedFallback = tagProvider(fallback, "Alchemy", alchemyUrl);
    __activeProviderRef = taggedPrimary;
    
    console.log("🔗 [RPC] Using static resilient provider (Infura primary, Alchemy fallback)");
    return new Proxy(taggedPrimary, {
      get(target, prop) {
        if (prop === "send") {
          return async (...args) => {
            try {
              const res = await target.send(...args);
              __activeProviderRef = target;
              return res;
            } catch (err) {
              const isRateLimited = 
                err?.code === -32005 || 
                err?.code === 429 ||
                /Too Many Requests/i.test(err?.message) ||
                /rate limit/i.test(err?.message);

              const isNetworkError = 
                err?.code === 'NETWORK_ERROR' ||
                err?.code === 'TIMEOUT' ||
                /network/i.test(err?.message) ||
                /timeout/i.test(err?.message);

              if (isRateLimited || isNetworkError) {
                console.warn(`⚠️ [RPC] Infura error (${err?.code || err?.message}) — switching to Alchemy`);
                try {
                  const res = await taggedFallback.send(...args);
                  __activeProviderRef = taggedFallback;
                  return res;
                } catch (fallbackErr) {
                  console.error("❌ [RPC] Both providers failed:", fallbackErr);
                  throw new Error(`RPC Error: Primary (${err?.message}) and Fallback (${fallbackErr?.message}) both failed`);
                }
              }
              throw err;
            }
          };
        }
        return target[prop];
      },
    });
  }
}

/**
 * Creates a WebSocket provider for Alchemy with auto-reconnect and fallback
 * @returns {ethers.WebSocketProvider|ethers.JsonRpcProvider} - WebSocket provider for real-time events, falls back to HTTP RPC if WS fails
 */
export function getAlchemyWsProvider() {
  const wsUrl = import.meta.env.VITE_ALCHEMY_WS;
  if (!wsUrl) {
    throw new Error("Alchemy WS URL not configured");
  }

  try {
    const provider = new ethers.WebSocketProvider(wsUrl);
    console.log("[ResilientProvider] 🧠 Alchemy WS connected:", wsUrl);

    provider._networkPromise.catch((err) => {
      console.warn("[ResilientProvider][Warn] WS initial network fetch failed:", err);
    });

    // Auto-reconnect fallback
    provider.on("close", () => {
      console.warn("[ResilientProvider] ⚠️ WS closed — retrying in 3s");
      setTimeout(() => window.location.reload(), 3000);
    });

    provider.on("error", (err) => {
      console.warn("[ResilientProvider] WS error —", err);
    });

    return provider;
  } catch (err) {
    console.error("[ResilientProvider] WS init failed:", err);
    return new ethers.JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC);
  }
}

export function getSimpleProvider() {
  const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC || import.meta.env.VITE_ALCHEMY_RPC;
  if (!rpcUrl) {
    throw new Error("No RPC endpoints configured");
  }
  return new ethers.JsonRpcProvider(rpcUrl);
}

