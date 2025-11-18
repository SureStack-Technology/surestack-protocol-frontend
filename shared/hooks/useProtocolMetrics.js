import { useEffect, useState, useRef } from "react";
import { useEthUsdFeed } from "./useEthUsdFeed";
import {
  fetchCoverageUSD,
  fetchTotalStaked,
  fetchDaoTreasurySST,
  fetchRewardRateApy,
  calcRiskIndexFromPrices,
} from "../services/metrics";

export function useProtocolMetrics() {
  const { price, updatedAt, history, warmup, source, isStreaming, connectionState } = useEthUsdFeed();
  const mounted = useRef(true);
  
  const [state, setState] = useState({
    loading: true,
    coverageUSD: 0,
    totalStaked: 0,
    treasurySST: 0,
    apy: 0,
    oracle: price ? { price, updatedAt } : null,
    risk24h: { value: 0, warmingUp: true, samples: 0 },
    risk7d: { value: 0, warmingUp: true, samples: 0 },
    error: null,
  });

  // Separate effect to update oracle and risk when history/price changes (but not trigger full refresh)
  useEffect(() => {
    if (!mounted.current) return;
    
    // Calculate risk indices from history
    const riskIndices = calcRiskIndexFromPrices(history);
    
    setState(prev => ({
      ...prev,
      oracle: price ? { price, updatedAt } : null,
      risk24h: riskIndices.risk24h,
      risk7d: riskIndices.risk7d,
    }));

    // Log risk status
    console.info(`[Risk] Using ${history.length} samples; warmup=${riskIndices.risk24h.warmingUp || riskIndices.risk7d.warmingUp}`);
  }, [history, price, updatedAt]);

  // Main polling effect - runs every 30s, independent of history changes
  // Skip polling if WebSocket is streaming
  useEffect(() => {
    mounted.current = true;

    const run = async () => {
      console.log("[useProtocolMetrics] tick");
      
      try {
        const [coverageUSD, totalStaked, treasurySST, apy] = await Promise.all([
          fetchCoverageUSD(),
          fetchTotalStaked(),
          fetchDaoTreasurySST(),
          fetchRewardRateApy(),
        ]);

        if (!mounted.current) return;
        
        setState(prev => ({
          ...prev,
          loading: false,
          coverageUSD,
          totalStaked,
          treasurySST,
          apy,
          error: null,
        }));
      } catch (e) {
        if (!mounted.current) return;
        setState(prev => ({ ...prev, loading: false, error: e.message || "Metrics error" }));
      }
    };
    
    // Run immediately
    run();
    
    // Only poll if not streaming via WebSocket
    let id = null
    if (!isStreaming) {
      // Then every 30s
      id = setInterval(run, 30000);
    } else {
      console.log("[Stream] WebSocket streaming active, skipping polling interval")
    }
    
    return () => { 
      mounted.current = false; 
      if (id) clearInterval(id); 
    };
  }, [isStreaming]); // Re-run if streaming status changes

  return {
    ...state,
    source, // Expose source for RpcChip
    isStreaming, // Expose streaming status for RpcChip
    connectionState, // Expose connection state for RpcChip
  };
}

