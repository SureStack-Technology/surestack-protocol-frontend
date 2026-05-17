/**
 * Intelligence console vs protocol demo telemetry vs Explorer acquisition tier.
 */

import { ATLAS_INTELLIGENCE_DESCRIPTION, EXPLORER_POSITIONING_TAGLINE } from '@/constants/intelligenceTiers.js'

export function isDemoModeEnabled() {
  return import.meta.env.VITE_DEMO_MODE === 'true'
}

/**
 * Investor / protocol-style headline metrics (treasury, staked, APY, etc.).
 * True when demo flag is on, or paid / enterprise profile (not Explorer-only acquisition).
 */
export function shouldShowProtocolDemoMetrics(profile) {
  if (isDemoModeEnabled()) return true
  if (!profile) return false
  if (profile.membershipTier && profile.membershipTier !== 'EXPLORER_ACCESS') return true
  if (profile.institutionalIntent || profile.governanceAccessEligible) return true
  return false
}

/**
 * Free Explorer funnel: no POC analytics, no scenario lab, no investor telemetry.
 * False when demo mode is on (investor console) or when profile is not plain Explorer.
 *
 * Intentionally does **not** gate on `profileLoading` when `profile` is present, so a
 * background GET /api/auth/me (e.g. after wallet verify) does not flip the shell to non-Explorer.
 */
export function isExplorerAcquisitionTier(profile, _profileLoading, profileError) {
  if (profileError || !profile) return false
  if (isDemoModeEnabled()) return false
  if (profile.institutionalIntent || profile.governanceAccessEligible) return false
  return profile.membershipTier === 'EXPLORER_ACCESS'
}

/** Explorer / Prime / Atlas — Digital Asset Risk Intelligence console (not legacy protocol demo). */
export function usesModernIntelligenceConsole(profile, profileLoading, profileError) {
  if (profileLoading) return true
  if (profileError || !profile) return true
  if (isDemoModeEnabled()) return true
  const tier = profile.membershipTier || 'EXPLORER_ACCESS'
  return (
    tier === 'EXPLORER_ACCESS' ||
    tier === 'INTELLIGENCE_PRO' ||
    tier === 'STRATEGIC_ACCESS' ||
    profile.institutionalIntent ||
    profile.governanceAccessEligible
  )
}

/** @returns {'explorer' | 'prime' | 'atlas'} */
export function getIntelligenceConsoleVariant(profile) {
  if (!profile) return 'explorer'
  if (profile.institutionalIntent || profile.governanceAccessEligible) return 'atlas'
  switch (profile.membershipTier) {
    case 'INTELLIGENCE_PRO':
      return 'prime'
    case 'STRATEGIC_ACCESS':
      return 'atlas'
    default:
      return 'explorer'
  }
}

const SESSION_EXPLORER_WALLET_CONSOLE_SKIP = 'surestack_explorer_wallet_console_skip'

/** Session-only: user chose "Skip wallet for now" on onboarding — allows console until they sign in again. */
export function markExplorerWalletConsoleSkipped() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_EXPLORER_WALLET_CONSOLE_SKIP, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearExplorerWalletConsoleSkip() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_EXPLORER_WALLET_CONSOLE_SKIP)
  } catch {
    /* ignore */
  }
}

function explorerWalletConsoleSkippedThisSession() {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_EXPLORER_WALLET_CONSOLE_SKIP) === '1'
  } catch {
    return false
  }
}

/** At least one linked wallet has completed EIP-191 verification (server `verifiedAt`). */
export function accountHasVerifiedWallet(profile) {
  return Boolean(profile?.wallets?.some((w) => w?.verifiedAt))
}

/**
 * Explorer funnel: intelligence console routes are gated on verified wallet even when
 * `onboardingCompleted` is already true (returning accounts, legacy flags, or skip confusion).
 * Mirrors Explorer acquisition scope: not demo, not institutional/governance shortcut.
 * Respects a same-session skip from onboarding (see markExplorerWalletConsoleSkipped).
 */
export function explorerPersonalConsoleRequiresWallet(profile) {
  if (!profile) return false
  if (isDemoModeEnabled()) return false
  if (profile.institutionalIntent || profile.governanceAccessEligible) return false
  const tier = profile.membershipTier || 'EXPLORER_ACCESS'
  if (tier !== 'EXPLORER_ACCESS') return false
  if (accountHasVerifiedWallet(profile)) return false
  if (explorerWalletConsoleSkippedThisSession()) return false
  return true
}

const EXPLORER_WALLET_GATED_PATHNAMES = new Set([
  '/dashboard',
  '/programs',
  '/incident-support',
  '/policies',
  '/claims',
])

/** MainLayout routes that are the Explorer intelligence console (not Membership/Billing). */
export function isExplorerPersonalConsolePath(pathname) {
  if (!pathname) return false
  if (EXPLORER_WALLET_GATED_PATHNAMES.has(pathname)) return true
  return pathname.startsWith('/programs/') || pathname.startsWith('/incident-support/')
}

/**
 * Membership ladder entitlements from effective /api/auth/me tier (includes dev override).
 * @param {{ membershipTier?: string, institutionalIntent?: boolean, governanceAccessEligible?: boolean } | null | undefined} profile
 */
export function resolveMembershipEntitlements(profile) {
  const tier = profile?.membershipTier || 'EXPLORER_ACCESS'
  const hasPrime = tier === 'INTELLIGENCE_PRO' || tier === 'STRATEGIC_ACCESS'
  const hasAtlas = tier === 'STRATEGIC_ACCESS'
  const hasEnterprise = Boolean(profile?.institutionalIntent || profile?.governanceAccessEligible)
  return {
    tier,
    hasPrime,
    hasAtlas,
    hasEnterprise,
    isExplorerOnly: tier === 'EXPLORER_ACCESS' && !hasEnterprise,
  }
}

/** Prime Intelligence (INTELLIGENCE_PRO) or Atlas Intelligence (STRATEGIC_ACCESS) — unlocks analytics product surface on /dashboard */
export function hasIntelligenceProOrHigher(profile) {
  if (!profile?.membershipTier) return false
  return (
    profile.membershipTier === 'INTELLIGENCE_PRO' ||
    profile.membershipTier === 'STRATEGIC_ACCESS'
  )
}

/** Strategic (Atlas) tier or enterprise flags — unlocks strategic messaging / workflow strip */
export function hasStrategicTierOrEnterprise(profile) {
  if (!profile) return false
  return (
    profile.membershipTier === 'STRATEGIC_ACCESS' ||
    profile.institutionalIntent ||
    profile.governanceAccessEligible
  )
}

const emptyStats = {
  totalPolicies: 0,
  totalCoverage: 0,
  totalPremiums: 0,
  avgCoveragePercent: 0,
  claimsProcessed: 0,
}

/** Same aggregation as AnalyticsPanel — local chain event cache only. */
export function getLocalConsoleStats() {
  if (typeof window === 'undefined') return { ...emptyStats }
  try {
    const stored = JSON.parse(localStorage.getItem('surestack_events') || '[]')
    if (!Array.isArray(stored) || !stored.length) return { ...emptyStats }

    const policyEvents = stored.filter((e) => e.name === 'PolicyCreated')
    const claimEvents = stored.filter((e) => e.name === 'ClaimProcessed')

    const totalCoverage = policyEvents.reduce(
      (sum, e) => sum + Number(e.args?.coverage || 0),
      0
    )
    const totalPremiums = policyEvents.reduce(
      (sum, e) => sum + Number(e.args?.sst || 0),
      0
    )
    const avgCoveragePercent =
      policyEvents.length > 0
        ? policyEvents.reduce((s, e) => s + Number(e.args?.coveragePercent || 0), 0) /
          policyEvents.length
        : 0

    return {
      totalPolicies: policyEvents.length,
      totalCoverage,
      totalPremiums,
      avgCoveragePercent,
      claimsProcessed: claimEvents.length,
    }
  } catch {
    return { ...emptyStats }
  }
}

export function hasVerifiedWallet(profile) {
  return Boolean(profile?.wallets?.length)
}

/**
 * Raw RPC / polling chip, DevOverlay, DevTelemetry — hidden for Explorer acquisition
 * (unless demo mode). Shown for Prime Intelligence tier and above, Strategic, enterprise signals, and unknown profile after load.
 */
export function shouldShowInfraDiagnostics(profile, profileLoading, profileError) {
  if (isDemoModeEnabled()) return true
  if (profileLoading) return false
  if (!profile || profileError) return false
  if (usesModernIntelligenceConsole(profile, profileLoading, profileError)) return false
  return true
}

/** Sidebar / header / dashboard hero naming by tier (Explorer is not the analytics product). */
export function getConsoleExperienceLabels(profile) {
  if (!profile) {
    return {
      sidebarSubtitle: 'Console',
      headerSubtitle: 'Member hub',
      dashboardHeroTitle: 'Member console',
      dashboardHeroSubtitle: null,
    }
  }
  if (profile.institutionalIntent || profile.governanceAccessEligible) {
    return {
      sidebarSubtitle: 'Enterprise Intelligence console',
      headerSubtitle: 'Institutional workspace',
      dashboardHeroTitle: 'Enterprise Intelligence workspace',
      dashboardHeroSubtitle: 'Institutional digital asset intelligence infrastructure',
    }
  }
  switch (profile.membershipTier) {
    case 'EXPLORER_ACCESS':
      return {
        sidebarSubtitle: 'Digital Asset Risk Intelligence',
        headerSubtitle: 'Explorer Intelligence Console',
        dashboardHeroTitle: 'Explorer Intelligence Console',
        dashboardHeroSubtitle: EXPLORER_POSITIONING_TAGLINE,
      }
    case 'INTELLIGENCE_PRO':
      return {
        sidebarSubtitle: 'Prime Intelligence · flagship paid tier',
        headerSubtitle: 'Flagship retail · $59/mo',
        dashboardHeroTitle: 'Prime Intelligence workspace',
        dashboardHeroSubtitle: 'Your AI digital asset risk co-pilot',
      }
    case 'STRATEGIC_ACCESS':
      return {
        sidebarSubtitle: 'Atlas Intelligence',
        headerSubtitle: 'DAO / treasury · $299/mo · EARLY ACCESS',
        dashboardHeroTitle: 'Atlas Intelligence workspace',
        dashboardHeroSubtitle: ATLAS_INTELLIGENCE_DESCRIPTION,
      }
    default:
      return {
        sidebarSubtitle: 'Console',
        headerSubtitle: 'Member hub',
        dashboardHeroTitle: 'Member console',
        dashboardHeroSubtitle: null,
      }
  }
}
