import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveHeroIntelligenceMetrics } from './resolveHeroIntelligenceMetrics.mjs'
import {
  resolveExecutiveClassification,
  resolveClassificationSecondaryDriver,
  executiveIntelligenceFromScanner,
  resolveMemeNarrativeCategory,
} from './executiveIntelligenceEngine.mjs'

const wifCtx = {
  modeId: 'token',
  executiveRiskScore: 45,
  narrativeCategory: 'meme',
  narrativeElevated: false,
  composite: { subscores: { narrativeRisk: 72, contractRisk: 35, liquidityRisk: 40 } },
  scannerReport: {
    tokenConcentration: { top10HolderPct: 79.9 },
    mintAuthority: 'none',
    freezeAuthority: 'none',
    liquidityIntelligence: { concentrationLabel: 'CRITICAL', liquidityDepthLabel: 'Strong' },
  },
  liquidityIntel: { concentrationLabel: 'CRITICAL', liquidityDepthLabel: 'Strong' },
}

test('WIF meme token classifies as MEME SPECULATIVE with concentrated holder secondary driver', () => {
  assert.equal(resolveExecutiveClassification(wifCtx), 'MEME SPECULATIVE ASSET')
  assert.equal(resolveClassificationSecondaryDriver(wifCtx), 'Concentrated Holder Distribution')
})

test('resolveHeroIntelligenceMetrics returns non-zero risk after scanner evidence', () => {
  const metrics = resolveHeroIntelligenceMetrics({
    report: {
      composite: { score: 45 },
      targetClassification: { symbol: 'WIF' },
    },
    executive: {
      executiveRiskScore: 45,
      executiveRiskBand: 'MODERATE RISK',
      assetLabel: 'dogwifhat (WIF)',
    },
    scannerReport: {
      success: true,
      product: 'surestack_solana_risk_scanner',
      compositeTrustScore: 55,
    },
  })

  assert.ok(metrics)
  assert.equal(metrics.riskScore, 45)
  assert.ok(metrics.volatility > 0)
  assert.equal(metrics.active, true)
  assert.equal(metrics.riskBand, 'MODERATE')
})

test('resolveMemeNarrativeCategory detects WIF, BONK, and dogwifhat by name', () => {
  assert.equal(resolveMemeNarrativeCategory({ symbol: 'WIF' }), 'meme')
  assert.equal(resolveMemeNarrativeCategory({ symbol: 'BONK' }), 'meme')
  assert.equal(resolveMemeNarrativeCategory({ tokenName: 'dogwifhat' }), 'meme')
  assert.equal(resolveMemeNarrativeCategory({ query: 'PEPE' }), 'meme')
})

test('WIF backend scanner executive resolves MEME SPECULATIVE without narrativeCategory in ctx', () => {
  const intel = executiveIntelligenceFromScanner(wifCtx.scannerReport, { symbol: 'WIF' })
  assert.equal(intel.classification, 'MEME SPECULATIVE ASSET')
  assert.equal(intel.classificationSecondaryDriver, 'Concentrated Holder Distribution')
  assert.notEqual(intel.classification, 'CONCENTRATED EXPOSURE ASSET')
})
