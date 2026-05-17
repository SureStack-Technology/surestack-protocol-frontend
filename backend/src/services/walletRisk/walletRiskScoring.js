import { RISK_BANDS } from './walletRiskTypes.js'

/**
 * Deterministic scoring — no LLM.
 * @param {{
 *   topTokenSharePct: number
 *   volatileSharePct: number
 *   transferCount: number
 *   uniqueCounterparties: number
 *   approvalPenalty: number
 *   insufficientHistory: boolean
 * }} signals
 * @returns {{ score: number, band: string, findings: Array<{ code: string, severity: string, title: string, detail: string }> }}
 */
export function scoreWalletRisk(signals) {
  let score = 100
  /** @type {Array<{ code: string, severity: string, title: string, detail: string }>} */
  const findings = []

  const unlimitedUnknown = Number(signals.unlimitedApprovalUnknownCount) || 0
  if (unlimitedUnknown > 0) {
    findings.push({
      code: 'UNLIMITED_APPROVAL_SURFACE',
      severity: unlimitedUnknown >= 3 ? 'HIGH' : 'MEDIUM',
      title: 'Unlimited approvals to unknown counterparties detected',
      detail: `${unlimitedUnknown} unlimited approval pairing(s) to non-catalogued spenders observed in the recent log window.`,
    })
  }

  const approval = Math.min(38, Math.max(0, Number(signals.approvalPenalty) || 0))
  if (approval > 0) {
    score -= approval
    findings.push({
      code: 'APPROVAL_EXPOSURE',
      severity: approval >= 18 ? 'HIGH' : 'MEDIUM',
      title: 'Allowance posture contributes measurable drag',
      detail: `On-chain allowance surface contributes an estimated ${approval} point risk drag (capped scoring model).`,
    })
  }

  const top = Number(signals.topTokenSharePct) || 0
  if (top >= 80) {
    score -= 15
    findings.push({
      code: 'CONCENTRATION',
      severity: 'HIGH',
      title: 'Concentration risk detected',
      detail: `Roughly ${top.toFixed(0)}% of observed token balances are in a single asset.`,
    })
  } else if (top >= 60) {
    score -= 10
    findings.push({
      code: 'CONCENTRATION',
      severity: 'MEDIUM',
      title: 'Concentration risk detected',
      detail: `Single-asset share near ${top.toFixed(0)}% of token balances (orientation estimate).`,
    })
  }

  const vol = Number(signals.volatileSharePct) || 0
  let volPenalty = 0
  if (vol >= 85) volPenalty = 15
  else if (vol >= 70) volPenalty = 10
  else if (vol >= 55) volPenalty = 5
  volPenalty = Math.min(15, volPenalty)
  if (volPenalty > 0) {
    score -= volPenalty
    findings.push({
      code: 'VOLATILITY',
      severity: volPenalty >= 12 ? 'MEDIUM' : 'LOW',
      title: 'Volatility exposure moderate',
      detail: `Volatile asset share estimated at ${vol.toFixed(0)}% of token balances (proxy, not a beta model).`,
    })
  }

  let contractPenalty = 0
  const uniq = Number(signals.uniqueCounterparties) || 0
  if (uniq > 60) contractPenalty = 20
  else if (uniq > 40) contractPenalty = 14
  else if (uniq > 25) contractPenalty = 8
  else if (uniq > 15) contractPenalty = 4
  contractPenalty = Math.min(20, contractPenalty)
  if (contractPenalty > 0) {
    score -= contractPenalty
    findings.push({
      code: 'CONTRACT_INTERACTION',
      severity: contractPenalty >= 14 ? 'MEDIUM' : 'LOW',
      title: 'Broad contract interaction surface',
      detail: `${uniq} unique counterparties observed in recent transfer sample.`,
    })
  }

  const tx = Number(signals.transferCount) || 0
  let actPenalty = 0
  if (tx > 120) actPenalty = 10
  else if (tx > 80) actPenalty = 7
  else if (tx > 50) actPenalty = 4
  actPenalty = Math.min(10, actPenalty)
  if (actPenalty > 0) {
    score -= actPenalty
    findings.push({
      code: 'ACTIVITY',
      severity: 'LOW',
      title: 'Elevated wallet activity',
      detail: `${tx} recent transfers in sampled window — hot-wallet style cadence.`,
    })
  }

  if (signals.insufficientHistory) {
    findings.push({
      code: 'INSUFFICIENT_HISTORY',
      severity: 'INFO',
      title: 'Establishing wallet intelligence',
      detail: 'Limited transfer history in the sampled window — score will stabilize as activity accumulates.',
    })
  }

  const breadth = Number(signals.interactionBreadthRatio) || 0
  if (!signals.insufficientHistory && tx >= 12 && uniq >= 14 && breadth > 0.55) {
    score -= Math.min(8, breadth >= 0.72 ? 8 : 5)
    findings.push({
      code: 'NETWORK_CLUSTERING',
      severity: 'MEDIUM',
      title: 'Unusually broad counterparty dispersion for sample depth',
      detail:
        `${uniq} counterparties across ${tx} sampled transfers (${(breadth * 100).toFixed(0)}% breadth ratio) suggests elevated interaction diversity — validate expected operational routing.`,
    })
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  let band = RISK_BANDS.MODERATE
  if (score >= 85) band = RISK_BANDS.LOW
  else if (score >= 65) band = RISK_BANDS.MODERATE
  else if (score >= 40) band = RISK_BANDS.ELEVATED
  else band = RISK_BANDS.HIGH

  findings.sort((a, b) => {
    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2, INFO: 3 }
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9)
  })

  return {
    score,
    band,
    findings: findings.slice(0, 8),
  }
}
