/**
 * Premium tier display names. Backend Prisma enums stay:
 * EXPLORER_ACCESS | INTELLIGENCE_PRO | STRATEGIC_ACCESS
 */

export const TIER_DISPLAY_NAME = {
  EXPLORER_ACCESS: 'Explorer Access',
  INTELLIGENCE_PRO: 'Prime Intelligence',
  STRATEGIC_ACCESS: 'Atlas Intelligence',
}

/** Marketing-only tiers (no DB enum yet). */
export const MARKETING_ONLY_TIERS = {
  ALPHA_INTELLIGENCE: 'Alpha Intelligence',
  ATLAS_INTELLIGENCE: 'Atlas Intelligence',
  ENTERPRISE_INTELLIGENCE: 'Enterprise Intelligence',
}

/** Explorer free tier — conversion-focused positioning (UI only). */
export const EXPLORER_POSITIONING_TAGLINE = 'Your first digital asset risk intelligence check.'
export const EXPLORER_UPGRADE_CTA = 'Unlock continuous monitoring with Prime Intelligence'

/** Membership ladder hero — concise premium positioning (UI). */
export const MEMBERSHIP_LADDER_PREMIUM_INTRO =
  'Digital Asset Risk Intelligence for wallets, protocols, and treasury operations. Explorer provides your first intelligence check. Prime is the flagship intelligence tier. Alpha serves advanced operators. Atlas powers treasury and protocol teams. Enterprise delivers custom institutional infrastructure. Founders Pass remains a separate community credential.'

/** Prime tier — recurring brief product name (UI). */
export const WEEKLY_MARKET_THREAT_INTELLIGENCE_BRIEF = 'AI Market & Threat Intelligence Briefs'

/** Explorer gated analyst copy (UI; enforcement may follow separately). */
export const EXPLORER_AI_WALLET_ANALYST_FEATURE =
  'AI Wallet Risk Analyst — 1 complimentary analysis'

/** Membership pricing — single source for pricing / membership / dashboard UI (not billing enforcement). */
export const PRIME_INTELLIGENCE_PRICE = '$99/mo'
export const ALPHA_INTELLIGENCE_PRICE = '$199/mo'

/** Prime Intelligence feature list — single source for pricing / membership / dashboard cards (UI). */
export const PRIME_INTELLIGENCE_FEATURES = [
  'Continuous intelligence refresh',
  'Adaptive Threat Intelligence Terminal',
  'Token / Contract / Wallet Analysis',
  'Universal Contract Analyzer',
  'Approval / spender risk detection',
  'Wallet exposure analysis',
  'Suspicious interaction alerts',
  'Wallet hygiene recommendations',
  'Market volatility intelligence',
  'Wallet Health Timeline (7d / 30d)',
  'Scenario Intelligence Simulator (full access)',
  'AI Wallet Risk Analyst (full access)',
  'Executive Verdict Engine',
  'Alert Center',
  'Priority feature access',
]

/** Alpha Intelligence feature list — operator-grade differentiators (UI). */
export const ALPHA_INTELLIGENCE_FEATURES = [
  'Everything in Prime Intelligence',
  'Multi-wallet intelligence',
  'Cross-wallet analytics',
  'Smart money / whale intelligence',
  'Advanced alert routing',
  'Custom watchlists',
  'Advanced AI Analyst',
  'Faster refresh cadence',
  'Priority upgrade path to Atlas',
]

/** Atlas Intelligence — premium DAO / treasury tier (UI; STRATEGIC_ACCESS on backend). */
export const ATLAS_INTELLIGENCE_PRICE = '$499/mo'
export const ATLAS_INTELLIGENCE_BADGE = 'EARLY ACCESS'
export const ATLAS_INTELLIGENCE_DESCRIPTION = 'Treasury & protocol intelligence infrastructure.'
export const ATLAS_INTELLIGENCE_SHORT_DESCRIPTOR =
  'DAO / treasury · protocol intelligence · APIs · team workspaces'

export const ATLAS_INTELLIGENCE_FEATURES = [
  'Everything in Alpha Intelligence',
  'Treasury exposure intelligence',
  'Protocol dependency intelligence',
  'Incident intelligence',
  'Strategic dashboards',
  'Advanced reporting & exports',
  'API integrations',
  'Automation workflows',
  'Priority onboarding & support',
  'Dedicated intelligence workspaces',
]

/** Enterprise Intelligence — institutional tier (UI; marketing only). */
export const ENTERPRISE_INTELLIGENCE_TAGLINE =
  'Institutional infrastructure for treasury teams, exchanges, custodians, and protocol operators.'

export const ENTERPRISE_INTELLIGENCE_FEATURES = [
  'Everything in Atlas Intelligence',
  'White-label dashboards',
  'Dedicated solutions architecture',
  'Custom APIs',
  'Branded deployments',
  'SSO / Identity Integration',
  'Audit Logs',
  'Private Deployment Options',
  'Compliance surfaces',
  'SLA-backed monitoring',
  'Custom alert integrations',
  'Priority solutions desk',
]

export function getTierDisplayName(tierKey) {
  if (!tierKey) return TIER_DISPLAY_NAME.EXPLORER_ACCESS
  return TIER_DISPLAY_NAME[tierKey] || String(tierKey).replace(/_/g, ' ')
}

/** Human line for settings / onboarding (replaces raw enum dumps). */
export function formatActivePlanLabel(profile) {
  const key = profile?.membershipTier || 'EXPLORER_ACCESS'
  return `Active plan: ${getTierDisplayName(key)}`
}

export const INTELLIGENCE_ACCESS_HEADING = 'Digital Asset Risk Intelligence'

export const SURESTACK_INTELLIGENCE_NAV = 'SureStack Intelligence'
