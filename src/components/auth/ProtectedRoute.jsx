import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useAuthRouteDiagnostics } from '@/hooks/useAuthRouteDiagnostics.js'
import { AuthSessionShell } from '@/components/auth/AuthSessionShell.jsx'

/** Requires Clerk session — use as layout route (`element={<ProtectedRoute />}`). */
export default function ProtectedRoute() {
  const location = useLocation()
  const { isLoaded, isSignedIn, userId } = useAuth()

  useAuthRouteDiagnostics('ProtectedRoute', {
    isSignedIn: Boolean(isSignedIn),
    userId: userId ? `${String(userId).slice(0, 8)}…` : null,
    redirectTarget: isLoaded && !isSignedIn ? '/sign-in' : null,
  })

  if (!isLoaded) {
    return <AuthSessionShell message="Loading session…" />
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
