import { useCallback, useEffect, useState } from 'react'

/**
 * Authenticated Wallet Risk Index (Ethereum mainnet MVP).
 * @param {(path: string, options?: RequestInit) => Promise<Response>} api
 * @param {string | null} walletKey — e.g. `${address}-${verifiedAtISO}` or null when not verified
 */
export function useWalletRiskIndex(api, walletKey) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchIndex = useCallback(async () => {
    if (!walletKey) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await api('/api/wallet/risk-index')
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(j)
        setData(null)
      } else {
        setData(j)
        setError(null)
      }
    } catch {
      setError({ error: 'network' })
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [api, walletKey])

  useEffect(() => {
    fetchIndex()
  }, [fetchIndex])

  return { data, loading, error, refetch: fetchIndex }
}

export { walletExposureStateLabel as walletRiskBandLabel } from '@/utils/primeIntelligenceFormat.js'
