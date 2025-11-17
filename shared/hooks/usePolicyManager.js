import { useState, useEffect, useCallback } from 'react'
import { useContracts } from '../../src/hooks/useContracts'
import { formatEther } from '../../src/utils/formatters'
import mock from '../../data/mock-data.json'
import { useSimulation } from '../../src/contexts/SimulationContext'

export function usePolicyManager() {
  const { policyManager } = useContracts()
  const { simulationMode } = useSimulation()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPolicies = useCallback(async () => {
    try {
      if (simulationMode || !policyManager) {
        setPolicies(mock.riskPools || [])
        setLoading(false)
        return
      }

      const total = Number(await policyManager.totalPolicies())
      const arr = []

      for (let i = 0; i < total; i++) {
        const p = await policyManager.policies(i)
        arr.push({
          id: i,
          name: `Policy #${i}`,
          totalStaked: Number(formatEther(p.coverageLimit || 0)),
          rewards: Number(formatEther(p.premiumRate || 0)),
          validators: p.validators || 0,
        })
      }

      setPolicies(arr)
    } catch (e) {
      console.error('❌ usePolicyManager.fetchPolicies', e)
      setPolicies(mock.riskPools || [])
    } finally {
      setLoading(false)
    }
  }, [policyManager, simulationMode])

  useEffect(() => { fetchPolicies() }, [fetchPolicies])

  return { policies, loading, fetchPolicies }
}

export default usePolicyManager
