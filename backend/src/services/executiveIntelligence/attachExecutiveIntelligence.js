import { executiveIntelligenceFromScanner } from './executiveIntelligenceEngine.js'
import { lookupPrimeTokenByAddress } from '../../../../shared/constants/primeTokenRegistry.mjs'
import {
  hasRegistryMatch,
  hasVerifiedMetadata,
} from '../../../../src/lib/intelligence/assetIntelligenceState.mjs'

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

  const addr = report.address || ctx.address || ctx.query
  const isSolana =
    report.chain === 'solana' ||
    report.product === 'surestack_solana_risk_scanner' ||
    ctx.isSolanaToken === true
  const reg = lookupPrimeTokenByAddress(addr)
  const metaReport = {
    modeId: 'token',
    query: ctx.query || addr,
    scannerReport: report,
    isSolanaToken: isSolana,
    solanaMintAddress: isSolana ? addr : null,
    tokenResolution: ctx.tokenResolution,
    targetClassification: ctx.targetClassification,
  }
  if (reg) {
    metaReport.tokenResolution = {
      source: 'registry',
      resolved: true,
      symbol: reg.symbol,
      name: reg.name,
      address: reg.address,
    }
    metaReport.targetClassification = {
      symbol: reg.symbol,
      name: reg.name,
      address: reg.address,
      recommendedModule: 'token',
    }
  }

  if (!hasRegistryMatch(metaReport) && !hasVerifiedMetadata(metaReport, report)) {
    return report
  }

  const executiveIntelligence = executiveIntelligenceFromScanner(report, {
    ...ctx,
    symbol: ctx.symbol || reg?.symbol,
    tokenName: ctx.tokenName || reg?.name,
    report: metaReport,
  })
  return { ...report, executiveIntelligence }
}
