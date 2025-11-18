import { useEffect, useState, useCallback } from 'react'
import { usePocAnalytics } from '@shared/hooks/usePocAnalytics'

export function useProposals() {
  const { data } = usePocAnalytics()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const mapFromPoc = useCallback(() => {
    try {
      const list = Array.isArray(data?.governance?.active) ? data.governance.active : []
      const formatted = list.map((proposal, index) => ({
        id: proposal?.id ?? String(index + 1),
        proposer: proposal?.proposer ?? '0x0000000000000000000000000000000000000000',
        description: proposal?.description ?? '',
        txHash: proposal?.txHash ?? null,
        state: proposal?.state ?? 1,
        timestamp: proposal?.timestamp ?? Date.now(),
        votes: proposal?.votes ?? { forVotes: '0', againstVotes: '0', abstainVotes: '0' },
      }))
      setProposals(formatted)
      setError(null)
    } catch (err) {
      console.error('❌ useProposals (POC):', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [data])

  useEffect(() => {
    setLoading(true)
    mapFromPoc()
  }, [mapFromPoc])

  return { proposals, loading, error, fetchProposals: mapFromPoc }
}

export default useProposals
