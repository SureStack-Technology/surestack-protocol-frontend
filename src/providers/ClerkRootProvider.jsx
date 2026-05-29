import { ClerkProvider } from '@clerk/clerk-react'
import {
  getClerkAuthRedirectUrl,
  getClerkOriginWarnings,
  getClerkPublishableKey,
  DEV_APP_ORIGIN,
} from '@/utils/clerkEnv.js'

export default function ClerkRootProvider({ children }) {
  const publishableKey = getClerkPublishableKey()
  const authRedirectUrl = getClerkAuthRedirectUrl()

  if (import.meta.env.DEV) {
    console.log('[clerk] configured', {
      hasPublishableKey: Boolean(publishableKey),
      keyPrefix: publishableKey ? `${publishableKey.slice(0, 12)}…` : null,
      source: 'VITE_CLERK_PUBLISHABLE_KEY',
      expectedDevOrigin: DEV_APP_ORIGIN,
      authRedirectUrl,
      originWarnings: getClerkOriginWarnings(),
    })
  }

  if (!publishableKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void text-risk px-6 text-center max-w-lg mx-auto">
        <div>
          <p className="font-heading text-lg text-neon mb-2">Clerk is not configured</p>
          <p className="text-sm text-slate-400">
            Set <code className="text-cyan-300">VITE_CLERK_PUBLISHABLE_KEY</code> in{' '}
            <code className="text-cyan-300">.env.local</code> to enable authentication.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signUpForceRedirectUrl={authRedirectUrl}
      signUpFallbackRedirectUrl={authRedirectUrl}
      signInForceRedirectUrl={authRedirectUrl}
      signInFallbackRedirectUrl={authRedirectUrl}
      appearance={{
        variables: {
          colorPrimary: '#7c3aed',
          colorBackground: 'transparent',
          colorInputBackground: '#0f172a',
          colorInputText: '#f8fafc',
          colorText: '#f9fafb',
          colorTextSecondary: '#cbd5e1',
          colorNeutral: '#94a3b8',
          borderRadius: '0.75rem',
          fontFamily: 'inherit',
        },
        elements: {
          rootBox: 'w-full',
          card: 'bg-transparent border-0 shadow-none p-0 m-0',
          headerTitle: 'text-white font-heading uppercase tracking-[0.14em]',
          headerSubtitle: 'text-slate-400',
          socialButtonsBlockButton:
            'bg-slate-950 border border-slate-600/90 text-white hover:bg-slate-900 shadow-sm',
          socialButtonsBlockButtonText: 'font-medium',
          formFieldLabel: 'text-slate-100 text-sm font-medium',
          formFieldInput:
            'bg-slate-950 border border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/60',
          formButtonPrimary:
            'bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-[0_8px_28px_rgba(124,58,237,0.35)] border-0',
          footerActionText: 'text-slate-400',
          footerActionLink: 'text-violet-400 hover:text-violet-300 font-medium',
          identityPreviewText: 'text-white',
          formFieldInputShowPasswordButton: 'text-slate-300 hover:text-white',
          alternateBlock: 'border-t border-white/10',
          dividerLine: 'bg-white/10',
        },
      }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  )
}
