import { makeRequireClerkAuth } from './clerkAuth.js'
import { devMembershipOverrideActive } from '../lib/devMembershipOverride.js'

/**
 * Development-only: allow Prime routes without Bearer when DEV_FORCE_MEMBERSHIP_TIER is set.
 * Signed-in Clerk sessions still use normal JWT verification.
 */
export function makePrimeAuthWithDevBypass(opts = {}) {
  const requireClerk = makeRequireClerkAuth(opts)

  return async function primeAuthWithDevBypass(req, res, next) {
    const header = req.headers.authorization || ''
    const hasBearer = header.startsWith('Bearer ') && header.slice(7).trim()

    if (
      !hasBearer &&
      process.env.NODE_ENV === 'development' &&
      devMembershipOverrideActive()
    ) {
      req.clerkUserId = req.clerkUserId || 'dev_prime_intel'
      req.devPrimeAuthBypass = true
      return next()
    }

    return requireClerk(req, res, next)
  }
}

/**
 * @param {import('../services/authUser.js').loadAuthUser} loadAuthUser
 */
export async function loadPrimeUserForRequest(req, loadAuthUser) {
  if (req.devPrimeAuthBypass) {
    const tier =
      (process.env.DEV_FORCE_MEMBERSHIP_TIER || 'INTELLIGENCE_PRO').trim().toUpperCase() ===
      'STRATEGIC_ACCESS'
        ? 'STRATEGIC_ACCESS'
        : 'INTELLIGENCE_PRO'
    return { id: 'dev', clerkId: 'dev_prime_intel', membershipTier: tier }
  }
  return loadAuthUser(req.clerkUserId)
}
