import { test } from 'node:test'
import assert from 'node:assert/strict'

/** Mirrors ExecutiveIntelligenceCard normalizeList (same contract). */
function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') return value ? [value] : []
  if (value && typeof value === 'object') {
    if (Array.isArray(value.items)) return value.items.filter(Boolean)
    if (Array.isArray(value.recommendations)) return value.recommendations.filter(Boolean)
    if (typeof value.label === 'string') return [value.label]
    if (typeof value.title === 'string') return [value.title]
  }
  return []
}

function renderInvestigations(executive) {
  const recommendedNextInvestigations = normalizeList(executive?.recommendedNextInvestigation)
  return recommendedNextInvestigations.length > 0
    ? recommendedNextInvestigations
    : ['Review evidence layers']
}

const WIF_EXECUTIVE_BASE = {
  assetLabel: 'dogwifhat (WIF)',
  classification: 'MEME SPECULATIVE ASSET',
  executiveRiskScore: 52,
  executiveRiskBand: 'ELEVATED RISK',
  executiveRiskBandId: 'elevated',
  confidenceScore: 68,
  confidenceInterpretation: 'Moderate provider coverage',
  executiveConclusion: 'Observations for dogwifhat (WIF)',
  keyFindings: ['Mint authority revoked or absent'],
}

test('normalizeList handles string recommendedNextInvestigation (WIF pending state)', () => {
  const executive = {
    ...WIF_EXECUTIVE_BASE,
    recommendedNextInvestigation:
      'Run Solana Token Scan for scanner-backed mint, liquidity, holder, and routing evidence.',
  }
  const items = renderInvestigations(executive)
  assert.equal(items.length, 1)
  assert.match(items[0], /Solana Token Scan/)
  assert.doesNotThrow(() => items.map((item) => item))
})

test('normalizeList handles object recommendedNextInvestigation', () => {
  const executive = {
    ...WIF_EXECUTIVE_BASE,
    recommendedNextInvestigation: {
      label: 'Review Liquidity Intelligence',
      items: ['Review Holder Concentration', 'Review Narrative Intelligence'],
    },
  }
  const items = renderInvestigations(executive)
  assert.deepEqual(items, ['Review Holder Concentration', 'Review Narrative Intelligence'])
  assert.doesNotThrow(() => items.map((item) => item))
})

test('normalizeList handles array recommendedNextInvestigation (post-scan WIF)', () => {
  const executive = {
    ...WIF_EXECUTIVE_BASE,
    recommendedNextInvestigation: [
      'Review Liquidity Intelligence',
      'Review Holder Concentration',
    ],
  }
  const items = renderInvestigations(executive)
  assert.deepEqual(items, ['Review Liquidity Intelligence', 'Review Holder Concentration'])
})

test('normalizeList empty recommendedNextInvestigation falls back to Review evidence layers', () => {
  const executive = { ...WIF_EXECUTIVE_BASE, recommendedNextInvestigation: null }
  const items = renderInvestigations(executive)
  assert.deepEqual(items, ['Review evidence layers'])
})

test('normalizeList handles string and object keyFindings', () => {
  assert.deepEqual(normalizeList('Single finding'), ['Single finding'])
  assert.deepEqual(normalizeList({ title: 'Liquidity thin' }), ['Liquidity thin'])
  assert.deepEqual(normalizeList(['a', '', 'b']), ['a', 'b'])
})

test('normalizeList string recommendedNextInvestigation is mappable (no crash)', () => {
  const stringRec = normalizeList('Run Solana Token Scan')
  assert.deepEqual(stringRec, ['Run Solana Token Scan'])
  assert.doesNotThrow(() => stringRec.map((x) => x))
})
