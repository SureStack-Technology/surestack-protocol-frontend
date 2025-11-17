import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSimulationEngine } from "@shared/hooks/useSimulationEngine";
import { useEthUsdFeed } from "@shared/hooks/useEthUsdFeed";
import { useProtocolMetrics } from "@shared/hooks/useProtocolMetrics";
import RiskRadar from "@components/visuals/RiskRadar";
import RiskGradeBadge from "./RiskGradeBadge";

/**
 * 🧮 What-If Simulation Panel
 * Allows users to simulate price changes and see impact on risk scores
 */
export default function SimulationPanel() {
  const { price: currentPrice } = useEthUsdFeed();
  const metrics = useProtocolMetrics();
  const currentRiskScore = typeof metrics.risk24h === 'object' 
    ? metrics.risk24h.value 
    : metrics.risk24h || 0;
  const [volatilityFactor] = useState(2.5); // Default volatility
  
  const {
    simulated,
    simulate,
    reset,
  } = useSimulationEngine(
    currentPrice || 0,
    currentRiskScore || 0,
    volatilityFactor
  );
  
  const {
    active: simulationActive,
    changePercent: priceDelta,
    simulatedRisk: simulatedRiskScore,
    simulatedPrice,
    delta: riskDelta,
  } = simulated;

  const [sliderValue, setSliderValue] = useState(0);

  // Update simulation when slider changes
  useEffect(() => {
    if (sliderValue !== 0) {
      simulate(sliderValue);
    } else {
      reset();
    }
  }, [sliderValue, simulate, reset]);

  const handleSliderChange = (e) => {
    const value = Number(e.target.value);
    setSliderValue(value);
  };

  const handleReset = () => {
    setSliderValue(0);
    reset();
  };
  
  // Generate simulation description
  const simulationDescription = simulationActive
    ? `If ETH price ${priceDelta > 0 ? 'rises' : 'drops'} ${Math.abs(priceDelta)}%, Risk Score ${riskDelta > 0 ? 'increases' : 'decreases'} by ${Math.abs(riskDelta).toFixed(1)} points to ${simulatedRiskScore.toFixed(1)}`
    : "Live data";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="glass-panel holo-glow p-6 mb-6 text-slate-100 section-fade"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-heading text-neon-cyan flex items-center gap-2">
          🧮 What-If Simulation
        </h3>
        {simulationActive && (
          <button
            onClick={handleReset}
            className="btn-cyber text-xs px-3 py-1"
          >
            Reset to Live
          </button>
        )}
      </div>

      {/* Price Change Slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-slate-300">
            ETH Price Change: {sliderValue > 0 ? '+' : ''}{sliderValue}%
          </label>
          <span className="text-xs text-slate-500">
            {simulatedPrice > 0 
              ? `Simulated: $${simulatedPrice.toFixed(2)}`
              : `Current: $${currentPrice?.toFixed(2) || '0.00'}`}
          </span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          step="5"
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full h-2 bg-slate-800/80 rounded-lg appearance-none cursor-pointer accent-[var(--accent-cyan)]"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>-50%</span>
          <span>0%</span>
          <span>+50%</span>
        </div>
      </div>

      {/* Simulation Results */}
      {simulationActive ? (
        <div className="space-y-4">
          <div className="rounded-lg p-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(0,255,240,0.25)] shadow-[0_0_25px_rgba(0,255,240,0.18)]">
            <p className="text-sm text-slate-300 mb-3">
              {simulationDescription}
            </p>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">Simulated Risk Score</div>
                <div className="text-2xl font-heading text-neon-cyan">
                  {simulatedRiskScore.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Risk Grade</div>
                <RiskGradeBadge score={simulatedRiskScore} size="md" />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Change</div>
                <div className={`text-lg font-semibold ${
                  simulatedRiskScore > currentRiskScore 
                    ? 'text-risk' 
                    : simulatedRiskScore < currentRiskScore 
                    ? 'text-neon-cyan' 
                    : 'text-slate-400'
                }`}>
                  {simulatedRiskScore > currentRiskScore ? '+' : ''}
                  {(simulatedRiskScore - currentRiskScore).toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Radar with Simulated Data */}
          <div className="relative">
            <div className="absolute top-2 right-2 z-10 bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded border border-yellow-500/40">
              🧮 Simulation Active
            </div>
            <RiskRadar 
              simulatedRiskScore={simulatedRiskScore}
              simulatedPrice={simulatedPrice}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-sm">
          <p>Adjust the slider above to simulate price changes</p>
          <p className="text-xs mt-2">See how risk scores respond to market volatility</p>
        </div>
      )}
    </motion.div>
  );
}

