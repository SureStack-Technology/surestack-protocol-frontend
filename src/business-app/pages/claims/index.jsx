import BusinessClaimPanel from '@components/business/BusinessClaimPanel'
import { motion } from 'framer-motion'
import EnterpriseBadge from '@/components/ui/EnterpriseBadge.jsx'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'
import { formatNumber } from '@/utils/formatters'

export default function BusinessClaimsPage() {
  const {
    loading,
    error,
    protocol,
    rewards,
  } = useProtocolAnalytics()

  const totals = {
    totalPolicies: protocol?.totalPolicies ?? 0,
    totalCoverageUSD: protocol?.totalCoverageUSD ?? 0,
    totalPremiums: protocol?.totalPremiums ?? 0,
    totalRewardsDistributed: rewards?.totalRewardsDistributed ?? 0,
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
          Enterprise Claims
          <EnterpriseBadge />
        </h1>
        <div className="w-20 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
          Review high severity incidents, escalate underwriting actions, and coordinate reinsurance responses.
        </p>
      </motion.header>

      {error && (
        <div className="glass-card p-4 border border-amber-400/30 bg-amber-500/10 text-amber-100 text-sm">
          Claims analytics are currently unavailable. Displaying cached event data when possible.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Policies Under Management</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : totals.totalPolicies.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">Potential claim sources</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Coverage at Risk</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `$${formatNumber(totals.totalCoverageUSD, 0)}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">USD of active coverage</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Premium Buffer</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `${formatNumber(totals.totalPremiums, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Liquidity available for claims</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Rewards Distributed</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `${formatNumber(totals.totalRewardsDistributed, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Validator incentives issued</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
      >
        <BusinessClaimPanel />
      </motion.div>
    </motion.section>
  )
}

