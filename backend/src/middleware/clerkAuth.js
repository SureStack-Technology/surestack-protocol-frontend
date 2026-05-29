import { verifyToken } from '@clerk/backend'

/**
 * @param {{ unauthorizedError?: string }} [opts]
 * When `unauthorizedError` is set, all 401 responses use that code (for route-specific contracts).
 */
export function makeRequireClerkAuth(opts = {}) {
  const unauthorizedError = opts.unauthorizedError

  return async function requireClerkAuth(req, res, next) {
    try {
      const header = req.headers.authorization || ''
      if (!header.startsWith('Bearer ')) {
        return res.status(401).json({ error: unauthorizedError || 'missing_bearer_token' })
      }
      const token = header.slice(7).trim()
      if (!token) {
        return res.status(401).json({ error: unauthorizedError || 'empty_token' })
      }

      const secretKey = process.env.CLERK_SECRET_KEY
      if (!secretKey) {
        console.error('[auth] CLERK_SECRET_KEY is not set')
        return res.status(500).json({ error: 'auth_not_configured' })
      }

      const verified = await verifyToken(token, { secretKey })
      req.clerkUserId = verified.sub
      req.clerkSessionClaims = verified
      next()
    } catch (err) {
      console.warn('[auth] verifyToken failed:', err?.message || err)
      return res.status(401).json({ error: unauthorizedError || 'invalid_token' })
    }
  }
}

/** Validates Clerk session JWT from Authorization: Bearer <token> */
export const requireClerkAuth = makeRequireClerkAuth()
