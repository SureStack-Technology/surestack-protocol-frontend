/** @typedef {'CLEAR' | 'LOW' | 'MODERATE' | 'HIGH'} WalletExposureRiskLevel */

/**
 * @typedef {object} WalletExposureAsset
 * @property {string} symbol
 * @property {string} token
 * @property {number | null} balanceUsd
 * @property {boolean} isUnlimited
 */

/**
 * @typedef {object} WalletExposureResult
 * @property {boolean} hasExposure
 * @property {WalletExposureRiskLevel} riskLevel
 * @property {number} approvalCount
 * @property {number} unlimitedApprovals
 * @property {number | null} estimatedExposureUsd
 * @property {WalletExposureAsset[]} affectedAssets
 * @property {string | null} lastInteractionAt
 * @property {string} recommendation
 */

export const EXPOSURE_RECOMMENDATIONS = {
  CLEAR: 'No direct wallet exposure detected.',
  LOW: 'Monitor these approvals and revoke any you no longer use.',
  MODERATE: 'Review approval scope before additional interactions with this contract.',
  HIGH: 'Review or revoke inactive approvals before further interaction.',
}
