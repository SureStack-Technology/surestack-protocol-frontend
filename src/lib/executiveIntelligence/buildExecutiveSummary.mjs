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

  if (pending && !hasScannerEvidence(report, sr)) {
    return {
      assetLabel: report.displayTarget || report.query || 'Intelligence target',
      riskScore: null,
      overallRisk: 'PENDING',
      overallRiskBand: 'pending',
      primaryStrengths: ['Run Intelligence Scan for scanner-backed synthesis'],
      primaryRisks: ['Provider coverage incomplete until scan completes'],
      recommendedAction: 'Run Intelligence Scan to populate executive briefing.',
      pending: true,
    }
  }

  const assetLabel = executive?.assetLabel || report.displayTarget || report.query || 'Intelligence target'
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

  if (authorityRevoked(sr?.mintAuthority)) strengths.push('Mint authority revoked')
  else if (sr?.mintAuthority) risks.push('Mint authority present — review upgrade surface')

  if (authorityRevoked(sr?.freezeAuthority)) strengths.push('Freeze authority revoked')
  else if (sr?.freezeAuthority) risks.push('Freeze authority observable on mint')

  const depth =
    sr?.liquidityIntelligence?.liquidityDepthLabel ||
    report?.liquidityIntelligence?.liquidityDepthLabel
  if (depth === 'Strong' || depth === 'Exceptional' || depth === 'Healthy') {
    strengths.push('Strong liquidity depth')
  } else if (depth === 'Thin' || depth === 'Limited') {
    risks.push('Indexed liquidity appears limited')
  }

  const jupFinding = sr?.findings?.find?.((f) => /jupiter routing available/i.test(String(f.title || '')))
  const jupRoute =
    jupFinding ||
    sr?.liquidityIntelligence?.jupiterRouting === true ||
    sr?.tokenConcentration?.dataSources?.jupiter
  if (jupRoute) strengths.push('Jupiter routing active')
  else if (hasScannerEvidence(report, sr)) risks.push('Jupiter routing unconfirmed')

  const top10 = top10Pct(sr)
  if (top10 != null && top10 >= 40) {
    risks.push(`Top 10 holders control ${top10.toFixed(1)}%`)
  }

  const liqConc =
    sr?.liquidityIntelligence?.concentrationLabel || report?.liquidityIntelligence?.concentrationLabel
  if (liqConc === 'CRITICAL') risks.push('Liquidity concentration critical')
  else if (liqConc === 'ELEVATED') risks.push('Liquidity concentration elevated')

  if (report.narrativeCategory === 'meme' || executive?.classification?.includes('MEME')) {
    risks.push('Narrative-driven volatility')
  } else if (report.narrativeElevated) {
    risks.push('Narrative momentum exceeds technical signals')
  }

  if (sr?.verifiedSource || sr?.findings?.some?.((f) => /verified/i.test(String(f.code || f.title || '')))) {
    strengths.push('Verified mint or contract source indexed')
  }

  if (num(sr?.trustScore) >= 70 || num(sr?.compositeTrustScore) >= 70) {
    strengths.push(`Technical trust index ${Math.round(num(sr?.compositeTrustScore ?? sr?.trustScore))}/100`)
  }

  if (!strengths.length) strengths.push('Scanner-backed evidence indexed')
  if (!risks.length) risks.push('No elevated structural flags in current cycle')

  let recommendedAction =
    verdict.recommendation ||
    executive?.recommendedNextInvestigation?.[0] ||
    'Review evidence layers before increasing exposure.'

  if (typeof recommendedAction === 'string' && recommendedAction.length > 120) {
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
    primaryStrengths: strengths.slice(0, 4),
    primaryRisks: risks.slice(0, 4),
    recommendedAction,
    pending: false,
  }
}
