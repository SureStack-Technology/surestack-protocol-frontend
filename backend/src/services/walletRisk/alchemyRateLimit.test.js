import assert from 'node:assert/strict'
import test from 'node:test'
import { AlchemyRateLimitError, classifyAlchemyLimit, isAlchemyRateLimitError } from './alchemyRateLimit.js'

test('detects HTTP 429', () => {
  const hit = classifyAlchemyLimit(429, undefined, undefined)
  assert.equal(hit.limited, true)
  assert.equal(hit.kind, 'rate_limited')
})

test('detects quota HTTP 403', () => {
  const hit = classifyAlchemyLimit(403, undefined, 'quota exceeded')
  assert.equal(hit.limited, true)
  assert.equal(hit.kind, 'quota_exceeded')
})

test('detects RPC message rate limit', () => {
  const hit = classifyAlchemyLimit(undefined, -32005, 'request limit reached')
  assert.equal(hit.limited, true)
})

test('isAlchemyRateLimitError recognizes typed error', () => {
  const err = new AlchemyRateLimitError('limited', { httpStatus: 429 })
  assert.equal(isAlchemyRateLimitError(err), true)
})
