export default function Billing() {
  const membershipFee = 25
  const vafRate = 0.5
  const vafAdjustment = membershipFee * (vafRate / 100)
  const total = membershipFee + vafAdjustment

  return (
    <div className="space-y-6 text-[color:rgba(200,228,255,0.85)]">
      <header className="glass-card p-6 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[color:rgba(200,228,255,0.55)] mb-1">
          Intelligence console
        </p>
        <h1 className="text-3xl font-heading text-[var(--primary-cyan)] uppercase tracking-[0.24em]">
          Membership fees (preview)
        </h1>
        <p className="text-sm text-[color:rgba(200,228,255,0.72)] max-w-3xl">
          Illustrative example only — Stripe checkout and subscription management are not enabled yet. Future billing
          will reflect membership fees and any volatility adjustments disclosed in program terms.
        </p>
      </header>

      <section className="glass-card p-6 space-y-4">
        <h2 className="text-2xl font-heading text-white">Illustrative monthly statement</h2>
        <p className="text-sm text-[color:rgba(200,228,255,0.8)]">
          Example line items for transparency-style UX; not a live invoice.
        </p>
        <ul className="space-y-2 text-sm text-[color:rgba(200,228,255,0.85)]">
          <li>Base membership fee: ${membershipFee.toFixed(2)}</li>
          <li>Volatility adjustment: ${vafAdjustment.toFixed(2)}</li>
          <li>Total (example): ${total.toFixed(2)}</li>
        </ul>
        <p className="text-sm font-semibold text-[color:rgba(200,228,255,0.85)]">
          SureStack provides digital asset risk intelligence — not a licensed carrier. Member assistance limits follow
          program terms and are not open-ended incident protection limit assurances.
        </p>
      </section>
    </div>
  );
}
