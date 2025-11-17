import { useState, useEffect } from 'react'
import { useVoting, VOTE_TYPES, useGovernance } from "@shared/hooks"
import { formatNumber } from '../../utils/formatters'
import { ThumbsUp, ThumbsDown, Minus, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function VotingInterface({ proposalId }) {
  console.log('✅ [VotingInterface] Component mounted, proposalId:', proposalId)
  
  const { votes, deadline, loading, error, hasVoted, voteChoice, votingPower, castVote } = useVoting(proposalId)
  const { quorum } = useGovernance()
  
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleVote = async (support) => {
    if (!proposalId) {
      toast.error('Proposal ID is required')
      return
    }

    if (hasVoted) {
      toast.error('You have already voted on this proposal')
      return
    }

    if (Number(votingPower) === 0) {
      toast.error('You have no voting power')
      return
    }

    if (!castVote) {
      toast.error('Voting not available')
      return
    }

    try {
      setIsSubmitting(true)
      toast.loading('Casting vote...', { id: 'cast-vote' })
      
      // Cast vote directly (support: 1=For, 0=Against, 2=Abstain)
      await castVote(support, reason || undefined)
      
      const voteType = support === VOTE_TYPES.FOR ? 'For' : support === VOTE_TYPES.AGAINST ? 'Against' : 'Abstain'
      toast.success(`Vote cast: ${voteType}`, { id: 'cast-vote' })
      setReason('')
    } catch (err) {
      console.error('Error casting vote:', err)
      toast.error(err.reason || err.message || 'Failed to cast vote', { id: 'cast-vote' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getVoteLabel = (choice) => {
    switch (choice) {
      case VOTE_TYPES.FOR:
        return 'For'
      case VOTE_TYPES.AGAINST:
        return 'Against'
      case VOTE_TYPES.ABSTAIN:
        return 'Abstain'
      default:
        return 'No Vote'
    }
  }

  const getVoteColor = (choice) => {
    switch (choice) {
      case VOTE_TYPES.FOR:
        return 'text-green-400 bg-green-500/20 border-green-500/30'
      case VOTE_TYPES.AGAINST:
        return 'text-red-400 bg-red-500/20 border-red-500/30'
      case VOTE_TYPES.ABSTAIN:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const totalVotes = Number(votes.forVotes) + Number(votes.againstVotes) + Number(votes.abstainVotes)
  const forPercent = totalVotes > 0 ? (Number(votes.forVotes) / totalVotes) * 100 : 0
  const againstPercent = totalVotes > 0 ? (Number(votes.againstVotes) / totalVotes) * 100 : 0
  const abstainPercent = totalVotes > 0 ? (Number(votes.abstainVotes) / totalVotes) * 100 : 0

  if (loading && !hasVoted) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Loading vote status...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Voting Deadlines */}
      {deadline && deadline.start && deadline.end && (
        <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
          <div className="text-sm text-gray-400 mb-2">Voting Period</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Start:</span>
              <span className="text-white">{deadline.start}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">End:</span>
              <span className="text-white font-medium">{deadline.end}</span>
            </div>
          </div>
        </div>
      )}

      {/* Voting Power Display */}
      <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Your Voting Power</span>
          <span className="text-lg font-semibold text-blue-400">
            {formatNumber(votingPower, 2)} SST
          </span>
        </div>
        {hasVoted && (
          <div className="mt-2 pt-2 border-t border-blue-500/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Your Vote</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getVoteColor(voteChoice)}`}>
                {getVoteLabel(voteChoice)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Vote Status */}
      {hasVoted ? (
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">You have already voted on this proposal</span>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">You haven't voted yet</span>
          </div>
        </div>
      )}

      {/* Voting Buttons */}
      {!hasVoted && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleVote(VOTE_TYPES.FOR)}
              disabled={isSubmitting || Number(votingPower) === 0}
              className="flex flex-col items-center justify-center p-4 bg-green-500/20 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ThumbsUp className="h-6 w-6 text-green-400 mb-2" />
              <span className="text-sm font-medium text-green-400">For</span>
            </button>
            <button
              onClick={() => handleVote(VOTE_TYPES.AGAINST)}
              disabled={isSubmitting || Number(votingPower) === 0}
              className="flex flex-col items-center justify-center p-4 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ThumbsDown className="h-6 w-6 text-red-400 mb-2" />
              <span className="text-sm font-medium text-red-400">Against</span>
            </button>
            <button
              onClick={() => handleVote(VOTE_TYPES.ABSTAIN)}
              disabled={isSubmitting || Number(votingPower) === 0}
              className="flex flex-col items-center justify-center p-4 bg-gray-500/20 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="h-6 w-6 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-400">Abstain</span>
            </button>
          </div>

          {/* Reason Input (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain your vote..."
              rows={2}
              className="input-field"
              disabled={isSubmitting}
            />
          </div>

          {isSubmitting && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
              <span className="text-sm text-gray-400">Submitting vote...</span>
            </div>
          )}
        </div>
      )}

      {/* Vote Results */}
      <div className="space-y-3 pt-4 border-t border-slate-700">
        <h4 className="text-sm font-semibold text-gray-300">Vote Results</h4>
        
        <div className="space-y-2">
          {/* For Votes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">For</span>
              <span className="text-sm font-medium text-green-400">
                {formatNumber(votes.forVotes, 2)} SST ({forPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${forPercent}%` }}
              />
            </div>
          </div>

          {/* Against Votes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">Against</span>
              <span className="text-sm font-medium text-red-400">
                {formatNumber(votes.againstVotes, 2)} SST ({againstPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${againstPercent}%` }}
              />
            </div>
          </div>

          {/* Abstain Votes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">Abstain</span>
              <span className="text-sm font-medium text-gray-400">
                {formatNumber(votes.abstainVotes, 2)} SST ({abstainPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-500 transition-all duration-500"
                style={{ width: `${abstainPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Votes */}
        <div className="pt-2 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Total Votes</span>
            <span className="text-sm font-semibold text-white">
              {formatNumber(totalVotes, 2)} SST
            </span>
          </div>
          {quorum && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500">Quorum Required</span>
              <span className="text-xs text-gray-400">
                {formatNumber(quorum, 2)} SST
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

