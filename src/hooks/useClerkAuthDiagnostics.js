import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'

/**
 * Dev-safe Clerk session diagnostics — no tokens or publishable key material.
 */
export function useClerkAuthDiagnostics(extra = {}) {
  const { pathname } = useLocation()
  const { isLoaded, isSignedIn, userId } = useAuth()
  const prev = useRef(null)

  const extraKey = JSON.stringify(extra)

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const payload = {
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId: userId ? `${String(userId).slice(0, 8)}…` : null,
      pathname,
      ...extra,
    }
    const key = JSON.stringify(payload)
    if (prev.current === key) return
    prev.current = key
    console.log('[clerkAuth]', payload)
  }, [isLoaded, isSignedIn, userId, pathname, extraKey])
}
