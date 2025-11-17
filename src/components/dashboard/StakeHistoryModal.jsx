import React, { useState } from "react";
import TokenIcon from "../ui/TokenIcon.jsx";

/**
 * 📜 Stake History Modal
 * Displays a collapsible list of stake actions with timestamps and tiers
 */
export default function StakeHistoryModal({ history }) {
  const [open, setOpen] = useState(false);
  
  if (!history?.length) return null;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="text-[var(--primary-cyan)] hover:text-[var(--primary-blue)] underline text-sm transition-colors"
      >
        {open ? "▼ Hide" : "▶ Show"} Stake History ({history.length})
      </button>

      {open && (
        <div className="mt-3 text-sm text-neutral-300 max-h-48 overflow-y-auto space-y-1">
          {history.map((tx, i) => (
            <div key={i} className="py-2 border-b border-neutral-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-semibold inline-flex items-center gap-1">
                  <TokenIcon className="h-4 w-4" />
                  +{tx.amount.toFixed(2)} SST
                </span>
                staked
              </div>
              <div className="text-xs text-neutral-400 flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded ${
                    tx.tier === "Elite"
                      ? "bg-[color:rgba(0,102,255,0.22)] text-[var(--primary-blue)]"
                      : tx.tier === "Pro"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-[color:var(--surface-cyan-soft)] text-[var(--primary-cyan)] border border-safe"
                  }`}
                >
                  {tx.tier}
                </span>
                <span>{new Date(tx.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

