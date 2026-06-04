/**
 * Optional structured logging for wallet portfolio USD pricing (debug / audit).
 * Enable with WALLET_PORTFOLIO_PRICING_LOG=1
 */

/**
 * @param {object} entry
 * @param {{ enabled?: boolean }} [opts]
 */
export function logHoldingPriceResolution(entry, opts = {}) {
  const enabled = opts.enabled ?? process.env.WALLET_PORTFOLIO_PRICING_LOG === '1'
  if (!enabled) return
  const payload = {
    asset: entry.asset ?? entry.symbol ?? null,
    contract: entry.contract ?? null,
    coingeckoId: entry.coingeckoId ?? null,
    priceLookupStatus: entry.priceLookupStatus ?? 'unknown',
    usdValuation: entry.usdValuation ?? null,
    hasReliablePrice: Boolean(entry.hasReliablePrice),
    resolutionSource: entry.resolutionSource ?? null,
  }
  console.info('[wallet-portfolio-pricing]', JSON.stringify(payload))
}

/**
 * @param {object[]} entries
 * @param {{ enabled?: boolean }} [opts]
 */
export function logHoldingPriceResolutionBatch(entries, opts = {}) {
  for (const entry of entries || []) {
    logHoldingPriceResolution(entry, opts)
  }
}
