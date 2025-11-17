import { motion } from 'framer-motion'
import EnterpriseBadge from '@/components/ui/EnterpriseBadge.jsx'
import ProposalForm from '@/components/governance/ProposalForm.jsx'
import { useGovernance } from '@/hooks/useGovernance'
import { formatNumber } from '@/utils/formatters'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'

export default function BusinessGovernanceCreateProposalPage() {
  const { votingPower = 0, proposalThreshold = 0, quorum = 0, loading } = useGovernance() ?? {}
  const {
    loading: analyticsLoading,
    error: analyticsError,
    governance: governanceStats,
  } = useProtocolAnalytics()

  const safeVotingPower = Number(votingPower ?? 0)
  const safeThreshold = Number(proposalThreshold ?? 0)
  const safeQuorum = Number(quorum ?? 0)

  const thresholdFallback = Number(governanceStats?.proposalThreshold ?? 0) / 1e18
  const quorumFallback = Number(governanceStats?.quorumRequirement ?? 0) / 1e18

  const displayThreshold = safeThreshold > 0 ? safeThreshold : thresholdFallback
  const displayQuorum = safeQuorum > 0 ? safeQuorum : quorumFallback

  const canCreate = displayThreshold > 0 && safeVotingPower >= displayThreshold

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
            Create Governance Proposal
          </h1>
          <EnterpriseBadge />
        </div>
        <div className="w-24 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.72)]">
          Draft a new governance action for the SureStack DAO. Ensure you have sufficient SST voting power before submitting.
        </p>
      </motion.header>

      {analyticsError && (
        <div className="glass-card p-4 border border-amber-400/30 bg-amber-500/10 text-amber-100 text-sm">
          Governance analytics are currently unavailable. Thresholds shown may be cached.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Your Voting Power</p>
          <p className="text-2xl font-semibold text-[var(--primary-cyan)]">
            {loading ? '—' : `${formatNumber(safeVotingPower, 2)} SST`}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Proposal Threshold</p>
          <p className="text-2xl font-semibold text-[var(--primary-blue)]">
            {analyticsLoading ? '…' : `${formatNumber(displayThreshold, 2)} SST`}
          </p>
          {!canCreate && (
            <p className="text-xs text-yellow-400 mt-2">
              You need more SST tokens to create a proposal.
            </p>
          )}
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Quorum Requirement</p>
          <p className="text-2xl font-semibold text-[var(--primary-cyan)]">
            {analyticsLoading ? '…' : `${formatNumber(displayQuorum, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-2">Participation needed for passage.</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        className={`glass-card p-5 space-y-4 ${!canCreate ? 'opacity-80' : ''}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Proposal Payload</h2>
          <span className="text-xs text-slate-400 uppercase tracking-[0.3em]">
            {canCreate ? 'Ready to submit' : 'Action disabled'}
          </span>
        </div>
        <ProposalForm votingPower={safeVotingPower} proposalThreshold={displayThreshold} />
      </motion.div>
    </motion.section>
  )
}

