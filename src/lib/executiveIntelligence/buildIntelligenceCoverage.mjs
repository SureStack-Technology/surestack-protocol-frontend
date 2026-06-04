import { isPrimeLunarCrushLive } from '../../data/lunarCrushScenarioShowcase.js'
import { assessBehaviorCoverage } from '../../utils/behaviorIntelligenceStatus.js'
import {
  PROVIDER_STATUS,
  providerStatusLabel,
  resolveLunarCrushProviderStatus,
  resolveBirdeyeProviderStatus,
  resolveScannerProviderStatus,
} from '../intelligence/providerCoverageStatus.mjs'
import { resolveIntelligenceChain } from '../intelligence/chainIntelligence.mjs'

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

/**
 * @typedef {'live'|'partial'|'rate_limited'|'fallback'|'unsupported'} ProviderCoverageStatus
 * @typedef {{ label: string, status: ProviderCoverageStatus, statusLabel?: string }} CoverageSource
 */

/**
 * Build provider coverage checklist for intelligence confidence transparency.
 * @param {object} params
 * @returns {CoverageSource[]}
 */
export function buildIntelligenceCoverageSources({
  report = null,
  scannerReport = null,
  primeTrends = null,
  watchlist = null,
  birdeyeAssets = [],
} = {}) {
  const sr = scannerReport || report?.scannerReport || null
  const scanActive = hasScannerEvidence(report, sr)
  const behavior = assessBehaviorCoverage(watchlist, birdeyeAssets)
  const chain = resolveIntelligenceChain(report, sr)
  const isSolana = chain === 'solana'
  const isEthereum = chain === 'ethereum'

  const narrativeStatus = resolveLunarCrushProviderStatus(primeTrends)
  const behaviorStatus = resolveBirdeyeProviderStatus(watchlist, {
    chain,
    unsupportedChain: isEthereum,
  })
  const scannerStatus = resolveScannerProviderStatus(scanActive)

  const ds =
    sr?.tokenConcentration?.dataSources?.dexscreener ||
    sr?.liquidityIntelligence?.dexScreenerUsed ||
    sr?.findings?.some?.((f) => /dexscreener/i.test(String(f.detail || f.title || '')))
  const jup =
    isSolana &&
    (sr?.tokenConcentration?.dataSources?.jupiter ||
      sr?.liquidityIntelligence?.jupiterRouting ||
      sr?.findings?.some?.((f) => /jupiter/i.test(String(f.detail || f.title || ''))))
  const helius =
    isSolana &&
    (sr?.mintAuthority != null ||
      sr?.freezeAuthority != null ||
      sr?.tokenConcentration?.holderCount != null)
  const alchemy =
    isEthereum &&
    (sr?.providerCoverage?.alchemy === 'alchemy' ||
      /alchemy|on-chain bytecode/i.test(String(sr?.scannerSummary || sr?.dataConfidence?.detail || '')))
  const etherscan =
    isEthereum &&
    (sr?.providerCoverage?.etherscan === 'etherscan' ||
      sr?.verifiedSource != null ||
      sr?.findings?.some?.((f) => /verified|etherscan/i.test(String(f.title || f.detail || ''))))
  const goplus =
    isEthereum &&
    (sr?.providerCoverage?.goPlus === 'goplus' ||
      sr?.honeypotRisk != null ||
      sr?.findings?.some?.((f) => /goplus|security/i.test(String(f.title || f.detail || ''))))

  /** @param {string} label @param {ProviderCoverageStatus} status @param {boolean} [activeHint] */
  function row(label, status, activeHint = false) {
    const resolved =
      status === PROVIDER_STATUS.PARTIAL && activeHint ? PROVIDER_STATUS.LIVE : status
    return {
      label,
      status: resolved,
      statusLabel: providerStatusLabel(resolved),
    }
  }

  /** @type {CoverageSource[]} */
  const sources = []

  sources.push(row('Scanner Engine', scannerStatus, scanActive))
  sources.push(row('DexScreener', ds ? PROVIDER_STATUS.LIVE : scanActive ? PROVIDER_STATUS.PARTIAL : PROVIDER_STATUS.FALLBACK))

  if (isSolana) {
    sources.push(
      row(
        'Birdeye',
        behaviorStatus === PROVIDER_STATUS.UNSUPPORTED ? PROVIDER_STATUS.UNSUPPORTED : behaviorStatus,
        behavior.mode === 'full',
      ),
    )
    sources.push(row('Jupiter', jup ? PROVIDER_STATUS.LIVE : scanActive ? PROVIDER_STATUS.PARTIAL : PROVIDER_STATUS.FALLBACK))
    sources.push(row('Helius', helius ? PROVIDER_STATUS.LIVE : scanActive ? PROVIDER_STATUS.PARTIAL : PROVIDER_STATUS.FALLBACK))
  }

  if (isEthereum) {
    sources.push(row('Alchemy', alchemy ? PROVIDER_STATUS.LIVE : scanActive ? PROVIDER_STATUS.PARTIAL : PROVIDER_STATUS.FALLBACK))
    sources.push(row('Etherscan', etherscan ? PROVIDER_STATUS.LIVE : scanActive ? PROVIDER_STATUS.PARTIAL : PROVIDER_STATUS.FALLBACK))
    sources.push(row('GoPlus', goplus ? PROVIDER_STATUS.LIVE : scanActive ? PROVIDER_STATUS.PARTIAL : PROVIDER_STATUS.FALLBACK))
    sources.push(row('Birdeye', PROVIDER_STATUS.UNSUPPORTED))
    sources.push(row('Jupiter', PROVIDER_STATUS.UNSUPPORTED))
    sources.push(row('Helius', PROVIDER_STATUS.UNSUPPORTED))
  }

  sources.push(row('Behavior Feed', behaviorStatus, behavior.mode === 'full'))
  sources.push(
    row(
      'Narrative Intelligence',
      narrativeStatus,
      isPrimeLunarCrushLive(primeTrends),
    ),
  )

  return sources
}

/**
 * Layer-level provider status for UI badges.
 * @param {object} params
 */
export function buildProviderLayerStatuses({
  report = null,
  scannerReport = null,
  primeTrends = null,
  watchlist = null,
  birdeyeAssets = [],
} = {}) {
  const chain = resolveIntelligenceChain(report, scannerReport)
  const scanActive = hasScannerEvidence(report, scannerReport)
  return {
    narrative: resolveLunarCrushProviderStatus(primeTrends),
    behavior: resolveBirdeyeProviderStatus(watchlist, {
      chain,
      unsupportedChain: chain === 'ethereum',
    }),
    scanner: resolveScannerProviderStatus(scanActive),
    chain,
  }
}
