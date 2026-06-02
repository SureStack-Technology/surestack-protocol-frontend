import { solanaScannerReportActive } from './solanaTokenTarget.js'
import { buildInstitutionalAnalystAssessment } from '../lib/executiveIntelligence/buildInstitutionalAnalystAssessment.mjs'

export const SOLANA_SCANNED_MODE_VERDICT =
  'Solana mint scanned — liquidity, holder concentration, authority, and routing evidence available.'

export const SOLANA_SCANNED_RECOMMENDATION =
  'Review liquidity concentration, holder distribution, and narrative momentum before interaction.'

export const SOLANA_SCANNED_CONTRACT_PROOF =
  'Scanner evidence available — liquidity, holder concentration, authority controls, and routing indexed.'

/**
 * @param {object} [report]
 * @param {object} [scannerReport]
 */
export function isSolanaScannerBacked(report, scannerReport = null) {
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

/** @param {object} report */
export function solanaScannedThreatPills(report) {
  const pills = []
  pills.push({ label: 'Scanner watch', level: 'MEDIUM' })
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

/**
 * Merge scanner-backed Solana verdict fields onto a terminal report for display/build.
 * @param {object} report
 * @param {object} [scannerReport]
 */
export function enrichSolanaScannerBackedReport(report, scannerReport = null) {
  if (!report || !isSolanaScannerBacked(report, scannerReport)) return report

  const sr = scannerReport || report.scannerReport
  const enriched = {
    ...report,
    isSolanaToken: true,
    analysisModeId: 'solana_token',
    solanaMintResolved: true,
    isPreliminary: false,
    isFallback: false,
    scannerReport: sr,
    modeVerdict: SOLANA_SCANNED_MODE_VERDICT,
    confidence: 'Evidence verified',
    scannerValidation: 'Complete',
    recommendation: SOLANA_SCANNED_RECOMMENDATION,
    mintProofTitle: 'Scanner evidence available',
    contractProofNote: SOLANA_SCANNED_CONTRACT_PROOF,
    scannerSignals: {
      hasScan: true,
      mostlyClean: false,
      honeypotDetected: false,
      maliciousScanner: false,
      unlimitedApproval: false,
      severeFindings: false,
      ...(report.scannerSignals || {}),
      hasScan: true,
    },
    threats: solanaScannedThreatPills(report),
  }

  enriched.analyst = buildInstitutionalAnalystAssessment({
    report: enriched,
    scannerReport: sr,
    executive: report.executiveIntelligence || null,
  })

  return enriched
}
