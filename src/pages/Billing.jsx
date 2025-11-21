export default function Billing() {
  const coveragePremium = 25
  const vafRate = 0.5
  const vafAdjustment = coveragePremium * (vafRate / 100)
  const total = coveragePremium + vafAdjustment

  return (
    <div className="space-y-6 text-[color:rgba(200,228,255,0.85)]">
      <header className="glass-card p-6 space-y-3">
        <h1 className="text-3xl font-heading text-[var(--primary-cyan)] uppercase tracking-[0.24em]">
          Billing Overview
        </h1>
        <p className="text-sm text-[color:rgba(200,228,255,0.72)] max-w-3xl">
          Track how your subscription premium and the temporary volatility adjustment combine to keep your coverage active.
        </p>
      </header>

      <section className="glass-card p-6 space-y-4">
        <h2 className="text-2xl font-heading text-white">Monthly Billing</h2>
        <p className="text-sm text-[color:rgba(200,228,255,0.8)]">
          Your monthly billing includes your base protection premium and a temporary volatility adjustment when markets are unstable.
        </p>
        <ul className="space-y-2 text-sm text-[color:rgba(200,228,255,0.85)]">
          <li>Coverage Premium: ${coveragePremium.toFixed(2)}</li>
          <li>VAF Adjustment: ${vafAdjustment.toFixed(2)}</li>
          <li>Total: ${total.toFixed(2)}</li>
        </ul>
        <p className="text-sm font-semibold text-[color:rgba(200,228,255,0.85)]">
          The VAF applies only during periods of elevated market volatility and automatically returns to 0% when conditions stabilise.
        </p>
      </section>
    </div>
  );
}

