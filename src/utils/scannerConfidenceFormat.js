/**
 * @param {'HIGH' | 'MODERATE' | 'LOW' | string | null | undefined} band
 */
export function confidenceHelperText(band) {
  switch (String(band || '').toUpperCase()) {
    case 'LOW':
      return 'Limited intelligence coverage. Verdict based on partial provider data.'
    case 'MODERATE':
      return 'Some intelligence sources unavailable.'
    default:
      return null
  }
}

/**
 * @param {object | null | undefined} report
 */
export function buildConfidenceView(report) {
  const c = report?.confidence
  if (!c?.band) return null
  return {
    score: c.score,
    band: c.band,
    providerCoverage: c.providerCoverage || {},
    helperText: confidenceHelperText(c.band),
  }
}
