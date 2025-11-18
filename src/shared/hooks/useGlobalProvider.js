import { useMemo } from "react";
import { getHybridProvider } from "@/shared/rpc/providerManager";

let globalProvider = null;

/**
 * 🌐 Global Provider Hook
 * Reuses the shared hybrid provider instance across components.
 */
export function useGlobalProvider() {
  const provider = useMemo(() => {
    if (!globalProvider) {
      globalProvider = getHybridProvider();
      console.log("[GlobalProvider] ✅ Using shared hybrid provider");
    }
    return globalProvider;
  }, []);

  return provider;
}

