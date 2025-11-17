import { useState, useCallback } from "react";

/**
 * 🧮 useSimulationEngine Hook
 * Calculates simulated risk score and price impact for "What-If" scenarios.
 *
 * Inputs:
 *   basePrice     – current ETH/USD oracle price
 *   riskBaseline  – baseline protocol risk (0-100)
 *   volatility    – optional multiplier (default 1.0)
 *
 * Exposes:
 *   simulate(changePercent)
 *   reset()
 *   state: { simulatedPrice, simulatedRisk, delta, active }
 */
export function useSimulationEngine(basePrice = 0, riskBaseline = 0, volatility = 1.0) {
  const [simulated, setSimulated] = useState({
    active: false,
    changePercent: 0,
    simulatedPrice: basePrice,
    simulatedRisk: riskBaseline,
    delta: 0,
  });

  /**
   * Core simulation logic:
   * risk grows exponentially with negative price changes
   * and mildly with positive volatility.
   */
  const simulate = useCallback(
    (changePercent) => {
      if (!basePrice || basePrice <= 0) {
        console.warn("[SimulationEngine] Invalid base price:", basePrice);
        return;
      }

      const simulatedPrice = basePrice * (1 + changePercent / 100);
      
      // Exponential risk scaling: drop amplifies risk faster
      const riskChange =
        changePercent < 0
          ? Math.min(riskBaseline * Math.exp(Math.abs(changePercent) / 25) * volatility, 100)
          : Math.max(riskBaseline * (1 - changePercent / 80 / volatility), 0);

      const delta = riskChange - riskBaseline;

      setSimulated({
        active: true,
        changePercent,
        simulatedPrice,
        simulatedRisk: parseFloat(riskChange.toFixed(2)),
        delta: parseFloat(delta.toFixed(2)),
      });

      console.log(`[SimulationEngine] Scenario: ETH ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}% → Risk ${riskChange.toFixed(1)}`);
    },
    [basePrice, riskBaseline, volatility]
  );

  /** Reset simulation back to baseline */
  const reset = useCallback(() => {
    setSimulated({
      active: false,
      changePercent: 0,
      simulatedPrice: basePrice,
      simulatedRisk: riskBaseline,
      delta: 0,
    });
    console.log("[SimulationEngine] 🔄 Reset to baseline");
  }, [basePrice, riskBaseline]);

  return {
    simulated,
    simulate,
    reset,
  };
}

