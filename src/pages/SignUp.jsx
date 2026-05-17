import { SignUp } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import Logo from '@/components/ui/Logo.jsx'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'
import ClerkAuthPageGate from '@/components/auth/ClerkAuthPageGate.jsx'
import ClerkAuthTroubleshoot from '@/components/auth/ClerkAuthTroubleshoot.jsx'
import { CLERK_AUTH_REDIRECT_PATH } from '@/utils/clerkEnv.js'

export default function SignUpPage() {
  return (
    <PublicMarketingShell>
      <PublicMarketingHeader />
      <main className="flex-1 flex flex-col items-center px-4 py-12 md:py-14 relative z-10">
        <Link
          to="/"
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <Logo className="h-8" />
          <span className="font-heading text-lg text-white">SureStack</span>
        </Link>
        <ClerkAuthPageGate page="sign-up">
          <SignUpClerkForm />
        </ClerkAuthPageGate>
      </main>
    </PublicMarketingShell>
  )
}

function SignUpClerkForm() {
  return (
    <>
      <div className="public-clerk-shell w-full max-w-[440px]">
        <p className="text-center text-[10px] uppercase tracking-[0.35em] text-emerald-400/80 mb-1">
          Explorer Access
        </p>
        <p className="text-center text-xs text-slate-400 mb-4">Email signup · Clerk-secured sessions</p>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl={CLERK_AUTH_REDIRECT_PATH}
          fallbackRedirectUrl={CLERK_AUTH_REDIRECT_PATH}
          signInForceRedirectUrl={CLERK_AUTH_REDIRECT_PATH}
        />
      </div>
      <ClerkAuthTroubleshoot />
    </>
  )
}
