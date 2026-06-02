import assert from 'node:assert/strict'
import test from 'node:test'
import { getTokenBehaviorIntelligence } from './birdeyeService.js'

test('birdeye skips ethereum 0x assets without upstream call', async () => {
  const originalFetch = globalThis.fetch
  let fetchCount = 0
  globalThis.fetch = async () => {
    fetchCount += 1
    throw new Error('fetch should not be called for unsupported ethereum assets')
  }

  try {
    process.env.BIRDEYE_API_KEY = 'test-key'
    const out = await getTokenBehaviorIntelligence(
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      'ethereum',
    )
    assert.equal(out.status, 'unsupported')
    assert.equal(fetchCount, 0)
  } finally {
    globalThis.fetch = originalFetch
    delete process.env.BIRDEYE_API_KEY
  }
})
