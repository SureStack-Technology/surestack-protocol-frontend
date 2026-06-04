/**
 * P4.2.6 — Wallet exposure valuation summary + excluded holding debug.
 */

/**
 * @param {object[]} holdings
 */
export function summarizeWalletValuation(holdings = []) {
  const total = holdings.length
  const priced = holdings.filter((h) => h.hasReliablePrice && h.usdValue > 0)
  const unpriced = holdings.filter((h) => !h.hasReliablePrice || !h.usdValue)
  const pricedValue = priced.reduce((s, h) => s + (Number(h.usdValue) || 0), 0)
  const unpricedPercentage = total > 0 ? Math.round((unpriced.length / total) * 1000) / 10 : 0

  return {
    totalHoldings: total,
    pricedHoldings: priced.length,
    unpricedHoldings: unpriced.length,
    pricedValue: Math.round(pricedValue * 100) / 100,
    unpricedPercentage,
  }
}

function valuationLoggingEnabled() {
  return (
    process.env.WALLET_EXPOSURE_VALUATION_LOG === '1' ||
    process.env.WALLET_HOLDINGS_RESOLUTION_LOG === '1' ||
    process.env.WALLET_PORTFOLIO_PRICING_LOG === '1'
  )
}

/**
 * @param {object} summary
 */
export function logWalletExposureValuation(summary) {
  if (!valuationLoggingEnabled()) return
  console.info('[walletExposure:valuation]', JSON.stringify(summary))
}

/**
 * @param {object[]} holdings
 */
export function logExcludedHoldingsDebug(holdings = []) {
  if (!valuationLoggingEnabled()) return
  const excluded = holdings.filter((h) => !h.hasReliablePrice || !h.usdValue)
  for (const h of excluded) {
    console.info(
      '[walletExposure:excluded]',
      JSON.stringify({
        symbol: h.symbol,
        asset: h.asset ?? h.name,
        contract: h.contract,
        coingeckoId: h.coingeckoId ?? null,
        identityStatus: h.identityStatus ?? null,
        identityStatusDisplay: h.identityStatusDisplay ?? null,
        priceStatus: h.priceStatus ?? null,
        priceStatusDisplay: h.priceStatusDisplay ?? null,
        priceLookupStatus: h.priceLookupStatus ?? 'unknown',
        exclusionReason: h.exclusionReason ?? 'no_market_price',
        usdValuation: h.usdValue ?? null,
      }),
    )
  }
}

/**
 * P4.2.7 — NEXUS valuation audit (contract, decimals, unit × qty = total).
 * @param {object} audit
 */
export function logNexusValuationAudit(audit) {
  if (!valuationLoggingEnabled()) return
  const qty = Number(audit.normalizedQuantity)
  const unit = Number(audit.unitUsdPrice)
  const computed =
    Number.isFinite(qty) && Number.isFinite(unit) ? Math.round(qty * unit * 100) / 100 : null
  console.info(
    '[walletExposure:nexus-audit]',
    JSON.stringify({
      ...audit,
      expectedTotalUsd: computed,
      mathCheck:
        computed != null && audit.totalUsd != null
          ? Math.abs(computed - audit.totalUsd) < 0.02
          : null,
    }),
  )
}
