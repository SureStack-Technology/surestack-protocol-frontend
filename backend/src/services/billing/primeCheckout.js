import { prisma } from '../../lib/prisma.js'
import { getFrontendUrl, getPrimePriceId, getStripe } from './stripeClient.js'
import {
  mapStripeSubscriptionStatus,
  resolveMembershipTierAfterStripe,
} from './stripeEntitlements.js'

/**
 * Ensure Stripe Customer exists and is saved on User.
 * @param {{ id: string; email: string; stripeCustomerId?: string|null; clerkId: string }} user
 */
export async function ensureStripeCustomer(user) {
  const stripe = getStripe()

  if (user.stripeCustomerId) {
    try {
      await stripe.customers.retrieve(user.stripeCustomerId)
      return user.stripeCustomerId
    } catch (e) {
      console.warn('[stripe] stored customer missing, recreating', e?.message)
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: {
      surestackUserId: user.id,
      clerkId: user.clerkId,
    },
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}

/**
 * Create a Stripe Checkout Session for Prime Intelligence monthly subscription.
 * @param {{ id: string; email: string; stripeCustomerId?: string|null; clerkId: string; membershipTier: string }} user
 */
export async function createPrimeCheckoutSession(user) {
  const stripe = getStripe()
  const priceId = getPrimePriceId()
  const frontendUrl = getFrontendUrl()
  const customerId = await ensureStripeCustomer(user)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${frontendUrl}/billing/prime/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/billing/prime/cancel`,
    metadata: {
      surestackUserId: user.id,
      clerkId: user.clerkId,
      product: 'prime_intelligence',
    },
    subscription_data: {
      metadata: {
        surestackUserId: user.id,
        clerkId: user.clerkId,
        product: 'prime_intelligence',
      },
    },
    allow_promotion_codes: true,
  })

  return { url: session.url, sessionId: session.id }
}

/**
 * Apply subscription state to a User row (idempotent per call).
 * @param {{
 *   userId?: string|null
 *   stripeCustomerId?: string|null
 *   stripeSubscriptionId?: string|null
 *   stripeStatus?: string|null
 * }} params
 */
export async function applySubscriptionEntitlement({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  stripeStatus,
}) {
  const { subscriptionStatus, grantsPrime } = mapStripeSubscriptionStatus(stripeStatus)

  let user = null
  if (userId) {
    user = await prisma.user.findUnique({ where: { id: userId } })
  }
  if (!user && stripeCustomerId) {
    user = await prisma.user.findFirst({ where: { stripeCustomerId } })
  }
  if (!user && stripeSubscriptionId) {
    user = await prisma.user.findFirst({ where: { stripeSubscriptionId } })
  }

  if (!user) {
    console.warn('[stripe] entitlement: user not found', {
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
    })
    return { ok: false, reason: 'user_not_found' }
  }

  const nextTier = resolveMembershipTierAfterStripe({
    currentTier: user.membershipTier,
    grantsPrime,
  })

  const data = {
    subscriptionStatus,
  }
  if (stripeCustomerId && !user.stripeCustomerId) {
    data.stripeCustomerId = stripeCustomerId
  }
  if (stripeSubscriptionId) {
    data.stripeSubscriptionId = stripeSubscriptionId
  }
  if (nextTier) {
    data.membershipTier = nextTier
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  })

  console.log('[stripe] entitlement applied', {
    userId: user.id,
    subscriptionStatus,
    grantsPrime,
    membershipTier: updated.membershipTier,
    previousTier: user.membershipTier,
  })

  return { ok: true, user: updated, grantsPrime }
}
