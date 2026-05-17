import { useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getBackendBaseUrl } from '@shared/services/validatorApi'

const AUTH_WAIT_MS = 240
const TOKEN_RETRY_MS = 200

/**
 * Authenticated fetch against SureStack API (Clerk JWT).
 */
export function useAuthApi() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth()
  const base = getBackendBaseUrl()

  const api = useCallback(
    async (path, options = {}) => {
      if (!isLoaded) {
        await new Promise((r) => setTimeout(r, AUTH_WAIT_MS))
      }

      let token = await getToken()
      if (!token && isSignedIn) {
        await new Promise((r) => setTimeout(r, TOKEN_RETRY_MS))
        token = await getToken({ skipCache: true })
      }

      if (!token && isSignedIn && userId) {
        const err = new Error('auth_session_missing')
        err.friendlyMessage =
          'Session verification required. Refresh your Prime workspace and try again.'
        throw err
      }

      const headers = { ...(options.headers || {}) }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      let body = options.body
      if (body && typeof body === 'object' && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(body)
      }

      const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
      return fetch(url, {
        ...options,
        body,
        headers,
        credentials: 'include',
      })
    },
    [getToken, base, isLoaded, isSignedIn, userId],
  )

  return { api, baseUrl: base, isAuthReady: isLoaded && Boolean(isSignedIn && userId) }
}
