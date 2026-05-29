/** Clerk front-end env helpers (no secrets). */

export const CLERK_AUTH_REDIRECT_PATH = '/auth/redirect'

/** Local dev default per package.json `npm run dev` → vite --port 3000 */
export const DEV_APP_ORIGIN = 'http://localhost:3000'

export function getClerkPublishableKey() {
  const raw = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  return raw && String(raw).trim() ? String(raw).trim() : ''
}

export function getAppOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

/** Absolute URL for OAuth / SSO completion — always profile-aware via AuthRedirectPage. */
export function getClerkAuthRedirectUrl() {
  const origin = getAppOrigin()
  return origin ? `${origin}${CLERK_AUTH_REDIRECT_PATH}` : CLERK_AUTH_REDIRECT_PATH
}

/**
 * Dev-only hints when origin is not the expected local URL (mixed content / wrong port breaks CAPTCHA).
 * @returns {string[]}
 */
export function getClerkOriginWarnings() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return []
  const warnings = []
  const { origin, protocol, port } = window.location
  if (protocol === 'https:' && /localhost|127\.0\.0\.1/.test(origin)) {
    warnings.push('Local dev is served over HTTPS — Clerk CAPTCHA may fail. Prefer http://localhost:3000.')
  }
  if (origin && origin !== DEV_APP_ORIGIN && /^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin)) {
    warnings.push(`Dev server is on ${origin}; npm run dev defaults to ${DEV_APP_ORIGIN}. Align Clerk Dashboard allowed origins.`)
  }
  if (port && port !== '3000' && /^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin)) {
    warnings.push(`Running on port ${port}. Ensure this origin is allowed in the Clerk Dashboard.`)
  }
  return warnings
}
