import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthApi } from '@/hooks/useAuthApi.js'
import { hasIntelligenceProOrHigher } from '@/utils/dashboardPersonalization.js'

const POLL_MS = 120_000
const SUBSCRIPTION_COOLDOWN_MS = 10 * 60 * 1000

async function parseJson(res) {
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

/**
 * LunarCrush intelligence via SureStack API only (no client API key).
 * @param {{ profile?: { membershipTier?: string } | null, enabled?: boolean }} [opts]
 */
export function useLunarCrushIntel({ profile = null, enabled = true } = {}) {
  const { api, isAuthReady } = useAuthApi()
  const isPrime = hasIntelligenceProOrHigher(profile)

  const [explorerSentiment, setExplorerSentiment] = useState(null)
  const [primeTrends, setPrimeTrends] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPrimeLocked, setIsPrimeLocked] = useState(!isPrime)
  const providerCooldownUntilRef = useRef(0)

  const noteProviderCooldown = useCallback((data) => {
    if (data?.providerStatus === 'subscription_required') {
      providerCooldownUntilRef.current = Date.now() + SUBSCRIPTION_COOLDOWN_MS
    }
  }, [])

  const isProviderCooldownActive = useCallback(
    () => Date.now() < providerCooldownUntilRef.current,
    [],
  )

  const loadExplorer = useCallback(async () => {
    if (isProviderCooldownActive()) return true
    const { ok, body } = await parseJson(await api('/api/intelligence/market/sentiment'))
    if (ok && body?.success && body?.data) {
      noteProviderCooldown(body.data)
      setExplorerSentiment(body.data)
      return true
    }
    setError(body?.error || 'sentiment_fetch_failed')
    return false
  }, [api, isProviderCooldownActive, noteProviderCooldown])

  const loadPrime = useCallback(async () => {
    if (isProviderCooldownActive()) return true
    const { ok, status, body } = await parseJson(await api('/api/intelligence/social/trends'))
    if (status === 402 || body?.error === 'tier_required') {
      setIsPrimeLocked(true)
      setPrimeTrends(null)
      return false
    }
    setIsPrimeLocked(false)
    if (ok && body?.success && body?.data) {
      noteProviderCooldown(body.data)
      setPrimeTrends(body.data)
      return true
    }
    if (!isPrime) {
      setIsPrimeLocked(true)
    }
    return false
  }, [api, isPrime, isProviderCooldownActive, noteProviderCooldown])

  const refresh = useCallback(async () => {
    if (!enabled || !isAuthReady) return
    setLoading(true)
    setError(null)
    try {
      await loadExplorer()
      if (isPrime) {
        await loadPrime()
      } else {
        setPrimeTrends(null)
        setIsPrimeLocked(true)
      }
    } catch (e) {
      setError(e?.message || 'lunarcrush_refresh_failed')
    } finally {
      setLoading(false)
    }
  }, [enabled, isAuthReady, isPrime, loadExplorer, loadPrime])

  useEffect(() => {
    setIsPrimeLocked(!isPrime)
  }, [isPrime])

  useEffect(() => {
    if (!enabled || !isAuthReady) {
      setLoading(false)
      return undefined
    }
    refresh()
    const id = setInterval(() => {
      if (Date.now() < providerCooldownUntilRef.current) return
      refresh()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [enabled, isAuthReady, refresh])

  return {
    explorerSentiment,
    primeTrends,
    isPrimeLocked,
    loading,
    error,
    refresh,
  }
}
