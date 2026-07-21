import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireClerkAuth } from '../middleware/clerkAuth.js'
import { loadAuthUser } from '../services/authUser.js'
import { createPrimeCheckoutSession } from '../services/billing/primeCheckout.js'

const router = Router()

/**
 * @deprecated Paid Bronze/Silver/Gold Founders checkout is not part of launch strategy.
 * Founders Pass community credential: complete funnel + POST /api/membership/founding-member/claim (Clerk + verified wallet + team checks).
 * This route is retained only for backwards compatibility; clients should not call it.
 */
router.post('/founders/checkout-stub', (req, res) => {
  return res.status(410).json({
    deprecated: true,
    error: 'deprecated',
    message:
      'Paid Founders checkout is deprecated. Founders Pass is a limited early community credential — use /founders-pass and POST /api/membership/founding-member/claim after the full funnel is verified.',
  })
})

/**
 * POST /api/billing/prime/checkout
 * Creates a Stripe-hosted Checkout Session for Prime Intelligence (monthly Price ID from env).
 * Requires Clerk auth. Entitlement is granted only via Stripe webhooks — not via success redirect.
 */
router.post('/prime/checkout', requireClerkAuth, async (req, res) => {
  try {
    const user = await loadAuthUser(req.clerkUserId)
    if (!user) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Complete signup so your profile exists before checkout.',
      })
    }

    if (user.membershipTier === 'STRATEGIC_ACCESS') {
      return res.status(400).json({
        error: 'already_higher_tier',
        message: 'Your account already has Atlas Intelligence or higher access.',
      })
    }

    if (
      user.membershipTier === 'INTELLIGENCE_PRO' &&
      (user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'TRIALING') &&
      user.stripeSubscriptionId
    ) {
      return res.status(400).json({
        error: 'already_subscribed',
        message: 'Prime Intelligence is already active on this account.',
      })
    }

    // Fresh DB row for stripeCustomerId (loadAuthUser may include override fields)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    const { url, sessionId } = await createPrimeCheckoutSession(dbUser)
    if (!url) {
      return res.status(502).json({
        error: 'checkout_url_missing',
        message: 'Stripe did not return a Checkout URL.',
      })
    }

    return res.json({ ok: true, url, sessionId })
  } catch (e) {
    const code = e?.code || e?.message
    if (code === 'STRIPE_NOT_CONFIGURED' || code === 'stripe_not_configured') {
      return res.status(503).json({
        error: 'stripe_not_configured',
        message: 'Billing is not configured yet. Set STRIPE_SECRET_KEY on the API.',
      })
    }
    if (code === 'STRIPE_PRICE_NOT_CONFIGURED' || code === 'stripe_price_not_configured') {
      return res.status(503).json({
        error: 'stripe_price_not_configured',
        message: 'Prime Price ID is not configured. Set STRIPE_PRIME_PRICE_ID on the API.',
      })
    }
    console.error('[POST /billing/prime/checkout]', e)
    return res.status(500).json({
      error: 'checkout_failed',
      message: 'Could not start Prime checkout. Please try again.',
    })
  }
})

export default router
