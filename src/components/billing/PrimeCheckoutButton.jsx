import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Loader2 } from 'lucide-react'
import { useAuthApi } from '@/hooks/useAuthApi'

/**
 * Starts Stripe-hosted Checkout for Prime Intelligence Early Access.
 * Entitlement is granted only via Stripe webhooks — not this redirect alone.
 */
export default function PrimeCheckoutButton({ className = '', label = 'Start Prime Early Access' }) {
  const { isSignedIn } = useAuth()
  const { api } = useAuthApi()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const startCheckout = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api('/api/billing/prime/checkout', { method: 'POST', body: {} })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) {
          navigate('/sign-in?redirect_url=/pricing')
          return
        }
        setError(data.message || data.error || 'Could not start checkout')
        return
      }
      if (!data.url) {
        setError('Checkout URL missing from server response')
        return
      }
      window.location.assign(data.url)
    } catch (e) {
      setError(e?.friendlyMessage || e?.message || 'Network error starting checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2 w-full">
      <SignedOut>
        <Link
          to="/sign-in?redirect_url=/pricing"
          className={className || 'public-cta-secondary inline-flex items-center justify-center gap-2 w-full'}
        >
          Sign in for Prime Early Access
        </Link>
      </SignedOut>
      <SignedIn>
        <button
          type="button"
          disabled={loading || !isSignedIn}
          onClick={startCheckout}
          className={
            className ||
            'public-cta-secondary inline-flex items-center justify-center gap-2 w-full disabled:opacity-60'
          }
        >
          {loading ? <Loader2 className="animate-spin shrink-0" size={15} /> : null}
          {loading ? 'Redirecting to Stripe…' : label}
        </button>
      </SignedIn>
      {error ? (
        <p className="text-xs text-rose-300/95 text-center" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
