import { trustBandFromScore } from '../contractIntelligence/contractIntelTypes.js'
import { solanaTrustBandFromScore } from '../solanaRiskScanner/solanaTypes.js'
import {
  solanaVerdictActionFrame,
  verdictActionFrame as buildEvmVerdictFrame,
} from '../tokenConcentration/tokenConcentrationScoring.js'

/** @typedef {'HIGH' | 'MODERATE' | 'LOW'} ConfidenceBand */

const EVM_WEIGHTS = {
  etherscan: 20,
  goplus: 20,
  dexscreener: 15,
  honeypot: 15,
  ownership: 15,
  proxy: 15,
}

const SOLANA_WEIGHTS = {
  rpc: 20,
  dexscreener: 20,
  jupiter: 15,
  holders: 15,
  largestWallet: 10,
  metadata: 10,
  mintAuthority: 5,
  freezeAuthority: 5,
}

const TRUST_SCORE_CAP = {
  HIGH: 98,
  MODERATE: 88,
  LOW: 72,
}

/**
 * @param {number} score
 * @returns {ConfidenceBand}
 */
export function confidenceBandFromScore(score) {
  const s = Number(score)
  if (!Number.isFinite(s)) return 'LOW'
  if (s >= 90) return 'HIGH'
  if (s >= 70) return 'MODERATE'
  return 'LOW'
}

/**
 * @param {Record<string, boolean>} coverage
 * @param {Record<string, number>} weights
 */
function coverageScoreFromWeights(coverage, weights) {
  let score = 0
  for (const [key, weight] of Object.entries(weights)) {
    if (coverage[key]) score += weight
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * @param {object} report
 */
export function evmProviderCoverageFromReport(report) {
  const findings = report?.findings || []
  const verified = findings.some((f) => f.code === 'VERIFIED_SOURCE')
  const etherscanLive = report?.dataSources?.etherscan === 'etherscan_v2'
  const goPlusLive = report?.dataSources?.goPlus === 'goplus'
  const onChainLive = report?.dataSources?.onChain === 'live'
  const tc = report?.tokenConcentration

  return {
    etherscan: Boolean(verified || etherscanLive),
    goplus: goPlusLive,
    dexscreener: Boolean(
      tc?.dataSources?.dexscreener ||
        (tc?.liquidityUsd != null && tc.liquidityUsd > 0) ||
        tc?.liquidityConfirmed,
    ),
    honeypot: Boolean(goPlusLive && report?.honeypotRisk != null),
    ownership: report?.ownershipConcentration != null,
    proxy: Boolean(
      onChainLive &&
        (report?.upgradeableProxy != null ||
          report?.proxyImplementation != null ||
          report?.privilegedFunctions != null),
    ),
  }
}

/**
 * @param {object} report
 */
export function solanaProviderCoverageFromReport(report) {
  const tc = report?.tokenConcentration || {}
  const rpcOk = !report?.rpcUnavailable && !report?.partialMarketScan
  const holderText = String(tc.holderConcentration || '')
  const largestText = String(tc.largestWallet || '')

  return {
    rpc: Boolean(
      rpcOk &&
        (report?.supply != null ||
          report?.mintAuthority != null ||
          report?.freezeAuthority != null ||
          report?.addressType === 'SPL_TOKEN_MINT'),
    ),
    helius: Boolean(process.env.SOLANA_RPC_URL && rpcOk),
    birdeye: Boolean(tc.dataSources?.birdeye || tc.provenance?.birdeye),
    dexscreener: Boolean(tc.dataSources?.dexscreener || tc.provenance?.dexscreener),
    jupiter: Boolean(
      tc.dataSources?.jupiter ||
        tc.jupiterRoutable ||
        tc.jupiterClassification === 'ROUTABLE' ||
        tc.jupiterClassification === 'LIMITED_ROUTING',
    ),
    holders: Boolean(
      tc.holderCount != null ||
        tc.top10HolderPct != null ||
        (holderText.includes('%') && !/unavailable/i.test(holderText)),
    ),
    largestWallet: Boolean(
      tc.largestWalletPct != null ||
        (largestText.includes('%') && !/unavailable/i.test(largestText)),
    ),
    metadata: Boolean(report?.metadataPresent || report?.archetypeLabel),
    mintAuthority: Boolean(
      !report?.partialMarketScan &&
        (report?.mintAuthority != null || report?.mintAuthority === null),
    ),
    freezeAuthority: Boolean(
      !report?.partialMarketScan &&
        (report?.freezeAuthority != null || report?.freezeAuthority === null),
    ),
  }
}

/**
 * Human-readable scanner confidence label for Solana UI.
 * @param {Record<string, boolean>} coverage
 * @param {number} score
 */
export function buildSolanaScannerConfidenceLabel(coverage, score) {
  const parts = []
  if (coverage.rpc || coverage.helius) parts.push('Scanner')
  if (coverage.birdeye) parts.push('Birdeye')
  if (coverage.dexscreener) parts.push('DexScreener')
  if (coverage.jupiter) parts.push('Jupiter')
  if (coverage.helius && !parts.includes('Helius')) parts.push('Helius')

  let tier = 'Classification only'
  if (score >= 90) tier = 'Scanner + Birdeye + Helius + Jupiter'
  else if (score >= 75) tier = 'Scanner + Birdeye + DexScreener'
  else if (score >= 50) tier = 'Scanner + market providers'
  else if (score >= 25) tier = 'Scanner only'
  else tier = 'Classification only'

  return {
    score,
    tier,
    providersLabel: parts.length ? parts.join(' + ') : 'Classification only',
  }
}

/**
 * @param {object} report
 * @param {'evm' | 'solana'} platform
 */
export function computeScannerConfidence(report, platform) {
  const providerCoverage =
    platform === 'solana'
      ? solanaProviderCoverageFromReport(report)
      : evmProviderCoverageFromReport(report)

  const weights = platform === 'solana' ? SOLANA_WEIGHTS : EVM_WEIGHTS
  const score = coverageScoreFromWeights(providerCoverage, weights)
  const band = confidenceBandFromScore(score)

  return { score, band, providerCoverage }
}

/**
 * Apply trust-score cap from confidence band; recalculate trust band + verdict frame.
 * @param {object} report
 * @param {'evm' | 'solana'} platform
 */
export function applyConfidenceCalibration(report, platform) {
  if (report?.trustScore == null || !Number.isFinite(Number(report.trustScore))) {
    return report
  }

  const confidence = computeScannerConfidence(report, platform)
  const rawTrust = Number(report.trustScore)
  const tc = report?.tokenConcentration || {}

  let cappedTrust = rawTrust
  if (platform === 'solana') {
    const strongMarket =
      (tc.liquidityUsd != null && tc.liquidityUsd >= 100_000) ||
      (tc.marketCapUsd != null && tc.marketCapUsd >= 1_000_000) ||
      tc.liquidityConfidence === 'HIGH'
    const marketProvidersLive =
      confidence.providerCoverage.dexscreener && confidence.providerCoverage.jupiter

    if (strongMarket && marketProvidersLive) {
      cappedTrust = rawTrust
    } else {
      const dataPenalty = tc.dataConfidencePenalty ?? 0
      const cap = TRUST_SCORE_CAP[confidence.band]
      cappedTrust = Math.min(rawTrust, cap + Math.min(dataPenalty, 8))
    }

    const solanaLabel = buildSolanaScannerConfidenceLabel(confidence.providerCoverage, confidence.score)
    confidence.solanaLabel = solanaLabel
  } else {
    const cap = TRUST_SCORE_CAP[confidence.band]
    cappedTrust = Math.min(rawTrust, cap)
  }

  const trustBand =
    platform === 'solana'
      ? solanaTrustBandFromScore(cappedTrust)
      : trustBandFromScore(cappedTrust)

  let nextVerdictFrame = report.verdictActionFrame
  if (report.tokenConcentration) {
    const isCanonical = Boolean(report.archetypeId) || Boolean(tc.isMajorAsset)
    nextVerdictFrame =
      platform === 'solana'
        ? solanaVerdictActionFrame(trustBand, report.tokenConcentration, isCanonical)
        : buildEvmVerdictFrame(trustBand, report.tokenConcentration, isCanonical)
  }

  return {
    ...report,
    trustScore: cappedTrust,
    trustBand,
    verdictActionFrame: nextVerdictFrame,
    confidence: {
      score: confidence.score,
      band: confidence.band,
      providerCoverage: confidence.providerCoverage,
      solanaLabel: confidence.solanaLabel || null,
      dataConfidence: tc.dataConfidence || null,
    },
    scannerConfidenceScore: confidence.score,
    ...(rawTrust !== cappedTrust ? { trustScoreUncapped: rawTrust } : {}),
  }
}
