/**
 * Prime Intelligence Beta — Telegram onboarding URLs and copy (UI only).
 * Set in `.env.local`; defaults to public SureStack channels.
 */

export const TELEGRAM_COMMUNITY_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_COMMUNITY_URL) ||
  'https://t.me/SureStackCommunity'

export const TELEGRAM_OFFICIAL_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_OFFICIAL_URL) ||
  'https://t.me/SureStackOfficial'

export const PRIME_BETA_SECTION_ID = 'apply-prime-beta'

export const PRIME_BETA_ONBOARDING_SUMMARY =
  'Prime Intelligence is currently available to approved beta users. Join our Telegram Community, complete verification, and sign up using the same email. Once approved, your account can be upgraded to Prime Beta during the testing phase.'

export const PRIME_BETA_EXPLORER_NOTE =
  'Explorer Access remains free and public — snapshot wallet risk, orientation, and limited scenarios with no paid checkout required.'

export const PRIME_BETA_APPROVAL_NOTE =
  'Prime Intelligence Beta is invite and approval-based during testing. No automatic account linking — admin review confirms your Telegram verification and signup email match.'

export const PRIME_BETA_COMPLIANCE_NOTE =
  'Digital Asset Risk Intelligence for awareness and decision support only — not financial advice, insurance, guaranteed protection, custody, or regulated advisory services.'

export const PRIME_BETA_FLOW_STEPS = [
  { id: 'community', label: 'Telegram Community', detail: 'Join the public community channel' },
  { id: 'verification', label: 'Verification Bot', detail: 'Complete community verification' },
  { id: 'approval', label: 'Admin Approval', detail: 'Team reviews your request' },
  { id: 'access', label: 'Prime Beta Access', detail: 'Account upgraded when approved' },
]
