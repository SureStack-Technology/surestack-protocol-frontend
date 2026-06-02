const PENDING_FIELD_RE =
  /^(pending|—|-|$|provider ready|awaiting live feed|provider not configured|provider data unavailable|pending provider coverage|limited birdeye response)/i

const BEHAVIOR_REQUIRED_FIELDS = [
  'holderConcentration',
  'whaleActivity',
  'tradeVelocity',
  'smartMoneySignal',
]

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
 * @param {object | null | undefined} watchlist
 * @param {object[]} [assets]
 */
export function assessBehaviorCoverage(watchlist, assets = []) {
  const list = assets.length ? assets : watchlist?.assets || []
  const supported = list.filter((a) => a?.status !== 'unsupported')

  if (!supported.length) {
    return {
      mode: 'pending',
      badge: 'Ready',
      subtitle: 'Behavior Engine Ready (live provider activation pending)',
      watchlistLabel: 'Provider pending',
    }
  }

  const liveAssets = supported.filter((a) => a.status === 'live')
  const complete = supported.filter(isBehaviorAssetComplete)

  if (complete.length > 0 && complete.length === liveAssets.length && complete.length === supported.length) {
    return {
      mode: 'full',
      badge: 'Live',
      subtitle: 'Birdeye live feed active',
      watchlistLabel: 'Live feed active',
    }
  }

  if (complete.length > 0 || liveAssets.length > 0) {
    return {
      mode: 'partial',
      badge: 'Partial',
      subtitle: 'Partial live feed',
      watchlistLabel: 'Partial live feed',
    }
  }

  return {
    mode: 'pending',
    badge: 'Ready',
    subtitle: 'Pending provider coverage',
    watchlistLabel: 'Provider pending',
  }
}

/**
 * @param {object | null | undefined} watchlist
 * @param {object[]} [assets]
 */
export function behaviorFieldDisplay(asset, field, providerPending) {
  if (!asset || asset.status === 'unsupported') return 'Pending provider coverage'
  if (providerPending || asset.status !== 'live') return 'Provider data unavailable'
  const value = asset[field]
  return isBehaviorFieldPopulated(value) ? value : 'Provider data unavailable'
}
