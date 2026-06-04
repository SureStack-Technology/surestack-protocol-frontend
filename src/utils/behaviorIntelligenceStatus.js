const PENDING_FIELD_RE =
  /^(pending|—|-|$|provider ready|awaiting live feed|provider not configured|provider data unavailable|pending provider coverage|limited birdeye response)/i

const BEHAVIOR_REQUIRED_FIELDS = [
  'holderConcentration',
  'whaleActivity',
  'tradeVelocity',
  'smartMoneySignal',
]

export const ETHEREUM_BEHAVIOR_INTEL = {
  title: 'Behavior Intelligence',
  headline: 'Advanced Ethereum behavior analytics coming soon.',
  futureCoverage: [
    'Whale movement monitoring',
    'Smart money tracking',
    'Holder concentration analysis',
    'Capital flow intelligence',
    'Behavioral anomaly detection',
  ],
  availableNow: ['Contract Trust', 'Liquidity Intelligence', 'Security Signals'],
}

/**
 * @param {string | null | undefined} value
 */
export function isBehaviorFieldPopulated(value) {
  const v = String(value || '').trim()
  if (!v) return false
  return !PENDING_FIELD_RE.test(v)
}

/**
 * @param {object} asset
 */
export function isBehaviorAssetComplete(asset) {
  if (!asset || asset.status === 'unsupported' || asset.status === 'unavailable') return false
  if (asset.status !== 'live') return false
  return BEHAVIOR_REQUIRED_FIELDS.every((field) => isBehaviorFieldPopulated(asset[field]))
}

/**
 * Chain-aware behavior intelligence messaging for Prime terminal.
 * @param {object} [params]
 */
export function buildBehaviorContextMessage({
  chain = 'ethereum',
  hasScan = false,
} = {}) {
  const chainKey = String(chain || 'ethereum').toLowerCase()
  const isSolana = chainKey === 'solana'

  if (!isSolana) {
    const available = ETHEREUM_BEHAVIOR_INTEL.availableNow.join(', ')
    const future = ETHEREUM_BEHAVIOR_INTEL.futureCoverage.slice(0, 3).join(', ')
    const lead = hasScan
      ? 'Scanner-backed contract and liquidity evidence available.'
      : ETHEREUM_BEHAVIOR_INTEL.headline
    return `${lead} Current available intelligence: ${available}. Future coverage: ${future}, and behavioral anomaly detection.`
  }

  if (hasScan) {
    return 'Solana scanner-backed mint evidence available — behavior analytics expand after full market indexing.'
  }
  return 'Solana behavior intelligence expands after mint scan and market indexing.'
}

/**
 * @param {object | null | undefined} watchlist
 * @param {object[]} [assets]
 * @param {string} [chain]
 */
export function assessBehaviorCoverage(watchlist, assets = [], chain = 'ethereum') {
  const chainKey = String(chain || 'ethereum').toLowerCase()
  if (chainKey !== 'solana') {
    return {
      mode: 'unsupported',
      badge: 'Coming soon',
      subtitle: ETHEREUM_BEHAVIOR_INTEL.headline,
      watchlistLabel: 'Ethereum behavior analytics',
    }
  }

  const list = assets.length ? assets : watchlist?.assets || []
  const supported = list.filter((a) => a?.status !== 'unsupported')

  if (!supported.length) {
    return {
      mode: 'pending',
      badge: 'Ready',
      subtitle: 'Behavior engine ready — awaiting market feed',
      watchlistLabel: 'Awaiting feed',
    }
  }

  const liveAssets = supported.filter((a) => a.status === 'live')
  const complete = supported.filter(isBehaviorAssetComplete)

  if (complete.length > 0 && complete.length === liveAssets.length && complete.length === supported.length) {
    return {
      mode: 'full',
      badge: 'Live',
      subtitle: 'Behavior feed active',
      watchlistLabel: 'Live feed active',
    }
  }

  if (complete.length > 0 || liveAssets.length > 0) {
    return {
      mode: 'partial',
      badge: 'Partial',
      subtitle: 'Partial behavior coverage',
      watchlistLabel: 'Partial feed',
    }
  }

  return {
    mode: 'pending',
    badge: 'Ready',
    subtitle: 'Behavior engine ready',
    watchlistLabel: 'Awaiting feed',
  }
}

/**
 * @param {object | null | undefined} watchlist
 * @param {object[]} [assets]
 */
export function behaviorFieldDisplay(asset, field, providerPending) {
  if (!asset || asset.status === 'unsupported') return 'Not available for this chain'
  if (providerPending || asset.status !== 'live') return 'Awaiting live feed'
  const value = asset[field]
  return isBehaviorFieldPopulated(value) ? value : 'Awaiting live feed'
}
