import { useCallback, useEffect, useState } from 'react'
import { useAuthApi } from '@/hooks/useAuthApi.js'
import { hasIntelligenceProOrHigher } from '@/utils/dashboardPersonalization.js'

const POLL_MS = 120_000

async function parseJson(res) {
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

/**
 * Birdeye on-chain behavior intelligence via SureStack API only.
 * @param {{ profile?: { membershipTier?: string } | null, enabled?: boolean }} [opts]
 */
export function useBirdeyeIntel({ profile = null, enabled = true } = {}) {
  const { api, isAuthReady } = useAuthApi()
  const isPrime = hasIntelligenceProOrHigher(profile)

  const [watchlist, setWatchlist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLocked, setIsLocked] = useState(!isPrime)

  const loadWatchlist = useCallback(async () => {
    const { ok, status, body } = await parseJson(await api('/api/intelligence/birdeye/watchlist'))
    if (status === 402 || body?.error === 'tier_required') {
      setIsLocked(true)
      setWatchlist(null)
      return false
    }
    setIsLocked(false)
    if (ok && body?.success && body?.data) {
      setWatchlist(body.data)
      setError(null)
      return true
    }
    setError(body?.error || 'birdeye_watchlist_failed')
    return false
  }, [api])

  const refresh = useCallback(async () => {
    if (!enabled || !isAuthReady) return
    if (!isPrime) {
      setIsLocked(true)
      setWatchlist(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      await loadWatchlist()
    } catch (e) {
      setError(e?.message || 'birdeye_refresh_failed')
    } finally {
      setLoading(false)
    }
  }, [enabled, isAuthReady, isPrime, loadWatchlist])

  useEffect(() => {
    setIsLocked(!isPrime)
  }, [isPrime])

  useEffect(() => {
    if (!enabled || !isAuthReady) {
      setLoading(false)
      return undefined
    }
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [enabled, isAuthReady, refresh])

  const isUnavailable =
    watchlist?.status === 'unavailable' ||
    watchlist?.message?.includes('not configured')

  return {
    watchlist,
    assets: watchlist?.assets || [],
    loading,
    error,
    isLocked,
    isUnavailable,
    refresh,
  }
}
