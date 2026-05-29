import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CoverageTrendChart from "./CoverageTrendChart.jsx";
import TokenIcon from "../ui/TokenIcon.jsx";

/**
 * Advanced analytics surface for the intelligence console.
 * Aggregates live & cached event data from the LiveEventsPanel feed.
 * @param {{ variant?: 'protocol' | 'explorer' }} props
 */
export default function AnalyticsPanel({ variant = 'protocol' }) {
  const [stats, setStats] = useState({
    totalPolicies: 0,
    totalCoverage: 0,
    totalPremiums: 0,
    avgCoveragePercent: 0,
    claimsProcessed: 0,
  });

  useEffect(() => {
    const updateStats = () => {
      const stored = JSON.parse(localStorage.getItem("surestack_events") || "[]");

      if (!stored.length) {
        setStats({
          totalPolicies: 0,
          totalCoverage: 0,
          totalPremiums: 0,
          avgCoveragePercent: 0,
          claimsProcessed: 0,
        });
        return;
      }

      const policyEvents = stored.filter((e) => e.name === "PolicyCreated");
      const claimEvents = stored.filter((e) => e.name === "ClaimProcessed");

      const totalCoverage = policyEvents.reduce(
        (sum, e) => sum + Number(e.args?.coverage || 0),
        0
      );

      const totalPremiums = policyEvents.reduce(
        (sum, e) => sum + Number(e.args?.sst || 0),
        0
      );

      const avgCoveragePercent =
        policyEvents.length > 0
          ? policyEvents.reduce((s, e) => s + Number(e.args?.coveragePercent || 0), 0) /
            policyEvents.length
          : 0;

      setStats({
        totalPolicies: policyEvents.length,
        totalCoverage,
        totalPremiums,
        avgCoveragePercent,
        claimsProcessed: claimEvents.length,
      });
    };

    // Initial update
    updateStats();

    // Listen for storage changes (from other tabs/windows)
    window.addEventListener("storage", updateStats);

    // Listen for custom events from LiveEventsPanel
    const handleEventUpdate = () => {
      updateStats();
    };
    window.addEventListener("surestack:eventsUpdated", handleEventUpdate);

    // Poll for updates every 2 seconds (fallback)
    const pollInterval = setInterval(updateStats, 2000);

    return () => {
      window.removeEventListener("storage", updateStats);
      window.removeEventListener("surestack:eventsUpdated", handleEventUpdate);
      clearInterval(pollInterval);
    };
  }, []);

  const isExplorer = variant === 'explorer'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="glass-panel holo-glow relative z-10 pointer-events-auto p-6 mb-6 section-fade"
    >
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-sm font-subheading uppercase tracking-[0.35em] text-neon-soft">
            {isExplorer ? 'Your console' : 'Real-Time Risk Intelligence'}
          </h2>
          <p className="gradient-text text-2xl font-heading mt-1 drop-shadow">
            {isExplorer ? 'Activity snapshot' : 'Protocol Intelligence Hub'}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-[0.2em]">
            {isExplorer
              ? 'Local activity snapshot — full Digital Asset Risk Intelligence unlocks with Prime Intelligence and above'
              : 'On-chain program activity (when connected)'}
          </p>
        </div>
        <div className="px-3 py-2 rounded-lg bg-slate-900/60 text-sm font-mono text-neon-cyan border border-[rgba(0,255,240,0.25)] shadow-[0_0_16px_rgba(0,255,240,0.2)]">
          Live when RPC / WS configured
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-sm mb-6">
        <div className="holo-card p-4 text-center card-hoverable">
          <div className="text-2xl font-heading text-neon-cyan">
            {stats.totalPolicies}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-[0.2em] mt-2">
            Programs
          </div>
        </div>

        <div className="holo-card p-4 text-center card-hoverable">
          <div className="text-2xl font-heading gradient-text">
            ${stats.totalCoverage.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-[0.2em] mt-2">
            Value monitored
          </div>
        </div>

        <div className="holo-card p-4 text-center card-hoverable">
          <div className="text-2xl font-heading text-neon-yellow flex items-center justify-center gap-2">
            <TokenIcon className="h-6 w-6" />
            <span>{stats.totalPremiums.toFixed(2)} SST</span>
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-[0.2em] mt-2">
            {isExplorer ? 'Program fees (preview)' : 'Risk intelligence fees'}
          </div>
        </div>

        <div className="holo-card p-4 text-center card-hoverable">
          <div className="text-2xl font-heading text-neon-cyan">
            {stats.avgCoveragePercent.toFixed(0)}%
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-[0.2em] mt-2">
            {isExplorer ? 'Avg program limit (preview)' : 'Avg protection limit'}
          </div>
        </div>

        <div className="holo-card p-4 text-center card-hoverable">
          <div className="text-2xl font-heading text-neon-soft">
            {stats.claimsProcessed}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-[0.2em] mt-2">
            Incident assistance events
          </div>
        </div>
      </div>

      {/* 📈 Risk analytics trend */}
      <CoverageTrendChart />
    </motion.div>
  );
}

