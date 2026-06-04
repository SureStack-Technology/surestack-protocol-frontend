/**
 * Portfolio Breakdown — explainability layer for Wallet Exposure Intelligence.
 */

import { classifyHoldingCategory } from '../../../shared/lib/walletExposure/holdingClassification.mjs'
import { enrichPortfolioHoldings } from '../../../shared/lib/walletExposure/enrichPortfolioHoldings.mjs'
import { applyHoldingDisplayLabels } from '../../../shared/lib/walletExposure/holdingDisplayMeta.mjs'
import { EXPOSURE_STATUS_INSUFFICIENT_VALUATION } from './walletExposureIntelligenceEngine.mjs'

const SECTOR_KEYS = [
  { key: 'stablecoin', label: 'Stablecoin', match: (h) => h.riskCategory === 'Stablecoin' },
  { key: 'meme', label: 'Meme', match: (h) => h.riskCategory === 'Meme' },
  { key: 'blueChip', label: 'Blue Chip', match: (h) => h.riskCategory === 'Blue Chip' },
  {
    key: 'infrastructure',
    label: 'Infrastructure',
    match: (h) => h.riskCategory === 'Infrastructure',
  },
  { key: 'ai', label: 'AI', match: (h) => h.riskCategory === 'AI' },
  { key: 'defi', label: 'DeFi', match: (h) => ['DeFi', 'Governance', 'Unknown'].includes(h.riskCategory) },
  { key: 'nft', label: 'NFT', match: (h) => h.riskCategory === 'NFT' },
]

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function formatUsd(v) {
  const n = num(v)
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toFixed(2)}`
}

function formatQty(v) {
  const n = num(v)
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
  if (n > 0) return n.toPrecision(3)
  return '0'
}

/**
 * @param {object[]} rawHoldings
 * @returns {object[]}
 */
export function normalizePortfolioHoldings(rawHoldings = []) {
  return enrichPortfolioHoldings(rawHoldings || []).map((row) => {
    const display = applyHoldingDisplayLabels(row)
    const cats = classifyHoldingCategory({
      contract: display.contract,
      symbol: display.symbol,
      name: display.asset,
      catalogCategory: row.catalogCategory || display.catalogCategory,
      taxonomyLabel: row.taxonomyLabel || display.taxonomyLabel,
    })
    const hasReliablePrice = Boolean(display.hasReliablePrice && display.usdValue != null && display.usdValue > 0)
    return {
      ...display,
      category: cats.taxonomyLabel || cats.category,
      riskCategory: cats.riskCategory,
      taxonomyLabel: cats.taxonomyLabel,
      quantity: num(display.quantity),
      usdValue: hasReliablePrice ? num(display.usdValue) : null,
      hasReliablePrice,
      portfolioPct: null,
    }
  })
}

/**
 * @param {object[]} holdings
 */
function computeSectorMixFromHoldings(holdings, totalUsd) {
  const rows = SECTOR_KEYS.map(({ key, label, match }) => {
    const usd = holdings.filter((h) => h.hasReliablePrice && match(h)).reduce((s, h) => s + (h.usdValue || 0), 0)
    const pct = totalUsd > 0 ? (usd / totalUsd) * 100 : 0
    return {
      key,
      label,
      usd,
      pct: Math.round(pct * 100) / 100,
      formula:
        totalUsd > 0
          ? `${label} % = $${Math.round(usd).toLocaleString()} ÷ $${Math.round(totalUsd).toLocaleString()} × 100 = ${pct.toFixed(2)}%`
          : `${label} % = not computed (no priced holdings)`,
    }
  })
  return rows
}

/**
 * @param {object} params
 */
export function buildPortfolioBreakdown({
  portfolioHoldings = [],
  nftHoldingsCount = 0,
  profile = null,
  exposureHints = null,
} = {}) {
  const holdings = normalizePortfolioHoldings(portfolioHoldings)
  const priced = holdings.filter((h) => h.hasReliablePrice && h.usdValue > 0)
  const unpriced = holdings.filter((h) => !h.hasReliablePrice)

  const totalPortfolioUsd = priced.reduce((s, h) => s + (h.usdValue || 0), 0)

  for (const h of priced) {
    h.portfolioPct = totalPortfolioUsd > 0 ? (h.usdValue / totalPortfolioUsd) * 100 : 0
  }

  const top10 = [...priced].sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0)).slice(0, 10)
  const concentrationAsset = top10[0] || null

  const holdingCount = holdings.length + (nftHoldingsCount > 0 ? 1 : 0)
  const unpricedCount = unpriced.length + (nftHoldingsCount > 0 ? 0 : 0)
  const unpricedHoldingsSharePct =
    holdingCount > 0 ? Math.round((unpriced.length / holdingCount) * 1000) / 10 : 0

  const sectorMix = computeSectorMixFromHoldings(priced, totalPortfolioUsd)

  if (nftHoldingsCount > 0) {
    const nftUsd = 0
    sectorMix.find((r) => r.key === 'nft').usd = nftUsd
    sectorMix.find((r) => r.key === 'nft').pct = 0
    sectorMix.find((r) => r.key === 'nft').formula =
      `NFT % = ${nftHoldingsCount} NFT position(s) observed — USD mark not applied in this refresh`
  }

  const hints = exposureHints || {}
  const modelAllocation = profile?.assetAllocation || []

  const concentrationExplain = concentrationAsset
    ? {
        symbol: concentrationAsset.symbol,
        name: concentrationAsset.asset,
        portfolioPct: concentrationAsset.portfolioPct,
        usdValue: concentrationAsset.usdValue,
        detail:
          profile?.assetConcentrationReason ||
          `Largest priced position: ${concentrationAsset.asset} (${concentrationAsset.symbol}) at ${concentrationAsset.portfolioPct?.toFixed(2)}% of priced portfolio.`,
        drivesScore: profile?.assetConcentration || '—',
      }
    : {
        symbol: hints.topAssetSymbol || null,
        name: null,
        portfolioPct: num(hints.topTokenSharePct),
        usdValue: null,
        detail:
          profile?.assetConcentrationReason ||
          'Concentration derived from normalized on-chain balance weights when USD marks are partial.',
        drivesScore: profile?.assetConcentration || '—',
      }

  const insufficient = profile?.exposureStatus === EXPOSURE_STATUS_INSUFFICIENT_VALUATION

  const metricExplainers = insufficient
    ? [
        {
          metric: 'Exposure Status',
          value: EXPOSURE_STATUS_INSUFFICIENT_VALUATION,
          detail: profile?.exposureStatusReason || 'No holdings have reliable USD valuation.',
        },
        {
          metric: 'Concentration Risk',
          value: 'N/A',
          detail: 'Requires priced portfolio holdings.',
        },
        {
          metric: 'Sector Risk',
          value: 'N/A',
          detail: 'Requires priced portfolio holdings.',
        },
      ]
    : [
        {
          metric: 'Exposure Score',
          value: profile?.exposureScore != null ? `${profile.exposureScore} / 100` : '—',
          detail:
            profile?.exposureDrivers?.[0]?.detail ||
            'Weighted from concentration, sector mix, meme/stable allocation, and approval surface.',
        },
        {
          metric: 'Concentration Risk',
          value: profile?.assetConcentration || '—',
          detail: concentrationExplain.detail,
        },
        {
          metric: 'Sector Risk',
          value: profile?.sectorRisk || '—',
          detail: profile?.sectorRiskReason || 'Dominant sector share from allocation model.',
        },
      ]

  const allocationCompare = modelAllocation.slice(0, 6).map((row) => {
    const sector = sectorMix.find((s) => s.label.toLowerCase().includes(row.category.split(' ')[0].toLowerCase()))
    return {
      modelLabel: row.category,
      modelPct: row.pct,
      holdingsPct: sector?.pct ?? null,
      note:
        sector?.pct != null
          ? 'Holdings mix uses priced ERC-20 + native balances; model may include inferred bands.'
          : 'No priced holdings in this category',
    }
  })

  return {
    totalPortfolioUsd,
    totalPortfolioUsdDisplay: formatUsd(totalPortfolioUsd),
    top10Holdings: top10.map((h) => ({
      ...h,
      usdValueDisplay: formatUsd(h.usdValue),
      portfolioPctDisplay: h.portfolioPct != null ? `${h.portfolioPct.toFixed(2)}%` : '—',
      quantityDisplay: formatQty(h.quantity),
      priceSourceDisplay: h.priceSourceLabel ? `${h.symbol} — priced by ${h.priceSourceLabel}` : '—',
      unitUsdDisplay:
        h.unitUsdPrice != null ? `$${h.unitUsdPrice.toPrecision(4)} / unit` : null,
    })),
    concentrationAsset: concentrationExplain,
    sectorMix,
    excludedHoldings: unpriced.map((h) => ({
      ...h,
      reason: h.exclusionReason || h.priceStatusDisplay || 'No usable USD price',
      quantityDisplay: formatQty(h.quantity),
      identityStatusDisplay: h.identityStatusDisplay,
      priceStatusDisplay: h.priceStatusDisplay,
    })),
    unpricedHoldingsSharePct,
    valuationWarning:
      unpricedHoldingsSharePct > 10
        ? `${unpricedHoldingsSharePct.toFixed(1)}% of observed token positions lack reliable USD valuation — portfolio percentages reflect priced subset only.`
        : null,
    metricExplainers,
    allocationCompare,
    hasHoldings: holdings.length > 0,
  }
}
