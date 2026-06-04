function hasScannerEvidence(report, scannerReport = null) {
  const sr = scannerReport || report?.scannerReport || null
  return Boolean(
    sr?.success === true ||
    (sr?.success !== false && sr?.product === 'surestack_solana_risk_scanner') ||
    report?.scannerSignals?.hasScan ||
    sr?.scannerValidation === 'Complete' ||
    sr?.trustScore != null ||
    sr?.compositeTrustScore != null,
  )
}

function isExecutiveIntelPending(intel) {
  if (!intel) return true
  return Boolean(
    intel.pending ||
    intel.classification === 'Assessment pending' ||
    intel.executiveRiskBandId === 'pending',
  )
}

import { getAssetDisplayName, getAssetShortSymbol, getReportCanonicalAsset } from '../intelligence/assetDisplayLabel.mjs'

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Resolve hero VOL / RISK from scanner-backed intelligence hierarchy.
 * Executive Risk → Composite Trust → Liquidity Intelligence → Wallet Exposure
 * @param {object} params
 * @returns {{ volatility: number, riskScore: number, riskBand: string, assetLabel: string | null, active: boolean } | null}
 */
export function resolveHeroIntelligenceMetrics({
  report = null,
  executive = null,
  scannerReport = null,
  birdeyeAssets = [],
  primeTrends = null,
} = {}) {
  if (!report) return null

  const sr = scannerReport || report?.scannerReport || null
  if (!hasScannerEvidence(report, sr)) return null

  const canonical = getReportCanonicalAsset(report)
  const symbol = String(
    getAssetShortSymbol(canonical, '') ||
      report.targetClassification?.symbol ||
      report.tokenResolution?.symbol ||
      '',
  )
    .trim()
    .toUpperCase()

  let riskScore = null
  if (executive && !isExecutiveIntelPending(executive) && num(executive.executiveRiskScore) != null) {
    riskScore = num(executive.executiveRiskScore)
  } else if (num(report.composite?.score) != null) {
    riskScore = num(report.composite.score)
  } else if (num(sr?.liquidityIntelligence?.intelligenceScore) != null) {
    riskScore = Math.max(0, Math.min(100, Math.round(100 - num(sr.liquidityIntelligence.intelligenceScore))))
  } else if (num(report.walletExposureProfile?.exposureScore) != null) {
    riskScore = num(report.walletExposureProfile.exposureScore)
  }

  if (riskScore == null) return null

  let volatility = null
  const birdeyeAsset = birdeyeAssets?.find((a) => String(a.symbol || '').toUpperCase() === symbol)
  if (num(birdeyeAsset?.priceChange24h) != null) {
    volatility = Math.abs(num(birdeyeAsset.priceChange24h))
  } else if (num(sr?.liquidityIntelligence?.liquidityChange24hPct) != null) {
    volatility = Math.abs(num(sr.liquidityIntelligence.liquidityChange24hPct))
  } else if (num(report.liquidityIntelligence?.liquidityChange24hPct) != null) {
    volatility = Math.abs(num(report.liquidityIntelligence.liquidityChange24hPct))
  } else {
    const narrativeRisk = num(report.composite?.subscores?.narrativeRisk)
    if (narrativeRisk != null) volatility = Math.round((narrativeRisk / 10) * 10) / 10
    else {
      const trending = primeTrends?.trendingAssets?.find((a) => String(a.symbol || '').toUpperCase() === symbol)
      if (num(trending?.percentChange24h) != null) volatility = Math.abs(num(trending.percentChange24h))
    }
  }

  const riskBand =
    executive && !isExecutiveIntelPending(executive)
      ? executive.executiveRiskBand || null
      : report.composite?.verdictLabel || report.overallRiskDisplay || report.overallRisk || null

  return {
    volatility: volatility ?? Math.max(0.1, Math.round((riskScore / 10) * 10) / 10),
    riskScore: Math.round(riskScore),
    riskBand: riskBand ? String(riskBand).replace(/\s+RISK$/i, '').toUpperCase() : null,
    assetLabel:
      executive?.assetLabel || getAssetDisplayName(canonical, report.displayTarget || report.query) || symbol || null,
    active: true,
  }
}
