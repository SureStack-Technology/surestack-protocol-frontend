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

export function formatDeploymentAge(pairCreatedAtMs) {
  if (!pairCreatedAtMs) return 'Unknown'
  const hours = (Date.now() - pairCreatedAtMs) / (1000 * 60 * 60)
  if (hours < 48) return `${Math.max(1, Math.round(hours))} hours`
  const days = Math.round(hours / 24)
  if (days < 60) return `${days} days`
  const months = Math.round(days / 30)
  return `${months} months`
}

export function liquidityDepthLabel(usd) {
  if (usd == null || !Number.isFinite(usd) || usd <= 0) return 'No DEX liquidity detected'
  if (usd >= 500_000) return 'DEX liquidity detected — deep'
  if (usd >= 100_000) return 'DEX liquidity detected — moderate depth'
  if (usd >= 10_000) return 'DEX liquidity detected — thin'
  return 'DEX liquidity detected — very thin'
}
