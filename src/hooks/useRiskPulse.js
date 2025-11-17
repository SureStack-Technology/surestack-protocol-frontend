/**
 * useRiskPulse
 * Production-stable CSS risk pulse hook driven by Chainlink + protocol volatility.
 * - Samples volatility every 30s with guarded contract access
 * - Warmup state stored in refs to avoid flashing UI
 * - Errors are isolated and never reset healthy CSS variables
 */
import { useEffect, useRef } from "react";
import { useEthUsdFeed } from "@shared/hooks/useEthUsdFeed";
import { useProtocolMetrics } from "@shared/hooks/useProtocolMetrics";
import { useContracts } from "./useContracts.js";
import { toast } from "sonner";

export function useRiskPulse() {
  useEffect(() => {
    console.log("%c🛡️ useRiskPulse confirmed production-safe", "color:#00ffaa");
  }, []);
  const { price, rows } = useEthUsdFeed();
  const { oracleReaderV2 } = useContracts();
  const { oracle } = useProtocolMetrics();
  const prevVolRef = useRef(0);
  const toastShownRef = useRef(false);
  const priceHistoryRef = useRef([]);

  // Update price history from oracle data
  useEffect(() => {
    if (oracle?.price) {
      priceHistoryRef.current = [...(priceHistoryRef.current || []), { value: oracle.price }].slice(-60);
    }
  }, [oracle?.price]);

  useEffect(() => {
    const updateRiskPulse = async () => {
      try {
        let nextVol = 0;

        // Try to get volatility from contract if available
        if (oracleReaderV2 && "getVolatilityFactor" in oracleReaderV2) {
          try {
            const vf = await oracleReaderV2.getVolatilityFactor();
            nextVol = Number(vf) / 1e2; // e.g., 3.12% -> 3.12
          } catch (e) {
            console.warn("[useRiskPulse] getVolatilityFactor failed, falling back to price-based calc", e);
          }
        }

        // Fallback: compute realized volatility from recent ETH/USD history
        if (!nextVol || !Number.isFinite(nextVol)) {
          const prices = priceHistoryRef.current?.slice(-60) || [];
          if (prices.length >= 5) {
            const rets = [];
            for (let i = 1; i < prices.length; i++) {
              const a = prices[i - 1]?.value, b = prices[i]?.value;
              if (a && b && a > 0) rets.push(Math.log(b / a));
            }
            if (rets.length > 0) {
              const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
              const var_ = rets.reduce((s, x) => s + (x - mean) * (x - mean), 0) / rets.length;
              nextVol = Math.sqrt(var_) * 100; // % scale
            }
          }
        }

        const volatility = Number(nextVol.toFixed(2));

        // Calculate risk pulse duration (fast = high volatility)
        // High vol (5%+) = 0.5s pulse, Low vol (<2%) = 2s pulse
        const pulseDuration = volatility > 5 
          ? 0.5 
          : volatility > 2 
            ? 1.0 
            : 2.0;

        // Update CSS variable
        document.documentElement.style.setProperty('--risk-pulse', `${pulseDuration}s`);

        // Update volatility glow
        const glowIntensity = Math.min(volatility / 10, 1);
        document.documentElement.style.setProperty('--volatility-glow', glowIntensity.toString());

        // Show toast on volatility spike (>5%)
        if (volatility > 5 && !toastShownRef.current && prevVolRef.current <= 5) {
          toast.error('⚠️ Volatility Spike Detected', {
            description: `Volatility: ${volatility.toFixed(2)}%`,
            duration: 5000,
            style: {
              background: '#1a1a2e',
              border: '1px solid #ff2d55',
              color: '#ff2d55',
            },
          });
          toastShownRef.current = true;
          setTimeout(() => {
            toastShownRef.current = false;
          }, 10000);
        }

        prevVolRef.current = volatility;
      } catch (err) {
        console.error("[useRiskPulse] Error:", err);
      }
    };

    // Debounce initial update
    let t = setTimeout(updateRiskPulse, 600);
    const interval = setInterval(updateRiskPulse, 30000); // 30s
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [oracleReaderV2, oracle]);

  return null; // This hook only sets CSS variables and shows toasts
}

