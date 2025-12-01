import { useState } from "react";
import { motion } from "framer-motion";
import {
  calculateVAFMetrics,
  SIGMA_BASE_DEFAULT,
} from "@shared/risk-engine/volatility/VAFEngine.js";

const defaultState = {
  portfolio: 5_000_000,
  sigma30: 68,
  sigmaBase: SIGMA_BASE_DEFAULT,
  k: 0.18,
};

export default function VAFSimulationPanel({ onSimulate, history = [] }) {
  const [form, setForm] = useState(defaultState);
  const [result, setResult] = useState(null);

  const handleChange = (field) => (event) => {
    const value = Number(event.target.value);
    setForm((prev) => ({ ...prev, [field]: Number.isNaN(value) ? prev[field] : value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const metrics = calculateVAFMetrics({
      portfolioValue: form.portfolio,
      prices: history,
      sigmaBase: form.sigmaBase,
      k: form.k,
      overrideSigma30: form.sigma30,
    });
    const safeResult =
      metrics ??
      calculateVAFMetrics({
        portfolioValue: form.portfolio,
        prices: [],
        sigmaBase: form.sigmaBase,
        k: form.k,
        overrideSigma30: form.sigma30,
      });
    setResult(safeResult);
    onSimulate?.(safeResult);
  };

  const renderCurrency = (amount) =>
    `$${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <motion.div
      initial={{ opacity: 0.6, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-4 space-y-4"
    >
      <div>
        <h2 className="text-xl font-heading text-[var(--primary-cyan)] mb-2">
          VAF Simulation Sandbox
        </h2>
        <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
          Experiment with hypothetical volatility scenarios to understand how the actuarial
          VAF engine responds. All values are rounded and for decision-support modelling.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2 text-sm text-[color:rgba(200,228,255,0.8)]">
          Portfolio Size (USD)
          <input
            type="number"
            min="0"
            step="10000"
            value={form.portfolio}
            onChange={handleChange("portfolio")}
            className="input-brand rounded-lg px-3 py-2 bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[color:rgba(200,228,255,0.8)]">
          σ30 (30D Volatility %)
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.sigma30}
            onChange={handleChange("sigma30")}
            className="input-brand rounded-lg px-3 py-2 bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[color:rgba(200,228,255,0.8)]">
          σbase (%)
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.sigmaBase}
            onChange={handleChange("sigmaBase")}
            className="input-brand rounded-lg px-3 py-2 bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[color:rgba(200,228,255,0.8)]">
          k (Actuarial Scalar)
          <input
            type="number"
            min="0.1"
            max="0.25"
            step="0.01"
            value={form.k}
            onChange={handleChange("k")}
            className="input-brand rounded-lg px-3 py-2 bg-transparent"
          />
        </label>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="btn-brand px-5 py-2 text-sm font-semibold">
            Run Simulation
          </button>
        </div>
      </form>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="glass-panel p-4"
          >
            <h3 className="text-sm uppercase tracking-[0.28em] text-[var(--primary-cyan)] mb-2">
              Tier Result
            </h3>
            <p className="text-xl font-heading text-[var(--primary-magenta)]">{result.tier.label}</p>
            <p className="text-xs text-[color:rgba(200,228,255,0.65)]">
              VAF Rate: {result.tier.rate.toFixed(2)}%
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
            className="glass-panel p-4"
          >
            <h3 className="text-sm uppercase tracking-[0.28em] text-[var(--primary-cyan)] mb-2">
              Simple VAF
            </h3>
            <p className="text-xl font-heading text-[var(--primary-cyan)]">
              {renderCurrency(result.simpleVAF)}
            </p>
            <p className="text-xs text-[color:rgba(200,228,255,0.65)]">
              Portfolio × tier rate
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
            className="glass-panel p-4"
          >
            <h3 className="text-sm uppercase tracking-[0.28em] text-[var(--primary-cyan)] mb-2">
              Actuarial VAF
            </h3>
            <p className="text-xl font-heading text-[var(--primary-blue)]">
              {renderCurrency(result.actuarialVAF)}
            </p>
            <p className="text-xs text-[color:rgba(200,228,255,0.65)]">
              Incorporates volatility uplift & k scalar
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.15 }}
            className="md:col-span-3 glass-panel p-4 space-y-2"
          >
            <h4 className="text-sm uppercase tracking-[0.28em] text-[var(--primary-cyan)]">
              Adjustment Insight
            </h4>
            <p className="text-sm text-[color:rgba(200,228,255,0.75)]">
              The Adjustment Engine routes resources automatically to preserve solvency. Treasury
              allocation specifics remain confidential while the simulation focuses on volatility
              responses.
            </p>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

