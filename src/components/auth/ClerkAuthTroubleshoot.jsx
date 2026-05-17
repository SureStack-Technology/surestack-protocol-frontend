import { getClerkOriginWarnings } from '@/utils/clerkEnv.js'

/**
 * User guidance when Clerk CAPTCHA / OAuth widgets fail to load.
 * This is a Clerk/browser issue — not SureStack API or wallet verification.
 */
export default function ClerkAuthTroubleshoot() {
  const originWarnings = getClerkOriginWarnings()

  return (
    <aside
      className="mt-5 rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3.5 text-left text-xs text-amber-100/95 leading-relaxed max-w-[440px] w-full"
      role="note"
      aria-label="Clerk sign-in troubleshooting"
    >
      <p className="font-semibold text-amber-200/95 mb-1.5">Clerk sign-in not loading?</p>
      <p className="text-amber-100/85 mb-2">
        If you see &ldquo;CAPTCHA failed to load&rdquo; or OAuth buttons stay blank, this is a{' '}
        <strong className="text-amber-50">Clerk / browser</strong> issue — not a SureStack backend or wallet error.
      </p>
      <ul className="list-disc pl-4 space-y-1 text-amber-100/80">
        <li>Disable ad blockers and privacy extensions for this site (uBlock, Brave Shields, etc.).</li>
        <li>Allow third-party scripts and cookies for Clerk (<code className="text-amber-200/90">clerk.com</code>,{' '}
          <code className="text-amber-200/90">challenges.cloudflare.com</code>).</li>
        <li>Try Chrome Incognito with extensions disabled, or another browser.</li>
        <li>
          Use <code className="text-amber-200/90">http://localhost:3000</code> for local dev (not https on localhost).
        </li>
      </ul>
      {originWarnings.length > 0 ? (
        <ul className="mt-2 list-disc pl-4 space-y-1 text-amber-200/80 border-t border-amber-500/20 pt-2">
          {originWarnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  )
}
