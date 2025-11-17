import React from "react";

/**
 * 🕒 Cooldown Progress Ring
 * Visual circular progress indicator for unstake cooldown period
 */
export default function CooldownProgress({ remaining, total, status, unlockTime }) {
  // Calculate percentage complete
  const percentage = total > 0 ? Math.max(0, Math.min(100, ((total - remaining) / total) * 100)) : 0;
  const isReady = remaining <= 0 || status === "ready";
  
  // Determine ring color based on status
  const getRingColor = () => {
    if (isReady) return "#10b981"; // green
    if (status === "cooling") return "#06b6d4"; // cyan
    return "#6b7280"; // gray
  };

  const ringColor = getRingColor();
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Format unlock time
  const formatUnlockTime = () => {
    if (!unlockTime) return "";
    const date = new Date(unlockTime * 1000);
    return date.toLocaleTimeString();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        {/* Background ring */}
        <svg className="transform -rotate-90 w-24 h-24">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="#374151"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress ring */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={ringColor}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-lg font-bold ${isReady ? "text-green-400" : "text-[var(--primary-cyan)]"}`}>
              {isReady ? "100%" : `${Math.round(percentage)}%`}
            </div>
            {isReady && (
              <div className="text-xs text-green-400 mt-0.5">Ready</div>
            )}
          </div>
        </div>
      </div>
      {/* Status label */}
      <div className="text-xs text-neutral-400 text-center">
        {isReady ? (
          <span className="text-green-400">✅ Ready to Withdraw</span>
        ) : status === "cooling" ? (
          <span className="text-[var(--primary-cyan)]">🕒 Cooling Off</span>
        ) : (
          <span className="text-neutral-500">Active</span>
        )}
      </div>
      {/* Unlock time tooltip */}
      {unlockTime && !isReady && (
        <div className="text-xs text-neutral-500 text-center mt-1" title={`Unlocks at ${formatUnlockTime()}`}>
          Unlocks: {formatUnlockTime()}
        </div>
      )}
    </div>
  );
}

