import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../contexts/Web3Context'
import { useContracts } from './useContracts'
import { formatEther } from '../utils/formatters'
import toast from 'react-hot-toast'

export const useGovernance = () => {
  const { account, isConnected, provider, signer } = useWeb3()
  const { daoGovernance, sureStackToken } = useContracts()
  const [votingPower, setVotingPower] = useState('0')
  const [delegatedTo, setDelegatedTo] = useState(null)
  const [proposalThreshold, setProposalThreshold] = useState('0')
  const [quorum, setQuorum] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch governance parameters
  const fetchGovernanceParams = useCallback(async () => {
    if (!isConnected || !daoGovernance || !provider) return

    try {
      setLoading(true)
      setError(null)

      const [threshold, currentQuorum] = await Promise.all([
        daoGovernance.proposalThreshold(),
        daoGovernance.quorum(await provider.getBlockNumber()),
      ])

      setProposalThreshold(formatEther(threshold))
      setQuorum(formatEther(currentQuorum))

      // Get voting power if account is connected
      if (account && sureStackToken) {
        try {
          const votes = await daoGovernance.getVotes(account)
          setVotingPower(formatEther(votes))

          // Check delegation
          const delegates = await sureStackToken.delegates(account)
          setDelegatedTo(delegates)
        } catch (err) {
          console.warn('Error fetching voting power:', err)
        }
      }
    } catch (err) {
      console.error('Error fetching governance params:', err)
      setError(err.message || 'Failed to fetch governance parameters')
    } finally {
      setLoading(false)
    }
  }, [isConnected, daoGovernance, provider, account, sureStackToken])

  // Delegate voting power
  const delegate = useCallback(async (toAddress) => {
    if (!isConnected || !sureStackToken || !account) {
      throw new Error('Please connect your wallet')
    }

    try {
      setLoading(true)
      toast.loading('Delegating voting power...', { id: 'delegate' })

      const tx = await sureStackToken.delegate(toAddress)
      await tx.wait()

      toast.success('Voting power delegated successfully!', { id: 'delegate' })
      await fetchGovernanceParams()
    } catch (err) {
      console.error('Error delegating:', err)
      toast.error(err.reason || err.message || 'Failed to delegate', { id: 'delegate' })
      throw err
    } finally {
      setLoading(false)
    }
  }, [isConnected, sureStackToken, account, fetchGovernanceParams])

  // Auto-fetch on mount and account change
  useEffect(() => {
    if (isConnected && daoGovernance) {
      fetchGovernanceParams()
      const interval = setInterval(fetchGovernanceParams, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [isConnected, daoGovernance, fetchGovernanceParams])

  return {
    votingPower,
    delegatedTo,
    proposalThreshold,
    quorum,
    loading,
    error,
    delegate,
    fetchGovernanceParams,
  }
}




















