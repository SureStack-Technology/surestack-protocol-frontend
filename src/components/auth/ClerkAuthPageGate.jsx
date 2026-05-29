import { Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { CLERK_AUTH_REDIRECT_PATH } from '@/utils/clerkEnv.js'
import { useClerkAuthDiagnostics } from '@/hooks/useClerkAuthDiagnostics.js'
import { AuthSessionShell } from '@/components/auth/AuthSessionShell.jsx'

/**
 * Ensures signed-in users never see Clerk SignIn/SignUp forms (CAPTCHA/OAuth widgets).
 * OAuth and email flows should complete at /auth/redirect for profile-aware routing.
 */
export default function ClerkAuthPageGate({ children, page = 'auth' }) {
  const { isLoaded, isSignedIn } = useAuth()

  useClerkAuthDiagnostics({ page, gate: 'ClerkAuthPageGate' })

  if (!isLoaded) {
    return (
      <AuthSessionShell
        message="Loading secure sign-in…"
        submessage="Clerk authentication — not SureStack API."
      />
    )
  }

  if (isSignedIn) {
    return <Navigate to={CLERK_AUTH_REDIRECT_PATH} replace />
  }

  return children
}
