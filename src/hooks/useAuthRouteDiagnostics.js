import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'

/**
 * Dev-safe auth routing diagnostics (no tokens / secrets).
 * @param {string} scope
 * @param {Record<string, unknown>} extra
 */
export function useAuthRouteDiagnostics(scope, extra = {}) {
  const { pathname } = useLocation()
  const { isLoaded, isSignedIn, userId } = useAuth()
  const prev = useRef(null)

  const extraKey = JSON.stringify(extra)

  useEffect(() => {
    const payload = {
      scope,
      pathname,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId: userId ? `${String(userId).slice(0, 8)}…` : null,
      ...extra,
    }
    const key = JSON.stringify(payload)
    if (prev.current === key) return
    prev.current = key
    console.log('[authRoute]', payload)
  }, [scope, pathname, isLoaded, isSignedIn, userId, extraKey])
}
