/**
 * Deduplicates concurrent GET /api/auth/me for the same Clerk user.
 * Multiple layouts/hooks sharing a burst still produce one in-flight request.
 */
const inflightByUserId = new Map()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * @param {(path: string, opts?: RequestInit) => Promise<Response>} api
 * @param {string|null|undefined} userId
 * @param {{ retries?: number }} [opts]
 * @returns {Promise<{ res: Response, data: any }>}
 */
export async function fetchAuthMeDeduped(api, userId, opts = {}) {
  if (!userId) {
    const res = new Response(JSON.stringify({ error: 'not_authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
    return { res, data: null }
  }

  const retries = Number(opts.retries) || 0
  const cacheKey = `${userId}:r${retries}`
  const existing = inflightByUserId.get(cacheKey)
  if (existing) return existing

  const run = (async () => {
    let last = { res: null, data: null }
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (attempt > 0) {
        await sleep(350 * attempt)
      }
      const res = await api('/api/auth/me')
      let data = null
      try {
        data = await res.json()
      } catch {
        data = null
      }
      last = { res, data }
      if (res.ok) return last
      if (res.status !== 401 && res.status !== 404) return last
    }
    return last
  })().finally(() => {
    inflightByUserId.delete(cacheKey)
  })

  inflightByUserId.set(cacheKey, run)
  return run
}
