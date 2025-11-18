import { motion } from "framer-motion";
import TokenIcon from "@components/ui/TokenIcon.jsx";
import { SIGMA_BASE_DEFAULT } from "@shared/risk-engine/volatility/VAFEngine.js";

const metricCardClasses =
  "glass-card card-hoverable p-5 flex flex-col gap-2 min-h-[140px]";

function MetricCard({ label, value, description, accent = "var(--primary-cyan)" }) {
  return (
    <motion.div
      className={metricCardClasses}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <span className="text-xs uppercase tracking-[0.28em] text-[color:rgba(200,228,255,0.65)]">
        {label}
      </span>
      <span className="text-2xl font-heading" style={{ color: accent }}>
        {value}
      </span>
      {description && (
        <span className="text-xs text-[color:rgba(200,228,255,0.6)]">{description}</span>
      )}
    </motion.div>
  );
}

export default function VAFAnalytics({
  portfolioValue = 0,
  metrics = {},
  sigmaBase = SIGMA_BASE_DEFAULT,
  k = 0.15,
}) {
  const safeMetrics = metrics ?? {
    sigma30: 0,
    effectiveVolatility: 0,
    tier: { rate: 0, label: "Baseline" },
    simpleVAF: 0,
    actuarialVAF: 0,
    allocation: { pool: 0, reinsurance: 0, revenue: 0 },
  }

  if (!metrics && !safeMetrics) {
    return (
      <div className="glass-card p-6 text-[color:rgba(200,228,255,0.7)]">
        Loading volatility analytics…
      </div>
    );
  }

  const {
    sigma30,
    effectiveVolatility,
    tier,
    simpleVAF,
    actuarialVAF,
    allocation,
  } = safeMetrics;

  const renderSSTValue = (amount) => (
    <span className="inline-flex items-center gap-2">
      <TokenIcon className="h-5 w-5" />
      <span>{amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} SST</span>
    </span>
  );

  const renderCurrency = (amount) =>
    `$${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <motion.section
      initial={{ opacity: 0.6, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="30 Day Volatility (σ30)"
          value={`${sigma30?.toFixed(2) ?? "0.00"}%`}
          description="Derived from the ETH/USD oracle feed."
        />
        <MetricCard
          label="Baseline Volatility (σbase)"
          value={`${sigmaBase.toFixed(0)}%`}
          description="Configured actuarial baseline."
        />
        <MetricCard
          label="Effective Volatility"
          value={`${effectiveVolatility.toFixed(2)}%`}
          description="Above baseline, used for tier selection."
        />
        <MetricCard
          label="Actuarial Scalar (k)"
          value={k.toFixed(2)}
          description="Risk dampening multiplier."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Selected Tier"
          value={tier.label}
          description={`Applied VAF rate: ${tier.rate.toFixed(2)}%`}
          accent="var(--primary-magenta)"
        />
        <MetricCard
          label="Simple VAF"
          value={renderCurrency(simpleVAF)}
          description={`Portfolio × tier rate on ${renderCurrency(portfolioValue)}`}
          accent="var(--primary-cyan)"
        />
        <MetricCard
          label="Actuarial VAF"
          value={renderCurrency(actuarialVAF)}
          description="Adjusted using actuarial formula."
          accent="var(--primary-blue)"
        />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-lg font-heading text-[var(--primary-cyan)] mb-3">
          Allocation Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Risk Pool (60%)"
            value={renderCurrency(allocation.pool)}
            description="Stabilises claims liquidity."
          />
          <MetricCard
            label="Reinsurance (20%)"
            value={renderCurrency(allocation.reinsurance)}
            description="Backstops catastrophic scenarios."
          />
          <MetricCard
            label="SureStack Revenue (20%)"
            value={renderCurrency(allocation.revenue)}
            description="Funds protocol operations."
          />
        </div>
      </div>
    </motion.section>
  );
}

