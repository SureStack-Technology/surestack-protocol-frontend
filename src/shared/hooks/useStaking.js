import { useMemo, useCallback } from 'react'
import { usePocAnalytics } from '@shared/hooks/usePocAnalytics'

export function useStaking() {
  const { data } = usePocAnalytics()
  const pools = useMemo(() => data?.riskPools?.pools ?? [], [data])

  const fetchPools = useCallback(async () => pools, [pools])

  return { pools, loading: false, fetchPools }
}

export default useStaking
