/**
 * Prime Intelligence partial-provider messaging — avoids contradictory "scan failed"
 * copy when scanner-backed executive assessment is available.
 */

import {
  isTokenContractResolved,
  PROVIDER_COVERAGE_PRELIMINARY_NOTE,
} from './tokenResolutionCopy.mjs'
import { hasVerifiedMetadata, hasScannerValidation } from './assetIntelligenceState.mjs'

export { PROVIDER_COVERAGE_PRELIMINARY_NOTE }

export const PARTIAL_COVERAGE_TITLE =
  'Partial provider coverage — scanner-backed evidence available.'

export const PARTIAL_COVERAGE_BODY =
  'Some external intelligence providers were unavailable during this scan. Executive assessment generated from scanner-backed blockchain evidence.'

export const ANALYST_PARTIAL_COVERAGE =
  'Preliminary intelligence generated from registry, category, and indexed market context. Live narrative and behavior feeds may enhance this result after provider activation.'

export const TOKEN_PARTIAL_COVERAGE_BODY = PROVIDER_COVERAGE_PRELIMINARY_NOTE

/**
 * @param {object} [report]
 * @param {object} [scannerReport]
 */
export function hasScannerBackedEvidence(report, scannerReport = null) {
  return hasScannerValidation(report, scannerReport)
}

/**
 * @param {object} [report]
 */
export function hasPartialProviderCoverage(report) {
  if (!report) return false
  return Boolean(
    report.providersPending ||
      report.partialProviderCoverage ||
      !report.lunarLive ||
      !report.birdeyeLive ||
      report.confidence === 'Partial provider coverage',
  )
}

function isPreScanResolvedToken(report) {
  if (!report || report.modeId !== 'token') return false
  return isTokenContractResolved(report) && !hasScannerBackedEvidence(report, report?.scannerReport)
}

/**
 * @param {object} [report]
 * @param {object} [scannerReport]
 * @param {boolean} [scanFailed]
 * @returns {{ type: 'partial' | 'failure', title: string, body: string } | null}
 */
export function resolveScanStatusBanner(report, scannerReport = null, scanFailed = false) {
  if (!report) return null

  // Resolved pre-scan tokens: provider notes belong in coverage sections only.
  if (isPreScanResolvedToken(report)) {
    return null
  }

  const hasEvidence = hasScannerBackedEvidence(report, scannerReport)
  const partial = hasPartialProviderCoverage(report)

  if (hasEvidence && (partial || report.isFallback || scanFailed)) {
    const body = report.modeId === 'token' ? TOKEN_PARTIAL_COVERAGE_BODY : PARTIAL_COVERAGE_BODY
    return { type: 'partial', title: PARTIAL_COVERAGE_TITLE, body }
  }

  if (!hasEvidence && (report.isFallback || scanFailed)) {
    if (isTokenContractResolved(report)) {
      return null
    }
    return {
      type: 'failure',
      title:
        report.modeId === 'token'
          ? 'Token intelligence coverage limited'
          : 'Intelligence coverage limited',
      body:
        report.fallbackMessage ||
        'Intelligence synthesis could not complete with current provider coverage. Retry the scan or open Contract Analyzer.',
    }
  }

  return null
}
