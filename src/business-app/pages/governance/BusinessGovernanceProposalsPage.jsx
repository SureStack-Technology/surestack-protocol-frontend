import { motion } from 'framer-motion'
import { useProposals } from '@shared/hooks'
import EnterpriseBadge from '@/components/ui/EnterpriseBadge.jsx'
import BusinessProposalList from '../../components/governance/ProposalList.jsx'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'
import { formatNumber } from '@/utils/formatters'

export default function BusinessGovernanceProposalsPage() {
  const { proposals, loading, error } = useProposals()
  const {
    loading: analyticsLoading,
    error: analyticsError,
    governance: governanceStats,
  } = useProtocolAnalytics()

  const safeProposals = Array.isArray(proposals) ? proposals : []
  const rateLimited =
    error === 'rate_limit' ||
    (typeof error === 'string' && /too many requests|rate limit/i.test(error ?? ''))

  const activeProposals = governanceStats?.activeProposals ?? 0
  const totalProposals = governanceStats?.totalProposals ?? 0
  const totalVotingPower = Number(governanceStats?.totalVotingPower ?? 0) / 1e18

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
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass-card p-5 space-y-2"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-heading text-[var(--primary-cyan)] uppercase tracking-wider">
            Governance Proposals
          </h1>
          <EnterpriseBadge />
        </div>
        <div className="w-24 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.72)]">
          Review live DAO proposals, track quorum, and monitor execution states across the SureStack protocol.
        </p>
      </motion.header>

      {analyticsError && (
        <div className="glass-card p-4 border border-amber-400/30 bg-amber-500/10 text-amber-100 text-sm">
          Governance analytics are currently unavailable. Proposal list may show cached data.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="glass-panel p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Active Proposals</p>
          <p className="text-2xl font-semibold text-[var(--primary-cyan)]">
            {analyticsLoading ? '…' : activeProposals.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Total: {analyticsLoading ? '…' : totalProposals.toLocaleString()}
          </p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Voting Power</p>
          <p className="text-2xl font-semibold text-[var(--primary-blue)]">
            {analyticsLoading ? '…' : `${formatNumber(totalVotingPower, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Aggregate voting weight engaged in governance.
          </p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Rate Limit Status</p>
          <p className={`text-2xl font-semibold ${rateLimited ? 'text-yellow-400' : 'text-green-400'}`}>
            {rateLimited ? 'Degraded' : 'Healthy'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            {rateLimited ? 'Showing cached snapshots due to RPC throttling.' : 'Live data pulled from SureStack DAO.'}
          </p>
        </div>
      </motion.div>

      <div className="glass-card p-5 space-y-3">
        {loading && safeProposals.length === 0 && (
          <div className="animate-pulse text-slate-400 text-sm">Loading proposals…</div>
        )}

        {rateLimited && (
          <div className="glass-panel border border-amber-400/40 bg-amber-500/10 text-amber-100 p-3 text-xs rounded-lg">
            RPC rate-limit detected. Showing cached proposals.
          </div>
        )}

        <BusinessProposalList
          proposals={safeProposals}
          loading={loading}
          error={error}
          rateLimited={rateLimited}
        />
      </div>
    </motion.section>
  )
}

