import { useState, useEffect, useCallback } from 'react'
import { useProposals } from "@shared/hooks"
import { useWeb3 } from '../../contexts/Web3Context'
import { useContracts } from '../../hooks/useContracts'
import { formatAddress, formatDate, formatNumber, formatEther } from '../../utils/formatters'
import { queryRecentEvents, withTimestamps } from '../../utils/events'
import { ExternalLink, Clock, CheckCircle, XCircle, Loader2, Filter, TrendingUp, Users, Target } from 'lucide-react'

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

const FILTER_OPTIONS = {
  ALL: 'all',
  ACTIVE: 'active',
  EXECUTED: 'executed',
  SUCCEEDED: 'succeeded',
  DEFEATED: 'defeated',
}

export default function GovernanceHistory() {
  console.log('✅ [GovernanceHistory] Component mounted')
  
  const { account, isConnected, provider } = useWeb3()
  
  let proposals = []
  let loading = false
  let error = null
  let fetchProposals = null
  try {
    const proposalsData = useProposals()
    proposals = proposalsData.proposals || []
    loading = proposalsData.loading || false
    error = proposalsData.error || null
    fetchProposals = proposalsData.fetchProposals || null
    console.log('✅ [GovernanceHistory] useProposals hook loaded, proposals:', proposals.length)
  } catch (err) {
    console.error('❌ [GovernanceHistory] Error loading useProposals:', err)
    proposals = []
    loading = false
    error = err.message
  }
  
  let daoGovernance = null
  try {
    const contracts = useContracts()
    daoGovernance = contracts.daoGovernance || null
    console.log('✅ [GovernanceHistory] useContracts hook loaded, daoGovernance:', daoGovernance ? 'available' : 'null')
  } catch (err) {
    console.error('❌ [GovernanceHistory] Error loading useContracts:', err)
    daoGovernance = null
  }
  const [filter, setFilter] = useState(FILTER_OPTIONS.ALL)
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [voteHistory, setVoteHistory] = useState({})
  const [stats, setStats] = useState({
    totalProposals: 0,
    executedProposals: 0,
    activeProposals: 0,
    totalVoters: 0,
    averageParticipation: 0,
  })

  // Fetch vote history for a proposal
  const fetchVoteHistoryForProposal = useCallback(async (proposalId) => {
    if (!isConnected || !daoGovernance || !provider || !proposalId) return []

    try {
      // Query VoteCast events for this proposal
      const filter = daoGovernance.filters.VoteCast(null, proposalId)
      const events = await queryRecentEvents(daoGovernance, filter, provider, 100000)

      const enrichedEvents = await withTimestamps(provider, events)

      return enrichedEvents.map((event) => {
        try {
          const parsed = daoGovernance.interface.parseLog(event)
          return {
            voter: parsed.args.voter,
            proposalId: parsed.args.proposalId.toString(),
            support: Number(parsed.args.support), // 0=Against, 1=For, 2=Abstain
            weight: formatEther(parsed.args.weight),
            reason: parsed.args.reason || '',
            timestamp: event.__timestamp,
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
          }
        } catch {
          return null
        }
      }).filter(v => v !== null)
    } catch (err) {
      console.error(`Error fetching vote history for proposal ${proposalId}:`, err)
      return []
    }
  }, [isConnected, daoGovernance, provider])

  // Calculate statistics
  useEffect(() => {
    if (!proposals || proposals.length === 0) {
      setStats({
        totalProposals: 0,
        executedProposals: 0,
        activeProposals: 0,
        totalVoters: 0,
        averageParticipation: 0,
      })
      return
    }

    const executed = proposals.filter(p => p.state === 7).length
    const active = proposals.filter(p => p.state === 1).length
    const succeeded = proposals.filter(p => p.state === 4).length

    // Calculate total voters (unique addresses that voted)
    const allVoters = new Set()
    proposals.forEach(proposal => {
      // This would need to be fetched from vote history
      // For now, we'll estimate based on vote counts
    })

    // Calculate average participation (simplified)
    const totalVotes = proposals.reduce((sum, p) => {
      const forVotes = Number(p.votes.forVotes) || 0
      const againstVotes = Number(p.votes.againstVotes) || 0
      const abstainVotes = Number(p.votes.abstainVotes) || 0
      return sum + forVotes + againstVotes + abstainVotes
    }, 0)

    const averageParticipation = proposals.length > 0 ? totalVotes / proposals.length : 0

    setStats({
      totalProposals: proposals.length,
      executedProposals: executed,
      activeProposals: active,
      succeededProposals: succeeded,
      totalVoters: allVoters.size || 0,
      averageParticipation,
    })
  }, [proposals])

  // Filter proposals based on selected filter
  const filteredProposals = proposals.filter(proposal => {
    switch (filter) {
      case FILTER_OPTIONS.ACTIVE:
        return proposal.state === 1
      case FILTER_OPTIONS.EXECUTED:
        return proposal.state === 7
      case FILTER_OPTIONS.SUCCEEDED:
        return proposal.state === 4
      case FILTER_OPTIONS.DEFEATED:
        return proposal.state === 3
      default:
        return true
    }
  })

  // Sort proposals by timestamp (newest first)
  const sortedProposals = [...filteredProposals].sort((a, b) => {
    return (b.timestamp || 0) - (a.timestamp || 0)
  })

  const getStateInfo = (state) => {
    return PROPOSAL_STATES[state] || PROPOSAL_STATES[0]
  }

  const handleViewDetails = async (proposal) => {
    setSelectedProposal(proposal)
    // Fetch vote history for this proposal
    const history = await fetchVoteHistoryForProposal(proposal.id)
    setVoteHistory(prev => ({ ...prev, [proposal.id]: history }))
  }

  if (loading && proposals.length === 0) {
    return (
      <div className="card-dark animate-fade-in">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-400">Loading governance history...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-dark animate-fade-in">
        <div className="flex items-center justify-center py-12">
          <XCircle className="h-8 w-8 text-red-500" />
          <span className="ml-3 text-red-400">Error: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Governance History</h2>
          <p className="text-gray-400 mt-1">Track executed proposals, voter participation, and quorum data</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card-dark">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Proposals</span>
            <Target className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalProposals}</div>
        </div>
        <div className="card-dark">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Executed</span>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.executedProposals}</div>
        </div>
        <div className="card-dark">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Active</span>
            <Clock className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{stats.activeProposals}</div>
        </div>
        <div className="card-dark">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Avg Participation</span>
            <TrendingUp className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {formatNumber(stats.averageParticipation, 2)} SST
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-700">
        {Object.entries(FILTER_OPTIONS).map(([key, value]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === value
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {key.charAt(0) + key.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Proposals List */}
      {sortedProposals.length === 0 ? (
        <div className="card-dark">
          <div className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Proposals Found</h3>
            <p className="text-gray-500 text-center max-w-md">
              {filter === FILTER_OPTIONS.ALL
                ? 'No proposals have been created yet.'
                : `No ${filter} proposals found.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedProposals.map((proposal) => {
            const stateInfo = getStateInfo(proposal.state)
            const isSelected = selectedProposal?.id === proposal.id
            const votes = voteHistory[proposal.id] || []
            const totalVotes = Number(proposal.votes.forVotes) + Number(proposal.votes.againstVotes) + Number(proposal.votes.abstainVotes)

            return (
              <div
                key={proposal.id}
                className={`card-dark hover:border-blue-500/50 transition-all duration-300 ${
                  isSelected ? 'border-blue-500' : ''
                }`}
              >
                {/* Proposal Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-gray-400">#{proposal.id}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${stateInfo.bg} ${stateInfo.color}`}>
                        {stateInfo.label}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                      {proposal.description || `Proposal #${proposal.id}`}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>Proposer: {formatAddress(proposal.proposer)}</span>
                      <span>•</span>
                      <span>{formatDate(proposal.timestamp)}</span>
                    </div>
                  </div>
                </div>

                {/* Vote Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                    <div className="text-xs text-gray-400 mb-1">For</div>
                    <div className="text-lg font-semibold text-green-400">
                      {formatNumber(proposal.votes.forVotes, 2)} SST
                    </div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    <div className="text-xs text-gray-400 mb-1">Against</div>
                    <div className="text-lg font-semibold text-red-400">
                      {formatNumber(proposal.votes.againstVotes, 2)} SST
                    </div>
                  </div>
                  <div className="bg-gray-500/10 rounded-lg p-3 border border-gray-500/20">
                    <div className="text-xs text-gray-400 mb-1">Abstain</div>
                    <div className="text-lg font-semibold text-gray-400">
                      {formatNumber(proposal.votes.abstainVotes, 2)} SST
                    </div>
                  </div>
                </div>

                {/* Voter Count */}
                {votes.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">
                        {votes.length} Voter{votes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Total Votes: {formatNumber(totalVotes, 2)} SST
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${proposal.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Etherscan
                    </a>
                  </div>
                  <button
                    onClick={() => handleViewDetails(proposal)}
                    className="btn-outline text-sm px-4 py-2"
                  >
                    {isSelected ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                {/* Expanded Details */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                    {/* Proposal Details */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Proposal Details</h4>
                      <div className="space-y-2 text-sm text-gray-400">
                        <div className="flex justify-between">
                          <span>Snapshot Block:</span>
                          <span className="text-white">{proposal.snapshot}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Deadline Block:</span>
                          <span className="text-white">{proposal.deadline}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Transaction Hash:</span>
                          <span className="text-white font-mono text-xs">{proposal.txHash}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vote History */}
                    {votes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Vote History</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {votes.map((vote, index) => (
                            <div
                              key={index}
                              className="p-3 bg-slate-800 rounded-lg border border-slate-700"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-white">
                                  {formatAddress(vote.voter)}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  vote.support === 1
                                    ? 'bg-green-500/20 text-green-400'
                                    : vote.support === 0
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {vote.support === 1 ? 'For' : vote.support === 0 ? 'Against' : 'Abstain'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400">
                                {formatNumber(vote.weight, 2)} SST • {formatDate(vote.timestamp)}
                              </div>
                              {vote.reason && (
                                <div className="mt-2 text-xs text-gray-500 italic">
                                  "{vote.reason}"
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

