import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeLiquidityIntelligence,
  estimateMarketImpactLevel,
  liquidityDepthClassification,
  marketInputFromTokenConcentration,
} from '../../../../src/lib/liquidityIntelligence/liquidityIntelligenceEngine.mjs'

test('depth classification bands', () => {
  assert.equal(liquidityDepthClassification(92).label, 'Exceptional')
  assert.equal(liquidityDepthClassification(80).label, 'Strong')
})

test('market impact scales with trade size', () => {
  const liq = 2_000_000
  assert.equal(estimateMarketImpactLevel(1_000, liq, 500_000), 'LOW IMPACT')
  assert.equal(estimateMarketImpactLevel(1_000_000, liq, 500_000), 'HIGH IMPACT')
})

test('BONK-like market: strong depth, educational commentary only', () => {
  const intel = computeLiquidityIntelligence({
    liquidityUsd: 2_200_000,
    marketCapUsd: 477_000_000,
    volume24hUsd: 1_000_000,
    pairCount: 4,
    topPairLiquidityUsd: 1_400_000,
    jupiterClassification: 'ROUTABLE',
    dexListings: 'Raydium, Orca, Meteora',
  })
  assert.ok(['Strong', 'Healthy'].includes(intel.liquidityDepthLabel))
  assert.ok(!/buy|sell|hold|exit|guarantee/i.test(intel.analystCommentary))
})

test('marketInputFromTokenConcentration maps scanner fields', () => {
  const input = marketInputFromTokenConcentration({
    liquidityUsd: 100_000,
    marketCapUsd: 5_000_000,
    pairCount: 2,
    dexListings: 'uniswap',
  })
  assert.equal(input.liquidityUsd, 100_000)
})
