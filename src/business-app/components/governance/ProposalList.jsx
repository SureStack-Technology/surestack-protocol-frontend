import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { formatAddress, formatDate, formatNumber } from '@/utils/formatters'

export default function ProposalList({
  proposals = [],
  loading = false,
  error = null,
  rateLimited = false,
}) {
  const safeProposals = Array.isArray(proposals) ? proposals : []

  if (loading && safeProposals.length === 0) {
    return <div className="animate-pulse text-slate-400 text-sm">Loading proposals…</div>
  }

  if (error && !rateLimited && safeProposals.length === 0) {
    return (
      <div className="glass-card border border-red-500/40 bg-red-500/10 text-red-200 p-4 text-sm">
        Error loading proposals: {String(error)}
      </div>
    )
  }

  if (!loading && safeProposals.length === 0) {
    return <div className="text-sm text-slate-300">No proposals yet.</div>
  }

  return (
    <div className="space-y-3">
      {error && !rateLimited && (
        <div className="glass-card border border-red-500/40 bg-red-500/10 text-red-200 p-3 text-sm">
          Error loading proposals: {String(error)}
        </div>
      )}
      <div className="grid gap-4">
        {safeProposals.map((proposal, index) => (
          <ProposalItem key={proposal?.id || index} proposal={proposal} />
        ))}
      </div>
    </div>
  )
}

function ProposalItem({ proposal = {} }) {
  const proposalId = proposal.id ?? '—'
  const state = proposal.state ?? 0
  const stateInfo = PROPOSAL_STATES[state] || PROPOSAL_STATES[0]
  const votes = proposal.votes || {}
  const deadline = proposal.deadline
    ? new Date(Number(proposal.deadline) * 1000)
    : null

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-slate-400">#{proposalId}</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${stateInfo.bg} ${stateInfo.color}`}
            >
              {stateInfo.label}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2 line-clamp-2">
            {proposal.description || `Proposal #${proposalId}`}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 uppercase tracking-[0.25em]">
            <span>Proposer: {formatAddress(proposal.proposer)}</span>
            <span>•</span>
            <span>{proposal.timestamp ? formatDate(proposal.timestamp) : '—'}</span>
          </div>
        </div>
        {proposal.txHash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${proposal.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            View Tx
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="For" value={`${formatNumber(votes.forVotes ?? 0, 2)} SST`} tone="text-green-400" />
        <StatCard
          label="Against"
          value={`${formatNumber(votes.againstVotes ?? 0, 2)} SST`}
          tone="text-red-400"
        />
        <StatCard
          label="Abstain"
          value={`${formatNumber(votes.abstainVotes ?? 0, 2)} SST`}
          tone="text-slate-300"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/60 pt-3">
        <span>
          Deadline:{' '}
          {deadline
            ? `${deadline.toLocaleDateString()} ${deadline.toLocaleTimeString()}`
            : '—'}
        </span>
        <Link
          to={`/business/governance/proposals/${proposalId}`}
          className="btn-brand text-xs px-3 py-1"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, tone }) {
  return (
    <div className="glass-panel p-4 border border-slate-700/60 bg-slate-900/40 space-y-1">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className={`text-base font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

const PROPOSAL_STATES = {
  0: { label: 'Pending', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  1: { label: 'Active', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  2: { label: 'Canceled', color: 'text-red-400', bg: 'bg-red-500/20' },
  3: { label: 'Defeated', color: 'text-red-500', bg: 'bg-red-600/20' },
  4: { label: 'Succeeded', color: 'text-green-400', bg: 'bg-green-500/20' },
  5: { label: 'Queued', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  6: { label: 'Expired', color: 'text-gray-500', bg: 'bg-gray-600/20' },
  7: { label: 'Executed', color: 'text-green-500', bg: 'bg-green-600/20' },
}

