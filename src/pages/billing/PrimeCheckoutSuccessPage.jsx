import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'

/**
 * Stripe Checkout success landing.
 * Access is activated by Stripe webhooks — this page is confirmation UX only.
 */
export default function PrimeCheckoutSuccessPage() {
  return (
    <PublicMarketingShell>
      <PublicMarketingHeader current="intelligence" />
      <main className="max-w-lg mx-auto px-5 pb-32 pt-20 relative z-10">
        <div className="public-premium-card p-8 space-y-5 text-center">
          <CheckCircle2 className="mx-auto text-emerald-400" size={40} />
          <h1 className="text-2xl font-heading text-white tracking-tight">Payment received</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Thanks for subscribing to Prime Intelligence Early Access. Your account is activated by our billing
            webhook — usually within a few seconds. Refresh your console if Prime features are not visible yet.
          </p>
          <p className="text-[11px] text-slate-500">
            This page alone does not grant access. Entitlement is confirmed server-side after Stripe notifies us.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/dashboard" className="public-cta-primary inline-flex items-center justify-center gap-2">
              Open console <ArrowRight size={15} />
            </Link>
            <Link to="/membership" className="public-cta-secondary inline-flex items-center justify-center gap-2">
              Membership
            </Link>
          </div>
        </div>
      </main>
    </PublicMarketingShell>
  )
}
