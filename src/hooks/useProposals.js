import { useState, useEffect, useCallback } from 'react'
import { useContracts } from './useContracts'
import { useWeb3 } from '../contexts/Web3Context'
import { formatEther } from '../utils/formatters'
import toast from 'react-hot-toast'

export function useProposals() {
  const { daoGovernance } = useContracts()
  const { isConnected, account, provider, signer } = useWeb3()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProposals = useCallback(async () => {
    try {
      console.log('🔍 [useProposals] Fetching proposals from DAO...')

      if (!daoGovernance || !provider) {
        console.warn('⚠️ [useProposals] DAO contract or provider not loaded yet')
        setLoading(false)
        return
      }

      // Query ProposalCreated events using the filter
      const filter = daoGovernance.filters.ProposalCreated()
      const events = await daoGovernance.queryFilter(filter, 0, 'latest')
      console.log('🧾 [useProposals] Found proposals:', events.length)

      const formatted = await Promise.all(
        events.map(async (e) => {
          try {
            const parsed = daoGovernance.interface.parseLog(e)
            const id = parsed.args.proposalId.toString()
            
            // Get proposal state and votes
            const [state, proposalVotes] = await Promise.all([
              daoGovernance.state(id).catch(() => 0),
              daoGovernance.proposalVotes(id).catch(() => ({
                againstVotes: 0n,
                forVotes: 0n,
                abstainVotes: 0n,
              })),
            ])

            const block = await provider.getBlock(e.blockNumber).catch(() => ({ timestamp: Date.now() / 1000 }))

            return {
              id,
              proposer: parsed.args.proposer,
              targets: parsed.args.targets || [],
              values: parsed.args.values || [],
              calldatas: parsed.args.calldatas || [],
              description: parsed.args.description || '',
              descriptionHash: parsed.args.descriptionHash,
              txHash: e.transactionHash,
              state: Number(state),
              timestamp: Number(block.timestamp) * 1000,
              votes: {
                forVotes: formatEther(proposalVotes.forVotes || 0n),
                againstVotes: formatEther(proposalVotes.againstVotes || 0n),
                abstainVotes: formatEther(proposalVotes.abstainVotes || 0n),
              },
            }
          } catch (err) {
            console.error('❌ [useProposals] Error processing event:', err)
            return null
          }
        })
      )

      // Filter out null results and sort by ID (newest first)
      const validProposals = formatted
        .filter(p => p !== null)
        .sort((a, b) => Number(b.id) - Number(a.id))

      setProposals(validProposals)
      console.log('✅ [useProposals] Loaded proposals:', validProposals.length)
    } catch (err) {
      console.error('❌ [useProposals] Error fetching proposals:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [daoGovernance, provider])

  // Create a new proposal
  const createProposal = useCallback(async (targets, values, calldatas, description) => {
    if (!isConnected || !daoGovernance || !account || !signer) {
      throw new Error('Please connect your wallet')
    }

    try {
      setLoading(true)
      console.log('🔍 [useProposals] Creating proposal:', { targets, values, calldatas, description })

      toast.loading('Creating proposal...', { id: 'create-proposal' })

      const tx = await daoGovernance.propose(targets, values, calldatas, description, {
        gasLimit: 2_000_000,
      })
      console.log('📝 [useProposals] Transaction sent:', tx.hash)

      const receipt = await tx.wait()
      console.log('✅ [useProposals] Proposal created in block:', receipt.blockNumber)

      // Find ProposalCreated event
      const proposalCreatedEvent = receipt.logs.find(
        log => {
          try {
            const parsed = daoGovernance.interface.parseLog(log)
            return parsed && parsed.name === 'ProposalCreated'
          } catch {
            return false
          }
        }
      )

      let proposalId = null
      if (proposalCreatedEvent) {
        const parsed = daoGovernance.interface.parseLog(proposalCreatedEvent)
        proposalId = parsed.args.proposalId.toString()
        console.log('✅ [useProposals] Proposal ID:', proposalId)
      }

      toast.success(`Proposal created! ID: ${proposalId || 'N/A'}`, { id: 'create-proposal' })

      // Refresh proposals list
      await fetchProposals()

      return { proposalId, txHash: tx.hash }
    } catch (err) {
      console.error('❌ [useProposals] Error creating proposal:', err)
      toast.error(err.reason || err.message || 'Failed to create proposal', { id: 'create-proposal' })
      throw err
    } finally {
      setLoading(false)
    }
  }, [isConnected, daoGovernance, account, signer, fetchProposals])

  /**
   * 🕒 Queue a proposal once it has Succeeded
   */
  const queueProposal = useCallback(async (proposalId, targets, values, calldatas, descriptionHash) => {
    if (!isConnected || !daoGovernance || !account) {
      throw new Error('Please connect your wallet')
    }

    try {
      setLoading(true)
      console.log(`📦 [DAO] Queueing proposal ${proposalId}...`)
      toast.loading('Queueing proposal...', { id: 'queue-proposal' })

      // If parameters not provided, fetch from proposal
      let finalTargets = targets
      let finalValues = values
      let finalCalldatas = calldatas
      let finalDescriptionHash = descriptionHash

      if (!finalTargets || !finalValues || !finalCalldatas || !finalDescriptionHash) {
        const proposal = proposals.find(p => p.id === proposalId.toString())
        if (!proposal) {
          throw new Error('Proposal not found. Please provide all parameters.')
        }
        finalTargets = proposal.targets
        finalValues = proposal.values
        finalCalldatas = proposal.calldatas
        finalDescriptionHash = proposal.descriptionHash
      }

      const tx = await daoGovernance.queue(finalTargets, finalValues, finalCalldatas, finalDescriptionHash, {
        gasLimit: 500_000,
      })
      await tx.wait()

      console.log(`✅ [DAO] Proposal ${proposalId} queued successfully.`)
      toast.success('Proposal queued successfully!', { id: 'queue-proposal' })
      await fetchProposals()
    } catch (err) {
      console.error('❌ [DAO] Error queueing proposal:', err)
      toast.error(err.reason || err.message || 'Failed to queue proposal', { id: 'queue-proposal' })
      throw err
    } finally {
      setLoading(false)
    }
  }, [isConnected, daoGovernance, account, proposals, fetchProposals])

  /**
   * 🚀 Execute a queued proposal through the Timelock
   */
  const executeProposal = useCallback(async (proposalId, targets, values, calldatas, descriptionHash) => {
    if (!isConnected || !daoGovernance || !account) {
      throw new Error('Please connect your wallet')
    }

    try {
      setLoading(true)
      console.log(`🚀 [DAO] Executing proposal ${proposalId}...`)
      toast.loading('Executing proposal...', { id: 'execute-proposal' })

      // If parameters not provided, fetch from proposal
      let finalTargets = targets
      let finalValues = values
      let finalCalldatas = calldatas
      let finalDescriptionHash = descriptionHash

      if (!finalTargets || !finalValues || !finalCalldatas || !finalDescriptionHash) {
        const proposal = proposals.find(p => p.id === proposalId.toString())
        if (!proposal) {
          throw new Error('Proposal not found. Please provide all parameters.')
        }
        finalTargets = proposal.targets
        finalValues = proposal.values
        finalCalldatas = proposal.calldatas
        finalDescriptionHash = proposal.descriptionHash
      }

      const tx = await daoGovernance.execute(finalTargets, finalValues, finalCalldatas, finalDescriptionHash, {
        gasLimit: 1_000_000,
      })
      await tx.wait()

      console.log(`✅ [DAO] Proposal ${proposalId} executed successfully.`)
      toast.success('Proposal executed successfully!', { id: 'execute-proposal' })
      await fetchProposals()
    } catch (err) {
      console.error('❌ [DAO] Error executing proposal:', err)
      toast.error(err.reason || err.message || 'Failed to execute proposal', { id: 'execute-proposal' })
      throw err
    } finally {
      setLoading(false)
    }
  }, [isConnected, daoGovernance, account, proposals, fetchProposals])

  // Fetch proposals when connected
  useEffect(() => {
    if (isConnected && daoGovernance) {
      fetchProposals()
    }
  }, [isConnected, daoGovernance, fetchProposals])

  // Live event listener for new proposals
  useEffect(() => {
    if (!daoGovernance) return

    console.log('👂 [useProposals] Listening for ProposalCreated events...')

    const filter = daoGovernance.filters.ProposalCreated()
    
    const listener = (proposalId, proposer, targets, values, signatures, calldatas, startBlock, endBlock, description, event) => {
      console.log('🆕 [useProposals] New Proposal Detected:', description)
      
      // Add new proposal to the list immediately
      setProposals(prev => [
        {
          id: proposalId.toString(),
          proposer,
          targets: targets || [],
          values: values || [],
          calldatas: calldatas || [],
          description: description || '',
          txHash: event.transactionHash,
          state: 0, // Pending
          timestamp: Date.now(),
          votes: { forVotes: '0', againstVotes: '0', abstainVotes: '0' },
        },
        ...prev, // Add to beginning (newest first)
      ])
      
      // Refresh to get full details
      setTimeout(() => fetchProposals(), 2000)
    }

    daoGovernance.on(filter, listener)
    return () => daoGovernance.off(filter, listener)
  }, [daoGovernance, fetchProposals])

  return { proposals, loading, error, fetchProposals, createProposal, queueProposal, executeProposal }
}

export default useProposals
