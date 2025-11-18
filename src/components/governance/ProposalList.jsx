import { formatAddress, formatDate, formatNumber } from '../../utils/formatters'
import { ExternalLink } from 'lucide-react'

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

export default function ProposalList({ proposals }) {
  const safeProposals = Array.isArray(proposals) ? proposals : []

  if (safeProposals.length === 0) {
    return (
      <div className="glass-card p-6 text-slate-300">
        <p>No proposals found.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {safeProposals.map((proposal, index) => (
        <ProposalItem key={proposal?.id || index} proposal={proposal} />
      ))}
    </div>
  )
}

function ProposalItem({ proposal = {} }) {
  const stateInfo = PROPOSAL_STATES[proposal.state] || PROPOSAL_STATES[0]
  const votes = proposal.votes || {}
  const forVotes = formatNumber(votes.forVotes ?? 0, 2)
  const againstVotes = formatNumber(votes.againstVotes ?? 0, 2)
  const abstainVotes = formatNumber(votes.abstainVotes ?? 0, 2)
  const deadline = proposal.deadline
    ? new Date(Number(proposal.deadline) * 1000)
    : null
  const createdAt = proposal.timestamp ? formatDate(proposal.timestamp) : '—'

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-slate-400">
              #{proposal.id ?? '—'}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${stateInfo.bg} ${stateInfo.color}`}
            >
              {stateInfo.label}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
            {proposal.description || `Proposal #${proposal.id ?? '—'}`}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 uppercase tracking-[0.2em]">
            <span>Proposer: {formatAddress(proposal.proposer)}</span>
            <span>•</span>
            <span>{createdAt}</span>
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
        <VoteStat label="For" value={forVotes} className="text-green-400" />
        <VoteStat label="Against" value={againstVotes} className="text-red-400" />
        <VoteStat label="Abstain" value={abstainVotes} className="text-slate-300" />
      </div>

      {deadline && (
        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/60 pt-3">
          <span>Voting Deadline</span>
          <span>
            {deadline.toLocaleDateString()} {deadline.toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  )
}

function VoteStat({ label, value, className }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">
        {label}
      </p>
      <p className={`text-lg font-semibold ${className}`}>{value} SST</p>
    </div>
  )
}

