import { useEffect } from 'react'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'
import OracleFeedPanel from './ui/OracleFeedPanel.jsx'
import RiskRadar from './visuals/RiskRadar.jsx'
import HolographicCard from './ui/HolographicCard.jsx'
import LiveEventsPanel from './dashboard/LiveEventsPanel.jsx'
import AnalyticsPanel from './dashboard/AnalyticsPanel.jsx'
import SimulationPanel from './dashboard/SimulationPanel.jsx'
import TokenIcon from './ui/TokenIcon.jsx'
import { motion } from 'framer-motion'
import VAFBanner from '../user-app/dashboard/VAFBanner.jsx'
import VAFAlert from '../user-app/components/VAFAlert.jsx'

console.log('[TRACE] Mounting Dashboard')

export default function Dashboard() {
  console.log('[TRACE] Rendering Dashboard')

  const { analytics, loading, error } = useProtocolAnalytics()

  const protocol = analytics?.protocol ?? {}
  const validators = analytics?.validators ?? {}
  const stress = analytics?.stress ?? {}
  const oracle = analytics?.oracle ?? {}

  const renderSSTValue = (amount, formatOptions = { maximumFractionDigits: 2 }) => {
    const formatted = Number(amount ?? 0).toLocaleString(undefined, formatOptions)

    return (
      <span className="inline-flex items-center gap-2">
        <TokenIcon className="h-6 w-6 drop-shadow-[0_0_12px_rgba(0,255,240,0.5)]" />
        <span>{formatted} SST</span>
      </span>
    )
  }

  useEffect(() => {
    console.log('[TRACE] Rendered Dashboard')
  }, [])

  const coverageUSD = protocol.totalCoverageUSD ?? 0
  const totalStakedSST = protocol.totalStakedSST ?? validators.totalStaked ?? 0
  const treasurySST = protocol.treasurySST ?? 0
  const totalRewards = validators.totalRewards ?? 0
  const sigma24h = stress.vol24h ?? 0
  const sigma7d = stress.vol7d ?? 0
  const ethPrice = oracle.ethPrice ?? 0
  const maxRiskScore = Math.max(sigma24h || 0, sigma7d || 0)
  const apy = totalStakedSST > 0 ? Math.min((totalRewards / totalStakedSST) * 100, 9999) : 0

  return (
    <section className="relative z-0 pointer-events-auto space-y-10 pt-8 min-h-screen text-white">

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 space-y-6"
      >
        <h1 className="text-4xl font-heading gradient-text uppercase tracking-wider">
          SureStack Dashboard
        </h1>
        <img
          src="/assets/banner/surestack-banner.png"
          alt="SureStack Protocol Banner"
          className="w-full max-h-64 object-cover rounded-3xl border border-[var(--glow-cyan)] shadow-[0_0_35px_rgba(6,87,180,0.35)]"
        />
        <p className="neon-soft font-mono text-sm">
          Real-time risk monitoring and coverage analytics
        </p>
      </motion.div>

      <VAFBanner rate={0.5} premium={25} />
      <VAFAlert rate={0.5} />

      <AnalyticsPanel />
      <SimulationPanel />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4 section-fade"
      >
        <div className="glass-panel holo-glow p-6 card-hoverable">
          <h3 className="text-xs uppercase tracking-[0.3em] neon-soft mb-3">
            Total Coverage
          </h3>
          <p className="text-3xl font-heading text-neon-cyan drop-shadow-lg">
            {loading ? '…' : `$${coverageUSD.toLocaleString()}`}
          </p>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            USD across all active pools
          </p>
        </div>

        <div className="glass-panel holo-glow p-6 card-hoverable">
          <h3 className="text-xs uppercase tracking-[0.3em] neon-soft mb-3">
            DAO Treasury
          </h3>
          <p className="text-3xl font-heading text-neon-pink drop-shadow-lg flex items-center gap-3">
            {loading ? '…' : renderSSTValue(treasurySST, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Governance reserves
          </p>
        </div>

        <div className="glass-panel holo-glow p-6 card-hoverable">
          <h3 className="text-xs uppercase tracking-[0.3em] neon-soft mb-3">
            Total Staked
          </h3>
          <p className="text-3xl font-heading text-neon-yellow drop-shadow-lg flex items-center gap-3">
            {loading ? '…' : renderSSTValue(totalStakedSST, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Validator capital
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <div className="lg:col-span-8 space-y-6">

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

            <HolographicCard
              title="Total Coverage"
              value={`$${coverageUSD.toLocaleString()}`}
              subtitle="Across all active pools"
              riskScore={maxRiskScore}
            />

            <HolographicCard
              title="Total Staked"
              value={loading ? '…' : renderSSTValue(totalStakedSST, { maximumFractionDigits: 0 })}
              subtitle="Validator capital"
              riskScore={Math.min(maxRiskScore, 50)}
            />

            <HolographicCard
              title="DAO Treasury"
              value={loading ? '…' : renderSSTValue(treasurySST, { maximumFractionDigits: 2 })}
              subtitle="Governance reserves"
              riskScore={20}
            />

            <HolographicCard
              title="Oracle — ETH/USD"
              value={ethPrice ? `$${ethPrice.toFixed(2)}` : '—'}
              subtitle={ethPrice ? 'POC analytics feed' : '—'}
              riskScore={30}
            />

          </div>

          <OracleFeedPanel />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

            <HolographicCard
              title="24h Risk Index"
              value={sigma24h.toFixed(1)}
              subtitle="From ETH/USD volatility"
              riskScore={sigma24h}
            />

            <HolographicCard
              title="7d Risk Index"
              value={sigma7d.toFixed(1)}
              subtitle="From ETH/USD volatility"
              riskScore={sigma7d}
            />

            <HolographicCard
              title="APY (Annual)"
              value={`${apy.toFixed(2)}%`}
              subtitle="From reward rate"
              riskScore={20}
            />

            <HolographicCard
              title="Status"
              value={error ? 'Error' : 'Live'}
              subtitle={error?.message || 'All systems operational'}
              riskScore={error ? 80 : 20}
            />

          </div>

        </div>

        <div className="lg:col-span-4 space-y-6">
          <RiskRadar simulatedRiskScore={Math.min(Math.round(maxRiskScore * 1.5), 100)} simulatedPrice={ethPrice} />
          <LiveEventsPanel />
        </div>

      </div>
    </section>
  )
}

console.log("%c✨ SureStack Components Themed", "color:#ff00ff;font-size:16px")