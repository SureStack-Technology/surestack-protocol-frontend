import assert from 'node:assert/strict'
import test from 'node:test'
import { enrichReportWithCanonical, resolveCanonicalAssetSync } from '../intelligence/canonicalAssetResolver.mjs'
import { buildExecutiveSummary } from './buildExecutiveSummary.mjs'
import {
  buildPreliminaryExecutiveIntel,
  buildPreliminaryExecutiveSummary,
} from './preliminaryExecutiveIntel.mjs'
import {
  buildCategoryExecutiveStrengths,
  resolveExecutiveSummaryCategoryContext,
} from './executiveSummaryStrengths.mjs'

const LINK_ADDR = '0x514910771AF9Ca656af840dff83E8264EcF986CA'
const USDC_ADDR = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const UNI_ADDR = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'
const WIF_MINT = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'
const TAO_MINT = resolveCanonicalAssetSync('TAO').address

const ORACLE_STRENGTHS = [
  'Established oracle network',
  'Deep market adoption',
  'Long deployment history',
]

function stubRegistryReport(query) {
  const canonical = resolveCanonicalAssetSync(query)
  const report = enrichReportWithCanonical(
    {
      modeId: 'token',
      query,
      displayTarget: query,
      narrativeCategory: canonical.narrativeCategory,
      targetClassification: {
        type: 'token',
        symbol: canonical.symbol,
        name: canonical.name,
        address: canonical.address,
        recommendedModule: 'token',
        canonicalAsset: canonical,
      },
      tokenResolution: {
        resolved: true,
        symbol: canonical.symbol,
        name: canonical.name,
        address: canonical.address,
        source: 'registry',
      },
      scannerSignals: { hasScan: false },
      isPreliminary: true,
    },
    canonical,
  )
  const executive = buildPreliminaryExecutiveIntel(report)
  return { report, executive }
}

function assertStrengthsMatch(strengths, expectedIncludes, forbidden = []) {
  for (const needle of expectedIncludes) {
    assert.ok(strengths.some((s) => s.includes(needle)), `missing strength containing: ${needle}`)
  }
  for (const bad of forbidden) {
    assert.ok(!strengths.some((s) => bad.test(s)), `forbidden strength matched: ${bad}`)
  }
}

test('resolveExecutiveSummaryCategoryContext maps LINK contract to oracle', () => {
  const ctx = resolveExecutiveSummaryCategoryContext(stubRegistryReport(LINK_ADDR).report)
  assert.equal(ctx.narrativeCategory, 'oracle')
  assert.equal(ctx.canonicalCategory, 'ORACLE_INFRASTRUCTURE')
  assert.equal(ctx.isRegistryBacked, true)
})

test('LINK symbol, name, and contract share identical preliminary executive summary strengths', () => {
  const summaries = ['LINK', 'Chainlink', LINK_ADDR].map((query) => {
    const { report, executive } = stubRegistryReport(query)
    return buildPreliminaryExecutiveSummary({ report, executive })
  })

  const first = summaries[0].primaryStrengths
  for (const summary of summaries) {
    assert.deepEqual(summary.primaryStrengths, first)
    assertStrengthsMatch(summary.primaryStrengths, ORACLE_STRENGTHS, [
      /category intelligence model active/i,
      /^Classification:/i,
    ])
    assert.deepEqual(summary.primaryRisks, summaries[0].primaryRisks)
  }
})

test('buildExecutiveSummary merges oracle strengths for registry LINK contract input', () => {
  const { report, executive } = stubRegistryReport(LINK_ADDR)
  const summary = buildExecutiveSummary({ report, executive, scannerReport: null })
  assertStrengthsMatch(summary.primaryStrengths, ORACLE_STRENGTHS, [/category intelligence model active/i])
})

test('USDC inputs use stablecoin-specific strengths', () => {
  for (const query of ['USDC', 'USD Coin', USDC_ADDR]) {
    const { report, executive } = stubRegistryReport(query)
    const summary = buildPreliminaryExecutiveSummary({ report, executive })
    assertStrengthsMatch(summary.primaryStrengths, ['stablecoin profile', 'Issuer-backed'], [
      /category intelligence model active/i,
    ])
  }
})

test('WIF inputs use meme-specific strengths', () => {
  for (const query of ['WIF', 'dogwifhat', WIF_MINT]) {
    const { report, executive } = stubRegistryReport(query)
    const summary = buildPreliminaryExecutiveSummary({ report, executive })
    assertStrengthsMatch(summary.primaryStrengths, ['Narrative-driven', 'meme'], [
      /category intelligence model active/i,
    ])
  }
})

test('UNI inputs use governance/DeFi strengths', () => {
  for (const query of ['UNI', 'Uniswap', UNI_ADDR]) {
    const { report, executive } = stubRegistryReport(query)
    const summary = buildPreliminaryExecutiveSummary({ report, executive })
    assert.ok(
      summary.primaryStrengths.some((s) => /governance|DeFi protocol/i.test(s)),
      query,
    )
    assert.ok(!summary.primaryStrengths.some((s) => /category intelligence model active/i.test(s)), query)
  }
})

test('TAO uses AI-specific strengths across input forms', () => {
  for (const query of ['TAO', 'Bittensor', TAO_MINT]) {
    const { report, executive } = stubRegistryReport(query)
    const summary = buildPreliminaryExecutiveSummary({ report, executive })
    assertStrengthsMatch(summary.primaryStrengths, ['AI / compute'], [/category intelligence model active/i])
  }
})

test('buildCategoryExecutiveStrengths honors ORACLE_INFRASTRUCTURE via narrative oracle', () => {
  const strengths = buildCategoryExecutiveStrengths('oracle')
  assert.deepEqual(strengths, ORACLE_STRENGTHS)
})

test('BONK and RNDR registry inputs use meme and AI strengths', () => {
  const bonk = buildPreliminaryExecutiveSummary(stubRegistryReport('BONK'))
  assert.ok(bonk.primaryStrengths.some((s) => /meme|Narrative-driven/i.test(s)))

  const rndr = buildPreliminaryExecutiveSummary(stubRegistryReport('RNDR'))
  assert.ok(rndr.primaryStrengths.some((s) => /AI \/ compute/i.test(s)))

  const fet = buildPreliminaryExecutiveSummary(stubRegistryReport('FET'))
  assert.ok(fet.primaryStrengths.some((s) => /AI \/ compute/i.test(s)))
})
