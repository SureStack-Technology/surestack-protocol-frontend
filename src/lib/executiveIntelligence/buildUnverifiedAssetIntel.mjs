import { EXECUTIVE_INTEL_DISCLAIMER } from './executiveIntelligenceEngine.mjs'
import {
  ASSET_INTEL_STATES,
  assetIntelligenceUiCopy,
  confidenceCapForState,
  resolveAssetIntelligenceState,
} from '../intelligence/assetIntelligenceState.mjs'
import { getAssetDisplayName, getReportCanonicalAsset } from '../intelligence/assetDisplayLabel.mjs'

/**
 * Executive placeholder for unknown / mint-only assets — no fabricated classification or risk.
 * @param {object} report
 * @param {object} [options]
 */
export function buildUnverifiedAssetExecutiveIntel(report, { state = null } = {}) {
  if (!report) return null

  const intelState =
    state ||
    resolveAssetIntelligenceState({
      report,
      scannerReport: report.scannerReport,
    })
  const ui = assetIntelligenceUiCopy(intelState)
  const confidenceCap = confidenceCapForState(intelState)
  const addr =
    report.solanaMintAddress ||
    report.tokenResolution?.address ||
    report.targetClassification?.address
  const canonical = getReportCanonicalAsset(report)
  const label = canonical?.resolved
    ? getAssetDisplayName(canonical, report.query)
    : report.displayTarget || report.query || addr || 'Unknown asset'

  return {
    assetLabel: label,
    classification: 'UNKNOWN ASSET',
    classificationSecondaryDriver: null,
    executiveRiskScore: '—',
    executiveRiskBand: 'PENDING',
    executiveRiskBandId: 'pending',
    confidenceScore: confidenceCap,
    confidenceInterpretation: ui.subtitle,
    assessmentStage: 'UNVERIFIED',
    assessmentStatus:
      intelState === ASSET_INTEL_STATES.MINT_DETECTED ? 'Mint detected' : 'Asset detected',
    compositeInterpretation: null,
    keyFindings: ['No verified intelligence profile available.'],
    executiveConclusion: 'No verified intelligence profile available.',
    recommendedNextInvestigation: [
      report.isSolanaToken || report.analysisModeId === 'solana_token'
        ? 'Run Solana Token Scan to resolve metadata, liquidity, holder, and authority evidence.'
        : 'Run Intelligence Scan to resolve metadata and validate contract-backed evidence.',
    ],
    disclaimer: EXECUTIVE_INTEL_DISCLAIMER,
    pending: true,
    unverified: true,
    preliminary: false,
    assetIntelligenceState: intelState,
    generatedAt: new Date().toISOString(),
  }
}
