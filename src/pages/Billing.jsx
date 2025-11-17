import VAFBreakdown from "../user-app/billing/VAFBreakdown.jsx";

export default function Billing() {
  return (
    <div className="space-y-6">
      <header className="glass-card p-6 space-y-2">
        <h1 className="text-3xl font-heading text-[var(--primary-cyan)]">Billing Overview</h1>
        <p className="text-sm text-[color:rgba(200,228,255,0.72)]">
          Track your monthly cover charges and understand how the Volatility Adjustment Fee keeps your plan sustainable.
        </p>
      </header>

      <VAFBreakdown premium={25} rate={0.5} />
    </div>
  );
}

