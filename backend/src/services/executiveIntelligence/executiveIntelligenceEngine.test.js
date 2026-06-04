import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeExecutiveIntelligence,
  executiveRiskBandFromScore,
  executiveIntelligenceFromScanner,
} from '../../../../src/lib/executiveIntelligence/executiveIntelligenceEngine.mjs'

test('executive risk bands', () => {
  assert.equal(executiveRiskBandFromScore(20).label, 'LOW RISK')
  assert.equal(executiveRiskBandFromScore(47).label, 'MODERATE RISK')
  assert.equal(executiveRiskBandFromScore(60).label, 'ELEVATED RISK')
  assert.equal(executiveRiskBandFromScore(82).label, 'HIGH RISK')
})

test('WIF-like meme token classification', () => {
  const intel = computeExecutiveIntelligence({
    modeId: 'token',
    symbol: 'WIF',
    tokenName: 'dogwifhat',
    narrativeCategory: 'meme',
    narrativeElevated: false,
    composite: {
      score: 47,
      verdictLabel: 'MODERATE RISK',
      subscores: {
        contractRisk: 22,
        narrativeRisk: 72,
        behaviorRisk: 18,
        liquidityRisk: 28,
        walletExposureRisk: 60,
      },
    },
    scannerReport: {
      trustScore: 78,
      mintAuthority: null,
      freezeAuthority: null,
      tokenConcentration: { top10HolderPct: 79.9 },
      liquidityIntelligence: { liquidityDepthLabel: 'Strong', intelligenceScore: 72 },
    },
    liquidityIntel: { liquidityDepthLabel: 'Strong' },
    providerFlags: { hasScan: true, lunarLive: false, behaviorCoverage: 'partial' },
  })
  assert.equal(intel.classification, 'MEME SPECULATIVE ASSET')
  assert.equal(intel.executiveRiskScore, 47)
  assert.ok(intel.keyFindings.length >= 3)
  assert.ok(!/\b(buy|sell|hold|recommend|guarantee)\b/i.test(intel.executiveConclusion))
})

test('USDC stablecoin low risk classification', () => {
  const intel = computeExecutiveIntelligence({
    modeId: 'token',
    symbol: 'USDC',
    narrativeCategory: 'stablecoin',
    composite: { score: 22, subscores: { contractRisk: 18, narrativeRisk: 25, behaviorRisk: 20, liquidityRisk: 15 } },
    scannerReport: { trustScore: 88 },
    providerFlags: { hasScan: true },
  })
  assert.equal(intel.classification, 'STABLECOIN ASSET')
  assert.equal(intel.classificationSecondaryDriver, 'Reserve Transparency')
})

test('BONK narrative driven classification', () => {
  const intel = computeExecutiveIntelligence({
    modeId: 'token',
    symbol: 'BONK',
    narrativeCategory: 'meme',
    narrativeElevated: true,
    composite: {
      score: 52,
      subscores: { contractRisk: 30, narrativeRisk: 68, behaviorRisk: 35, liquidityRisk: 40 },
    },
    scannerReport: { trustScore: 70 },
  })
  assert.equal(intel.classification, 'MEME SPECULATIVE ASSET')
})

test('WIF scanner attachment classifies MEME SPECULATIVE without explicit narrativeCategory', () => {
  const intel = executiveIntelligenceFromScanner(
    {
      trustScore: 76,
      compositeTrustScore: 76,
      mintAuthority: null,
      freezeAuthority: null,
      tokenConcentration: { top10HolderPct: 79.9 },
      liquidityIntelligence: { liquidityDepthLabel: 'Strong', concentrationLabel: 'CRITICAL' },
    },
    { symbol: 'WIF' },
  )
  assert.equal(intel.classification, 'MEME SPECULATIVE ASSET')
  assert.equal(intel.classificationSecondaryDriver, 'Concentrated Holder Distribution')
})
