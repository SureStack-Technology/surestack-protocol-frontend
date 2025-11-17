import React from "react";
import TokenIcon from "../ui/TokenIcon.jsx";

/**
 * 💧 Stake Split Panel
 * Visualizes the distribution of active vs cooling stake
 */
export default function StakeSplitPanel({ activeStake, coolingStake }) {
  const total = activeStake + coolingStake;
  const activePct = total > 0 ? (activeStake / total) * 100 : 0;
  const coolingPct = total > 0 ? (coolingStake / total) * 100 : 0;

  return (
    <div className="bg-neutral-900 text-neutral-100 rounded-2xl p-4 border border-neutral-800 mb-4">
      <h3 className="text-lg font-semibold text-[var(--primary-cyan)] mb-2">💧 Stake Distribution</h3>
      <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden relative">
        {activePct > 0 && (
          <div
            className="bg-green-500 h-full absolute left-0 top-0 transition-all duration-700"
            style={{ width: `${activePct}%` }}
          />
        )}
        {coolingPct > 0 && (
          <div
            className="bg-yellow-500 h-full absolute top-0 transition-all duration-700"
            style={{ left: `${activePct}%`, width: `${coolingPct}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-neutral-400 mt-2">
        <span className="inline-flex items-center gap-2">
          🟢 Active:{" "}
          <span className="inline-flex items-center gap-1 text-green-300">
            <TokenIcon className="h-4 w-4" />
            {activeStake.toFixed(2)} SST
          </span>{" "}
          ({activePct.toFixed(1)}%)
        </span>
        <span className="inline-flex items-center gap-2">
          🟡 Cooling:{" "}
          <span className="inline-flex items-center gap-1 text-yellow-300">
            <TokenIcon className="h-4 w-4" />
            {coolingStake.toFixed(2)} SST
          </span>{" "}
          ({coolingPct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

