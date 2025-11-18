import { useState } from "react";

export default function VAFAlert({ rate }) {
  const [open, setOpen] = useState(false);
  const displayRate = `${rate?.toFixed(2) ?? "0.00"}%`;

  return (
    <div className="glass-card p-4 space-y-3 border border-[var(--glow-cyan)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--primary-cyan)]">
            Volatility Adjustment Fee Active
          </p>
          <p className="text-xs text-[color:rgba(200,228,255,0.7)]">
            This month&apos;s protection fee includes a volatility buffer of {displayRate}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-brand px-3 py-1 text-xs"
        >
          Learn More
        </button>
      </div>

      {open && (
        <div className="glass-panel p-3 rounded-lg text-xs text-[color:rgba(200,228,255,0.78)] space-y-2">
          <p className="font-semibold text-[var(--primary-magenta)]">
            What is the VAF?
          </p>
          <p>
            The Volatility Adjustment Fee keeps your cover sustainable when markets become
            extremely turbulent. We only apply it when the 30-day volatility exceeds the normal
            range, and the fee automatically deactivates once markets stabilise.
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-magenta px-3 py-1 text-xs"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}

