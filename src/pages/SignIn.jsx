import { SignIn } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import Logo from '@/components/ui/Logo.jsx'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'
import ClerkAuthPageGate from '@/components/auth/ClerkAuthPageGate.jsx'
import ClerkAuthTroubleshoot from '@/components/auth/ClerkAuthTroubleshoot.jsx'
import { CLERK_AUTH_REDIRECT_PATH } from '@/utils/clerkEnv.js'

export default function SignInPage() {
  return (
    <PublicMarketingShell>
      <PublicMarketingHeader />
      <main className="flex-1 flex flex-col items-center px-4 py-12 md:py-16 relative z-10">
        <Link
          to="/"
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <Logo className="h-8" />
          <span className="font-heading text-lg text-white">SureStack</span>
        </Link>
        <ClerkAuthPageGate page="sign-in">
          <SignInClerkForm />
        </ClerkAuthPageGate>
      </main>
    </PublicMarketingShell>
  )
}

function SignInClerkForm() {
  return (
    <>
      <div className="public-clerk-shell w-full max-w-[420px]">
        <p className="text-center text-[10px] uppercase tracking-[0.35em] text-slate-500 mb-2">Secure sign in</p>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl={CLERK_AUTH_REDIRECT_PATH}
          fallbackRedirectUrl={CLERK_AUTH_REDIRECT_PATH}
        />
      </div>
      <ClerkAuthTroubleshoot />
    </>
  )
}
