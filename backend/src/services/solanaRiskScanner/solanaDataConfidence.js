/** @typedef {'SAFE' | 'KNOWN_RISK' | 'UNKNOWN'} DataConfidenceStatus */

export const DATA_CONFIDENCE = {
  SAFE: 'SAFE',
  KNOWN_RISK: 'KNOWN_RISK',
  UNKNOWN: 'UNKNOWN',
}

/**
 * @param {*} value
 * @param {{ knownRisk?: boolean }} [opts]
 * @returns {DataConfidenceStatus}
 */
export function resolveFieldConfidence(value, opts = {}) {
  if (opts.knownRisk) return DATA_CONFIDENCE.KNOWN_RISK
  const empty =
    value == null ||
    value === '' ||
    value === '—' ||
    value === 'Unavailable' ||
    value === 'Unknown' ||
    /unavailable/i.test(String(value)) ||
    /not confidently observed/i.test(String(value)) ||
    /limited market intelligence/i.test(String(value))
  if (empty) return DATA_CONFIDENCE.UNKNOWN
  return DATA_CONFIDENCE.SAFE
}

/**
 * @param {Record<string, DataConfidenceStatus>} fields
 */
export function countUnknownFields(fields) {
  return Object.values(fields).filter((s) => s === DATA_CONFIDENCE.UNKNOWN).length
}

/**
 * Confidence reduction from missing fields (does not affect risk score).
 * @param {Record<string, DataConfidenceStatus>} fields
 * @param {number} [perField=3]
 */
export function confidencePenaltyFromFields(fields, perField = 3) {
  return countUnknownFields(fields) * perField
}
