import {
  computeLiquidityIntelligence,
  marketInputFromTokenConcentration,
} from '@/lib/liquidityIntelligence/liquidityIntelligenceEngine.mjs'
import { resolveAssetLiquidityTier } from '@/lib/liquidityIntelligence/assetLiquidityTier.mjs'
import { getAssetShortSymbol, getReportCanonicalAsset } from '@/lib/intelligence/assetDisplayLabel.mjs'

/**
 * Build liquidity intelligence from a universal / Solana scanner report.
 * @param {object | null} scannerReport
 */
export function buildLiquidityIntelFromScanner(scannerReport) {
  return buildLiquidityIntelFromContext({ scannerReport })
}

/**
 * @param {object} [params]
 */
export function buildLiquidityIntelFromContext({ scannerReport = null, report = null } = {}) {
  const tc = scannerReport?.tokenConcentration
  const precomputed = scannerReport?.liquidityIntelligence
  if (precomputed?.intelligenceScore != null) return precomputed

  const hasMarketData =
    tc?.available ||
    tc?.liquidityUsd != null ||
    tc?.liquidityConfirmed ||
    tc?.volume24hUsd != null

  if (hasMarketData) {
    return computeLiquidityIntelligence(marketInputFromTokenConcentration(tc))
  }

  const canonical = getReportCanonicalAsset(report)
  const symbol =
    getAssetShortSymbol(canonical, '') ||
    report?.targetClassification?.symbol ||
    report?.tokenResolution?.symbol ||
    report?.displayTarget
  const tier = resolveAssetLiquidityTier({
    symbol,
    address: report?.tokenResolution?.address || report?.targetClassification?.address,
    narrativeCategory: report?.narrativeCategory,
    query: report?.query,
  })

  if (tier.isCanonical || tier.isMajorAsset || tier.isStablecoin) {
    return computeLiquidityIntelligence({
      isStablecoin: tier.isStablecoin,
      isCanonical: tier.isCanonical,
      isMajorAsset: tier.isMajorAsset,
    })
  }

  return computeLiquidityIntelligence({})
}

/**
 * @param {object | null} scannerReport
 * @param {object | null} [report]
 * @returns {number|null} 0–100 liquidity risk score for composite engine
 */
export function liquidityRiskScoreFromScanner(scannerReport, report = null) {
  const intel = buildLiquidityIntelFromContext({ scannerReport, report })
  return Number.isFinite(Number(intel?.intelligenceScore))
    ? Math.round(Number(intel.intelligenceScore))
    : null
}
