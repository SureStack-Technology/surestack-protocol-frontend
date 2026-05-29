/**
 * Membership tier helpers — source of truth is User.membershipTier (Postgres).
 */

export function isExplorerTier(user) {
  return String(user?.membershipTier || '') === 'EXPLORER_ACCESS'
}

export function hasIntelligenceProOrHigher(user) {
  const tier = user?.membershipTier
  return tier === 'INTELLIGENCE_PRO' || tier === 'STRATEGIC_ACCESS'
}

export function hasStrategicAccess(user) {
  return user?.membershipTier === 'STRATEGIC_ACCESS'
}

/**
 * @param {Record<string, unknown>|null|undefined} user
 * @param {'explorer'|'prime'|'atlas'} tier
 * @returns {{ ok: true } | { ok: false, status: number, error: string, requiredTier?: string }}
 */
export function requireTier(user, tier) {
  if (!user) {
    return { ok: false, status: 404, error: 'user_not_found' }
  }

  if (tier === 'explorer') {
    return { ok: true }
  }

  if (tier === 'prime') {
    if (hasIntelligenceProOrHigher(user)) return { ok: true }
    return {
      ok: false,
      status: 402,
      error: 'tier_required',
      requiredTier: 'INTELLIGENCE_PRO',
    }
  }

  if (tier === 'atlas') {
    if (hasStrategicAccess(user)) return { ok: true }
    return {
      ok: false,
      status: 402,
      error: 'tier_required',
      requiredTier: 'STRATEGIC_ACCESS',
    }
  }

  return { ok: false, status: 400, error: 'invalid_tier_gate' }
}
