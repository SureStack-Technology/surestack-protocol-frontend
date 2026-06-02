import { isPrimeLunarCrushLive } from '../../data/lunarCrushScenarioShowcase.js'
import { assessBehaviorCoverage } from '../../utils/behaviorIntelligenceStatus.js'

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
 * @typedef {'active' | 'partial' | 'pending'} CoverageStatus
 * @typedef {{ label: string, status: CoverageStatus }} CoverageSource
 */

function sourceStatus(active, partial = false) {
  if (active) return 'active'
  if (partial) return 'partial'
  return 'pending'
}

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
  const lunarLive = isPrimeLunarCrushLive(primeTrends)

  const ds =
    sr?.tokenConcentration?.dataSources?.dexscreener ||
    sr?.liquidityIntelligence?.dexScreenerUsed ||
    sr?.findings?.some?.((f) => /dexscreener/i.test(String(f.detail || f.title || '')))
  const jup =
    sr?.tokenConcentration?.dataSources?.jupiter ||
    sr?.liquidityIntelligence?.jupiterRouting ||
    sr?.findings?.some?.((f) => /jupiter/i.test(String(f.detail || f.title || '')))
  const birdeye =
    behavior.mode === 'full' ||
    behavior.mode === 'partial' ||
    sr?.tokenConcentration?.dataSources?.birdeye ||
    birdeyeAssets?.some?.((a) => a.status === 'live')
  const helius =
    sr?.mintAuthority != null ||
    sr?.freezeAuthority != null ||
    sr?.tokenConcentration?.holderCount != null ||
    /helius|rpc|on-chain mint/i.test(String(sr?.dataConfidence?.detail || sr?.scannerValidation || ''))
  const heliusPartial =
    helius &&
    (sr?.dataConfidence?.label === 'Limited' ||
      sr?.dataConfidence?.label === 'Partial' ||
      /limited market intelligence/i.test(String(sr?.scannerSummary || '')))

  /** @type {CoverageSource[]} */
  const sources = [
    {
      label: 'Birdeye',
      status: sourceStatus(behavior.mode === 'full', behavior.mode === 'partial'),
    },
    {
      label: 'DexScreener',
      status: sourceStatus(Boolean(ds), scanActive && !ds),
    },
    {
      label: 'Jupiter',
      status: sourceStatus(Boolean(jup), scanActive && !jup),
    },
    {
      label: 'Scanner Engine',
      status: sourceStatus(scanActive),
    },
    {
      label: 'Helius',
      status: heliusPartial ? 'partial' : sourceStatus(Boolean(helius)),
    },
    {
      label: 'Behavior Feed',
      status: sourceStatus(behavior.mode === 'full', behavior.mode === 'partial'),
    },
    {
      label: 'Narrative Intelligence',
      status: sourceStatus(lunarLive, !lunarLive && Boolean(primeTrends)),
    },
  ]

  return sources
}
