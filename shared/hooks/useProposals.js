import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { ADDR } from '../constants/addresses'
import daoAbi from '../abi/DAOGovernance.json'
import mock from '../../data/mock-data.json'
import { useSimulation } from '../../src/contexts/SimulationContext'

export function useProposals() {
  const { simulationMode } = useSimulation()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProposals = useCallback(async () => {
    try {
      if (simulationMode) {
        setProposals(mock.proposals || [])
        setLoading(false)
        return
      }

      const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC)
      const dao = new ethers.Contract(ADDR.DAO, daoAbi.abi, provider)

      const events = await dao.queryFilter(dao.filters.ProposalCreated(), 9580000, 'latest')
      const formatted = await Promise.all(events.map(async (e) => {
        const id = e.args.proposalId.toString()
        const state = await dao.state(id).catch(() => 0)
        const block = await e.getBlock()
        return {
          id,
          proposer: e.args.proposer,
          description: e.args.description,
          txHash: e.transactionHash,
          state: Number(state),
          timestamp: block.timestamp * 1000,
          votes: { forVotes: '0', againstVotes: '0', abstainVotes: '0' },
        }
      }))
      setProposals(formatted.reverse())
    } catch (err) {
      console.error('❌ useProposals:', err)
      setError(err.message)
      // Fallback to mock data on error
      if (!simulationMode) {
        setProposals(mock.proposals || [])
      }
    } finally {
      setLoading(false)
    }
  }, [simulationMode])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  return { proposals, loading, error, fetchProposals }
}

export default useProposals
