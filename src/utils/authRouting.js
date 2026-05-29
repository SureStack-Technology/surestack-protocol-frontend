/**
 * Post-Clerk navigation — single source of truth for where signed-in users should land.
 */

/**
 * @param {import('@/hooks/useDashboardProfile').DashboardProfile | null | undefined} profile
 * @param {{ pathname?: string }} [opts]
 * @returns {'/onboarding' | '/dashboard' | null}
 */
export function resolveAuthenticatedPath(profile, opts = {}) {
  if (!profile || typeof profile !== 'object') return null

  if (profile.onboardingCompleted !== true) {
    return '/onboarding'
  }

  return '/dashboard'
}

/** True only when API explicitly reports onboarding incomplete (not while profile is still loading). */
export function profileRequiresOnboarding(profile) {
  return Boolean(profile && profile.onboardingCompleted !== true)
}
