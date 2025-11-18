const revenueItems = [
  {
    title: 'Subscription Fees',
    subtitle: 'MRR and ARR',
    description: 'Predictable monthly and annual premiums keep the user pool funded without sudden price shocks.',
  },
  {
    title: 'Coverage Premiums',
    subtitle: 'Your plan',
    description: 'Each plan contributes a base premium that powers instant claim payouts across the SureStack network.',
  },
  {
    title: 'VAF Adjustment Fee',
    subtitle: 'Only during high volatility',
    description: 'A temporary stabiliser applied when markets spike to maintain solvency, then drops back to zero.',
  },
]

export default function RevenueExplainer() {
  return (
    <div className="glass-card p-6 space-y-4">
      <header>
        <p className="text-xs uppercase tracking-[0.26em] text-[color:rgba(200,228,255,0.5)]">Revenue Model</p>
        <h2 className="text-2xl font-heading text-white mt-2">How SureStack Funds Protection</h2>
        <p className="text-sm text-[color:rgba(200,228,255,0.7)] mt-2">
          Clear alignment between your subscription, the shared risk pool, and the Volatility Adjustment Fee keeps payouts reliable.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4">
        {revenueItems.map((item) => (
          <div
            key={item.title}
            className="glass-panel p-4 rounded-xl border border-[rgba(0,255,240,0.14)]"
          >
            <h3 className="text-lg font-heading text-white">{item.title}</h3>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:rgba(200,228,255,0.55)] mt-1">
              {item.subtitle}
            </p>
            <p className="text-sm text-[color:rgba(200,228,255,0.74)] mt-3">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

