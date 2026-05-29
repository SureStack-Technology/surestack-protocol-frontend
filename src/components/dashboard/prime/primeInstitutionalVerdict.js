import { compositeVerdictLabel } from '@/components/dashboard/prime/compositeRiskEngine.js'

function intelRow(view, label) {
  return view?.intelligence?.find((r) => r.label === label)?.value || ''
}

function findingCodes(report) {
  return new Set((report?.findings || []).map((f) => String(f.code || '')))
}

/**
 * Contextual executive copy for infrastructure / stablecoin tokens (investor-grade).
 * @param {object} params
 */
export function buildInstitutionalTokenVerdict({
  narrativeCategory,
  scannerReport,
  scannerView,
  composite,
  tokenLabel = 'Token',
}) {
  if (!scannerReport || narrativeCategory !== 'stablecoin') return null

  const codes = findingCodes(scannerReport)
  const verified =
    codes.has('VERIFIED_SOURCE') ||
    /verified on block explorer/i.test(intelRow(scannerView, 'Source verification'))
  const tc = scannerReport.tokenConcentration || {}
  const deploymentAge =
    tc.deploymentAge || intelRow(scannerView, 'Deployment age') || intelRow(scannerView, 'Token age')
  const holderConc = intelRow(scannerView, 'Holder concentration') || tc.top10Share || ''
  const whaleRisk = intelRow(scannerView, 'Whale risk') || tc.whaleConcentration || ''
  const proxy = scannerReport.upgradeableProxy
  const trustBand = String(scannerReport.trustBand || '').toUpperCase()

  const reasoning = []
  if (verified) reasoning.push('Verified source on block explorer')
  if (/deep|high|established/i.test(String(tc.liquidityProfile || ''))) {
    reasoning.push('Deep liquidity profile')
  } else if (trustBand === 'TRUSTED' || trustBand === 'MODERATE') {
    reasoning.push('Established market liquidity (scanner heuristic)')
  }
  if (deploymentAge && !/unknown|unavailable/i.test(String(deploymentAge))) {
    reasoning.push(`${deploymentAge} deployment history`)
  }
  reasoning.push('Stablecoin category')
  if (proxy) reasoning.push('Upgradeable proxy architecture')
  if (holderConc && !/unknown/i.test(holderConc)) {
    reasoning.push(`Holder concentration: ${holderConc}`)
  }
  if (whaleRisk && !/unknown|low/i.test(whaleRisk)) {
    reasoning.push(`Whale concentration signal: ${whaleRisk}`)
  }
  if (codes.has('TOP10_CONCENTRATION')) reasoning.push('Top-holder concentration flagged — monitor supply distribution')
  if (codes.has('WHALE_DOMINANCE')) reasoning.push('Whale dominance elevated — treasury flow review advised')

  const compositeLabel = composite?.verdictLabel || compositeVerdictLabel(composite?.score)
  const lowOperational =
    (composite?.score ?? 50) <= 42 || trustBand === 'TRUSTED' || trustBand === 'MODERATE'

  return {
    overallRiskDisplay: lowOperational ? 'Low Operational Risk' : compositeLabel,
    reasoning: reasoning.slice(0, 6),
    recommendation:
      'Monitor reserve disclosures, attestation events, and issuer-related governance before scaling discretionary exposure.',
    institutionalSignals: {
      holderConcentration: holderConc || null,
      whaleRisk: whaleRisk || null,
      verifiedSource: verified,
      proxyUpgradeable: Boolean(proxy),
    },
  }
}
