import { motion } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import EnterpriseBadge from '@/components/ui/EnterpriseBadge.jsx'
import { useProposals } from '@shared/hooks'
import { formatNumber, formatDate, formatAddress } from '@/utils/formatters'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'

export default function BusinessGovernanceProposalDetailPage() {
  const { proposalId } = useParams()
  const { proposals, loading, error } = useProposals()
  const {
    loading: analyticsLoading,
    error: analyticsError,
    governance: governanceStats,
  } = useProtocolAnalytics()

  const safeProposals = Array.isArray(proposals) ? proposals : []
  const proposal = safeProposals.find(
    (item) => String(item?.id ?? '') === String(proposalId ?? '')
  )

  const quorumRequirement = Number(governanceStats?.quorumRequirement ?? 0) / 1e18
  const proposalThreshold = Number(governanceStats?.proposalThreshold ?? 0) / 1e18
  const totalVotingPower = Number(governanceStats?.totalVotingPower ?? 0) / 1e18

  const rateLimited =
    error === 'rate_limit' ||
    (typeof error === 'string' && /too many requests|rate limit/i.test(error ?? ''))

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
            Proposal Details
          </h1>
          <EnterpriseBadge />
        </div>
        <div className="w-24 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.72)]">
          Inspect the full payload, quorum status, and voting breakdown for proposal #{proposalId}.
        </p>
      </motion.header>

      {analyticsError && (
        <div className="glass-card border border-amber-400/30 bg-amber-500/10 text-amber-100 p-4 text-sm">
          Governance analytics unavailable. Thresholds shown below may be cached.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Quorum Requirement"
          value={analyticsLoading ? '…' : `${formatNumber(quorumRequirement, 2)} SST`}
          subtitle="Minimum participation to finalise votes"
        />
        <SummaryCard
          title="Proposal Threshold"
          value={analyticsLoading ? '…' : `${formatNumber(proposalThreshold, 2)} SST`}
          subtitle="Voting power needed to submit proposals"
        />
        <SummaryCard
          title="Total Voting Power"
          value={analyticsLoading ? '…' : `${formatNumber(totalVotingPower, 2)} SST`}
          subtitle="Aggregate SST engaged in governance"
        />
      </div>

      {loading && (
        <div className="glass-card p-5 animate-pulse text-slate-400 text-sm">
          Loading proposal…
        </div>
      )}

      {!loading && rateLimited && (
        <div className="glass-card border border-amber-400/40 bg-amber-500/10 text-amber-100 p-3 text-xs rounded-lg">
          RPC rate-limit detected. Displaying cached proposal data.
        </div>
      )}

      {!loading && error && !rateLimited && (
        <div className="glass-card p-5 border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
          Unable to load proposal data: {String(error)}
        </div>
      )}

      {!loading && !proposal && (
        <div className="glass-card p-5 space-y-3 text-slate-300">
          <p className="font-semibold text-white">Proposal not found</p>
          <p className="text-sm text-slate-400">
            This proposal may not exist or data could not be retrieved. Return to the proposals list to view available items.
          </p>
          <Link to="/business/governance/proposals" className="btn-brand w-fit">
            Back to Proposals
          </Link>
        </div>
      )}

      {!loading && proposal && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">
                Proposal ID
              </p>
              <p className="text-lg font-semibold text-white">#{proposal.id}</p>
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-[0.3em]">
              Created {proposal.timestamp ? formatDate(proposal.timestamp) : '—'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <DetailStat label="Proposer" value={formatAddress(proposal.proposer)} />
            <DetailStat
              label="For Votes"
              value={`${formatNumber(proposal?.votes?.forVotes ?? 0, 2)} SST`}
              tone="text-green-400"
            />
            <DetailStat
              label="Against Votes"
              value={`${formatNumber(proposal?.votes?.againstVotes ?? 0, 2)} SST`}
              tone="text-red-400"
            />
          </div>

          <div className="glass-panel p-4 border border-slate-700/60 bg-slate-900/50 space-y-2">
            <h2 className="text-lg font-semibold text-white">Description</h2>
            <p className="text-sm text-slate-300 whitespace-pre-line">
              {proposal.description || 'No description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <Link
              to="/business/governance/proposals"
              className="btn-brand text-xs px-3 py-1"
            >
              Back to Proposals
            </Link>
          </div>
        </div>
      )}
    </motion.section>
  )
}

function DetailStat({ label, value, tone = 'text-slate-200' }) {
  return (
    <div className="glass-panel p-4 border border-slate-700/60 bg-slate-900/40 space-y-1">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className={`text-base font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

function SummaryCard({ title, value, subtitle }) {
  return (
    <div className="glass-panel p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">{title}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
    </div>
  )
}

