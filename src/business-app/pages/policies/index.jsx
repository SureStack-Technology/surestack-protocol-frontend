import PolicyOps from '@components/business/PolicyOps'
import { motion } from 'framer-motion'
import EnterpriseBadge from '@/components/ui/EnterpriseBadge.jsx'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'
import { formatNumber } from '@/utils/formatters'

export default function BusinessPoliciesPage() {
  const {
    loading,
    error,
    protocol,
  } = useProtocolAnalytics()

  const totals = {
    totalPolicies: protocol?.totalPolicies ?? 0,
    totalCoverageUSD: protocol?.totalCoverageUSD ?? 0,
    totalPremiums: protocol?.totalPremiums ?? 0,
    avgCoveragePct: protocol?.avgCoveragePct ?? 0,
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
          Enterprise Policies
          <EnterpriseBadge />
        </h1>
        <div className="w-20 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
          Manage underwriting controls, policy lifecycles, and partner configuration.
        </p>
      </motion.header>

      {error && (
        <div className="glass-card p-4 border border-amber-400/30 bg-amber-500/10 text-amber-100 text-sm">
          Unable to load live policy analytics. Displaying cached data when available.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Active Policies</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : totals.totalPolicies.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">Total live coverage programmes</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Total Coverage</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `$${formatNumber(totals.totalCoverageUSD, 0)}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">USD capacity under management</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Premiums In Force</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `${formatNumber(totals.totalPremiums, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Cumulative SST premiums</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Average Coverage Ratio</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `${formatNumber(totals.avgCoveragePct, 2)}%`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Coverage utilisation vs limits</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
      >
        <PolicyOps />
      </motion.div>
    </motion.section>
  )
}

