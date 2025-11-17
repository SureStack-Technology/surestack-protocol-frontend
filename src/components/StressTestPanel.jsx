import { useState, useMemo } from 'react'
import { formatNumber } from '../utils/formatters'
import { usePocAnalytics } from '@shared/hooks/usePocAnalytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import toast from 'react-hot-toast'

export default function StressTestPanel() {
  const { data } = usePocAnalytics()
  const [priceDrop, setPriceDrop] = useState(40)

  const protocol = data?.protocol ?? {}
  const stress = data?.stress ?? {}
  const validatorSummary = data?.validators?.validatorSummary ?? {}

  const currentPrice = useMemo(() => {
    return Number(stress.currentPrice ?? data?.oracle?.ethPrice ?? 0)
  }, [stress.currentPrice, data?.oracle?.ethPrice])

  const impact = useMemo(() => {
    if (!currentPrice) return null

    const simulatedPriceValue = currentPrice * (1 - priceDrop / 100)
    const totalPolicies = Number(protocol.activePolicies ?? 0)
    const estimatedActivePolicies = totalPolicies * 0.5
    const averageCoverageLimit = 10_000
    const averageCoveragePercent = 0.5
    const estimatedTotalClaims = estimatedActivePolicies * averageCoverageLimit * averageCoveragePercent
    const poolBalance = Number(
      validatorSummary.totalStaked ?? protocol.totalStakedSST ?? validatorSummary.totalRewards ?? 0
    )
    const claimsImpact = estimatedTotalClaims
    const remainingBalance = Math.max(0, poolBalance - claimsImpact)
    const impactPercent = poolBalance > 0 ? (claimsImpact / poolBalance) * 100 : 0

    return {
      currentPrice,
      simulatedPrice: simulatedPriceValue,
      priceDrop,
      totalPolicies,
      estimatedActivePolicies,
      estimatedTotalClaims,
      estimatedClaimsInSST: estimatedTotalClaims,
      poolBalance,
      claimsImpact,
      remainingBalance,
      impactPercent,
    }
  }, [currentPrice, priceDrop, protocol.activePolicies, protocol.totalStakedSST, validatorSummary])

  const stressTestData = useMemo(() => (
    impact
      ? [
          { name: 'Current Pool', value: impact.poolBalance },
          { name: 'Claims Impact', value: impact.claimsImpact },
          { name: 'Remaining', value: impact.remainingBalance },
        ]
      : []
  ), [impact])

  const priceHistory = useMemo(() => (
    impact
      ? [
          { time: 'Current', price: impact.currentPrice },
          { time: 'Simulated', price: impact.simulatedPrice },
        ]
      : []
  ), [impact])

  return (
    <div className="p-6 glass-panel holo-card space-y-7 text-slate-100">
      <h1 className="text-4xl font-heading text-neon-cyan drop-shadow">
        Stress Test Panel
      </h1>

      {/* Price Drop Simulation */}
      <div className="glassmorphism p-6 border border-safe/20">
        <h2 className="text-lg font-heading text-neon-yellow tracking-wide mb-4">
          Price Drop Simulation
        </h2>
        <div className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-3">
              Price Drop Percentage: {priceDrop}%
            </label>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={priceDrop}
              onChange={(e) => setPriceDrop(Number(e.target.value))}
              className="w-full accent-neon-cyan"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-mono">
              <span>10%</span>
              <span>60%</span>
            </div>
          </div>

          {impact && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="glass-card p-4 border border-blue-400/20">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Current ETH/USD Price
                </p>
                <p className="text-3xl font-heading text-sky-300 mt-2">
                  ${formatNumber(impact.currentPrice)}
                </p>
              </div>
              <div className="glass-card p-4 border border-risk/30">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Simulated Price ({impact.priceDrop}% drop)
                </p>
                <p className="text-3xl font-heading text-risk mt-2">
                  ${formatNumber(impact.simulatedPrice)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Treasury Impact */}
      {impact && (
        <>
          <div className="glassmorphism p-6 border border-purple-500/20">
            <h2 className="text-lg font-heading text-neon-purple mb-5">Treasury Impact Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-4 border border-green-400/30">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  Current Pool Balance
                </p>
                <p className="text-2xl font-heading text-neon-green mt-2">
                  {formatNumber(impact.poolBalance)} SST
                </p>
              </div>
              <div className="glass-card p-4 border border-risk/40">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  Estimated Claims
                </p>
                <p className="text-2xl font-heading text-risk mt-2">
                  {formatNumber(impact.claimsImpact)} SST
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Impact: {formatNumber(impact.impactPercent, 1)}%
                </p>
              </div>
              <div className="glass-card p-4 border border-yellow-400/30">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  Remaining Balance
                </p>
                <p className="text-2xl font-heading text-neon-yellow mt-2">
                  {formatNumber(impact.remainingBalance)} SST
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {formatNumber((impact.remainingBalance / impact.poolBalance) * 100, 1)}% of pool
                </p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glassmorphism p-6 border border-safe/15">
              <h3 className="text-lg font-heading text-neon-cyan uppercase tracking-[0.25em] mb-4">
                Treasury Impact
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stressTestData}>
                  <CartesianGrid strokeOpacity={0.2} stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8" }} />
                  <YAxis tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(10,12,18,0.95)",
                      border: "1px solid rgba(0,245,255,0.2)",
                      borderRadius: "12px",
                      color: "#e2e8f0",
                    }}
                    formatter={(value) => `${formatNumber(value)} SST`}
                  />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glassmorphism p-6 border border-risk/20">
              <h3 className="text-lg font-heading text-neon-pink uppercase tracking-[0.25em] mb-4">
                Price Comparison
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeOpacity={0.2} stroke="#1f2937" />
                  <XAxis dataKey="time" tick={{ fill: "#94a3b8" }} />
                  <YAxis tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(10,12,18,0.95)",
                      border: "1px solid rgba(255,0,255,0.25)",
                      borderRadius: "12px",
                      color: "#e2e8f0",
                    }}
                    formatter={(value) => `$${formatNumber(value)}`}
                  />
                  <Line type="monotone" dataKey="price" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Policy Statistics */}
          <div className="glassmorphism p-6 border border-safe/15">
            <h2 className="text-lg font-heading text-neon-cyan mb-4">Policy Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="glass-card p-3 border border-slate-500/30">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Total Policies</p>
                <p className="text-2xl font-heading text-white mt-1">{impact.totalPolicies}</p>
              </div>
              <div className="glass-card p-3 border border-slate-500/30">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Estimated Active Policies</p>
                <p className="text-2xl font-heading text-white mt-1">
                  {formatNumber(impact.estimatedActivePolicies, 0)}
                </p>
              </div>
              <div className="glass-card p-3 border border-slate-500/30">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Estimated Total Claims (USD)</p>
                <p className="text-2xl font-heading text-neon-yellow mt-1">
                  ${formatNumber(impact.estimatedTotalClaims)}
                </p>
              </div>
              <div className="glass-card p-3 border border-slate-500/30">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Estimated Claims (SST)</p>
                <p className="text-2xl font-heading text-neon-green mt-1">
                  {formatNumber(impact.estimatedClaimsInSST)} SST
                </p>
              </div>
            </div>
          </div>

          {/* Actuarial Resilience Indicator */}
          <div
            className={`glassmorphism p-6 border-2 ${
              impact.remainingBalance > impact.poolBalance * 0.3
                ? 'border-green-400/40'
                : impact.remainingBalance > impact.poolBalance * 0.1
                ? 'border-yellow-400/40'
                : 'border-risk/50'
            }`}
          >
            <h3 className="text-lg font-heading text-white uppercase tracking-[0.2em] mb-3">
              Actuarial Resilience
            </h3>
            <p
              className={`text-3xl font-heading ${
                impact.remainingBalance > impact.poolBalance * 0.3
                  ? 'text-neon-green'
                  : impact.remainingBalance > impact.poolBalance * 0.1
                  ? 'text-neon-yellow'
                  : 'text-risk'
              }`}
            >
              {impact.remainingBalance > impact.poolBalance * 0.3
                ? 'STRONG'
                : impact.remainingBalance > impact.poolBalance * 0.1
                ? 'MODERATE'
                : 'CRITICAL'}
            </p>
            <p className="text-sm text-slate-300 mt-3">
              After a {impact.priceDrop}% price drop, the treasury would retain{' '}
              {formatNumber((impact.remainingBalance / impact.poolBalance) * 100, 1)}% of its balance.
            </p>
          </div>

          {/* Investor Summary Button */}
          <button
            onClick={() => {
              if (!impact) return
              const retentionPercent = impact.poolBalance > 0
                ? ((impact.remainingBalance / impact.poolBalance) * 100).toFixed(1)
                : '0.0'
              const summary = `After a ${impact.priceDrop}% price drop across ${impact.totalPolicies} policies, SureStack's treasury retains ${retentionPercent}% of its balance (${formatNumber(impact.remainingBalance)} SST).`
              // Copy to clipboard and show toast
              navigator.clipboard.writeText(summary).then(() => {
                toast.success('Summary copied to clipboard!')
              }).catch(() => {
                alert(summary)
              })
            }}
            className="w-full btn-cyber text-lg justify-center mt-6"
          >
            🎬 Generate Investor Stress-Test Summary
          </button>
        </>
      )}

      {!impact && (
        <div className="glass-card border border-yellow-400/30 text-yellow-200 px-6 py-5">
          <p className="font-mono text-sm uppercase tracking-[0.2em]">Stress analytics unavailable</p>
          <p className="mt-2 text-slate-200">
            Unable to derive treasury impact with the current dataset. Update the POC analytics snapshot to continue.
          </p>
        </div>
      )}
    </div>
  )
}

