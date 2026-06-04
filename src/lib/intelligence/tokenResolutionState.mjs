/**
 * Token resolution state machine — consistent institutional messaging.
 */

import { isTokenContractResolved } from './tokenResolutionCopy.mjs'
import {
  ASSET_INTEL_STATES,
  hasRegistryMatch,
  hasVerifiedMetadata,
  isMintOrContractDetected,
} from './assetIntelligenceState.mjs'

export { UNRESOLVED_ASSET_TITLE, UNRESOLVED_ASSET_COPY } from './tokenResolutionCopy.mjs'

/**
 * @typedef {'fully_resolved' | 'symbol_resolved' | 'unresolved'} TokenResolutionState
 */

/**
 * @param {object} [report]
 * @param {object} [confirmedTokenContract]
 * @returns {TokenResolutionState}
 */
export function resolveTokenResolutionState(report, confirmedTokenContract = null) {
  if (!report) return 'unresolved'

  const hasScan = Boolean(report.scannerSignals?.hasScan || report.scannerReport?.success === true)
  const identified = isTokenIdentified(report, confirmedTokenContract)

  if (!identified) return 'unresolved'
  if (hasScan) return 'fully_resolved'
  return 'symbol_resolved'
}

/**
 * Token is identified when registry/classifier/resolver produced symbol + address.
 * @param {object} [report]
 * @param {object} [confirmedTokenContract]
 */
export function isTokenIdentified(report, confirmedTokenContract = null) {
  if (!report) return false
  if (report.tokenResolution?.status === 'unresolved') return false
  if (hasRegistryMatch(report)) return true
  if (hasVerifiedMetadata(report, report?.scannerReport)) return true

  if (report.isSolanaToken || report.analysisModeId === 'solana_token') {
    return false
  }

  if (isTokenContractResolved(report, confirmedTokenContract)) {
    const sym = report.tokenResolution?.symbol || report.targetClassification?.symbol
    if (sym) return true
    if (hasRegistryMatch(report)) return true
  }

  if (report.tokenResolution?.resolved && report.tokenResolution?.address && report.tokenResolution?.symbol) {
    return true
  }

  if (
    report.targetClassification?.address &&
    report.targetClassification?.symbol &&
    report.targetClassification?.recommendedModule === 'token'
  ) {
    return true
  }
  return false
}

/**
 * Valid mint/contract without verified metadata.
 * @param {object} [report]
 */
export function isMintDetectedOnly(report) {
  if (!report) return false
  return isMintOrContractDetected(report) && !isTokenIdentified(report)
}

/**
 * @param {object} [report]
 * @param {object} [executive]
 */
export function shouldSuppressUnresolvedCopy(report, executive = null) {
  if (isTokenIdentified(report)) return true
  if (
    executive &&
    !executive.pending &&
    !executive.unverified &&
    executive.classification &&
    executive.classification !== 'Assessment pending' &&
    executive.classification !== 'UNKNOWN ASSET' &&
    (executive.preliminary || Number(executive.confidenceScore) > 0)
  ) {
    return Boolean(report?.targetClassification?.symbol || report?.tokenResolution?.symbol || report?.query)
  }
  return false
}

export const RESOLUTION_STATUS = {
  RESOLVED: 'resolved',
  UNRESOLVED: 'unresolved',
}
