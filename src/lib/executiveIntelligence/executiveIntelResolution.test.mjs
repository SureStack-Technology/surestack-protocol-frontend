import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeExecutiveIntelligence,
  calibrateExecutiveRiskScore,
  executiveRiskBandFromScore,
} from './executiveIntelligenceEngine.mjs'

/** Mirrors buildExecutiveIntel.js */
function hasScannerEvidence(report, scannerReport = null) {
  const sr = scannerReport || report?.scannerReport || null
  return Boolean(
    sr?.success === true ||
    (sr?.success !== false && sr?.product === 'surestack_solana_risk_scanner') ||
    report?.scannerSignals?.hasScan ||
    sr?.trustScore != null ||
    sr?.compositeTrustScore != null,
  )
}

function isExecutiveIntelPending(intel) {
  if (!intel) return true
  return Boolean(
    intel.pending ||
    intel.classification === 'Assessment pending' ||
    intel.executiveRiskBandId === 'pending' ||
    intel.confidenceInterpretation === 'Pending scanner evidence',
  )
}

function formatAssetLabel(symbol, name) {
  const sym = symbol ? String(symbol).trim().toUpperCase() : null
  const nm = name ? String(name).trim() : null
  if (nm && sym) {
    if (new RegExp(`\\(${sym}\\)`, 'i').test(nm)) return nm
    return `${nm} (${sym})`
  }
  if (nm) return nm
  if (sym) return sym
  return 'Intelligence target'
}

function buildWifExecutive(report, scannerReport) {
  const composite = report.composite
  const rawScore =
    composite?.score ??
    (scannerReport.compositeTrustScore != null
      ? 100 - scannerReport.compositeTrustScore
      : 48)
  const executiveRiskScore = calibrateExecutiveRiskScore(rawScore, {
    scannerReport,
    composite,
    narrativeCategory: 'meme',
    narrativeElevated: true,
    liquidityIntel: scannerReport.liquidityIntelligence,
  })
  return computeExecutiveIntelligence({
    modeId: 'token',
    symbol: 'WIF',
    tokenName: 'dogwifhat (WIF)',
    assetLabel: formatAssetLabel('WIF', 'dogwifhat (WIF)'),
    narrativeCategory: 'meme',
    narrativeElevated: true,
    composite,
    scannerReport,
    liquidityIntel: scannerReport.liquidityIntelligence,
    providerFlags: { hasScan: true, narrativeFallback: true, behaviorCoverage: 'partial' },
    executiveRiskScore,
  })
}

const WIF_SCANNER = {
  success: true,
  product: 'surestack_solana_risk_scanner',
  chain: 'solana',
  addressType: 'SPL_TOKEN_MINT',
  symbol: 'WIF',
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
  },
  liquidityIntelligence: {
    intelligenceScore: 38,
    liquidityDepthLabel: 'Strong',
    concentrationLabel: 'CRITICAL',
  },
}

test('WIF: pending report executive is replaced when scannerReport.success is true', () => {
  const report = {
    modeId: 'token',
    query: 'WIF',
    isSolanaToken: true,
    analysisModeId: 'solana_token',
    narrativeCategory: 'meme',
    narrativeElevated: true,
    composite: {
      score: 47,
      subscores: { narrativeRisk: 72, contractRisk: 38, liquidityRisk: 55, walletExposureRisk: 52 },
    },
    executiveIntelligence: {
      classification: 'Assessment pending',
      pending: true,
      confidenceScore: 0,
    },
    scannerSignals: { hasScan: true },
  }

  assert.equal(hasScannerEvidence(report, WIF_SCANNER), true)
  const executive = buildWifExecutive(report, WIF_SCANNER)

  assert.notEqual(executive.classification, 'Assessment pending')
  assert.notEqual(executive.confidenceInterpretation, 'Pending scanner evidence')
  assert.ok(executive.executiveRiskScore >= 42)
  assert.ok(executive.confidenceScore > 0)
  assert.match(String(executive.classification), /MEME SPECULATIVE|NARRATIVE DRIVEN/)
  assert.notEqual(executive.executiveRiskBand, 'LOW RISK')
})

test('WIF: trust inversion alone is floored to MODERATE executive risk', () => {
  const report = {
    composite: { score: null, subscores: { narrativeRisk: 72 } },
  }
  const calibrated = calibrateExecutiveRiskScore(24, {
    scannerReport: WIF_SCANNER,
    narrativeCategory: 'meme',
    narrativeElevated: true,
    liquidityIntel: WIF_SCANNER.liquidityIntelligence,
  })
  assert.ok(calibrated >= 45)
  const band = executiveRiskBandFromScore(calibrated)
  assert.equal(band.label, 'MODERATE RISK')
})

test('WIF: asset label is not duplicated', () => {
  assert.equal(formatAssetLabel('WIF', 'dogwifhat (WIF)'), 'dogwifhat (WIF)')
  const executive = buildWifExecutive(
    { composite: { score: 47, subscores: { narrativeRisk: 72 } } },
    WIF_SCANNER,
  )
  assert.equal(executive.assetLabel, 'dogwifhat (WIF)')
  assert.doesNotMatch(executive.assetLabel, /\(WIF\)\s*\(WIF\)/)
})

test('WIF: scanner-backed executive is not pending', () => {
  const executive = buildWifExecutive(
    {
      composite: { score: 47, subscores: { narrativeRisk: 72, liquidityRisk: 55 } },
      scannerSignals: { hasScan: true },
    },
    WIF_SCANNER,
  )
  assert.equal(isExecutiveIntelPending(executive), false)
  assert.equal(typeof executive.executiveRiskScore, 'number')
})

test('no scanner evidence keeps pending executive', () => {
  const pending = {
    classification: 'Assessment pending',
    pending: true,
    confidenceScore: 0,
  }
  assert.equal(hasScannerEvidence({ modeId: 'token' }, null), false)
  assert.equal(isExecutiveIntelPending(pending), true)
})
