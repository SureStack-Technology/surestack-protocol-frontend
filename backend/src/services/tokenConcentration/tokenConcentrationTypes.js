/**
 * @typedef {object} TokenConcentrationIntel
 * @property {boolean} available
 * @property {string} holderConcentration
 * @property {string} largestWallet
 * @property {number | null} largestWalletPct
 * @property {number | null} top10HolderPct
 * @property {string} liquidityStatus
 * @property {string} liquidityConcentration
 * @property {'LOW'|'MODERATE'|'ELEVATED'|'CRITICAL'|'UNKNOWN'} whaleRisk
 * @property {string} tradingBehavior
 * @property {string} deploymentAge
 * @property {string} bundledWallets
 * @property {string} lpStatus
 * @property {number | null} liquidityUsd
 * @property {object} dataSources
 */

/**
 * Human-readable age from Unix ms timestamp.
 * @param {number | null | undefined} createdAtMs
 * @returns {string | null}
 */
export function formatDeploymentAgeFromTimestamp(createdAtMs) {
  if (!createdAtMs || !Number.isFinite(Number(createdAtMs))) return null
  const hours = (Date.now() - Number(createdAtMs)) / (1000 * 60 * 60)
  if (hours < 0) return null
  if (hours < 48) return `${Math.max(1, Math.round(hours))} hours`
  const days = Math.round(hours / 24)
  if (days < 60) return `${days} days`
  const months = Math.round(days / 30.44)
  if (months < 24) return `${months} months`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem > 0) return `~${years} years ${rem} months`
  return `~${years} years`
}

/** @deprecated Prefer formatDeploymentAgeFromTimestamp — pool-only ages are misleading for tokens. */
export function formatDeploymentAge(pairCreatedAtMs) {
  return formatDeploymentAgeFromTimestamp(pairCreatedAtMs) || 'Unknown'
}

export function liquidityDepthLabel(usd) {
  if (usd == null || !Number.isFinite(usd) || usd <= 0) return 'No DEX liquidity detected'
  if (usd >= 500_000) return 'DEX liquidity detected — deep'
  if (usd >= 100_000) return 'DEX liquidity detected — moderate depth'
  if (usd >= 10_000) return 'DEX liquidity detected — thin'
  return 'DEX liquidity detected — very thin'
}
