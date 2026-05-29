import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useSimulationEngine } from "@shared/hooks/useSimulationEngine";
import { useEthUsdFeed } from "@shared/hooks/useEthUsdFeed";
import { useProtocolMetrics } from "@shared/hooks/useProtocolMetrics";
import RiskRadar from "@components/visuals/RiskRadar";
import RiskGradeBadge from "./RiskGradeBadge";

/**
 * Scenario Intelligence Lab — tier-gated: Explorer presets, Prime Intelligence full, Atlas Intelligence advanced.
 */
export default function SimulationPanel({
  membershipTier = "EXPLORER_ACCESS",
  enterpriseProtocols = false,
  investorDemoUnlock = false,
} = {}) {
  const labMode = useMemo(() => {
    if (investorDemoUnlock) return "full";
    if (enterpriseProtocols || membershipTier === "STRATEGIC_ACCESS") return "advanced";
    if (membershipTier === "INTELLIGENCE_PRO") return "full";
    return "preview";
  }, [membershipTier, enterpriseProtocols, investorDemoUnlock]);

  const sliderMin = labMode === "preview" ? -15 : -50;
  const sliderMax = labMode === "preview" ? 15 : 50;

  const { price, quoteForUi } = useEthUsdFeed();
  const currentPrice = quoteForUi ?? price ?? 0;
  const metrics = useProtocolMetrics();
  const currentRiskScore = typeof metrics.risk24h === 'object' 
    ? metrics.risk24h.value 
    : metrics.risk24h || 0;
  const [volatilityFactor] = useState(2.5);
  
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

  useEffect(() => {
    setSliderValue((v) => {
      if (v < sliderMin) return sliderMin
      if (v > sliderMax) return sliderMax
      return v
    })
  }, [sliderMin, sliderMax])

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
  
  const simulationDescription = simulationActive
    ? `If ETH price ${priceDelta > 0 ? 'rises' : 'drops'} ${Math.abs(priceDelta)}%, Risk Score ${riskDelta > 0 ? 'increases' : 'decreases'} by ${Math.abs(riskDelta).toFixed(1)} points to ${simulatedRiskScore.toFixed(1)}`
    : "Live data";

  const modeLabel =
    labMode === "advanced"
      ? "Atlas · advanced scenario lab"
      : labMode === "full"
        ? "Prime · full scenario lab"
        : "Explorer · limited presets";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="glass-panel holo-glow p-6 mb-6 text-slate-100 section-fade"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-heading text-neon-cyan flex items-center gap-2">
            Scenario Intelligence Lab
          </h3>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-mono mt-1">{modeLabel}</p>
        </div>
        {simulationActive && (
          <button
            type="button"
            onClick={handleReset}
            className="btn-cyber text-xs px-3 py-1 self-start"
          >
            Reset to Live
          </button>
        )}
      </div>

      {labMode === "preview" && (
        <div className="mb-4 rounded-lg border border-violet-500/25 bg-violet-950/20 px-3 py-2.5 text-xs text-violet-100/95 leading-relaxed">
          <strong className="text-violet-200">Explorer presets:</strong> two fixed scenarios (ETH volatility shock, stablecoin
          depeg) with a bounded stress band — your orientation layer, not the full Scenario Intelligence Simulator.{' '}
          <Link to="/pricing" className="text-violet-200 underline underline-offset-2">
            Prime Intelligence
          </Link>{' '}
          unlocks continuous monitoring, timelines, Alert Center, and the full simulator;{' '}
          <Link to="/membership" className="text-violet-200 underline underline-offset-2">
            Alpha Intelligence
          </Link>{' '}
          adds operator-grade depth.
        </div>
      )}

      {labMode === "advanced" && (
        <div className="mb-4 rounded-lg border border-cyan-500/25 bg-cyan-950/15 px-3 py-2.5 text-xs text-cyan-100/90 leading-relaxed">
          <strong className="text-cyan-200">Advanced lab:</strong> Atlas Intelligence is positioned for DAO and treasury
          workflows, API-backed intelligence (when enabled), and expanded Digital Asset Risk Intelligence tooling.
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-slate-300">
            ETH price change: {sliderValue > 0 ? '+' : ''}{sliderValue}%
          </label>
          <span className="text-xs text-slate-500">
            {simulatedPrice > 0 
              ? `Simulated: $${simulatedPrice.toFixed(2)}`
              : `Current: $${currentPrice?.toFixed(2) || '0.00'}`}
          </span>
        </div>
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step="5"
          value={Math.min(Math.max(sliderValue, sliderMin), sliderMax)}
          onChange={handleSliderChange}
          className="w-full h-2 bg-slate-800/80 rounded-lg appearance-none cursor-pointer accent-[var(--accent-cyan)]"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{sliderMin}%</span>
          <span>0%</span>
          <span>+{sliderMax}%</span>
        </div>
      </div>

      {simulationActive ? (
        <div className="space-y-4">
          <div className="rounded-lg p-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(0,255,240,0.25)] shadow-[0_0_25px_rgba(0,255,240,0.18)]">
            <p className="text-sm text-slate-300 mb-3">
              {simulationDescription}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-xs text-slate-400 mb-1">Simulated risk score</div>
                <div className="text-2xl font-heading text-neon-cyan">
                  {simulatedRiskScore.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Risk grade</div>
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

          <div className="relative">
            <div className="absolute top-2 right-2 z-10 bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded border border-yellow-500/40">
              Scenario active
            </div>
            <RiskRadar 
              simulatedRiskScore={simulatedRiskScore}
              simulatedPrice={simulatedPrice}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-sm">
          <p>Adjust the slider to stress ETH against the current risk score</p>
          <p className="text-xs mt-2">
            {labMode === "preview"
              ? "Preview band only on Explorer Access — upgrade for full scenario intelligence."
              : "See how risk scores respond to market volatility"}
          </p>
        </div>
      )}
    </motion.div>
  );
}
