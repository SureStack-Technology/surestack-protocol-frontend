/**
 * Development-only membership tier override for internal product testing.
 * Never applied when NODE_ENV is production.
 */

const ALLOWED_RAW = new Set([
  'EXPLORER',
  'EXPLORER_ACCESS',
  'INTELLIGENCE_PRO',
  'ALPHA_ACCESS',
  'STRATEGIC_ACCESS',
  'ENTERPRISE',
])

/** Maps DEV_FORCE_MEMBERSHIP_TIER values to persisted MembershipTier enum strings. */
const MEMBERSHIP_TIER_BY_ENV = {
  EXPLORER: 'EXPLORER_ACCESS',
  EXPLORER_ACCESS: 'EXPLORER_ACCESS',
  INTELLIGENCE_PRO: 'INTELLIGENCE_PRO',
  ALPHA_ACCESS: 'STRATEGIC_ACCESS',
  STRATEGIC_ACCESS: 'STRATEGIC_ACCESS',
  ENTERPRISE: 'STRATEGIC_ACCESS',
}

let overrideLogged = false
let invalidLogged = false

/**
 * @param {Record<string, unknown>|null|undefined} user
 * @returns {typeof user}
 */
export function applyDevMembershipOverride(user) {
  if (!user) return user
  if (process.env.NODE_ENV === 'production') return user
  if (process.env.NODE_ENV !== 'development') return user

  const raw = (process.env.DEV_FORCE_MEMBERSHIP_TIER || '').trim().toUpperCase()
  if (!raw) return user

  if (!ALLOWED_RAW.has(raw)) {
    if (!invalidLogged) {
      console.warn(`[devMembershipOverride] ignoring invalid DEV_FORCE_MEMBERSHIP_TIER="${raw}"`)
      invalidLogged = true
    }
    return user
  }

  const membershipTier = MEMBERSHIP_TIER_BY_ENV[raw]
  const next = { ...user, membershipTier, devMembershipOverrideActive: true }

  if (raw === 'ENTERPRISE') {
    next.institutionalIntent = true
    next.governanceAccessEligible = true
  }

  if (!overrideLogged) {
    console.log(`[devMembershipOverride] forcing tier ${membershipTier}`)
    overrideLogged = true
  }

  return next
}

export function devMembershipOverrideActive() {
  if (process.env.NODE_ENV !== 'development') return false
  const raw = (process.env.DEV_FORCE_MEMBERSHIP_TIER || '').trim().toUpperCase()
  return Boolean(raw && ALLOWED_RAW.has(raw))
}
