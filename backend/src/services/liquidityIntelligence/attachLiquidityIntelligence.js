import {
  computeLiquidityIntelligence,
  marketInputFromTokenConcentration,
} from '../../../../src/lib/liquidityIntelligence/liquidityIntelligenceEngine.mjs'

/**
 * Attach liquidity intelligence payload to scanner / contract intel reports.
 * @param {object} report
 */
export function attachLiquidityIntelligence(report) {
  if (!report?.tokenConcentration) return report
  const liquidityIntelligence = computeLiquidityIntelligence(
    marketInputFromTokenConcentration(report.tokenConcentration),
  )
  return { ...report, liquidityIntelligence }
}
