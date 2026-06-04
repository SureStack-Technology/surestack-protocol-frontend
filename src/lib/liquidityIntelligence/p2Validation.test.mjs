import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveAssetLiquidityTier } from './assetLiquidityTier.mjs'
import {
  computeLiquidityDepthScore,
  computeLiquidityIntelligence,
  liquidityDepthClassification,
} from './liquidityIntelligenceEngine.mjs'
import { buildRiskExplainability } from '../executiveIntelligence/buildRiskExplainability.mjs'

function buildPreScanLiquidityIntel(report) {
  const tier = resolveAssetLiquidityTier({
    symbol: report?.query,
    narrativeCategory: report?.narrativeCategory,
    query: report?.query,
  })
  if (tier.isCanonical || tier.isMajorAsset || tier.isStablecoin) {
    return computeLiquidityIntelligence({
      isStablecoin: tier.isStablecoin,
      isCanonical: tier.isCanonical,
      isMajorAsset: tier.isMajorAsset,
    })
  }
  return computeLiquidityIntelligence({})
}

test('LINK resolves as blue-chip canonical tier', () => {
  const tier = resolveAssetLiquidityTier({ symbol: 'LINK' })
  assert.equal(tier.tier, 'blue_chip')
  assert.equal(tier.isCanonical, true)
})

test('PEPE resolves as meme tier', () => {
  const tier = resolveAssetLiquidityTier({ symbol: 'PEPE' })
  assert.equal(tier.tier, 'meme')
  assert.equal(tier.isCanonical, false)
})

test('canonical asset without DEX data scores strong depth not thin', () => {
  const depth = computeLiquidityDepthScore({ isCanonical: true })
  assert.equal(depth, 88)
  assert.match(liquidityDepthClassification(depth).label, /Strong|Healthy|Exceptional/)
})

test('unknown asset without market data stays pending not thin', () => {
  const intel = computeLiquidityIntelligence({})
  assert.equal(intel.pending, true)
  assert.equal(intel.liquidityDepthLabel, 'Awaiting scan')
  assert.equal(intel.intelligenceScore, null)
})

test('pre-scan LINK liquidity profile is institutional not elevated risk', () => {
  const intel = buildPreScanLiquidityIntel({
    query: 'LINK',
    modeId: 'token',
    narrativeCategory: 'oracle',
  })
  assert.equal(intel.pending, false)
  assert.match(intel.liquidityDepthLabel, /Strong|Healthy|Exceptional/)
  assert.ok(Number(intel.intelligenceScore) <= 35, `expected low liquidity risk, got ${intel.intelligenceScore}`)
  assert.match(intel.estimatedMarketImpactSummary, /Low|Moderate/)
})

test('USDC stablecoin liquidity uses institutional profile', () => {
  const intel = buildPreScanLiquidityIntel({
    query: 'USDC',
    modeId: 'token',
    narrativeCategory: 'stablecoin',
  })
  assert.match(intel.liquidityDepthLabel, /Strong|Exceptional/)
  assert.ok(Number(intel.intelligenceScore) <= 30)
})

test('risk explainability exposes component breakdown for preliminary LINK', () => {
  const explainability = buildRiskExplainability({
    report: { query: 'LINK', modeId: 'token', narrativeCategory: 'oracle' },
    executive: {
      preliminary: true,
      executiveRiskScore: 32,
      executiveRiskBandId: 'moderate',
      classification: 'ORACLE INFRASTRUCTURE',
      assessmentStage: 'PRELIMINARY',
      assessmentStatus: 'Awaiting scanner validation',
      confidenceInterpretation: 'Category intelligence + registry validation',
    },
  })
  assert.ok(explainability.components.some((c) => c.id === 'technical' && c.score != null))
  assert.ok(explainability.components.some((c) => c.id === 'governance'))
  assert.ok(explainability.components.some((c) => c.id === 'behavior' && c.pending))
  assert.ok(explainability.components.some((c) => c.id === 'composite' && c.score === 32))
  assert.ok(explainability.primaryContributor)
  assert.ok(explainability.positiveOffsets.length > 0)
})
