import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useAuthApi } from '@/hooks/useAuthApi'
import { fetchAuthMeDeduped } from '@/lib/authMeClient.js'
import { resolveAuthenticatedPath } from '@/utils/authRouting.js'
import { useAuthRouteDiagnostics } from '@/hooks/useAuthRouteDiagnostics.js'
import { AuthSessionShell, ProfileSyncShell } from '@/components/auth/AuthSessionShell.jsx'

/**
 * When Clerk session exists on /sign-in or /sign-up, resolve the correct destination
 * from GET /api/auth/me instead of blind Navigate to /dashboard or /onboarding.
 */
export default function AuthenticatedEntryRedirect({ defaultPath = '/dashboard' }) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { api } = useAuthApi()
  const [state, setState] = useState({ phase: 'idle', target: null, error: null })

  const loadProfile = useCallback(async () => {
    if (!userId) return
    setState({ phase: 'loading', target: null, error: null })
    try {
      const { res, data } = await fetchAuthMeDeduped(api, userId, { retries: 2 })
      const target = res.ok ? resolveAuthenticatedPath(data) || defaultPath : null
      if (res.ok && target) {
        setState({ phase: 'ready', target, error: null })
        return
      }
      setState({
        phase: 'error',
        target: null,
        error: data?.error || `http_${res.status}`,
      })
    } catch (e) {
      setState({ phase: 'error', target: null, error: e?.message || 'network' })
    }
  }, [api, userId, defaultPath])

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      setState({ phase: 'idle', target: null, error: null })
      return
    }
    loadProfile()
  }, [isLoaded, isSignedIn, userId, loadProfile])

  useAuthRouteDiagnostics('AuthenticatedEntryRedirect', {
    profileLoading: state.phase === 'loading',
    hasProfile: state.phase === 'ready',
    redirectTarget: state.target,
    profileError: state.error,
  })

  if (!isLoaded) {
    return <AuthSessionShell message="Loading session…" />
  }

  if (!isSignedIn) {
    return null
  }

  if (state.phase === 'loading' || state.phase === 'idle') {
    return <AuthSessionShell message="Syncing your SureStack profile…" />
  }

  if (state.phase === 'error') {
    return (
      <ProfileSyncShell
        errorCode={state.error}
        onRetry={loadProfile}
        hint="SureStack API profile sync — separate from Clerk CAPTCHA/OAuth. If Clerk failed to load, return to Sign in and check the troubleshooting note."
      />
    )
  }

  if (state.target) {
    return <Navigate to={state.target} replace />
  }

  return <Navigate to={defaultPath} replace />
}
