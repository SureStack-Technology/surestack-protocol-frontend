import { useState, useEffect, useCallback } from 'react'
import { useContracts } from './useContracts'
import { useWeb3 } from '../contexts/Web3Context'
import { formatEther } from 'ethers'

export function useVoting(proposalId) {
  const { daoGovernance } = useContracts()
  const { account, provider, isConnected } = useWeb3()
  const [votes, setVotes] = useState({ forVotes: '0', againstVotes: '0', abstainVotes: '0' })
  const [deadline, setDeadline] = useState({ start: null, end: null })
  const [loading, setLoading] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [voteChoice, setVoteChoice] = useState(null)
  const [votingPower, setVotingPower] = useState('0')
  const [error, setError] = useState(null)

  // Fetch votes + block timestamps
  const fetchVoteStats = useCallback(async () => {
    if (!daoGovernance || !proposalId || !provider) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      console.log('🔍 [useVoting] Fetching vote stats for proposal:', proposalId)

      // Get proposal data directly from proposals() mapping
      const proposal = await daoGovernance.proposals(proposalId)

      const forVotes = formatEther(proposal.forVotes || 0n)
      const againstVotes = formatEther(proposal.againstVotes || 0n)
      const abstainVotes = formatEther(proposal.abstainVotes || 0n)

      const startBlock = Number(proposal.startBlock)
      const endBlock = Number(proposal.endBlock)

      // 🕒 Convert block numbers → timestamps
      const [startBlockData, endBlockData] = await Promise.all([
        provider.getBlock(startBlock),
        provider.getBlock(endBlock),
      ])

      const startDate = new Date(startBlockData.timestamp * 1000)
      const endDate = new Date(endBlockData.timestamp * 1000)

      setVotes({ forVotes, againstVotes, abstainVotes })
      setDeadline({
        start: startDate.toLocaleString(),
        end: endDate.toLocaleString(),
      })

      // Check if user has voted
      if (account) {
        try {
          const voted = await daoGovernance.hasVoted(proposalId, account)
          setHasVoted(voted)
          
          if (voted) {
            const voteReceipt = await daoGovernance.getVote(proposalId, account)
            setVoteChoice(Number(voteReceipt.support)) // 0=Against, 1=For, 2=Abstain
          }

          // Get voting power at proposal snapshot
          const votes = await daoGovernance.getVotes(account, startBlock)
          setVotingPower(formatEther(votes))
        } catch (err) {
          console.warn('⚠️ [useVoting] Error checking vote status:', err)
        }
      }

      console.log('✅ [useVoting] Vote stats loaded:', { forVotes, againstVotes, abstainVotes })
    } catch (err) {
      console.error('❌ [useVoting] Failed to fetch voting stats:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [daoGovernance, provider, proposalId, account])

  // Cast a vote
  const castVote = useCallback(
    async (support, reason = '') => {
      if (!daoGovernance || !account || !proposalId) {
        throw new Error('Please connect your wallet')
      }

      try {
        setLoading(true)
        console.log('🔍 [useVoting] Casting vote:', { proposalId, support, reason })

        let tx
        if (reason) {
          tx = await daoGovernance.castVoteWithReason(proposalId, support, reason, { gasLimit: 500_000 })
        } else {
          tx = await daoGovernance.castVote(proposalId, support, { gasLimit: 500_000 })
        }

        console.log('📝 [useVoting] Transaction sent:', tx.hash)
        const receipt = await tx.wait()
        console.log('✅ Vote cast successfully:', receipt.blockNumber)

        // Refresh vote stats
        await fetchVoteStats()

        return { txHash: tx.hash }
      } catch (err) {
        console.error('❌ [useVoting] Error casting vote:', err)
        setError(err.reason || err.message || 'Failed to cast vote')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [daoGovernance, account, proposalId, fetchVoteStats]
  )

  useEffect(() => {
    if (isConnected && daoGovernance && proposalId) {
      fetchVoteStats()
      // Refresh every 15 seconds
      const interval = setInterval(fetchVoteStats, 15000)
      return () => clearInterval(interval)
    }
  }, [isConnected, daoGovernance, proposalId, fetchVoteStats])

  // Listen for VoteCast events
  useEffect(() => {
    if (!daoGovernance || !proposalId) return

    console.log('👂 [useVoting] Listening for VoteCast events...')

    const filter = daoGovernance.filters.VoteCast(null, proposalId)
    
    const listener = (voter, proposalIdArg, support, weight, reason, event) => {
      console.log('🆕 [useVoting] VoteCast event detected:', {
        voter,
        proposalId: proposalIdArg.toString(),
        support: Number(support),
      })
      
      // Refresh vote stats when a vote is cast
      fetchVoteStats()
    }

    daoGovernance.on(filter, listener)
    return () => daoGovernance.off(filter, listener)
  }, [daoGovernance, proposalId, fetchVoteStats])

  return { 
    votes, 
    deadline, 
    loading, 
    error,
    hasVoted,
    voteChoice,
    votingPower,
    castVote,
    fetchVoteStats,
  }
}

// Vote types: 0=Against, 1=For, 2=Abstain
export const VOTE_TYPES = {
  AGAINST: 0,
  FOR: 1,
  ABSTAIN: 2,
}

export default useVoting
