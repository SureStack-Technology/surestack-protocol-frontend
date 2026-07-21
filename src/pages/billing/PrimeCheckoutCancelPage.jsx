import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'

/**
 * Stripe Checkout cancel landing.
 */
export default function PrimeCheckoutCancelPage() {
  return (
    <PublicMarketingShell>
      <PublicMarketingHeader current="intelligence" />
      <main className="max-w-lg mx-auto px-5 pb-32 pt-20 relative z-10">
        <div className="public-premium-card p-8 space-y-5 text-center">
          <h1 className="text-2xl font-heading text-white tracking-tight">Checkout canceled</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            No charge was made. You can restart Prime Early Access anytime from Pricing, or continue with free
            Explorer Access.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/pricing" className="public-cta-primary inline-flex items-center justify-center gap-2">
              Back to pricing <ArrowRight size={15} />
            </Link>
            <Link to="/dashboard" className="public-cta-secondary inline-flex items-center justify-center gap-2">
              Explorer console
            </Link>
          </div>
        </div>
      </main>
    </PublicMarketingShell>
  )
}
