import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resolvePreliminaryRiskScore,
  resolveIntelligenceConfidenceBand,
  ASSESSMENT_STAGES,
} from './preliminaryExecutiveIntel.mjs'
import { resolveExecutiveClassification } from './executiveIntelligenceEngine.mjs'

test('preliminary confidence band uses registry validation range', () => {
  const band = resolveIntelligenceConfidenceBand({
    assessmentStage: ASSESSMENT_STAGES.PRELIMINARY,
    narrativeCategory: 'oracle',
    tokenResolved: true,
    lunarLive: false,
  })
  assert.ok(band.score >= 60 && band.score <= 70)
  assert.match(band.interpretation, /registry|category/i)
})

test('preliminary LINK risk score maps to moderate-low band', () => {
  const score = resolvePreliminaryRiskScore('oracle')
  assert.ok(score >= 28 && score <= 40)
  const classification = resolveExecutiveClassification({
    modeId: 'token',
    executiveRiskScore: score,
    narrativeCategory: 'oracle',
    symbol: 'LINK',
    query: 'LINK',
  })
  assert.equal(classification, 'ORACLE INFRASTRUCTURE')
})

test('scanner validated confidence band reaches scanner-backed range', () => {
  const band = resolveIntelligenceConfidenceBand({
    assessmentStage: ASSESSMENT_STAGES.SCANNER_VALIDATED,
    hasScan: true,
  })
  assert.ok(band.score >= 80)
  assert.match(band.interpretation, /scanner-backed/i)
})
