/**
 * Map Stripe subscription status → Prisma SubscriptionStatus + whether paid Prime applies.
 */

/** @typedef {'NONE'|'ACTIVE'|'PAST_DUE'|'CANCELED'|'TRIALING'} AppSubscriptionStatus */

/**
 * @param {string|null|undefined} stripeStatus
 * @returns {{ subscriptionStatus: AppSubscriptionStatus, grantsPrime: boolean }}
 */
export function mapStripeSubscriptionStatus(stripeStatus) {
  const s = String(stripeStatus || '').toLowerCase()
  switch (s) {
    case 'active':
      return { subscriptionStatus: 'ACTIVE', grantsPrime: true }
    case 'trialing':
      return { subscriptionStatus: 'TRIALING', grantsPrime: true }
    case 'past_due':
      return { subscriptionStatus: 'PAST_DUE', grantsPrime: false }
    case 'canceled':
    case 'cancelled':
      return { subscriptionStatus: 'CANCELED', grantsPrime: false }
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return { subscriptionStatus: 'CANCELED', grantsPrime: false }
    default:
      return { subscriptionStatus: 'NONE', grantsPrime: false }
  }
}

/**
 * Tier rank for upgrade/downgrade safety.
 * STRATEGIC_ACCESS (Atlas) is higher than paid Prime — never overwrite via Stripe.
 */
export const TIER_RANK = {
  EXPLORER_ACCESS: 0,
  INTELLIGENCE_PRO: 1,
  STRATEGIC_ACCESS: 2,
}

/**
 * @param {string|null|undefined} currentTier
 * @param {boolean} grantsPrime
 * @returns {string|undefined} new membershipTier, or undefined to leave unchanged
 */
export function resolveMembershipTierAfterStripe({ currentTier, grantsPrime }) {
  const tier = currentTier || 'EXPLORER_ACCESS'
  const rank = TIER_RANK[tier] ?? 0

  if (grantsPrime) {
    // Never overwrite Atlas / higher manual tiers
    if (rank >= TIER_RANK.STRATEGIC_ACCESS) return undefined
    if (tier === 'INTELLIGENCE_PRO') return undefined
    return 'INTELLIGENCE_PRO'
  }

  // Revoke paid Prime only — leave Atlas alone; leave Explorer alone
  if (tier === 'INTELLIGENCE_PRO') return 'EXPLORER_ACCESS'
  return undefined
}
