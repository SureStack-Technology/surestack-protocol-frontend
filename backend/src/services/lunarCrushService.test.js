import assert from 'node:assert/strict'
import test from 'node:test'

test('lunarCrush subscription cooldown module loads', async () => {
  const mod = await import('./lunarCrushService.js')
  assert.equal(typeof mod.getPrimeSocialTrends, 'function')
  assert.equal(typeof mod.getExplorerMarketSentiment, 'function')
})
