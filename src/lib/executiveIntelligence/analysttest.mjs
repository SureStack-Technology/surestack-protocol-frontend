import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeExecutiveIntelligence,
  executiveIntelligenceFromScanner,
  resolveExecutiveClassification,
  resolveClassificationSecondaryDriver,
  resolveEffectiveNarrativeCategory,
} from './executiveIntelligenceEngine.mjs'
import { buildInstitutionalAnalystAssessment } from './buildInstitutionalAnalystAssessment.mjs'
import { buildExecutiveSummary } from './buildExecutiveSummary.mjs'

const WIF_SCANNER = {
  success: true,
  product: 'surestack_solana_risk_scanner',
  chain: 'solana',
  addressType: 'SPL_TOKEN_MINT',
  symbol: 'WIF',
  requestedSymbol: 'WIF',
  trustScore: 76,
  compositeTrustScore: 76,
  technicalTrustScore: 88,
  scannerVerdict: 'MODERATE WATCH',
  trustBand: 'MODERATE',
  mintAuthority: null,
  freezeAuthority: null,
  tokenConcentration: {
    top10HolderPct: 79.9,
    holderConcentration: 'Elevated',
    jupiterClassification: 'ROUTABLE',
    pairCount: 4,
  },
  findings: [{ title: 'Jupiter routing available', detail: 'Token is tradable via Jupiter aggregator.' }],
  liquidityIntelligence: {
    intelligenceScore: 38,
    liquidityDepthLabel: 'Strong',
    concentrationLabel: 'CRITICAL',
    jupiterRoutable: true,
  },
}

const WIF_REPORT = {
  modeId: 'token',
  query: 'WIF',
  displayTarget: 'WIF',
  isSolanaToken: true,
  analysisModeId: 'solana_token',
  narrativeCategory: 'meme',
  narrativeElevated: false,
  composite: {
    score: 45,
    verdictLabel: 'MODERATE RISK',
    subscores: { narrativeRisk: 72, contractRisk: 35, liquidityRisk: 55, behaviorRisk: 18 },
  },
  scannerSignals: { hasScan: true },
  scannerReport: WIF_SCANNER,
}

const FALLBACK_PHRASES = /\b(pending|scenario|demo|provider activation|scenario only|live feeds are pending)\b/i

function buildWifExecutive(report = WIF_REPORT, scannerReport = WIF_SCANNER) {
  return computeExecutiveIntelligence({
    modeId: 'token',
    query: report.query,
    symbol: 'WIF',
    tokenName: 'dogwifhat (WIF)',
    narrativeCategory: resolveEffectiveNarrativeCategory({
      narrativeCategory: report.narrativeCategory,
      symbol: 'WIF',
      query: report.query,
      scannerReport,
    }),
    narrativeElevated: report.narrativeElevated,
    composite: report.composite,
    scannerReport,
    liquidityIntel: scannerReport.liquidityIntelligence,
    executiveRiskScore: report.composite.score,
    providerFlags: { hasScan: true, narrativeFallback: true, behaviorCoverage: 'partial' },
  })
}

test('WIF scanner-backed: classification is MEME SPECULATIVE ASSET with concentrated holder secondary', () => {
  const backendIntel = executiveIntelligenceFromScanner(WIF_SCANNER, { symbol: 'WIF', tokenName: 'dogwifhat' })
  assert.equal(backendIntel.classification, 'MEME SPECULATIVE ASSET')
  assert.equal(backendIntel.classificationSecondaryDriver, 'Concentrated Holder Distribution')

  const resolved = buildWifExecutive()
  assert.equal(resolved.classification, 'MEME SPECULATIVE ASSET')
  assert.equal(resolved.classificationSecondaryDriver, 'Concentrated Holder Distribution')
})

test('WIF scanner-backed: symbol-only inference classifies MEME SPECULATIVE not CONCENTRATED EXPOSURE', () => {
  assert.equal(
    resolveExecutiveClassification({
      modeId: 'token',
      executiveRiskScore: 45,
      symbol: 'WIF',
      scannerReport: WIF_SCANNER,
      composite: WIF_REPORT.composite,
      liquidityIntel: WIF_SCANNER.liquidityIntelligence,
    }),
    'MEME SPECULATIVE ASSET',
  )
  assert.equal(
    resolveClassificationSecondaryDriver({
      modeId: 'token',
      executiveRiskScore: 45,
      symbol: 'WIF',
      scannerReport: WIF_SCANNER,
      composite: WIF_REPORT.composite,
      liquidityIntel: WIF_SCANNER.liquidityIntelligence,
    }),
    'Concentrated Holder Distribution',
  )
})

test('WIF scanner-backed: AI analyst avoids fallback language and references scan evidence', () => {
  const executive = buildWifExecutive()
  const analyst = buildInstitutionalAnalystAssessment({
    report: WIF_REPORT,
    scannerReport: WIF_SCANNER,
    executive,
  })

  const blob = [
    analyst.technicalAssessment,
    analyst.primaryRiskDriver,
    analyst.marketStructureAssessment,
    analyst.recommendedMonitoringAction,
    analyst.summary,
    analyst.keyConcern,
    analyst.nextMove,
  ].join(' ')

  assert.doesNotMatch(blob, FALLBACK_PHRASES)
  assert.match(blob, /Mint authority revoked/i)
  assert.match(blob, /Freeze authority revoked/i)
  assert.match(blob, /holder concentration/i)
  assert.match(blob, /liquidity/i)
  assert.match(blob, /scanner-backed/i)
  assert.match(blob, /Meme\/narrative-driven volatility/i)
})

test('WIF scanner-backed: stale fallback analyst is replaced by scanner-backed assessment', () => {
  const staleReport = {
    ...WIF_REPORT,
    isFallback: true,
    analyst: {
      summary: 'WIF intelligence uses narrative intelligence model while live feeds are pending.',
      keyConcern: 'Live narrative and behavior feeds may be partial until provider activation.',
      nextMove: 'Expand Narrative and Behavior evidence layers.',
    },
  }
  const analyst = buildInstitutionalAnalystAssessment({
    report: { ...staleReport, scannerSignals: { hasScan: true } },
    scannerReport: WIF_SCANNER,
    executive: buildWifExecutive(staleReport),
  })
  const blob = Object.values(analyst).join(' ')
  assert.doesNotMatch(blob, FALLBACK_PHRASES)
  assert.match(blob, /Mint authority revoked/i)
  assert.match(blob, /holder concentration/i)
})

test('WIF scanner-backed: executive summary includes revoked authorities and top 10 holder risk', () => {
  const executive = buildWifExecutive()
  const summary = buildExecutiveSummary({
    report: WIF_REPORT,
    executive,
    scannerReport: WIF_SCANNER,
    topVerdictReport: WIF_REPORT,
  })

  assert.ok(summary)
  assert.ok(summary.primaryStrengths.some((s) => /Mint authority revoked/i.test(s)))
  assert.ok(summary.primaryStrengths.some((s) => /Freeze authority revoked/i.test(s)))
  assert.ok(summary.primaryRisks.some((s) => /Top 10 holders/i.test(s)))
})
