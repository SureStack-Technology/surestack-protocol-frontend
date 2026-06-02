import {
  computeWalletExposureIntelligenceProfile,
  walletExposureProfileFromRiskData,
} from '../../../../src/lib/walletExposureIntelligence/walletExposureIntelligenceEngine.mjs'
import { buildExposureMetrics } from './walletExposureMetrics.js'

/**
 * Enrich legacy exposureIntelligence with institutional wallet exposure profile.
 * @param {object} signals
 * @param {object[]} approvalRows
 * @param {object} exposureIntelligence — output of computeWalletExposureIntelligence
 * @param {{ score?: number | null, assessmentPending?: boolean, exposureHints?: object }} [ctx]
 */
export function buildWalletExposureProfile(signals, approvalRows, exposureIntelligence, ctx = {}) {
  const metrics = buildExposureMetrics(signals, approvalRows)
  const profile = computeWalletExposureIntelligenceProfile({
    safetyScore: ctx.score,
    assessmentPending: ctx.assessmentPending,
    exposureHints: ctx.exposureHints,
    exposureIntelligence,
    metrics,
    approvalRows,
    hasWallet: true,
  })

  return {
    ...profile,
    legacyBands: exposureIntelligence?.bands || [],
    provenance: exposureIntelligence?.provenance || 'PROVIDER_PENDING',
    subtitle: exposureIntelligence?.subtitle || '',
    sources: exposureIntelligence?.sources || [],
  }
}

export { walletExposureProfileFromRiskData, computeWalletExposureIntelligenceProfile }
