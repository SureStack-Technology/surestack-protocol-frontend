import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import EnterpriseBadge from '@/components/ui/EnterpriseBadge.jsx'
import { useGovernance } from '@/hooks/useGovernance'
import { formatNumber } from '@/utils/formatters'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'

export default function BusinessGovernanceIndexPage() {
  const { votingPower = 0, proposalThreshold = 0, quorum = 0, loading } = useGovernance() ?? {}
  const {
    loading: analyticsLoading,
    error: analyticsError,
    governance: governanceStats,
  } = useProtocolAnalytics()

  const safeVotingPower = Number(votingPower ?? 0)
  const thresholdFallback = Number(governanceStats?.proposalThreshold ?? 0) / 1e18
  const quorumFallback = Number(governanceStats?.quorumRequirement ?? 0) / 1e18
  const totalVotingPower = Number(governanceStats?.totalVotingPower ?? 0) / 1e18
  const activeProposals = governanceStats?.activeProposals ?? 0
  const totalProposals = governanceStats?.totalProposals ?? 0

  const safeThresholdRaw = Number(proposalThreshold ?? 0)
  const safeQuorumRaw = Number(quorum ?? 0)

  const displayThreshold = safeThresholdRaw > 0 ? safeThresholdRaw : thresholdFallback
  const displayQuorum = safeQuorumRaw > 0 ? safeQuorumRaw : quorumFallback

  const canCreate = safeVotingPower >= displayThreshold && displayThreshold > 0

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
        className="glass-card p-5 space-y-3"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-heading text-[var(--primary-cyan)] uppercase tracking-wider">
            Governance Control Centre
          </h1>
          <EnterpriseBadge />
        </div>
        <div className="w-24 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.72)]">
          Review governance health, inspect proposals, and submit new directives to the SureStack DAO.
        </p>
        <img
          src="/assets/banner/surestack-banner.png"
          alt="SureStack Governance Banner"
          className="w-[500px] md:w-[560px] mx-auto rounded-3xl border border-[var(--glow-cyan)] shadow-[0_0_32px_rgba(6,87,180,0.35)]"
        />
      </motion.header>

      {analyticsError && (
        <div className="glass-card p-4 border border-amber-400/30 bg-amber-500/10 text-amber-100 text-sm">
          Live governance analytics are currently unavailable. Displaying cached voting data when possible.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Your Voting Power</p>
          <p className="text-2xl font-semibold text-[var(--primary-cyan)]">
            {loading ? '—' : `${formatNumber(safeVotingPower, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Threshold: {analyticsLoading ? '…' : `${formatNumber(displayThreshold, 2)} SST`}
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Quorum Requirement</p>
          <p className="text-2xl font-semibold text-[var(--primary-blue)]">
            {analyticsLoading ? '…' : `${formatNumber(displayQuorum, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Minimum participation for a proposal to pass.
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Governance Status</p>
          <p className="text-2xl font-semibold text-green-400">
            {analyticsLoading ? 'Refreshing…' : `${activeProposals} Active / ${totalProposals} Total`}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Total voting power: {analyticsLoading ? '…' : `${formatNumber(totalVotingPower, 2)} SST`}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="glass-card p-5 space-y-3">
          <h2 className="text-xl font-semibold text-white">View Proposals</h2>
          <p className="text-sm text-slate-300">
            Inspect active and historical proposals, quorum results, and execution history.
          </p>
          <Link to="/business/governance/proposals" className="btn-brand w-fit">
            Browse Proposals
          </Link>
        </div>

        <div className={`glass-card p-5 space-y-3 ${!canCreate ? 'opacity-75' : ''}`}>
          <h2 className="text-xl font-semibold text-white">Create Proposal</h2>
          <p className="text-sm text-slate-300">
            Launch a new governance directive. Requires sufficient voting power.
          </p>
          <Link
            to="/business/governance/proposals/create"
            className={`btn-brand w-fit ${!canCreate ? 'pointer-events-none opacity-60' : ''}`}
          >
            {canCreate ? 'New Proposal' : 'Insufficient SST'}
          </Link>
          {!canCreate && (
            <p className="text-xs text-yellow-400">
              You need at least {formatNumber(displayThreshold, 2)} SST voting power to submit a proposal.
            </p>
          )}
        </div>
      </motion.div>
    </motion.section>
  )
}

