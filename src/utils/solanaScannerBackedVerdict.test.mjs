import { test } from 'node:test'
import assert from 'node:assert/strict'

const SOLANA_SCANNED_MODE_VERDICT =
  'Solana mint scanned — liquidity, holder concentration, authority, and routing evidence available.'

function solanaScannerReportActive(scannerReport) {
  return Boolean(
    scannerReport &&
      (scannerReport.chain === 'solana' ||
        scannerReport.addressType === 'SPL_TOKEN_MINT' ||
        scannerReport.product === 'surestack_solana_risk_scanner'),
  )
}

function isSolanaScannerBacked(report, scannerReport = null) {
  const sr = scannerReport || report?.scannerReport
  if (!sr || sr.success === false) return false
  if (!solanaScannerReportActive(sr)) return false
  return Boolean(
    report?.analysisModeId === 'solana_token' ||
      sr.success === true ||
      sr.trustScore != null ||
      sr.compositeTrustScore != null ||
      sr.technicalTrustScore != null ||
      sr.liquidityIntelligence != null,
  )
}

function solanaScannedThreatPills(report) {
  const pills = [{ label: 'Scanner watch', level: 'MEDIUM' }]
  if (report.narrativeCategory === 'meme') {
    pills.push({ label: 'Meme narrative', level: 'HIGH' })
  }
  if (!report.birdeyeLive) {
    pills.push({
      label: 'Behavior partial',
      level: report.narrativeCategory === 'meme' ? 'MEDIUM' : 'LOW',
    })
  }
  return pills.slice(0, 5)
}

function enrichSolanaScannerBackedReport(report, scannerReport = null) {
  if (!report || !isSolanaScannerBacked(report, scannerReport)) return report
  const sr = scannerReport || report.scannerReport
  return {
    ...report,
    isSolanaToken: true,
    analysisModeId: 'solana_token',
    solanaMintResolved: true,
    isPreliminary: false,
    modeVerdict: SOLANA_SCANNED_MODE_VERDICT,
    confidence: 'Evidence verified',
    scannerValidation: 'Complete',
    recommendation:
      'Review liquidity concentration, holder distribution, and narrative momentum before interaction.',
    contractProofNote:
      'Scanner evidence available — liquidity, holder concentration, authority controls, and routing indexed.',
    scannerReport: sr,
    scannerSignals: { ...(report.scannerSignals || {}), hasScan: true },
    threats: solanaScannedThreatPills(report),
  }
}

const WIF_SCANNER = {
  success: true,
  product: 'surestack_solana_risk_scanner',
  chain: 'solana',
  addressType: 'SPL_TOKEN_MINT',
  compositeTrustScore: 76,
}

const STALE_REPORT = {
  modeId: 'token',
  query: 'WIF',
  narrativeCategory: 'meme',
  birdeyeLive: false,
  modeVerdict:
    'Scenario and provider-prepared token intelligence only — contract proof unavailable until the token contract is resolved.',
  confidence: 'Scenario / provider-prepared',
  scannerValidation: 'Scenario only',
  recommendation: 'Proceed with scenario narrative context',
  contractProofNote: 'Contract proof unavailable until token contract is resolved.',
  composite: {
    score: 47,
    subscores: {
      contractRisk: 38,
      narrativeRisk: 72,
      behaviorRisk: 48,
      liquidityRisk: 55,
      walletExposureRisk: 52,
    },
  },
  threats: [{ label: 'Scenario narrative', level: 'LOW' }],
}

test('WIF scanner-backed report replaces stale top verdict fields', () => {
  const enriched = enrichSolanaScannerBackedReport(
    { ...STALE_REPORT, analysisModeId: 'solana_token', scannerReport: WIF_SCANNER },
    WIF_SCANNER,
  )

  assert.equal(enriched.confidence, 'Evidence verified')
  assert.equal(enriched.scannerValidation, 'Complete')
  assert.match(enriched.modeVerdict, /Solana mint scanned/)
  assert.doesNotMatch(String(enriched.modeVerdict), /Scenario only|contract proof unavailable/i)
  assert.doesNotMatch(String(enriched.contractProofNote), /contract proof unavailable/i)
})

test('WIF scanner-backed threats match expected indicators', () => {
  const enriched = enrichSolanaScannerBackedReport(
    { ...STALE_REPORT, analysisModeId: 'solana_token' },
    WIF_SCANNER,
  )
  const labels = enriched.threats.map((t) => t.label)
  assert.ok(labels.includes('Scanner watch'))
  assert.ok(labels.includes('Meme narrative'))
  assert.ok(labels.includes('Behavior partial'))
})

test('composite subscores preserved for top panel line', () => {
  const enriched = enrichSolanaScannerBackedReport(
    { ...STALE_REPORT, analysisModeId: 'solana_token' },
    WIF_SCANNER,
  )
  assert.equal(enriched.composite.subscores.narrativeRisk, 72)
})

test('non-scanner report unchanged', () => {
  const plain = { ...STALE_REPORT }
  assert.equal(enrichSolanaScannerBackedReport(plain, null), plain)
})
