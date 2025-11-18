import { useState, useReducer, useCallback } from "react"
import { useValidatorSync } from "@shared/hooks/useValidatorSync"
import ValidatorStatsPanel from "./dashboard/ValidatorStatsPanel"
import ValidatorRegistryTable from "./dashboard/ValidatorRegistryTable"
import BecomeValidatorPanel from "./dashboard/BecomeValidatorPanel"
import UnstakePanel from "./dashboard/UnstakePanel"
import ValidatorHealthChart from "./dashboard/ValidatorHealthChart"
import StakeSplitPanel from "./dashboard/StakeSplitPanel"
import StakeHistoryModal from "./dashboard/StakeHistoryModal"
import TokenIcon from "./ui/TokenIcon.jsx"

export default function ValidatorConsole() {
  const { validators, stats: legacyStats, connected, error } = useValidatorSync()
  const [validatorStats, setValidatorStats] = useState({})
  const [, forceRender] = useReducer((x) => x + 1, 0)
  
  console.log("[ValidatorConsole] validatorStats state:", validatorStats)
  
  // Memoize callback to prevent unnecessary re-renders
  const handleStatsUpdate = useCallback((data) => {
    console.log("[ValidatorConsole] received stats update:", data);
    setValidatorStats(data);
    forceRender(); // Force re-render safeguard
  }, []);

  const renderSST = (amount, { maximumFractionDigits = 2, iconClass = "h-5 w-5", wrapperClass = "" } = {}) => {
    const formatted =
      typeof amount === "number"
        ? amount.toLocaleString(undefined, { maximumFractionDigits })
        : amount

    return (
      <span className={`inline-flex items-center gap-2 ${wrapperClass}`.trim()}>
        <TokenIcon className={iconClass} />
        <span>{formatted} SST</span>
      </span>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gradient bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          Validator Console
        </h1>
        <div className="text-sm text-slate-400">
          {connected ? "🟢 Live Stream" : "🟡 Polling Mode"}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-300 p-2 rounded-md">
          Error: {error}
        </div>
      )}

      {/* 📊 Validator Stats Panel */}
      <div className="border-t border-safe mt-6 pt-6">
        <ValidatorStatsPanel onStatsUpdate={handleStatsUpdate} />
        
        {/* 💧 Stake Distribution Panel */}
        <StakeSplitPanel
          activeStake={validatorStats.activeStake || 0}
          coolingStake={validatorStats.coolingStake || 0}
        />
        
        {/* 📜 Stake History Modal */}
        <StakeHistoryModal history={validatorStats.history || []} />
      </div>

      {/* 🟢 Become Validator Panel */}
      <BecomeValidatorPanel />

      {/* 🕒 Unstake & Cooldown Panel */}
      <UnstakePanel />

      {/* 📊 Validator Health Chart */}
      <ValidatorHealthChart />

      {/* 📋 Validator Registry Table */}
      <ValidatorRegistryTable />

      {/* Network Summary (Live On-Chain Totals) */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card-dark p-4 rounded-lg text-center">
          <p className="text-slate-400 text-sm">Total Staked</p>
          <h2 className="text-2xl font-bold text-green-400">
            {renderSST(validatorStats?.totalStaked || 0, {
              maximumFractionDigits: 2,
              iconClass: "h-6 w-6",
              wrapperClass: "items-center justify-center",
            })}
          </h2>
        </div>
        <div className="card-dark p-4 rounded-lg text-center">
          <p className="text-slate-400 text-sm">Active Validators</p>
          <h2 className="text-2xl font-bold text-green-400">
            {(validatorStats?.activeValidators || 0)} Validators
          </h2>
        </div>
        <div className="card-dark p-4 rounded-lg text-center">
          <p className="text-slate-400 text-sm">Avg. Accuracy</p>
          <h2 className="text-2xl font-bold text-white">
            {validatorStats?.avgAccuracy?.toFixed(2) || "0.00"}%
          </h2>
        </div>
      </div>
    </div>
  )
}
