import { VAF_TIERS } from "@shared/risk-engine/volatility/VAFEngine.js";

export default function TierRulesCard() {
  return (
    <div className="glass-card p-6 space-y-3">
      <h3 className="text-xl font-heading text-[var(--primary-cyan)]">
        Tiered VAF Rules
      </h3>
      <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
        Tiers activate when volatility climbs above the 40% baseline. Each tier escalates the fee
        in 0.25% increments up to a 1.0% cap.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {VAF_TIERS.map((tier) => (
          <div
            key={tier.min ?? "baseline"}
            className="glass-panel p-4 space-y-2"
            style={{ borderColor: "var(--glow-cyan)" }}
          >
            <span className="text-xs uppercase tracking-[0.28em] text-[color:rgba(200,228,255,0.6)]">
              {tier.label}
            </span>
            <p className="text-2xl font-heading text-[var(--primary-magenta)]">
              {tier.rate.toFixed(2)}%
            </p>
            <p className="text-xs text-[color:rgba(200,228,255,0.6)]">
              σ30 exceeds σbase by {tier.min}% or more.
            </p>
          </div>
        ))}

        <div className="glass-panel p-4 space-y-2">
          <span className="text-xs uppercase tracking-[0.28em] text-[color:rgba(200,228,255,0.6)]">
            Baseline
          </span>
          <p className="text-2xl font-heading text-[var(--primary-cyan)]">0%</p>
          <p className="text-xs text-[color:rgba(200,228,255,0.6)]">
            If volatility remains within ±20% of σbase no fee is applied.
          </p>
        </div>
      </div>

      <p className="text-xs text-[color:rgba(200,228,255,0.55)]">
        The VAF automatically de-escalates once σ30 cools below the thresholds, ensuring fees only
        apply during periods of extreme volatility.
      </p>
    </div>
  );
}

