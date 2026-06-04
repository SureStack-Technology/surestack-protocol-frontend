import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveCanonicalAssetSync } from './canonicalAssetResolver.mjs'
import { lookupPrimeTokenByName } from '../../../shared/constants/primeTokenRegistry.mjs'

const EXPECTED = [
  ['ETH', 'ETH', 'Ethereum'],
  ['BTC', 'BTC', 'Bitcoin'],
  ['SOL', 'SOL', 'Solana'],
  ['USDT', 'USDT', 'Tether USD'],
  ['USDC', 'USDC', 'USD Coin'],
]

for (const [input, symbol, name] of EXPECTED) {
  test(`${input} resolves to ${name} (${symbol})`, () => {
    const asset = resolveCanonicalAssetSync(input)
    assert.equal(asset.resolved, true, input)
    assert.equal(asset.symbol, symbol)
    assert.equal(asset.name, name)
  })
}

test('ETH does not resolve to Tether via name lookup', () => {
  assert.equal(lookupPrimeTokenByName('ETH'), null)
  const asset = resolveCanonicalAssetSync('ETH')
  assert.notEqual(asset.symbol, 'USDT')
  assert.equal(asset.name, 'Ethereum')
})

test('ethereum alias resolves to ETH', () => {
  const asset = resolveCanonicalAssetSync('ethereum')
  assert.equal(asset.symbol, 'ETH')
})
