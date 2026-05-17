/**
 * @param {'CLEAR' | 'LOW' | 'MODERATE' | 'HIGH' | string} level
 */
export function exposureBadgeClass(level) {
  switch (String(level || '').toUpperCase()) {
    case 'CLEAR':
      return 'prime-wallet-exposure-badge prime-wallet-exposure-badge--clear'
    case 'LOW':
      return 'prime-wallet-exposure-badge prime-wallet-exposure-badge--low'
    case 'MODERATE':
      return 'prime-wallet-exposure-badge prime-wallet-exposure-badge--moderate'
    case 'HIGH':
      return 'prime-wallet-exposure-badge prime-wallet-exposure-badge--high'
    default:
      return 'prime-wallet-exposure-badge'
  }
}

/**
 * @param {number | null | undefined} usd
 */
export function formatExposureUsd(usd) {
  if (usd == null || !Number.isFinite(Number(usd))) return '—'
  const n = Number(usd)
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${Math.round(n).toLocaleString('en-US')}`
  return `$${n.toFixed(0)}`
}

/**
 * @param {object | null | undefined} walletExposure
 */
export function buildWalletExposureView(walletExposure) {
  if (!walletExposure) return null
  const assets = Array.isArray(walletExposure.affectedAssets) ? walletExposure.affectedAssets : []
  return {
    hasExposure: Boolean(walletExposure.hasExposure),
    riskLevel: walletExposure.riskLevel || 'CLEAR',
    status: walletExposure.status || null,
    approvalCount: walletExposure.approvalCount ?? 0,
    unlimitedApprovals: walletExposure.unlimitedApprovals ?? 0,
    estimatedExposureUsd: walletExposure.estimatedExposureUsd ?? null,
    affectedAssets: assets,
    assetSymbolsLabel: assets.map((a) => a.symbol).filter(Boolean).join(' · '),
    recommendation: walletExposure.recommendation || '',
    pendingUsd: Boolean(walletExposure.pendingUsd),
    matchType: walletExposure.matchType || 'none',
    inventoryStale: Boolean(walletExposure.inventoryStale),
    rateLimited: Boolean(walletExposure.rateLimited),
  }
}

export const STALE_INVENTORY_NOTICE = 'Using recently cached approval intelligence.'
