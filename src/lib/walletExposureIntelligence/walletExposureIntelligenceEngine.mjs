import { buildPortfolioBreakdown } from './portfolioBreakdown.mjs'
import { enrichPortfolioHoldings } from '../../../shared/lib/walletExposure/enrichPortfolioHoldings.mjs'

export const EXPOSURE_STATUS_INSUFFICIENT_VALUATION = 'INSUFFICIENT VALUATION DATA'

export const WALLET_EXPOSURE_DISCLAIMER =
  'Wallet Exposure Intelligence is generated from publicly observable wallet activity and blockchain data. It does not constitute investment advice, portfolio management, trading recommendations, or financial planning.'

/** @typedef {'LOW'|'MODERATE'|'HIGH'|'CRITICAL'} ConcentrationLevel */
/** @typedef {'LOW'|'MODERATE'|'HIGH'} SectorRiskLevel */

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {number} score 0–100 exposure risk
 */
export function walletExposureBandFromScore(score) {
  const s = Number(score)
  if (!Number.isFinite(s)) return { label: 'Assessment pending', band: 'pending' }
  if (s <= 25) return { label: 'LOW EXPOSURE', band: 'low' }
  if (s <= 50) return { label: 'MODERATE EXPOSURE', band: 'moderate' }
  if (s <= 75) return { label: 'HIGH EXPOSURE', band: 'high' }
  return { label: 'CRITICAL EXPOSURE', band: 'critical' }
}

/**
 * @param {number} pct
 * @returns {ConcentrationLevel}
 */
export function assetConcentrationLevel(pct) {
  const p = num(pct) ?? 0
  if (p >= 55) return 'CRITICAL'
  if (p >= 42) return 'HIGH'
  if (p >= 28) return 'MODERATE'
  return 'LOW'
}

/**
 * @param {number} sectorPct
 * @returns {SectorRiskLevel}
 */
export function sectorRiskLevel(sectorPct) {
  const p = num(sectorPct) ?? 0
  if (p >= 50) return 'HIGH'
  if (p >= 30) return 'MODERATE'
  return 'LOW'
}

function bandLevel(bands, id) {
  const b = (bands || []).find((x) => x.id === id)
  return num(b?.level) ?? 0
}

/**
 * @param {object[]} portfolioHoldings
 */
export function pricedPortfolioValueFromHoldings(portfolioHoldings = []) {
  return (portfolioHoldings || [])
    .filter((h) => h.hasReliablePrice && Number(h.usdValue) > 0)
    .reduce((s, h) => s + Number(h.usdValue), 0)
}

/**
 * Sector allocation from verified USD marks only.
 * @param {object[]} portfolioHoldings
 */
function allocationFromPricedHoldings(portfolioHoldings) {
  const breakdown = buildPortfolioBreakdown({ portfolioHoldings })
  const pct = (label) => breakdown.sectorMix.find((s) => s.label === label)?.pct ?? 0
  const stablePct = pct('Stablecoin')
  const memePct = pct('Meme')
  const blueChipPct = pct('Blue Chip')
  const infraPct = pct('Infrastructure')
  const defiPct = pct('DeFi')
  const aiPct = pct('AI')
  const nftPct = pct('NFT')
  const topShare = breakdown.concentrationAsset?.portfolioPct ?? 0
  const topSymbol = breakdown.concentrationAsset?.symbol || null

  const assetAllocation = normalizeAllocation([
    { category: 'Stablecoins', pct: stablePct },
    { category: 'Blue Chip Assets', pct: blueChipPct },
    { category: 'Infrastructure Assets', pct: infraPct },
    { category: 'Meme Assets', pct: memePct },
    { category: 'DeFi Assets', pct: defiPct },
    { category: 'AI Assets', pct: aiPct },
    { category: 'NFT Assets', pct: nftPct },
  ]).filter((r) => r.pct > 0)

  const sectorAllocation = normalizeAllocation([
    { sector: 'Stablecoins', pct: stablePct },
    { sector: 'Blue Chip', pct: blueChipPct },
    { sector: 'Infrastructure', pct: infraPct },
    { sector: 'Meme', pct: memePct },
    { sector: 'DeFi', pct: defiPct },
    { sector: 'NFT', pct: nftPct },
    { sector: 'AI', pct: aiPct },
  ]).filter((r) => r.pct > 0)

  const topAssets = breakdown.top10Holdings.slice(0, 5).map((h) => ({
    symbol: h.symbol,
    pct: h.portfolioPct ?? 0,
  }))

  return {
    stablePct,
    memePct,
    blueChipPct,
    infraPct,
    defiPct,
    aiPct,
    nftPct,
    topShare,
    topSymbol,
    assetAllocation,
    sectorAllocation,
    topAssets,
    largestPosition: topSymbol
      ? `${breakdown.concentrationAsset?.asset || topSymbol} (${topSymbol})`
      : 'N/A',
  }
}

/**
 * @param {object} input
 * @param {{ portfolioHoldings: object[], pricedPortfolioValue: number }} ctx
 */
function buildInsufficientValuationExposureProfile(input, ctx) {
  const metrics = input.metrics || {}
  const approvalRows = input.approvalRows || []
  const approvalCount = approvalRows.length
  const unlimitedUnknown = approvalRows.filter(
    (r) => r.unlimited && r.spenderCategory === 'UNKNOWN_SPENDER',
  ).length

  let exposureScore = num(input.exposureScore)
  if (exposureScore == null && num(input.safetyScore) != null) {
    exposureScore = clamp(Math.round(100 - Number(input.safetyScore)), 0, 100)
  }

  return {
    exposureStatus: EXPOSURE_STATUS_INSUFFICIENT_VALUATION,
    exposureStatusReason: 'No holdings have reliable USD valuation.',
    exposureScore: exposureScore ?? null,
    exposureBand: EXPOSURE_STATUS_INSUFFICIENT_VALUATION,
    exposureBandId: 'insufficient_valuation',
    assetAllocation: [],
    sectorAllocation: [],
    topAssets: [],
    assetConcentration: 'N/A',
    assetConcentrationReason: 'Requires priced portfolio holdings.',
    sectorRisk: 'N/A',
    sectorRiskReason: 'Requires priced portfolio holdings.',
    largestPosition: 'N/A',
    contractExposureScore: null,
    contractExposureLabel: 'N/A',
    contractExposureDetail: `${approvalCount} active approvals observed; valuation required for concentration metrics.`,
    counterpartyExposure: 'N/A',
    counterparties: [],
    exposureDrivers: [
      {
        rank: 'Primary',
        label: 'Insufficient valuation data',
        detail: 'No holdings have reliable USD valuation.',
      },
    ],
    threatIndicators: [
      {
        label: 'Portfolio valuation incomplete',
        level: 'MEDIUM',
      },
    ],
    analystCommentary:
      'Wallet Exposure Intelligence requires reliable USD marks on holdings before concentration, sector allocation, or exposure percentages can be computed. Connect a wallet and refresh when price feeds are available.',
    disclaimer: WALLET_EXPOSURE_DISCLAIMER,
    dataQuality: 'partial',
    pricedPortfolioValue: ctx.pricedPortfolioValue,
    portfolioHoldingsCount: ctx.portfolioHoldings.length,
    unpricedHoldingsCount: ctx.portfolioHoldings.filter((h) => !h.hasReliablePrice || !h.usdValue).length,
    assessmentPending: false,
  }
}

function normalizeAllocation(rows) {
  const total = rows.reduce((s, r) => s + (r.pct || 0), 0)
  if (total <= 0) {
    return rows.map((r) => ({ ...r, pct: 0 }))
  }
  if (Math.abs(total - 100) < 0.5) return rows
  return rows.map((r) => ({ ...r, pct: Math.round((r.pct / total) * 1000) / 10 }))
}

function inferTopAssets(input) {
  const hints = input.exposureHints || {}
  const stableSyms = input.stableSymbolsHeld || hints.stableSymbols || []
  const topShare = num(hints.topTokenSharePct) ?? num(input.topTokenSharePct) ?? 0
  const stableShare = num(hints.stableSharePct) ?? 0

  const assets = []
  if (topShare > 0) {
    assets.push({ symbol: input.topAssetSymbol || 'Largest sampled asset', pct: topShare })
  }
  if (stableShare > 0 && stableSyms.length) {
    const perStable = stableShare / stableSyms.length
    for (const sym of stableSyms.slice(0, 3)) {
      assets.push({ symbol: sym, pct: Math.round(perStable * 10) / 10 })
    }
  }

  const approvalTokens = (input.approvalRows || [])
    .map((r) => r.tokenSymbol || r.symbol || null)
    .filter(Boolean)
  const tokenCounts = new Map()
  for (const t of approvalTokens) {
    tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1)
  }
  const sorted = [...tokenCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [sym, count] of sorted.slice(0, 3)) {
    if (!assets.some((a) => a.symbol === sym)) {
      assets.push({ symbol: sym, pct: Math.min(15, count * 4) })
    }
  }

  if (!assets.length) {
    return [
      { symbol: 'Sampled holdings', pct: 100 },
    ]
  }

  const sortedAssets = [...assets].sort((a, b) => b.pct - a.pct).slice(0, 4)
  const used = sortedAssets.reduce((s, a) => s + a.pct, 0)
  sortedAssets.push({ symbol: 'Other', pct: Math.max(0, Math.round((100 - used) * 10) / 10) })
  return sortedAssets.filter((a) => a.pct > 0).slice(0, 5)
}

function inferCounterparties(input, metrics) {
  const names = new Set()
  for (const cp of metrics.protocolCounterparties || []) {
    if (cp) names.add(String(cp).slice(0, 42))
  }
  for (const row of input.approvalRows || []) {
    const label = row.spenderLabel || row.spenderName
    if (label) names.add(label)
    else if (row.spenderCategory === 'KNOWN_AGGREGATOR') names.add('DEX aggregator')
  }
  const dexLabels = ['Uniswap', '1inch', '0x', 'CoW Swap', 'SushiSwap', 'Jupiter', 'Raydium', 'Kamino', 'Marinade']
  for (const d of dexLabels) {
    if ((metrics.dexApprovalCount || 0) > 0 || (metrics.dexInteractionCount || 0) > 0) {
      if (d === 'Uniswap' || d === '1inch') names.add(d)
    }
  }
  if ((metrics.protocolSpenderCount || 0) > 0) names.add('DeFi protocol')
  return [...names].slice(0, 6)
}

function buildThreatIndicators(ctx) {
  const threats = []
  if (ctx.memePct >= 35) {
    threats.push({ label: 'High meme concentration', level: ctx.memePct >= 45 ? 'HIGH' : 'MEDIUM' })
  }
  if (ctx.unlimitedUnknown > 0) {
    threats.push({
      label: 'Unlimited approval exposure',
      level: ctx.unlimitedUnknown >= 2 ? 'HIGH' : 'MEDIUM',
    })
  }
  if (ctx.stablePct < 12 && ctx.hasWallet) {
    threats.push({ label: 'Stablecoin deficiency (observed)', level: 'MEDIUM' })
  }
  if (ctx.topShare >= 42) {
    threats.push({ label: 'Asset concentration elevated', level: 'HIGH' })
  }
  if (ctx.protocolDependency >= 5) {
    threats.push({ label: 'Protocol concentration', level: 'MEDIUM' })
  }
  if (ctx.unknownSpenders >= 2) {
    threats.push({ label: 'Unknown spender approvals', level: 'HIGH' })
  }
  if (!threats.length) {
    threats.push({ label: 'No elevated exposure flags in sampled data', level: 'LOW' })
  }
  return threats
}

function buildAnalystCommentary(ctx) {
  const parts = []
  parts.push(
    `This wallet profile reflects observed on-chain activity and sampled holdings. Overall exposure is classified as ${ctx.exposureBandLabel.toLowerCase()}.`,
  )
  if (ctx.memePct >= 30) {
    parts.push(
      'Elevated exposure to speculative asset categories appears present based on volatile balance share and concentration signals.',
    )
  } else if (ctx.stablePct >= 40) {
    parts.push(
      'Stablecoin balances represent a meaningful share of sampled wallet value, which may reduce sensitivity to short-term volatility relative to highly speculative profiles.',
    )
  }
  if (ctx.stablePct < 15) {
    parts.push(
      'Stablecoin reserves appear limited relative to total sampled portfolio value in available provider data.',
    )
  }
  if (ctx.counterpartyCount >= 3) {
    parts.push(
      `Exposure appears distributed across ${ctx.counterpartyCount} observed counterparties or protocol surfaces, though concentration within individual assets may still influence sensitivity during volatile periods.`,
    )
  } else {
    parts.push(
      'Counterparty diversity appears limited in sampled approval and interaction data.',
    )
  }
  if (ctx.unlimitedUnknown > 0) {
    parts.push(
      `${ctx.unlimitedUnknown} unlimited approval${ctx.unlimitedUnknown === 1 ? '' : 's'} to unclassified spenders were observed and may warrant monitoring.`,
    )
  }
  parts.push(
    'These observations are educational estimates from public blockchain data and may not capture private activity, full portfolio composition, or future market conditions.',
  )
  return parts.join(' ')
}

/**
 * @param {object} input
 */
export function computeWalletExposureIntelligenceProfile(input = {}) {
  const bands = input.exposureIntelligence?.bands || []
  const hints = input.exposureHints || {}
  const metrics = input.metrics || {}
  const approvalRows = input.approvalRows || []
  const portfolioHoldings = enrichPortfolioHoldings(hints.portfolioHoldings || input.portfolioHoldings || [])
  const pricedPortfolioValue = pricedPortfolioValueFromHoldings(portfolioHoldings)
  const hasWallet = Boolean(input.hasWallet)
  const holdingsObserved = portfolioHoldings.length > 0

  if (hasWallet && holdingsObserved && pricedPortfolioValue <= 0) {
    return buildInsufficientValuationExposureProfile(input, {
      portfolioHoldings,
      pricedPortfolioValue,
    })
  }

  const usePricedHoldings = hasWallet && holdingsObserved && pricedPortfolioValue > 0
  const pricedAlloc = usePricedHoldings ? allocationFromPricedHoldings(portfolioHoldings) : null

  const stablePct = pricedAlloc?.stablePct ?? num(hints.stableSharePct) ?? num(metrics.stableSharePct) ?? 0
  const volatilePct = num(hints.volatileSharePct) ?? num(metrics.volatileSharePct) ?? 0
  const topShare =
    pricedAlloc?.topShare ?? num(hints.topTokenSharePct) ?? num(metrics.topTokenSharePct) ?? 0

  const dexBand = bandLevel(bands, 'dex')
  const nftBand = bandLevel(bands, 'nft')
  const protocolBand = bandLevel(bands, 'protocol')
  const unknownBand = bandLevel(bands, 'unknown')

  const dexInteractions = num(hints.dexInteractionCount) ?? num(metrics.dexInteractionCount) ?? 0
  const nftCount = num(hints.nftHoldingsCount) ?? num(metrics.nftHoldingsCount) ?? 0
  const approvalCount = num(hints.approvalCount) ?? approvalRows.length ?? 0
  const unlimitedUnknown =
    num(hints.unlimitedApprovalUnknownCount) ??
    num(metrics.unlimitedUnknownCount) ??
    approvalRows.filter((r) => r.unlimited && r.spenderCategory === 'UNKNOWN_SPENDER').length
  const unknownSpenders =
    num(metrics.unknownSpenderCount) ??
    approvalRows.filter((r) => r.spenderCategory === 'UNKNOWN_SPENDER').length

  let memePct = pricedAlloc?.memePct ?? 0
  let defiPct = pricedAlloc?.defiPct ?? 0
  let nftPct = pricedAlloc?.nftPct ?? 0
  let blueChipPct = pricedAlloc?.blueChipPct ?? 0
  let infraPct = 0
  let gamingPct = 0
  let aiPct = pricedAlloc?.aiPct ?? 0
  let yieldPct = 0

  if (!usePricedHoldings && hasWallet) {
    memePct = 0
    defiPct = 0
    nftPct = 0
    blueChipPct = 0
    aiPct = 0
  } else if (!usePricedHoldings) {
    memePct =
      stablePct < 20 && topShare >= 35
        ? Math.min(48, topShare * 0.9)
        : stablePct < 15 && volatilePct > 55
          ? Math.min(35, volatilePct * 0.45)
          : Math.max(5, volatilePct * 0.12)
    defiPct = clamp((dexBand / 7) * 22 + dexInteractions * 1.8 + (protocolBand / 7) * 14, 0, 40)
    nftPct = clamp(nftCount * 3 + (nftBand / 7) * 12, 0, 22)
    blueChipPct = clamp(Math.max(0, volatilePct - memePct) * 0.5, 0, 45)
    infraPct = clamp((protocolBand / 7) * 10, 0, 15)
    aiPct = clamp(dexInteractions > 6 ? 4 : 2, 0, 8)
    yieldPct = clamp((protocolBand / 7) * 8, 0, 12)
  }

  let assetAllocation =
    pricedAlloc?.assetAllocation ??
    normalizeAllocation([
      { category: 'Stablecoins', pct: stablePct },
      { category: 'Blue Chip Assets', pct: blueChipPct },
      { category: 'Meme Assets', pct: memePct },
      { category: 'DeFi Assets', pct: defiPct },
      { category: 'AI Assets', pct: aiPct },
      { category: 'NFT Assets', pct: nftPct },
      { category: 'Gaming Assets', pct: gamingPct },
      { category: 'Infrastructure Assets', pct: infraPct },
      { category: 'Yield Exposure', pct: yieldPct },
    ])

  if (!pricedAlloc) {
    let unknownPct = 100 - assetAllocation.reduce((s, r) => s + r.pct, 0)
    if (unknownPct > 3) {
      assetAllocation = normalizeAllocation([
        ...assetAllocation.filter((r) => r.category !== 'Unknown Assets'),
        { category: 'Unknown Assets', pct: Math.max(0, unknownPct) },
      ])
    }
  }

  const sectorAllocation =
    pricedAlloc?.sectorAllocation ??
    normalizeAllocation([
      { sector: 'Stablecoins', pct: stablePct },
      { sector: 'Blue Chip', pct: blueChipPct + infraPct * 0.5 },
      { sector: 'Meme', pct: memePct },
      { sector: 'DeFi', pct: defiPct + yieldPct },
      { sector: 'NFT', pct: nftPct },
      { sector: 'Other', pct: Math.max(0, aiPct + gamingPct) },
    ]).filter((r) => r.pct > 0)

  const topAssets =
    pricedAlloc?.topAssets ??
    inferTopAssets({
      ...input,
      exposureHints: hints,
      approvalRows,
      topTokenSharePct: topShare,
      stableSymbolsHeld: metrics.stableSymbolsHeld || hints.stableSymbolsHeld || [],
    })

  const largestPosition = pricedAlloc?.largestPosition ?? topAssets[0]?.symbol ?? 'N/A'

  const concentrationLevel = usePricedHoldings
    ? assetConcentrationLevel(topShare)
    : hasWallet
      ? 'N/A'
      : assetConcentrationLevel(topShare || memePct)
  const concentrationReason = usePricedHoldings
    ? topShare >= 28
      ? `Largest position represents ${topShare.toFixed(2)}% of priced portfolio value.`
      : 'Largest position concentration appears within typical priced portfolio ranges.'
    : hasWallet
      ? 'Requires priced portfolio holdings.'
      : topShare >= 28
        ? `Largest position represents ${topShare.toFixed(0)}% of sampled wallet exposure.`
        : 'Largest position concentration appears within typical sampled ranges.'

  const dominantSector = [...sectorAllocation].sort((a, b) => b.pct - a.pct)[0]
  const sectorRisk = usePricedHoldings
    ? sectorRiskLevel(dominantSector?.pct ?? 0)
    : hasWallet
      ? 'N/A'
      : sectorRiskLevel(dominantSector?.pct ?? 0)

  let contractScore = clamp(
    Math.round(
      approvalCount * 2.5 +
        unlimitedUnknown * 14 +
        unknownSpenders * 6 +
        (num(metrics.topSpenderApprovalSharePct) ?? 0) * 0.35 +
        unknownBand * 4,
    ),
    0,
    100,
  )
  const contractLabel =
    contractScore >= 72 ? 'High' : contractScore >= 48 ? 'Moderate' : contractScore >= 28 ? 'Limited' : 'Low'

  const counterparties = inferCounterparties(input, {
    ...metrics,
    dexApprovalCount: metrics.dexApprovalCount,
    dexInteractionCount: dexInteractions,
    protocolCounterparties: metrics.protocolCounterparties,
  })
  const counterpartyLevel =
    counterparties.length >= 5 || protocolBand >= 5
      ? 'HIGH'
      : counterparties.length >= 2 || protocolBand >= 3
        ? 'MODERATE'
        : 'LOW'

  let exposureScore = num(input.exposureScore)
  if (exposureScore == null && num(input.safetyScore) != null) {
    exposureScore = clamp(Math.round(100 - Number(input.safetyScore)), 0, 100)
  }
  if (exposureScore == null) {
    exposureScore = clamp(
      Math.round(
        memePct * 0.35 +
          topShare * 0.35 +
          contractScore * 0.2 +
          (dominantSector?.pct ?? 0) * 0.25 +
          unknownBand * 5,
      ),
      0,
      100,
    )
  }

  const exposureBand = walletExposureBandFromScore(exposureScore)

  const driverCandidates = [
    {
      key: 'meme',
      weight: memePct * 1.2,
      label: 'Meme asset concentration',
      detail: `${memePct.toFixed(0)}% of sampled allocation classified as meme/speculative.`,
    },
    {
      key: 'stable',
      weight: stablePct < 15 ? 55 - stablePct : 0,
      label: 'Limited stablecoin allocation',
      detail: `Stablecoins represent ~${stablePct.toFixed(0)}% of sampled wallet value.`,
    },
    {
      key: 'concentration',
      weight: topShare * 1.1,
      label: 'Asset concentration',
      detail: concentrationReason,
    },
    {
      key: 'protocol',
      weight: (protocolBand / 7) * 40 + dexInteractions * 2,
      label: 'Protocol exposure',
      detail: `${counterparties.length || 0} counterparties observed across approvals and interactions.`,
    },
    {
      key: 'approvals',
      weight: unlimitedUnknown * 22 + unknownSpenders * 8,
      label: 'Token approval surface',
      detail: `${approvalCount} active approvals; ${unlimitedUnknown} unlimited to unknown spenders.`,
    },
    {
      key: 'nft',
      weight: nftPct * 0.8,
      label: 'NFT exposure',
      detail: `${nftCount} NFT holdings observed in sampled providers.`,
    },
  ]
    .filter((d) => d.weight > 0)
    .sort((a, b) => b.weight - a.weight)

  const exposureDrivers = driverCandidates.slice(0, 3).map((d, i) => ({
    rank: i === 0 ? 'Primary' : i === 1 ? 'Secondary' : 'Tertiary',
    label: d.label,
    detail: d.detail,
  }))

  if (!exposureDrivers.length) {
    exposureDrivers.push({
      rank: 'Primary',
      label: 'Limited sampled exposure',
      detail: 'Provider data did not surface dominant exposure drivers in this refresh.',
    })
  }

  const analystCommentary = buildAnalystCommentary({
    exposureBandLabel: exposureBand.label,
    memePct,
    stablePct,
    counterpartyCount: counterparties.length,
    unlimitedUnknown,
    hasWallet: Boolean(input.hasWallet),
  })

  const threatIndicators = buildThreatIndicators({
    memePct,
    stablePct,
    topShare,
    unlimitedUnknown,
    unknownSpenders,
    protocolDependency: counterparties.length,
    hasWallet: Boolean(input.hasWallet),
  })

  return {
    exposureScore,
    exposureBand: exposureBand.label,
    exposureBandId: exposureBand.band,
    exposureStatus: null,
    pricedPortfolioValue: usePricedHoldings ? pricedPortfolioValue : null,
    largestPosition,
    assetAllocation,
    sectorAllocation,
    topAssets,
    assetConcentration: concentrationLevel,
    assetConcentrationReason: concentrationReason,
    sectorRisk,
    sectorRiskReason: dominantSector
      ? `${dominantSector.sector} represents ~${dominantSector.pct.toFixed(0)}% of observed sector allocation.`
      : 'Sector allocation could not be fully classified from sampled data.',
    contractExposureScore: contractScore,
    contractExposureLabel: contractLabel,
    contractExposureDetail: `${approvalCount} active approvals observed; ${unlimitedUnknown} unlimited approvals to unclassified spenders.`,
    counterpartyExposure: counterpartyLevel,
    counterparties,
    exposureDrivers,
    threatIndicators,
    analystCommentary,
    disclaimer: WALLET_EXPOSURE_DISCLAIMER,
    dataQuality: input.assessmentPending ? 'pending' : input.exposureIntelligence?.provenance === 'LIVE' ? 'live' : 'partial',
  }
}

/**
 * @param {object} riskData — wallet risk API payload
 * @param {object} [opts]
 */
export function walletExposureProfileFromRiskData(riskData, opts = {}) {
  if (!riskData && !opts.approvalRows?.length) {
    const empty = computeWalletExposureIntelligenceProfile({ hasWallet: false })
    empty.portfolioBreakdown = buildPortfolioBreakdown({ portfolioHoldings: [], profile: empty })
    return empty
  }

  const metrics = riskData?.exposureIntelligence?.metrics || riskData?.exposureInputSummary || {}
  const hints = {
    ...(riskData?.exposureHints || {}),
    portfolioHoldings: enrichPortfolioHoldings(riskData?.exposureHints?.portfolioHoldings || []),
  }
  const profile = computeWalletExposureIntelligenceProfile({
    safetyScore: riskData?.score,
    assessmentPending: riskData?.assessmentPending,
    exposureHints: hints,
    exposureIntelligence: riskData?.exposureIntelligence,
    metrics,
    approvalRows: opts.approvalRows || [],
    hasWallet: opts.hasWallet !== false,
    findings: riskData?.findings || [],
  })

  profile.portfolioBreakdown = buildPortfolioBreakdown({
    portfolioHoldings: hints.portfolioHoldings || [],
    nftHoldingsCount: num(hints.nftHoldingsCount) ?? num(metrics.nftHoldingsCount) ?? 0,
    profile,
    exposureHints: hints,
  })

  return profile
}
