import assert from 'node:assert/strict'
import test from 'node:test'
import {
  lookupNativeAssetIntelligence,
  resolveNativeExecutiveClassification,
} from '../../../shared/constants/nativeAssetIntelligenceRegistry.mjs'
import { buildCategoryExecutiveStrengths } from '../executiveIntelligence/executiveSummaryStrengths.mjs'
import { resolveExecutiveClassification } from '../executiveIntelligence/executiveIntelligenceEngine.mjs'
import { normalizeContractAddress } from '../../../shared/lib/walletExposure/normalizeContractAddress.mjs'
import { enrichPortfolioHoldings } from '../../../shared/lib/walletExposure/enrichPortfolioHoldings.mjs'
import { resolveWalletHolding } from '../../../shared/lib/walletExposure/walletHoldingsResolution.mjs'
import { pricedPortfolioValueFromHoldings } from '../walletExposureIntelligence/walletExposureIntelligenceEngine.mjs'

const NEXUS = '0xc01154b4ccb518232d6bbfc9b9e6c5068b766f82'
const ZERO = '0xf0939011a9bb95c3b791f0cb546377ed2693a574'

test('ETH → Layer 1 classification and registry strengths', () => {
  const intel = lookupNativeAssetIntelligence('ETH')
  assert.equal(intel?.classification, 'LAYER 1 ASSET')
  const strengths = buildCategoryExecutiveStrengths('l2', { symbol: 'ETH', nativeIntel: intel })
  assert.ok(strengths.includes('Largest smart contract ecosystem'))
  assert.ok(!strengths.some((s) => /category intelligence model active/i.test(s)))
})

test('BTC → Store of Value classification and registry strengths', () => {
  const intel = lookupNativeAssetIntelligence('BTC')
  assert.equal(intel?.classification, 'STORE OF VALUE ASSET')
  const strengths = buildCategoryExecutiveStrengths('l2', { symbol: 'BTC', nativeIntel: intel })
  assert.ok(strengths.includes('Most secure proof-of-work network'))
})

test('SOL → Layer 1 classification and registry strengths', () => {
  const intel = lookupNativeAssetIntelligence('SOL')
  assert.equal(intel?.classification, 'LAYER 1 ASSET')
  const strengths = buildCategoryExecutiveStrengths('l2', { symbol: 'SOL', nativeIntel: intel })
  assert.ok(strengths.includes('High throughput architecture'))
})

test('resolveExecutiveClassification uses native registry for ETH', () => {
  const cls = resolveExecutiveClassification({
    modeId: 'token',
    executiveRiskScore: 32,
    symbol: 'ETH',
    canonicalAsset: { symbol: 'ETH', native: true, resolved: true },
    allowFabricatedClassification: true,
  })
  assert.equal(cls, 'LAYER 1 ASSET')
  assert.equal(resolveNativeExecutiveClassification('ETH', { native: true }), 'LAYER 1 ASSET')
})

test('checksum contract normalizes to catalog NEXUS and ZERO', () => {
  const nexusChecksum = '0xC01154B4CCB518232D6bbfC9B9E6C5068B766F82'
  assert.equal(normalizeContractAddress(nexusChecksum), NEXUS)
  const nexus = resolveWalletHolding(nexusChecksum)
  assert.equal(nexus.symbol, 'NEXUS')
  assert.equal(nexus.coingeckoId, 'nexus-2')
  assert.notEqual(nexus.name, 'Unclassified token')

  const zero = resolveWalletHolding(ZERO)
  assert.equal(zero.symbol, 'ZERO')
  assert.equal(zero.coingeckoId, 'zero-exchange')
})

test('enrichPortfolioHoldings re-resolves stale unclassified rows', () => {
  const enriched = enrichPortfolioHoldings([
    {
      contract: NEXUS,
      symbol: '0xc011…6f82',
      name: 'Unclassified token',
      usdValue: 100,
      hasReliablePrice: true,
    },
  ])
  assert.equal(enriched[0].symbol, 'NEXUS')
  assert.equal(enriched[0].name, 'Nexus Chain')
  assert.equal(enriched[0].coingeckoId, 'nexus-2')
  assert.ok(pricedPortfolioValueFromHoldings(enriched) > 0)
})

test('portfolio valuation uses only priced holdings', () => {
  const holdings = enrichPortfolioHoldings([
    { contract: NEXUS, symbol: 'NEXUS', usdValue: 1000, hasReliablePrice: true, quantity: 1 },
    { contract: ZERO, symbol: 'ZERO', usdValue: null, hasReliablePrice: false, quantity: 1 },
  ])
  assert.equal(pricedPortfolioValueFromHoldings(holdings), 1000)
})
