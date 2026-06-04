import { resolveStablecoinMatch, STABLECOIN_RISK_THEMES } from '../../shared/constants/stablecoinRegistry.mjs'
import { getAssetDisplayName, getReportCanonicalAsset } from '../intelligence/assetDisplayLabel.mjs'
import {
  mergeRegistryExecutiveSummaryLines,
  resolveExecutiveSummaryCategoryContext,
} from './executiveSummaryStrengths.mjs'
import { buildPreliminaryExecutiveSummary } from './preliminaryExecutiveIntel.mjs'
import { ASSESSMENT_STAGES } from './preliminaryExecutiveIntel.mjs'
import { isSolanaScannerReport, isEvmScannerReport } from '../intelligence/chainIntelligence.mjs'

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
  if (intel.preliminary || intel.assessmentStage === ASSESSMENT_STAGES.PRELIMINARY) return false
  return Boolean(
    intel.pending ||
    intel.classification === 'Assessment pending' ||
    intel.executiveRiskBandId === 'pending',
  )
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function top10Pct(scannerReport) {
  const tc = scannerReport?.tokenConcentration || {}
  return num(tc.top10HolderPct) ?? num(tc.top10Share) ?? num(tc.top10SharePct) ?? null
}

function authorityRevoked(value) {
  if (value == null || value === false) return true
  const s = String(value).toLowerCase()
  return s === 'none' || s === 'revoked' || s === 'null' || s === 'disabled' || s === 'no'
}

function isStablecoinContext(report, executive, sr) {
  return (
    report?.narrativeCategory === 'stablecoin' ||
    executive?.classification === 'STABLECOIN ASSET' ||
    Boolean(
      resolveStablecoinMatch({
        symbol: report?.displayTarget || report?.query,
        query: report?.query,
        scannerReport: sr,
      }),
    )
  )
}

/**
 * @param {object} params
 * @returns {object | null}
 */
export function buildExecutiveSummary({
  report = null,
  executive = null,
  scannerReport = null,
  topVerdictReport = null,
} = {}) {
  if (!report) return null

  const sr = scannerReport || report?.scannerReport || null
  const verdict = topVerdictReport || report
  const pending = !executive || isExecutiveIntelPending(executive)
  const solana = isSolanaScannerReport(sr, report)
  const evm = isEvmScannerReport(sr, report)
  const stablecoin = isStablecoinContext(report, executive, sr)

  if (!hasScannerEvidence(report, sr) && executive?.preliminary) {
    return buildPreliminaryExecutiveSummary({ report, executive })
  }

  if (pending && !hasScannerEvidence(report, sr)) {
    if (executive?.preliminary || executive?.assessmentStage === ASSESSMENT_STAGES.PRELIMINARY) {
      return buildPreliminaryExecutiveSummary({ report, executive })
    }
    return {
      assetLabel: getAssetDisplayName(getReportCanonicalAsset(report), report.query),
      riskScore: null,
      overallRisk: 'PENDING',
      overallRiskBand: 'pending',
      primaryStrengths: ['Run Intelligence Scan for scanner-backed synthesis'],
      primaryRisks: ['Provider coverage incomplete until scan completes'],
      recommendedAction: 'Run Intelligence Scan to populate executive briefing.',
      pending: true,
    }
  }

  const assetLabel =
    executive?.assetLabel || getAssetDisplayName(getReportCanonicalAsset(report), report.query)
  const riskScore = num(executive?.executiveRiskScore) ?? num(verdict.composite?.score) ?? null
  const overallRisk =
    executive?.executiveRiskBand?.replace(/\s+RISK$/i, '') ||
    verdict.overallRiskDisplay ||
    verdict.overallRisk ||
    'MODERATE'
  const overallRiskBand = executive?.executiveRiskBandId || 'moderate'

  /** @type {string[]} */
  const strengths = []
  /** @type {string[]} */
  const risks = []

  if (stablecoin) {
    strengths.push('Established stablecoin profile in indexed registry')
    strengths.push('Issuer-backed asset with reserve transparency expectations')
    strengths.push('Institutional-grade global liquidity (CEX / issuer rails exceed indexed DEX sample)')
    risks.push(STABLECOIN_RISK_THEMES[2])
    risks.push(STABLECOIN_RISK_THEMES[0])
    if (num(sr?.trustScore) >= 70 || num(sr?.compositeTrustScore) >= 70) {
      strengths.push(`Technical trust index ${Math.round(num(sr?.compositeTrustScore ?? sr?.trustScore))}/100`)
    }
  } else if (solana) {
    if (authorityRevoked(sr?.mintAuthority)) strengths.push('Mint authority revoked')
    else if (sr?.mintAuthority) risks.push('Mint authority present — review upgrade surface')

    if (authorityRevoked(sr?.freezeAuthority)) strengths.push('Freeze authority revoked')
    else if (sr?.freezeAuthority) risks.push('Freeze authority observable on mint')

    const jupFinding = sr?.findings?.find?.((f) => /jupiter routing available/i.test(String(f.title || '')))
    if (jupFinding) strengths.push('Jupiter routing active')
    else if (hasScannerEvidence(report, sr)) risks.push('Jupiter routing unconfirmed')
  } else if (evm) {
    if (sr?.verifiedSource) strengths.push('Contract source verified')
    else if (sr?.verifiedSource === false) risks.push('Contract source not verified')

    if (sr?.upgradeableProxy === false) strengths.push('Non-upgradeable contract surface')
    else if (sr?.upgradeableProxy === true) risks.push('Upgradeable proxy — review admin controls')

    const ownership = String(sr?.ownershipConcentration || '')
    if (/dispersed|renounced/i.test(ownership)) strengths.push('Ownership/admin surface appears limited')
    else if (/concentrated|centralized/i.test(ownership)) risks.push('Ownership/admin controls appear concentrated')

    if (sr?.providerCoverage?.goPlus === 'goplus') strengths.push('GoPlus security signals indexed')
  }

  const depth =
    sr?.liquidityIntelligence?.liquidityDepthLabel ||
    report?.liquidityIntelligence?.liquidityDepthLabel
  if (depth === 'Strong' || depth === 'Exceptional' || depth === 'Healthy') {
    strengths.push('Strong DEX liquidity depth')
  } else if (!stablecoin && (depth === 'Thin' || depth === 'Limited')) {
    risks.push('Indexed liquidity appears limited')
  }

  const top10 = top10Pct(sr)
  if (top10 != null && top10 >= 40 && !stablecoin) {
    risks.push(`Top 10 holders control ${top10.toFixed(1)}%`)
  }

  const liqConc =
    sr?.liquidityIntelligence?.concentrationLabel || report?.liquidityIntelligence?.concentrationLabel
  if (liqConc === 'CRITICAL') risks.push('Liquidity concentration critical')
  else if (liqConc === 'ELEVATED') risks.push('Liquidity concentration elevated')

  if (!stablecoin && (report.narrativeCategory === 'meme' || executive?.classification?.includes('MEME'))) {
    risks.push('Narrative-driven volatility')
  } else if (!stablecoin && report.narrativeElevated) {
    risks.push('Narrative momentum exceeds technical signals')
  }

  if (
    !stablecoin &&
    (sr?.verifiedSource || sr?.findings?.some?.((f) => /verified/i.test(String(f.code || f.title || ''))))
  ) {
    strengths.push('Verified source indexed in scanner pass')
  }

  if (!stablecoin && (num(sr?.trustScore) >= 70 || num(sr?.compositeTrustScore) >= 70)) {
    strengths.push(`Technical trust index ${Math.round(num(sr?.compositeTrustScore ?? sr?.trustScore))}/100`)
  }

  if (!strengths.length) strengths.push('Scanner-backed evidence indexed')
  if (!risks.length) {
    risks.push(stablecoin ? 'Monitor issuer attestations and redemption flows' : 'No elevated structural flags in current cycle')
  }

  const categoryCtx = resolveExecutiveSummaryCategoryContext(report, executive)
  const merged = mergeRegistryExecutiveSummaryLines(strengths, risks, categoryCtx, {
    hasScan: hasScannerEvidence(report, sr),
    maxStrengths: 4,
    maxRisks: 4,
  })

  let recommendedAction =
    verdict.recommendation ||
    executive?.recommendedNextInvestigation?.[0] ||
    'Review evidence layers before increasing exposure.'

  if (stablecoin) {
    recommendedAction = 'Verify issuer attestations, reserve transparency, and redemption liquidity before sizing exposure.'
  } else if (typeof recommendedAction === 'string' && recommendedAction.length > 120) {
    if (top10 != null && top10 >= 50) {
      recommendedAction = 'Review holder concentration and liquidity dependency before significant exposure.'
    } else if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') {
      recommendedAction = 'Review liquidity concentration and venue dependency before significant exposure.'
    } else {
      recommendedAction = recommendedAction.split('.')[0].trim() + '.'
    }
  }

  return {
    assetLabel,
    riskScore,
    overallRisk: String(overallRisk).toUpperCase(),
    overallRiskBand,
    primaryStrengths: merged.primaryStrengths,
    primaryRisks: merged.primaryRisks,
    recommendedAction,
    pending: false,
  }
}
