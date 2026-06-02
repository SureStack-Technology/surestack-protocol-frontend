import { walletExposureProfileFromRiskData } from '@/lib/walletExposureIntelligence/walletExposureIntelligenceEngine.mjs'

/**
 * Build wallet exposure intelligence profile for Prime UI.
 * @param {object | null} riskData
 * @param {object} [opts]
 * @param {object[]} [opts.approvalRows]
 * @param {boolean} [opts.hasWallet]
 */
export function buildWalletExposureIntel(riskData, opts = {}) {
  return walletExposureProfileFromRiskData(riskData, opts)
}

/**
 * @param {object | null} profile
 * @returns {number|null}
 */
export function walletExposureRiskScoreFromProfile(profile) {
  const s = Number(profile?.exposureScore)
  return Number.isFinite(s) ? Math.round(clamp(s)) : null
}

function clamp(n) {
  return Math.max(0, Math.min(100, n))
}
