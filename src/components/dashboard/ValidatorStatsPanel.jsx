import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useWeb3 } from "@contexts/Web3Context";
import { useValidatorChainStats } from "@shared/hooks/useValidatorChainStats";
import { useProtocolMetrics } from "@shared/hooks/useProtocolMetrics";
import SkeletonLoader from "@components/ui/SkeletonLoader";
import RiskGradeBadge from "./RiskGradeBadge";
import TokenIcon from "@components/ui/TokenIcon.jsx";

// 📊 Unified Validator Stats Panel using shared hook
export default function ValidatorStatsPanel({ onStatsUpdate }) {
  const { account } = useWeb3();
  const consensusAddress = import.meta.env.VITE_CONSENSUS_STAKING_V2_ADDRESS;
  const { stats, loading } = useValidatorChainStats({
    consensusAddress,
    account,
    refreshMs: 15000,
  });
  // Get protocol metrics from hook
  const { metrics, loading: metricsLoading } = useProtocolMetrics();
  const coverageUSD = metrics?.totalCoverageUSD || 0;
  
  // Reuse the same hook instance for comprehensive metrics if needed
  // Note: The simplified hook (src/shared/hooks) doesn't provide risk24h
  // For now, use a placeholder. Can be enhanced later with comprehensive hook if needed.
  const risk24hValue = 0; // Placeholder - risk24h not available in simplified hook
  const [isPulsing, setIsPulsing] = useState(false);
  
  // Calculate SST correlation (Coverage / Staked ratio)
  const sstCorrelation = stats.totalStaked > 0 
    ? ((coverageUSD || 0) / stats.totalStaked) * 100 
    : 0;

  // propagate up to parent (ValidatorConsole)
  useEffect(() => {
    if (typeof onStatsUpdate === "function") {
      onStatsUpdate(stats);
    }
  }, [stats, onStatsUpdate]);

  // Pulse animation on data refresh
  useEffect(() => {
    if (!loading && stats.lastUpdated) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [stats.lastUpdated, loading]);

  if (stats.error && !loading) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
        <p className="text-red-300 text-sm">
          ⚠️ Error loading validator stats: {stats.error}
        </p>
      </div>
    );
  }

  // Determine accuracy color
  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 95) return "text-green-400";
    if (accuracy >= 80) return "text-yellow-400";
    return "text-red-400";
  };

  // Circular progress component for accuracy
  const CircularProgress = ({ percentage, size = 40 }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const color = percentage >= 95 ? "#4ade80" : percentage >= 80 ? "#facc15" : "#f87171";

    return (
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-neutral-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
    );
  };

  const kpiCards = [
    {
      icon: "🧱",
      label: "Active Validators",
      value: loading ? "—" : `${stats.activeValidators} Validators`,
      color: "text-green-400",
      index: 0,
    },
    {
      icon: "💰",
      label: "Minimum Stake",
      value: loading
        ? "—"
        : (
            <span className="inline-flex items-center gap-2 justify-center">
              <TokenIcon className="h-5 w-5" />
              <span>
                {stats.minStakeSST.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })} SST
              </span>
            </span>
          ),
      color: "text-blue-400",
      index: 1,
    },
    {
      icon: "🎯",
      label: "Reward per Round",
      value: loading
        ? "—"
        : (
            <span className="inline-flex items-center gap-2 justify-center">
              <TokenIcon className="h-5 w-5" />
              <span>{stats.rewardPerRoundSST.toFixed(2)} SST</span>
            </span>
          ),
      color: "text-yellow-400",
      index: 2,
      showTierBonus: true,
      totalStaked: stats.totalStaked,
    },
    {
      icon: "📊",
      label: "Avg. Accuracy",
      value: loading ? "—" : `${(stats.avgAccuracy || 0).toFixed(2)}%`,
      color: getAccuracyColor(stats.avgAccuracy || 0),
      accuracy: stats.avgAccuracy || 0,
      tooltip: "Average validator accuracy (past 10 rounds)",
      index: 3,
    },
    {
      icon: "⚙️",
      label: "Network Status",
      value: loading ? "—" : stats.paused ? "Paused" : "Live",
      color: stats.paused ? "text-red-400" : "text-green-400",
      index: 4,
    },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpiCards.map((card) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 * card.index }}
          className={`bg-neutral-800 rounded-xl p-4 text-center border border-neutral-700 relative ${
            isPulsing ? "animate-pulse" : ""
          }`}
        >
          <div className="text-2xl mb-1">{card.icon}</div>
          {loading ? (
            <div className="flex items-center justify-center mb-1">
              <SkeletonLoader variant="text" width="60px" height="24px" />
            </div>
          ) : card.accuracy !== undefined ? (
            <div className="flex items-center justify-center gap-2 mb-1">
              <CircularProgress percentage={card.accuracy} size={32} />
              <div className={`text-xl font-bold ${card.color}`}>
                {card.value}
              </div>
            </div>
          ) : (
            <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
          )}
          {card.showTierBonus && card.totalStaked !== undefined && (
            <div className="mt-1">
              {card.totalStaked >= 50000 ? (
                <p className="text-[var(--primary-blue)] text-xs">🔵 Elite Tier • +20% Reward Bonus</p>
              ) : card.totalStaked >= 10000 ? (
                <p className="text-yellow-400 text-xs">🟡 Pro Tier • +10% Reward Bonus</p>
              ) : card.totalStaked >= 1000 ? (
                <p className="text-[var(--primary-cyan)] text-xs">🟢 Entry Tier • Standard Rewards</p>
              ) : (
                <p className="text-gray-500 text-xs">Stake ≥ 1000 SST to qualify</p>
              )}
            </div>
          )}
          <div className="text-neutral-400 text-sm mt-1 relative group">
            {card.label}
            {card.tooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-xs text-neutral-300 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-neutral-700">
                {card.tooltip}
              </div>
            )}
          </div>
        </motion.div>
      ))}
      </div>
      
      {/* SST Correlation & Risk Grade Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Insured Coverage Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-neutral-800 rounded-xl p-4 border border-neutral-700"
        >
          <div className="text-sm text-neutral-400 mb-2">Insured via Staked Capital</div>
          <div className="text-xl font-bold text-[var(--primary-cyan)] mb-2">
            {loading ? (
              "—"
            ) : (
              <span className="inline-flex items-center gap-2">
                <TokenIcon className="h-5 w-5" />
                <span>
                  {stats.totalStaked.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })} SST
                </span>
              </span>
            )}
          </div>
          {!loading && stats.totalStaked > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                <span>Coverage / Staked Ratio</span>
                <span className="font-mono">{sstCorrelation.toFixed(1)}%</span>
              </div>
          <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                <div
              className="h-full bg-gradient-to-r from-[var(--primary-cyan)] to-[var(--primary-blue)] transition-all duration-500"
                  style={{ width: `${Math.min(sstCorrelation, 100)}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>
        
        {/* Risk Grade Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-neutral-800 rounded-xl p-4 border border-neutral-700 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="text-sm text-neutral-400 mb-2">Network Risk Grade</div>
            <RiskGradeBadge score={risk24hValue} size="lg" showTooltip={true} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

