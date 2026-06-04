/**
 * Provider coverage status — institutional transparency for Prime Intelligence layers.
 *
 * @typedef {'live'|'partial'|'rate_limited'|'fallback'|'unsupported'} ProviderCoverageStatus
 */

export const PROVIDER_STATUS = {
  LIVE: 'live',
  PARTIAL: 'partial',
  RATE_LIMITED: 'rate_limited',
  FALLBACK: 'fallback',
  UNSUPPORTED: 'unsupported',
}

/** @type {Record<ProviderCoverageStatus, string>} */
export const PROVIDER_STATUS_LABELS = {
  live: 'Live',
  partial: 'Partial',
  rate_limited: 'Rate limited',
  fallback: 'Fallback',
  unsupported: 'Unsupported',
}

/** @type {Record<ProviderCoverageStatus, string>} */
export const PROVIDER_STATUS_DESCRIPTIONS = {
  live: 'Provider responding normally.',
  partial: 'Some evidence available; coverage gaps remain.',
  rate_limited: 'Provider returned HTTP 429 — quota or rate limit exceeded.',
  fallback: 'Category intelligence model active — live provider unavailable.',
  unsupported: 'Provider intentionally unavailable for this chain or target.',
}

/**
 * @param {ProviderCoverageStatus} status
 */
export function providerStatusLabel(status) {
  return PROVIDER_STATUS_LABELS[status] || 'Unknown'
}

/**
 * @param {ProviderCoverageStatus} status
 */
export function providerStatusDescription(status) {
  return PROVIDER_STATUS_DESCRIPTIONS[status] || ''
}

/**
 * Map legacy coverage source status to provider status.
 * @param {'active'|'partial'|'pending'} legacy
 * @param {object} [opts]
 */
export function legacySourceToProviderStatus(legacy, opts = {}) {
  if (opts.unsupported) return PROVIDER_STATUS.UNSUPPORTED
  if (opts.rateLimited) return PROVIDER_STATUS.RATE_LIMITED
  if (opts.fallback) return PROVIDER_STATUS.FALLBACK
  if (legacy === 'active') return PROVIDER_STATUS.LIVE
  if (legacy === 'partial') return PROVIDER_STATUS.PARTIAL
  return PROVIDER_STATUS.FALLBACK
}

/**
 * Resolve LunarCrush provider status from API payload.
 * @param {object | null | undefined} primeTrends
 */
export function resolveLunarCrushProviderStatus(primeTrends) {
  if (!primeTrends) return PROVIDER_STATUS.FALLBACK
  if (primeTrends.providerStatus === 'rate_limited') return PROVIDER_STATUS.RATE_LIMITED
  if (primeTrends.providerStatus === 'subscription_required') return PROVIDER_STATUS.FALLBACK
  if (primeTrends.status === 'live') return PROVIDER_STATUS.LIVE
  if (primeTrends.status === 'fallback' || primeTrends.status === 'unavailable') {
    return PROVIDER_STATUS.FALLBACK
  }
  return PROVIDER_STATUS.PARTIAL
}

/**
 * Resolve Birdeye behavior provider status.
 * @param {object | null | undefined} watchlist
 * @param {object} [opts]
 */
export function resolveBirdeyeProviderStatus(watchlist, opts = {}) {
  if (opts.chain === 'ethereum' || opts.unsupportedChain) return PROVIDER_STATUS.UNSUPPORTED
  if (!watchlist) return PROVIDER_STATUS.FALLBACK
  if (watchlist.status === 'live') return PROVIDER_STATUS.LIVE
  if (watchlist.status === 'partial') return PROVIDER_STATUS.PARTIAL
  if (watchlist.status === 'unsupported') return PROVIDER_STATUS.UNSUPPORTED
  return PROVIDER_STATUS.FALLBACK
}

/**
 * Resolve scanner engine status.
 * @param {boolean} scanActive
 */
export function resolveScannerProviderStatus(scanActive) {
  return scanActive ? PROVIDER_STATUS.LIVE : PROVIDER_STATUS.PARTIAL
}

/** Category fallback disclosure when narrative provider unavailable. */
export const CATEGORY_NARRATIVE_DISCLOSURE =
  'Narrative generated from category intelligence (provider unavailable).'
