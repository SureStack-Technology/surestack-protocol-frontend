import { useEffect, useState } from 'react'
import { getBackendBaseUrl } from '@shared/services/validatorApi'

const DEFAULT_POLL_MS = 90_000

/**
 * BTC / ETH / total cap snapshot for Explorer Market Pulse (via backend CoinGecko proxy).
 */
export function useExplorerMacroMarket({ pollMs = DEFAULT_POLL_MS } = {}) {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const base = getBackendBaseUrl()
        const url = `${base || ''}/api/market/macro`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.message || errBody.error || `http_${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) setState({ loading: false, data: json, error: null })
      } catch (e) {
        if (!cancelled) {
          setState((prev) => ({
            loading: false,
            data: prev.data,
            error: e?.message || 'macro_fetch_failed',
          }))
        }
      }
    }

    load()
    const id = setInterval(load, pollMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [pollMs])

  return state
}
