import StressTestPanel from '@components/StressTestPanel.jsx'
import { motion } from 'framer-motion'
import EnterpriseBadge from '@/components/ui/EnterpriseBadge.jsx'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'
import { formatNumber } from '@/utils/formatters'

export default function BusinessStressTestPage() {
  const {
    loading,
    error,
    protocol,
    staking,
    volatility,
  } = useProtocolAnalytics()

  const totals = {
    totalCoverageUSD: protocol?.totalCoverageUSD ?? 0,
    totalPolicies: protocol?.totalPolicies ?? 0,
    totalStakedSST: staking?.totalStakedSST ?? 0,
    sigma30: (volatility?.sigma30 ?? 0) / 1e6,
    ethPrice: volatility?.lastPrice ? volatility.lastPrice / 1e8 : 0,
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="glass-card p-4 space-y-2"
      >
        <h1 className="text-3xl font-heading text-[var(--primary-cyan)] flex items-center">
          Stress Tests
          <EnterpriseBadge />
        </h1>
        <div className="w-20 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
          Model premium shocks, validator churn, and reserve coverage under extreme scenarios.
        </p>
      </motion.header>

      {error && (
        <div className="glass-card p-4 border border-amber-400/30 bg-amber-500/10 text-amber-100 text-sm">
          Stress test analytics are currently unavailable. Scenario outputs may use cached metrics.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Coverage at Risk</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `$${formatNumber(totals.totalCoverageUSD, 0)}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">USD to stress across scenarios</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Total Policies</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : totals.totalPolicies.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">Active policy count fueling claims</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Validator Capital</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `${formatNumber(totals.totalStakedSST, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Staked cushion sustaining cover</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">σ30 Volatility</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `${formatNumber(totals.sigma30, 2)}%`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Baseline risk input for stress models</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
      >
        <StressTestPanel />
      </motion.div>
    </motion.section>
  )
}

