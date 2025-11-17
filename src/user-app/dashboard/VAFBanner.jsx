import TokenIcon from "@components/ui/TokenIcon.jsx";

export default function VAFBanner({ rate = 0.5, premium = 25 }) {
  const adjustment = premium * (rate / 100);
  const total = premium + adjustment;

  return (
    <div className="glass-card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-[var(--glow-cyan)]">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.28em] text-[color:rgba(200,228,255,0.6)]">
          Stability Update
        </p>
        <h2 className="text-xl font-heading text-[var(--primary-cyan)]">
          Volatility Adjustment Fee Active
        </h2>
        <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
          Markets have been turbulent, so a temporary stability fee of {rate.toFixed(2)}% is added
          to keep your coverage solvent through the spike.
        </p>
      </div>
      <div className="glass-panel p-4 rounded-xl w-full md:w-auto">
        <p className="text-xs uppercase tracking-[0.28em] text-[color:rgba(200,228,255,0.55)] mb-2">
          This Month
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-[color:rgba(200,228,255,0.75)]">
          <dt>Premium</dt>
          <dd className="text-right">${premium.toFixed(2)}</dd>
          <dt>VAF</dt>
          <dd className="text-right">${adjustment.toFixed(2)}</dd>
          <dt className="font-semibold text-[var(--primary-cyan)]">Total</dt>
          <dd className="text-right font-semibold text-[var(--primary-cyan)]">
            ${total.toFixed(2)}
          </dd>
        </dl>
      </div>
    </div>
  );
}

