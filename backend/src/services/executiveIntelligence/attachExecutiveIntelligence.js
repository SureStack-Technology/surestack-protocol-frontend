import { executiveIntelligenceFromScanner } from './executiveIntelligenceEngine.js'

/**
 * Attach executive intelligence summary to scanner / contract intel reports.
 * @param {object} report
 * @param {object} [ctx]
 */
export function attachExecutiveIntelligence(report, ctx = {}) {
  const hasTrust =
    report?.trustScore != null ||
    report?.compositeTrustScore != null ||
    report?.technicalTrustScore != null
  if (!report || !hasTrust) return report
  const executiveIntelligence = executiveIntelligenceFromScanner(report, ctx)
  return { ...report, executiveIntelligence }
}
