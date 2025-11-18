import RiskPoolManager from '@components/business/RiskPoolManager'
import { motion } from 'framer-motion'
import EnterpriseBadge from '@/components/ui/EnterpriseBadge.jsx'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'
import { formatNumber } from '@/utils/formatters'

export default function RiskPoolsPage() {
  const {
    loading,
    error,
    protocol,
    staking,
    rewards,
    oracle,
  } = useProtocolAnalytics()

  const totals = {
    totalCoverageUSD: protocol?.totalCoverageUSD ?? 0,
    totalPremiums: protocol?.totalPremiums ?? 0,
    totalPolicies: protocol?.totalPolicies ?? 0,
    totalStakedSST: staking?.totalStakedSST ?? 0,
    daoTreasurySST: staking?.daoTreasurySST ?? 0,
    totalRewardsDistributed: staking?.totalRewardsDistributed ?? rewards?.totalRewardsDistributed ?? 0,
  }

  const showOracleWarning = oracle?.ethPrice == null || Number(oracle?.ethPrice ?? 0) === 0
  const metricSkeleton = (
    <div className="glass-panel p-4 animate-pulse bg-white/5 border border-white/10 h-32" />
  )

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
          Risk Pools & Treasury
          <EnterpriseBadge />
        </h1>
        <div className="w-20 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
          Monitor capital buffers, allocations, and supply-side liquidity across underwriting pools.
        </p>
      </motion.header>

      {showOracleWarning && (
        <div className="glass-card p-4 border border-amber-500/40 bg-amber-500/10 text-amber-100 text-sm">
          Oracle feed inactive — using mock data.
        </div>
      )}

      {error && (
        <div className="glass-card p-4 border border-amber-400/30 bg-amber-500/10 text-amber-100 text-sm">
          Live analytics are temporarily unavailable. Displaying cached pool data where possible.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {loading ? (
          <>
            {metricSkeleton}
            {metricSkeleton}
            {metricSkeleton}
            {metricSkeleton}
          </>
        ) : (
          <>
            <div className="glass-panel p-4">
              <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Total Coverage</p>
              <p className="text-2xl font-heading text-white">
                {`$${formatNumber(totals.totalCoverageUSD, 0)}`}
              </p>
              <p className="text-xs text-slate-400 mt-1">Underwritten across all pools</p>
            </div>
            <div className="glass-panel p-4">
              <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">DAO Treasury</p>
              <p className="text-2xl font-heading text-white">
                {`${formatNumber(totals.daoTreasurySST, 2)} SST`}
              </p>
              <p className="text-xs text-slate-400 mt-1">Treasury liquidity supporting claims</p>
            </div>
            <div className="glass-panel p-4">
              <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Total Staked</p>
              <p className="text-2xl font-heading text-white">
                {`${formatNumber(totals.totalStakedSST, 2)} SST`}
              </p>
              <p className="text-xs text-slate-400 mt-1">Validator capital in underwriting pools</p>
            </div>
            <div className="glass-panel p-4">
              <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Rewards Distributed</p>
              <p className="text-2xl font-heading text-white">
                {`${formatNumber(totals.totalRewardsDistributed, 2)} SST`}
              </p>
              <p className="text-xs text-slate-400 mt-1">Cumulative rewards from pool activity</p>
            </div>
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
      >
        {loading ? (
          <div className="glass-panel p-6 space-y-4 animate-pulse bg-white/5 border border-white/10">
            <div className="h-6 w-48 bg-white/10 rounded" />
            <div className="h-48 bg-white/10 rounded" />
          </div>
        ) : (
          <RiskPoolManager />
        )}
      </motion.div>
    </motion.section>
  )
}

