import { buildSolanaRiskScanView } from '@/utils/solanaRiskScannerFormat.js'
import { buildConfidenceView } from '@/utils/scannerConfidenceFormat.js'

const BONK_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
const BONK_MINT_LEGACY = new Set([
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6Y7YaB1pPB263',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6Y7YaB1pPB2637',
])

function resolveMintForDisplay(mintAddress, scannerReport) {
  const m = mintAddress || scannerReport?.address
  if (BONK_MINT_LEGACY.has(m)) return BONK_MINT
  return m
}

function fieldFromTc(tc, key, intelMap, label) {
  if (tc[key] != null && tc[key] !== '' && tc[key] !== 'Unavailable') {
    return String(tc[key])
  }
  return intelMap.get(label) || '—'
}

/**
 * @param {object | null} scannerReport — Solana API payload
 * @param {string} mintAddress
 * @param {string} [symbol]
 * @param {string} [tokenName]
 */
export function buildSolanaTokenPanelSummary(scannerReport, mintAddress, symbol, tokenName) {
  const hasScan = Boolean(
    scannerReport &&
      scannerReport.success !== false &&
      (scannerReport.addressType ||
        scannerReport.trustScore != null ||
        scannerReport.compositeTrustScore != null ||
        scannerReport.product === 'surestack_solana_risk_scanner'),
  )
  const view = hasScan ? buildSolanaRiskScanView(scannerReport) : null
  const tc = scannerReport?.tokenConcentration || {}
  const intelMap = new Map((view?.intelligence || []).map((r) => [r.label, r.value]))
  const confidence = buildConfidenceView(scannerReport)
  const mint = resolveMintForDisplay(mintAddress, scannerReport)

  const providerPending =
    !hasScan ||
    (Boolean(scannerReport?.partialMarketScan) &&
      !tc?.liquidityConfirmed &&
      !tc?.marketCapUsd)

  const fields = [
    { label: 'Mint address', value: mint || '—', pending: !mint },
    {
      label: 'Symbol',
      value: symbol || tc?.birdeyeSymbol || scannerReport?.archetypeLabel?.match(/\(([^)]+)\)/)?.[1] || '—',
      pending: false,
    },
    { label: 'Token name', value: tokenName || scannerReport?.archetypeLabel || '—', pending: false },
    {
      label: 'Market cap',
      value: fieldFromTc(tc, 'marketCap', intelMap, 'Market cap'),
      pending: !hasScan,
      confidence: tc?.dataConfidence?.marketCap,
    },
    {
      label: 'Fully diluted value',
      value: fieldFromTc(tc, 'fdv', intelMap, 'FDV'),
      pending: !hasScan,
      confidence: tc?.dataConfidence?.fdv,
    },
    {
      label: 'Liquidity',
      value: fieldFromTc(tc, 'liquidityDepth', intelMap, 'Liquidity depth'),
      pending: !hasScan,
      confidence: tc?.dataConfidence?.liquidity,
    },
    {
      label: '24h volume',
      value: fieldFromTc(tc, 'volume24h', intelMap, '24h volume'),
      pending: !hasScan,
      confidence: tc?.dataConfidence?.volume24h,
    },
    {
      label: 'Holders',
      value: fieldFromTc(tc, 'holderCountDisplay', intelMap, 'Holder count'),
      pending: !hasScan,
      confidence: tc?.dataConfidence?.holderCount,
    },
    {
      label: 'Top holder %',
      value: fieldFromTc(tc, 'largestWallet', intelMap, 'Top holder %'),
      pending: !hasScan,
      confidence: tc?.dataConfidence?.top1HolderPct,
    },
    {
      label: 'Top 10 holder %',
      value:
        tc.top10HolderPct != null
          ? `${tc.top10HolderPct.toFixed(1)}%`
          : fieldFromTc(tc, 'holderConcentration', intelMap, 'Top 10 holder %'),
      pending: !hasScan,
      confidence: tc?.dataConfidence?.top10HolderPct,
    },
    {
      label: 'DEX listings',
      value: fieldFromTc(tc, 'dexListings', intelMap, 'DEX listings'),
      pending: !hasScan,
      confidence: tc?.dataConfidence?.dexListings,
    },
    {
      label: 'Jupiter routing',
      value: tc.jupiterRoutingLabel || fieldFromTc(tc, 'marketRouting', intelMap, 'Jupiter routing'),
      pending: !hasScan,
      confidence: tc?.dataConfidence?.jupiterRouting,
    },
    {
      label: 'Token age',
      value: fieldFromTc(tc, 'tokenAge', intelMap, 'Token age'),
      pending: !hasScan,
    },
    {
      label: 'LP locked status',
      value: tc.lpStatusLabel || tc.lpStatus || 'Unknown',
      pending: !hasScan,
      confidence: tc?.dataConfidence?.lpStatus,
    },
    {
      label: 'Mint authority',
      value: intelMap.get('Mint authority') || (scannerReport?.mintAuthority ? 'Active' : 'Revoked / not set'),
      pending: !hasScan && scannerReport?.partialMarketScan,
    },
    {
      label: 'Freeze authority',
      value: intelMap.get('Freeze authority') || (scannerReport?.freezeAuthority ? 'Active' : 'Revoked / not set'),
      pending: !hasScan && scannerReport?.partialMarketScan,
    },
  ]

  const evidenceSections = {
    marketStructure: [
      { label: 'Market cap', value: fields.find((f) => f.label === 'Market cap')?.value },
      { label: 'FDV', value: fields.find((f) => f.label === 'Fully diluted value')?.value },
      { label: 'Liquidity', value: fields.find((f) => f.label === 'Liquidity')?.value },
      { label: '24h volume', value: fields.find((f) => f.label === '24h volume')?.value },
    ],
    authorityControls: [
      { label: 'Mint authority', value: fields.find((f) => f.label === 'Mint authority')?.value },
      { label: 'Freeze authority', value: fields.find((f) => f.label === 'Freeze authority')?.value },
    ],
    holderDistribution: [
      { label: 'Holder count', value: fields.find((f) => f.label === 'Holders')?.value },
      { label: 'Top holder %', value: fields.find((f) => f.label === 'Top holder %')?.value },
      { label: 'Top 10 %', value: fields.find((f) => f.label === 'Top 10 holder %')?.value },
    ],
    tradability: [
      { label: 'Jupiter', value: fields.find((f) => f.label === 'Jupiter routing')?.value },
      { label: 'DEX listings', value: fields.find((f) => f.label === 'DEX listings')?.value },
      { label: 'LP / pools', value: fields.find((f) => f.label === 'LP locked status')?.value },
    ],
    providerHealth: tc.providerHealth
      ? Object.entries(tc.providerHealth).map(([k, v]) => ({
          label: k.charAt(0).toUpperCase() + k.slice(1),
          value: v,
        }))
      : [],
  }

  return {
    hasScan,
    providerPending,
    scannerVerdict: view?.verdict || null,
    scannerVerdictDetail: scannerReport?.scannerVerdictDetail || view?.verdictSubtitle || null,
    trustScore: scannerReport?.compositeTrustScore ?? scannerReport?.trustScore ?? null,
    technicalTrustScore: scannerReport?.technicalTrustScore ?? null,
    technicalTrustLabel: scannerReport?.technicalTrustLabel ?? null,
    narrativeRiskLabel: scannerReport?.narrativeRiskLabel ?? null,
    compositeRiskBand: scannerReport?.compositeRiskBand ?? null,
    scannerConfidenceScore: confidence?.scannerConfidencePct ?? null,
    scannerConfidenceTier: confidence?.scannerConfidenceTier ?? null,
    scannerConfidenceProviders: confidence?.providersLabel ?? null,
    recommendation: view?.recommendation || null,
    narrative: view?.narrative || scannerReport?.interpretationSummary || null,
    fields,
    evidenceSections,
    findings: scannerReport?.findings || [],
    dataConfidence: tc?.dataConfidence || null,
  }
}
