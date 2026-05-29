import { walletRiskBandLabel } from '@/hooks/useWalletRiskIndex.js'

/**
 * Canonical wallet risk snapshot for all Prime surfaces (hero, verdict, evidence).
 */
export function buildPrimeWalletSnapshot(source) {
  const hasWallet = Boolean(source?.hasWallet)
  const assessmentPending =
    Boolean(source?.assessmentPending) ||
    source?.band === 'PENDING' ||
    source?.exposureProvenance === 'PROVIDER_PENDING'

  if (assessmentPending) {
    return {
      score: null,
      band: 'PENDING',
      hasWallet,
      riskFromApi: Boolean(source?.riskFromApi),
      assessmentPending: true,
      scoreLine: 'Risk Assessment Pending',
      exposureLine: 'Insufficient Data',
      compact: 'Analysis Unavailable',
      heroBadge: hasWallet ? 'Pending · Insufficient Data' : 'Pending',
    }
  }

  const score = Number.isFinite(Number(source?.score)) ? Math.round(Number(source.score)) : null
  const band = source?.band ? String(source.band) : null
  const exposure = band ? walletRiskBandLabel(band).toLowerCase() : null

  return {
    score,
    band,
    hasWallet,
    riskFromApi: Boolean(source?.riskFromApi),
    assessmentPending: false,
    scoreLine: score != null ? `${score}/100` : null,
    exposureLine: exposure,
    compact: score != null && exposure ? `${score}/100 · ${exposure}` : exposure || 'Awaiting snapshot',
    heroBadge: hasWallet && score != null ? `Live · ${score}/100` : hasWallet ? 'Live' : 'Pending',
  }
}
