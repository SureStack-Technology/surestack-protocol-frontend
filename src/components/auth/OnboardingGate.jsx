import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useAuthApi } from '@/hooks/useAuthApi'
import { fetchAuthMeDeduped } from '@/lib/authMeClient.js'
import { profileRequiresOnboarding } from '@/utils/authRouting.js'
import { useAuthRouteDiagnostics } from '@/hooks/useAuthRouteDiagnostics.js'
import { AuthSessionShell, ProfileSyncShell } from '@/components/auth/AuthSessionShell.jsx'

/**
 * Console routes require onboardingCompleted === true on the server profile.
 * Wallet verification is recommended in-product — not a hard gate here.
 */
export default function OnboardingGate() {
  const location = useLocation()
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { api } = useAuthApi()
  const apiRef = useRef(api)
  apiRef.current = api
  const [state, setState] = useState({ loading: true, profile: null, error: null })

  const loadProfile = useCallback(async () => {
    if (!userId) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const { res, data } = await fetchAuthMeDeduped(apiRef.current, userId, { retries: 2 })
      setState({
        loading: false,
        profile: res.ok ? data : null,
        error: res.ok ? null : data?.error || `http_${res.status}`,
      })
    } catch (e) {
      setState({ loading: false, profile: null, error: e?.message || 'network' })
    }
  }, [userId])

  useEffect(() => {
    if (!isLoaded) {
      setState({ loading: true, profile: null, error: null })
      return
    }
    if (!isSignedIn || !userId) {
      setState({ loading: false, profile: null, error: null })
      return
    }
    loadProfile()
  }, [isLoaded, isSignedIn, userId, loadProfile])

  const redirectTarget = profileRequiresOnboarding(state.profile) ? '/onboarding' : null

  useAuthRouteDiagnostics('OnboardingGate', {
    profileLoading: state.loading,
    hasProfile: Boolean(state.profile),
    redirectTarget,
    profileError: state.error,
    onboardingCompleted: state.profile?.onboardingCompleted,
  })

  if (!isLoaded || (isSignedIn && state.loading)) {
    return <AuthSessionShell message="Syncing your SureStack profile…" />
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  if (!state.profile && state.error) {
    return <ProfileSyncShell errorCode={state.error} onRetry={loadProfile} />
  }

  if (profileRequiresOnboarding(state.profile)) {
    return <Navigate to="/onboarding" replace />
  }

  if (!state.profile) {
    return <ProfileSyncShell onRetry={loadProfile} />
  }

  return <Outlet />
}
