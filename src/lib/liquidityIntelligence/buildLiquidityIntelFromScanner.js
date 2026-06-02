import {
  computeLiquidityIntelligence,
  marketInputFromTokenConcentration,
} from '@/lib/liquidityIntelligence/liquidityIntelligenceEngine.mjs'

/**
 * Build liquidity intelligence from a universal / Solana scanner report.
 * @param {object | null} scannerReport
 */
export function buildLiquidityIntelFromScanner(scannerReport) {
  const tc = scannerReport?.tokenConcentration
  const precomputed = scannerReport?.liquidityIntelligence
  if (precomputed?.intelligenceScore != null) return precomputed
  if (!tc?.available && tc?.liquidityUsd == null && !tc?.liquidityConfirmed) {
    return computeLiquidityIntelligence({})
  }
  return computeLiquidityIntelligence(marketInputFromTokenConcentration(tc))
}

/**
 * @param {object | null} scannerReport
 * @returns {number|null} 0–100 liquidity risk score for composite engine
 */
export function liquidityRiskScoreFromScanner(scannerReport) {
  const intel = buildLiquidityIntelFromScanner(scannerReport)
  return Number.isFinite(Number(intel?.intelligenceScore))
    ? Math.round(Number(intel.intelligenceScore))
    : null
}
