import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resolveCanonicalAssetSync,
  classificationFromCanonical,
} from './canonicalAssetResolver.mjs'
import { canonicalCategoryToExecutiveClassification } from './assetCategoryRegistry.mjs'
import { resolveExecutiveClassification } from '../executiveIntelligence/executiveIntelligenceEngine.mjs'
import { holderMetricsFromLargestAccounts } from '../../../backend/src/services/tokenConcentration/solanaTokenConcentration.js'

const LINK_ADDR = '0x514910771AF9Ca656af840dff83E8264EcF986CA'

function assertSameIdentity(inputs, expectedSymbol) {
  const assets = inputs.map((raw) => resolveCanonicalAssetSync(raw))
  const first = assets[0]
  for (const asset of assets) {
    assert.equal(asset.resolved, true, `expected resolved: ${asset.rawInput}`)
    assert.equal(asset.source, 'registry')
    assert.equal(asset.symbol, first.symbol)
    assert.equal(asset.address, first.address)
    assert.equal(asset.category, first.category)
    assert.equal(asset.chain, first.chain)
  }
  assert.equal(first.symbol, expectedSymbol)
}

test('LINK symbol, name, and contract resolve to identical canonical asset', () => {
  assertSameIdentity(['LINK', 'Chainlink', LINK_ADDR], 'LINK')
  assert.equal(
    canonicalCategoryToExecutiveClassification(
      resolveCanonicalAssetSync('LINK').category,
    ),
    'ORACLE INFRASTRUCTURE',
  )
})

test('UNI, AAVE, USDC equivalence across input forms', () => {
  assertSameIdentity(['UNI', 'Uniswap', '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'], 'UNI')
  assertSameIdentity(['AAVE', 'Aave', '0x7fc66500c84a76ad7e9c93481fe6c2e88f4923e6'], 'AAVE')
  assertSameIdentity(['USDC', 'USD Coin', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'], 'USDC')
})

test('WIF and TAO resolve across symbol, name, and mint', () => {
  assertSameIdentity(
    ['WIF', 'dogwifhat', 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'],
    'WIF',
  )
  const taoMint = resolveCanonicalAssetSync('TAO').address
  assertSameIdentity(['TAO', 'Bittensor', taoMint], 'TAO')
})

test('LINK contract address classifies as token module, not generic contract', () => {
  const cls = classificationFromCanonical(resolveCanonicalAssetSync(LINK_ADDR))
  assert.equal(cls.recommendedModule, 'token')
  assert.equal(cls.symbol, 'LINK')
  assert.equal(cls.canonicalAsset?.category, 'ORACLE_INFRASTRUCTURE')
})

test('registry-backed executive classification matches for symbol vs address', () => {
  const symCanon = resolveCanonicalAssetSync('LINK')
  const addrCanon = resolveCanonicalAssetSync(LINK_ADDR)
  const symClass = resolveExecutiveClassification({
    modeId: 'token',
    executiveRiskScore: 32,
    canonicalAsset: symCanon,
    symbol: symCanon.symbol,
    tokenName: symCanon.name,
  })
  const addrClass = resolveExecutiveClassification({
    modeId: 'token',
    executiveRiskScore: 32,
    canonicalAsset: addrCanon,
    symbol: addrCanon.symbol,
    tokenName: addrCanon.name,
  })
  assert.equal(symClass, 'ORACLE INFRASTRUCTURE')
  assert.equal(addrClass, symClass)
})

test('unknown asset does not fabricate registry category', () => {
  const asset = resolveCanonicalAssetSync('NOTAREALTOKENXYZ')
  assert.equal(asset.resolved, false)
  assert.equal(asset.category, 'UNKNOWN_ASSET')
  const cls = classificationFromCanonical(asset)
  assert.equal(cls.recommendedModule, 'token')
  assert.ok(cls.confidence <= 35)
})

test('RPC largest-account sample does not report misleading 100% top10 supply', () => {
  const metrics = holderMetricsFromLargestAccounts([
    { uiAmount: 40 },
    { uiAmount: 30 },
    { uiAmount: 20 },
    { uiAmount: 10 },
  ])
  assert.equal(metrics.top10HolderPct, null)
  assert.equal(metrics.incompleteHolderSample, true)
  assert.ok(metrics.top10SamplePct >= 99)
})
