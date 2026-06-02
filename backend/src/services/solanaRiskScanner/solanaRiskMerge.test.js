import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeSolanaTokenConcentrationIntoCore } from './solanaRiskMerge.js'
import { normalizeSolanaMintAddress, resolveSolanaArchetype } from './solanaArchetypes.js'

test('normalizeSolanaMintAddress maps legacy BONK mint', () => {
  assert.equal(
    normalizeSolanaMintAddress('DezXAZ8z7PnrnRJjz3wXBoRgixCa6Y7YaB1pPB263'),
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  )
})

test('BONK archetype is major asset', () => {
  const a = resolveSolanaArchetype('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')
  assert.equal(a?.id, 'bonk')
  assert.equal(a?.majorAsset, true)
})

test('mergeSolana does not penalize missing Jupiter when market is strong', () => {
  const core = { trustScore: 72, findings: [], addressType: 'SPL_TOKEN_MINT' }
  const concentration = {
    available: true,
    isMajorAsset: true,
    liquidityUsd: 5_000_000,
    marketCapUsd: 2_000_000_000,
    volume24hUsd: 1_000_000,
    liquidityConfidence: 'HIGH',
    liquidityConfirmed: true,
    jupiterClassification: 'NOT_ROUTABLE',
    top10HolderPct: 25,
    largestWalletPct: 8,
    whaleRisk: 'LOW',
    limitedMarketIntelligence: false,
  }
  const merged = mergeSolanaTokenConcentrationIntoCore(core, concentration, { isMajorAsset: true })
  assert.ok(merged.trustScore >= 65, `expected trust >= 65, got ${merged.trustScore}`)
  assert.notEqual(merged.trustBand, 'HIGH_RISK')
})

test('mergeSolana leaves score neutral when holder data unknown', () => {
  const core = { trustScore: 70, findings: [], addressType: 'SPL_TOKEN_MINT' }
  const concentration = {
    available: true,
    liquidityConfirmed: false,
    limitedMarketIntelligence: true,
    jupiterClassification: 'NOT_ROUTABLE',
    whaleRisk: 'LOW',
  }
  const merged = mergeSolanaTokenConcentrationIntoCore(core, concentration, {})
  assert.ok(merged.trustScore >= 48)
})
