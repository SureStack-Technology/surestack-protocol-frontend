import { useEffect, useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { ADDR } from '../constants/addresses'
import stakingAbi from '../abi/ConsensusAndStaking.json'
import { formatEther } from 'ethers'
import mock from '../../data/mock-data.json'
import { useSimulation } from '../../src/contexts/SimulationContext'

export function useStaking() {
  const { simulationMode } = useSimulation()
  const [pools, setPools] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPools = useCallback(async () => {
    try {
      if (simulationMode) {
        setPools(mock.riskPools || [])
        setLoading(false)
        return
      }

      const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC)
      const staking = new ethers.Contract(ADDR.STAKING, stakingAbi.abi, provider)

      const totalPools = await staking.totalPools()
      const allPools = await Promise.all(
        [...Array(Number(totalPools))].map((_, i) => staking.pools(i))
      )

      const formatted = allPools.map((p, i) => ({
        id: i,
        name: `Pool #${i + 1}`,
        totalStaked: Number(formatEther(p.totalStaked)),
        rewards: Number(formatEther(p.rewards)),
        validators: Number(p.validators || 0),
      }))
      setPools(formatted)
    } catch (e) {
      console.error('❌ useStaking:', e)
      // Fallback to mock data on error
      if (!simulationMode) {
        setPools(mock.riskPools || [])
      }
    } finally {
      setLoading(false)
    }
  }, [simulationMode])

  useEffect(() => { fetchPools() }, [fetchPools])

  return { pools, loading, fetchPools }
}

export default useStaking
