import { EXPOSURE_RECOMMENDATIONS } from './walletExposureTypes.js'

/**
 * @param {object} params
 * @param {number} params.approvalCount
 * @param {number} params.unlimitedApprovals
 * @param {number | null} params.estimatedExposureUsd
 */
export function scoreWalletExposureLevel({ approvalCount, unlimitedApprovals, estimatedExposureUsd }) {
  const usd = Number(estimatedExposureUsd) || 0

  if (approvalCount <= 0) {
    return {
      riskLevel: 'CLEAR',
      recommendation: EXPOSURE_RECOMMENDATIONS.CLEAR,
    }
  }

  if (unlimitedApprovals >= 1 && usd > 1000) {
    return {
      riskLevel: 'HIGH',
      recommendation: EXPOSURE_RECOMMENDATIONS.HIGH,
    }
  }

  if (unlimitedApprovals >= 1 || usd > 2500 || approvalCount >= 4) {
    return {
      riskLevel: 'HIGH',
      recommendation: EXPOSURE_RECOMMENDATIONS.HIGH,
    }
  }

  if (approvalCount >= 3 || usd > 750) {
    return {
      riskLevel: 'MODERATE',
      recommendation: EXPOSURE_RECOMMENDATIONS.MODERATE,
    }
  }

  if (approvalCount <= 2 && usd < 500) {
    return {
      riskLevel: 'LOW',
      recommendation: EXPOSURE_RECOMMENDATIONS.LOW,
    }
  }

  return {
    riskLevel: 'MODERATE',
    recommendation: EXPOSURE_RECOMMENDATIONS.MODERATE,
  }
}
