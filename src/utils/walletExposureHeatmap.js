/** @typedef {'live' | 'partial' | 'provider_pending' | 'model_snapshot'} ExposureHeatmapSource */

/**
 * Accordion badge label aligned with exposureIntelligence.provenance / heatmap status.
 * @param {boolean} hasWallet
 * @param {import('./primeIntelligenceFormat.js').DataProvenance | string | null | undefined} provenance
 */
export function exposureAccordionBadge(hasWallet, provenance) {
  if (!hasWallet) return 'Pending'
  switch (String(provenance || '').toUpperCase()) {
    case 'LIVE':
      return 'Live'
    case 'PARTIAL_DATA':
      return 'Partial Data'
    case 'PROVIDER_PENDING':
      return 'Provider Pending'
    case 'MODEL_GENERATED':
      return 'Model Generated'
    case 'LATEST_SNAPSHOT':
      return 'Live'
    case 'ESTIMATED':
      return 'Partial Data'
    default:
      return 'Pending'
  }
}

/**
 * Map API exposureIntelligence to UI heatmap bundle.
 * @param {object | null | undefined} exposureIntelligence
 */
export function mapExposureIntelligenceFromApi(exposureIntelligence) {
  if (!exposureIntelligence) return null

  const provenance = String(exposureIntelligence.provenance || 'ESTIMATED')
  /** @type {import('./primeIntelligenceFormat.js').DataProvenance} */
  let uiProvenance = 'ESTIMATED'
  if (provenance === 'LIVE') uiProvenance = 'LIVE'
  else if (provenance === 'PARTIAL_DATA') uiProvenance = 'PARTIAL_DATA'
  else if (provenance === 'PROVIDER_PENDING') uiProvenance = 'PROVIDER_PENDING'
  else if (provenance === 'MODEL_GENERATED') uiProvenance = 'MODEL_GENERATED'

  const bandList = Array.isArray(exposureIntelligence.bands) ? exposureIntelligence.bands : []
  if (!bandList.length) {
    const labels = [
      'DEX exposure',
      'Stablecoins',
      'NFT exposure',
      'Unknown contracts',
      'Protocol dependency',
    ]
    const allPending = uiProvenance === 'PROVIDER_PENDING'
    return {
      rows: labels.map((label) => ({
        label,
        level: null,
        max: 7,
        pending: allPending,
        reasons: [],
      })),
      source: allPending ? 'provider_pending' : 'partial',
      subtitle: exposureIntelligence.subtitle || '',
      provenance: uiProvenance,
      sources: exposureIntelligence.sources || [],
    }
  }

  const rows = bandList.map((band) => ({
    label: band.label,
    level: band.pending ? null : band.level,
    max: band.max ?? 7,
    pending: Boolean(band.pending),
    reasons: Array.isArray(band.reasons) ? band.reasons : [],
  }))

  return {
    rows,
    source: provenance === 'LIVE' ? 'live' : provenance === 'PARTIAL_DATA' ? 'partial' : 'provider_pending',
    subtitle: exposureIntelligence.subtitle || '',
    provenance: uiProvenance,
    sources: exposureIntelligence.sources || [],
  }
}

/**
 * @param {object} params
 * @returns {{
 *   rows: { label: string, level: number | null, max: number, pending?: boolean, reasons?: string[] }[],
 *   source: ExposureHeatmapSource,
 *   subtitle: string,
 *   provenance: import('./primeIntelligenceFormat.js').DataProvenance,
 *   sources?: string[]
 * }}
 */
export function buildWalletExposureHeatmap({
  exposureIntelligence = null,
  findings = [],
  approvals,
  exposureHints = null,
  band,
  score,
  walletKey = null,
  hasWallet = false,
  approvalsFromApi = false,
  riskFromApi = false,
  approvalInventoryStatus = 'idle',
} = {}) {
  const fromApi = mapExposureIntelligenceFromApi(exposureIntelligence)
  if (fromApi) return fromApi

  const providerBlocked =
    approvalInventoryStatus === 'provider_missing' ||
    approvalInventoryStatus === 'rate_limited' ||
    approvalInventoryStatus === 'rpc_error'

  if (!hasWallet) {
    return pendingBundle('Demo exposure bands — connect a verified wallet for live analysis.', 'DEMO_MODE')
  }

  if (providerBlocked && !riskFromApi) {
    return pendingBundle(
      'Exposure bands pending — Ethereum approval and balance providers unavailable.',
      'PROVIDER_PENDING',
    )
  }

  if (!riskFromApi) {
    return modelBundle(walletKey, score, band)
  }

  return pendingBundle(
    'Exposure bands pending — refresh wallet risk index to load live exposure intelligence.',
    'PROVIDER_PENDING',
  )
}

function pendingBundle(subtitle, provenance) {
  const labels = [
    'DEX exposure',
    'Stablecoins',
    'NFT exposure',
    'Unknown contracts',
    'Protocol dependency',
  ]
  return {
    rows: labels.map((label) => ({
      label,
      level: null,
      max: 7,
      pending: true,
      reasons: [],
    })),
    source: 'provider_pending',
    subtitle,
    provenance,
    sources: [],
  }
}

function modelBundle(walletKey, score, band) {
  const seed = String(walletKey || 'anonymous')
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const base = Math.min(7, Math.max(0, Math.round((Number(score) || 50) / 14)))
  const bandBoost = band === 'ELEVATED' ? 2 : band === 'HIGH' ? 1 : band === 'MODERATE' ? 0 : -1
  const bump = (i, spread) =>
    Math.min(7, Math.max(0, base + bandBoost + ((seed + i * 17) % spread) - Math.floor(spread / 2)))

  const labels = [
    'DEX exposure',
    'Stablecoins',
    'NFT exposure',
    'Unknown contracts',
    'Protocol dependency',
  ]
  const levels = [bump(0, 3), bump(1, 4), bump(2, 2), bump(3, 3), bump(4, 3)]

  return {
    rows: labels.map((label, i) => ({
      label,
      level: levels[i],
      max: 7,
      pending: false,
      reasons: ['Model-generated snapshot — not derived from live on-chain providers'],
    })),
    source: 'model_snapshot',
    subtitle: 'Model-generated exposure snapshot — not derived from live wallet inventory.',
    provenance: 'MODEL_GENERATED',
    sources: [],
  }
}
