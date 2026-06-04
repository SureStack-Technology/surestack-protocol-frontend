import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAssetDisplayName,
  getAssetShortSymbol,
  getTechnicalTargetLabel,
  isRawBlockchainTarget,
  resolveReportDisplayLabels,
} from './assetDisplayLabel.mjs'
import { enrichReportWithCanonical, resolveCanonicalAssetSync } from './canonicalAssetResolver.mjs'
import { buildPreliminaryExecutiveSummary } from '../executiveIntelligence/preliminaryExecutiveIntel.mjs'
import { buildPreliminaryExecutiveIntel } from '../executiveIntelligence/preliminaryExecutiveIntel.mjs'
const LINK_ADDR = '0x514910771AF9Ca656af840dff83E8264EcF986CA'
const EXPECTED_DISPLAY = 'Chainlink (LINK)'

function stubLinkReport(query) {
  const canonical = resolveCanonicalAssetSync(query)
  const tokenResolution = {
    resolved: true,
    symbol: 'LINK',
    name: 'Chainlink',
    address: LINK_ADDR.toLowerCase(),
    source: 'registry',
  }
  const base = {
    modeId: 'token',
    query,
    displayTarget: query,
    targetClassification: {
      type: 'token',
      symbol: 'LINK',
      name: 'Chainlink',
      address: LINK_ADDR.toLowerCase(),
      recommendedModule: 'token',
      canonicalAsset: canonical,
    },
    tokenResolution,
    narrativeCategory: 'oracle',
    scannerSignals: { hasScan: false },
    isPreliminary: true,
  }
  return enrichReportWithCanonical(base, canonical)
}

test('LINK inputs resolve to Chainlink (LINK) display name', () => {
  for (const input of ['LINK', 'Chainlink', LINK_ADDR]) {
    const labels = resolveReportDisplayLabels({ query: input })
    assert.equal(labels.displayName, EXPECTED_DISPLAY, input)
    assert.equal(labels.shortSymbol, 'LINK', input)
    assert.equal(labels.narrativeSymbol, 'LINK', input)
  }
})

test('raw address never appears in marketing display labels', () => {
  const labels = resolveReportDisplayLabels(stubLinkReport(LINK_ADDR))
  assert.equal(labels.displayName, EXPECTED_DISPLAY)
  assert.doesNotMatch(labels.displayName, /0x514910/i)
  assert.equal(getTechnicalTargetLabel(LINK_ADDR, labels.canonicalAsset), LINK_ADDR)
})

test('display name helper maps contract address to canonical name', () => {
  for (const input of ['LINK', 'Chainlink', LINK_ADDR]) {
    const canonical = resolveCanonicalAssetSync(input)
    assert.equal(getAssetDisplayName(canonical, input), EXPECTED_DISPLAY, input)
  }
})

test('narrative headline prefix uses Chainlink (LINK) not raw address', () => {
  const display = getAssetDisplayName(resolveCanonicalAssetSync(LINK_ADDR), LINK_ADDR)
  const headline = `${display} — Narrative generated from category intelligence`
  assert.match(headline, /^Chainlink \(LINK\)/)
  assert.doesNotMatch(headline, /0x514910/i)
})

test('preliminary executive summary uses oracle strengths for all LINK inputs', () => {
  for (const query of ['LINK', 'Chainlink', LINK_ADDR]) {
    const report = stubLinkReport(query)
    const executive = buildPreliminaryExecutiveIntel(report)
    const summary = buildPreliminaryExecutiveSummary({ report, executive })
    assert.equal(executive.assetLabel, EXPECTED_DISPLAY, query)
    assert.equal(summary.assetLabel, EXPECTED_DISPLAY, query)
    assert.ok(summary.primaryStrengths.includes('Established oracle network'), query)
    assert.ok(summary.primaryRisks.some((r) => /scanner validation pending/i.test(r)), query)
    assert.ok(
      !summary.primaryStrengths.some((s) => /^Classification: ORACLE/i.test(s)),
      query,
    )
  }
})

test('short symbol helper rejects raw blockchain ids', () => {
  assert.equal(getAssetShortSymbol(null, LINK_ADDR), '')
  assert.ok(isRawBlockchainTarget(LINK_ADDR))
  assert.equal(getAssetDisplayName(null, LINK_ADDR), 'Intelligence target')
})
