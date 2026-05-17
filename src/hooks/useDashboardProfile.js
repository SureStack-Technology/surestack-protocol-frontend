import { createContext, useCallback, useContext, useEffect, useRef, useState, createElement } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useAuthApi } from '@/hooks/useAuthApi'
import { fetchAuthMeDeduped } from '@/lib/authMeClient.js'

export const DashboardProfileContext = createContext(undefined)

/**
 * Single source of truth for GET /api/auth/me (per layout tree).
 * Use only inside {@link DashboardProfileProvider}.
 */
export function useDashboardProfile() {
  const ctx = useContext(DashboardProfileContext)
  if (ctx === undefined) {
    throw new Error(
      'useDashboardProfile must be used within <DashboardProfileProvider> (wrap the layout shell).'
    )
  }
  return ctx
}

/**
 * Standalone profile fetch (e.g. RiskTicker outside {@link DashboardProfileProvider}).
 * Prefer wrapping the layout with the provider when possible.
 */
export function useDashboardProfileState() {
  const { isLoaded, userId } = useAuth()
  const { api } = useAuthApi()
  const apiRef = useRef(api)
  apiRef.current = api

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /**
   * Background refresh — does NOT toggle `loading` so Explorer tier layout stays stable
   * (see isExplorerAcquisitionTier: avoid flipping UI during wallet verify + refetch).
   */
  const refetchProfile = useCallback(async () => {
    if (!isLoaded || !userId) {
      setLoading(false)
      setProfile(null)
      setError(null)
      return null
    }
    setError(null)
    try {
      const { res, data } = await fetchAuthMeDeduped(apiRef.current, userId)
      if (res.ok) {
        setProfile(data)
        setError(null)
        return data
      }
      setProfile(null)
      setError(data?.error || `http_${res.status}`)
      return null
    } catch (e) {
      setProfile(null)
      setError(e?.message || 'fetch_failed')
      return null
    }
  }, [isLoaded, userId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isLoaded || !userId) {
        setLoading(false)
        setProfile(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const { res, data } = await fetchAuthMeDeduped(apiRef.current, userId)
        if (!cancelled) {
          if (res.ok) {
            setProfile(data)
            setError(null)
          } else {
            setProfile(null)
            setError(data?.error || `http_${res.status}`)
          }
        }
      } catch (e) {
        if (!cancelled) {
          setProfile(null)
          setError(e?.message || 'fetch_failed')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLoaded, userId])

  return { profile, loading, error, refetchProfile }
}

export function DashboardProfileProvider({ children }) {
  const value = useDashboardProfileState()
  return createElement(DashboardProfileContext.Provider, { value }, children)
}
