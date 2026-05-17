/** Official SureStack X profile */
export const SURESTACK_X_URL = 'https://x.com/sure_stack?s=11'

/**
 * Launch engagement post — replace when the final launch post is published.
 * TODO: Replace placeholder with the canonical SureStack launch post URL.
 */
export const SURESTACK_LAUNCH_POST_URL = '#'

/**
 * Private founders Telegram invite — set in `.env.local` only (never commit a live invite).
 * Revealed in UI only after `telegramVerified === true`.
 */
export const FOUNDERS_TELEGRAM_INVITE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FOUNDERS_TELEGRAM_INVITE_URL) || ''

export const FOUNDERS_PASS_MILESTONES = [
  { id: 'wallet', label: 'Verified wallet identity' },
  { id: 'x', label: 'Follow SureStack on X' },
  { id: 'engagement', label: 'Community engagement' },
  { id: 'telegram', label: 'Private founders access' },
]
