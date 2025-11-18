import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import VAFAnalytics from "../../components/VAFAnalytics.jsx";
import VAFSimulationPanel from "../../components/VAFSimulationPanel.jsx";
import VAFAllocationBreakdown from "../../components/VAFAllocationBreakdown.jsx";
import VolatilityCharts from "../../components/VolatilityCharts.jsx";
import TierRulesCard from "../../components/TierRulesCard.jsx";
import RevenueExplainer from "@/user-app/components/RevenueExplainer.jsx";
import EnterpriseBadge from "@/components/ui/EnterpriseBadge.jsx";
import {
  calculateVAFMetrics,
  SIGMA_BASE_DEFAULT,
} from "@shared/risk-engine/volatility/VAFEngine.js";
import { fetchInitialHistory } from "@shared/services/priceHistory.js";
import { useProtocolAnalytics } from "@/hooks/useProtocolAnalytics";
import { formatNumber } from "@/utils/formatters";

const DEFAULT_PORTFOLIO = 7_500_000;
const DEFAULT_K = 0.18;

export default function VAFModulePage() {
  const [history, setHistory] = useState([]);
  const [portfolioValue] = useState(DEFAULT_PORTFOLIO);
  const [sigmaBase, setSigmaBase] = useState(SIGMA_BASE_DEFAULT);
  const [k, setK] = useState(DEFAULT_K);
  const [metrics, setMetrics] = useState(null);

  const {
    loading: analyticsLoading,
    error: analyticsError,
    volatility,
    protocol,
    staking,
  } = useProtocolAnalytics();

  const loadHistory = useCallback(async () => {
    const { history: fetchedHistory } = await fetchInitialHistory({
      minSamples: 30,
      maxLookbackRounds: 120,
    });
    setHistory(fetchedHistory || []);
  }, []);

  useEffect(() => {
    loadHistory().catch((err) => {
      console.warn("[VAFModule] Failed to load volatility history:", err);
    });
  }, [loadHistory]);

  useEffect(() => {
    if (!history.length) return;
    const computed = calculateVAFMetrics({
      portfolioValue,
      prices: history,
      sigmaBase,
      k,
    });
    setMetrics(computed);
  }, [history, portfolioValue, sigmaBase, k]);

  const allocation = metrics?.allocation ?? { pool: 0, reinsurance: 0, revenue: 0 };

  const handleSimulation = (result) => {
    if (!result) return;
    setSigmaBase(result.sigmaBase ?? sigmaBase);
    setK(result.k ?? k);
  };

  const stats = useMemo(
    () => ({
      history,
      sigmaBase,
      k,
      metrics,
      portfolioValue,
    }),
    [history, sigmaBase, k, metrics, portfolioValue]
  );

  const analyticsSummary = useMemo(() => {
    const sigma30 = (volatility?.sigma30 ?? 0) / 1e6;
    const sigma7 = (volatility?.sigma7 ?? 0) / 1e6;
    const ethPrice = volatility?.lastPrice ? volatility.lastPrice / 1e8 : 0;
    return {
      sigma30,
      sigma7,
      ethPrice,
      totalCoverageUSD: protocol?.totalCoverageUSD ?? 0,
      totalStakedSST: staking?.totalStakedSST ?? 0,
    };
  }, [protocol, staking, volatility]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="glass-card p-4 space-y-2"
      >
        <h1 className="text-3xl font-heading text-[var(--primary-cyan)] flex items-center">
          Adjustments & Risk Engine
          <EnterpriseBadge />
        </h1>
        <div className="w-20 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.72)] max-w-3xl">
          Adjustments safeguard the SureStack treasury by proportionally tuning premiums during
          periods of extreme market volatility. Inspect volatility trends, stress test scenarios, and
          examine actuarial allocations in one unified console.
        </p>
      </motion.header>

      {analyticsError && (
        <div className="glass-card p-4 border border-amber-400/30 bg-amber-500/10 text-amber-100 text-sm">
          Volatility analytics are currently unavailable. Charts below may use cached data.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">ETH / USD Price</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? "…" : `$${formatNumber(analyticsSummary.ethPrice, 2)}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Latest oracle observation</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">σ30 (30d Volatility)</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? "…" : `${formatNumber(analyticsSummary.sigma30, 2)}%`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Annualised 30-day volatility</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">σ7 (7d Volatility)</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? "…" : `${formatNumber(analyticsSummary.sigma7, 2)}%`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Weekly volatility signal</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Coverage Backing Adjustments</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? "…" : `$${formatNumber(analyticsSummary.totalCoverageUSD, 0)}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">USD capacity subject to adjustment buffers</p>
        </div>
      </motion.div>

      <VolatilityCharts history={stats.history} sigmaBase={stats.sigmaBase} />
      <TierRulesCard />
      <section className="glass-card p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-heading text-white uppercase tracking-[0.24em]">
            Liquidity &amp; Adjustment Engine
          </h2>
          <p className="text-sm text-[color:rgba(200,228,255,0.72)]">
            Adjustments activate only during high volatility to stabilise payouts. When markets normalise the adjustment automatically
            returns to zero. We monitor these buffers continuously to keep underwriting solvent without overcharging policy holders.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-4 rounded-lg border border-white/10 space-y-3">
            <h3 className="text-lg font-heading text-white">Adjustment Overview</h3>
            <p className="text-sm text-white/70">
              Adjustment tiers scale with 30-day volatility. When sigma levels breach thresholds we proportionally lift fees, and
              once volatility cools the engine retracts back to zero automatically.
            </p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• 60% funds direct liquidity for payouts</li>
              <li>• 20% secures reinsurance &amp; counterparty buffers</li>
              <li>• 20% invests in underwriting intelligence &amp; ops</li>
            </ul>
          </div>
          <RevenueExplainer />
        </div>
        <div className="glass-panel p-4 rounded-lg border border-white/10 space-y-2">
          <h3 className="text-lg font-heading text-white">Need bespoke coverage?</h3>
          <p className="text-sm text-white/70">
            Institutional desks with unique risk exposures can engage our enterprise team for custom adjustment schedules, premium
            ladders, and liquidity commitments aligned to regulatory needs.
          </p>
          <a
            href="mailto:pilot@surestack.tech"
            className="btn-outline inline-flex items-center gap-2 w-fit text-sm"
          >
            Contact pilot@surestack.tech
          </a>
        </div>
      </section>
      <VAFAnalytics
        portfolioValue={stats.portfolioValue}
        metrics={stats.metrics}
        sigmaBase={stats.sigmaBase}
        k={stats.k}
      />
      <VAFAllocationBreakdown allocation={allocation} />
      <VAFSimulationPanel onSimulate={handleSimulation} history={stats.history} />
    </motion.section>
  );
}

