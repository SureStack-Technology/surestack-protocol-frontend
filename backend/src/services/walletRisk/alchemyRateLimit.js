/** @typedef {'rate_limited' | 'quota_exceeded'} AlchemyLimitKind */

export class AlchemyRateLimitError extends Error {
  /**
   * @param {string} message
   * @param {{ httpStatus?: number, code?: string | number, kind?: AlchemyLimitKind }} [meta]
   */
  constructor(message, meta = {}) {
    super(message || 'alchemy_rate_limited')
    this.name = 'AlchemyRateLimitError'
    this.httpStatus = meta.httpStatus
    this.code = meta.code
    this.kind = meta.kind || 'rate_limited'
  }
}

/**
 * @param {number | undefined} httpStatus
 * @param {string | number | undefined} rpcCode
 * @param {string | undefined} message
 */
export function classifyAlchemyLimit(httpStatus, rpcCode, message) {
  const status = Number(httpStatus)
  if (status === 429) return { limited: true, kind: 'rate_limited' }
  if (status === 402 || status === 403) return { limited: true, kind: 'quota_exceeded' }

  const code = String(rpcCode ?? '').toLowerCase()
  if (code === '-32005' || code === '429' || code.includes('rate')) {
    return { limited: true, kind: 'rate_limited' }
  }

  const msg = String(message || '').toLowerCase()
  if (
    /rate limit|too many requests|request limit|throttl|quota|capacity|compute units|exceeded your|monthly limit|usage limit/.test(
      msg,
    )
  ) {
    return { limited: true, kind: /quota|capacity|compute units|monthly|usage limit/.test(msg) ? 'quota_exceeded' : 'rate_limited' }
  }

  return { limited: false, kind: null }
}

/**
 * @param {unknown} err
 */
export function isAlchemyRateLimitError(err) {
  if (err instanceof AlchemyRateLimitError) return true
  const msg = String(err?.message || err || '')
  return classifyAlchemyLimit(undefined, undefined, msg).limited
}

/**
 * @param {number} httpStatus
 * @param {string} [message]
 */
export function throwIfAlchemyHttpLimited(httpStatus, message) {
  const hit = classifyAlchemyLimit(httpStatus, undefined, message)
  if (!hit.limited) return
  throw new AlchemyRateLimitError(message || `alchemy_http_${httpStatus}`, {
    httpStatus,
    kind: hit.kind,
  })
}

/**
 * @param {{ message?: string, code?: string | number }} rpcError
 */
export function throwIfAlchemyRpcLimited(rpcError) {
  const hit = classifyAlchemyLimit(undefined, rpcError?.code, rpcError?.message)
  if (!hit.limited) return
  throw new AlchemyRateLimitError(rpcError?.message || 'alchemy_rpc_rate_limited', {
    code: rpcError?.code,
    kind: hit.kind,
  })
}
