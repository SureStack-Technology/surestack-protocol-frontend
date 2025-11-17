import { useEffect, useState } from 'react'
import { useContracts } from '@/hooks/useContracts'
import { useSimulation } from '@/contexts/SimulationContext'
import mock from '@/data/mock-data.json'

export function useGovernance() {
  const { daoGovernance } = useContracts()
  const { simulationMode } = useSimulation()
  const [params, setParams] = useState({})

  useEffect(() => {
    async function fetchParams() {
      try {
        if (simulationMode || !daoGovernance) {
          setParams(mock.governanceParams || {})
          return
        }

        const delay = await daoGovernance.votingDelay()
        const period = await daoGovernance.votingPeriod()
        const threshold = await daoGovernance.proposalThreshold()
        const provider = daoGovernance.provider
        const blockNumber = await provider.getBlockNumber()
        const quorum = await daoGovernance.quorum(blockNumber)

        setParams({
          votingDelay: delay.toString(),
          votingPeriod: period.toString(),
          proposalThreshold: threshold.toString(),
          quorum: quorum.toString(),
        })
      } catch (e) {
        console.error('useGovernance.fetchParams', e)
        setParams(mock.governanceParams || {})
      }
    }
    fetchParams()
  }, [daoGovernance, simulationMode])

  return params
}

