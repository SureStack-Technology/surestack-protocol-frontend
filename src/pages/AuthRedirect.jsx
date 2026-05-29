import AuthenticatedEntryRedirect from '@/components/auth/AuthenticatedEntryRedirect.jsx'
import { useClerkAuthDiagnostics } from '@/hooks/useClerkAuthDiagnostics.js'
import { AuthSessionShell } from '@/components/auth/AuthSessionShell.jsx'
import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

/**
 * OAuth / SSO completion landing — profile-aware redirect (dashboard vs onboarding).
 * Clerk forceRedirectUrl should always target this route.
 */
export default function AuthRedirectPage() {
  const { isLoaded, isSignedIn } = useAuth()

  useClerkAuthDiagnostics({ page: 'auth/redirect' })

  if (!isLoaded) {
    return (
      <AuthSessionShell
        message="Completing sign-in…"
        submessage="Syncing your Clerk session — not a SureStack API call yet."
      />
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-void px-4">
      <AuthenticatedEntryRedirect defaultPath="/dashboard" />
    </div>
  )
}
