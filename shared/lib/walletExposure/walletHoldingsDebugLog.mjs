/**
 * Debug logging for wallet holdings resolution + pricing.
 * Enable: WALLET_HOLDINGS_RESOLUTION_LOG=1 or WALLET_PORTFOLIO_PRICING_LOG=1
 */

function loggingEnabled() {
  return (
    process.env.WALLET_HOLDINGS_RESOLUTION_LOG === '1' ||
    process.env.WALLET_PORTFOLIO_PRICING_LOG === '1'
  )
}

/**
 * @param {object} entry
 */
export function logWalletHoldingResolution(entry) {
  if (!loggingEnabled()) return
  console.info(
    '[wallet-holdings-resolution]',
    JSON.stringify({
      holdingContract: entry.contract ?? null,
      symbolResolved: entry.symbolResolved ?? null,
      categoryResolved: entry.categoryResolved ?? null,
      coingeckoId: entry.coingeckoId ?? null,
      resolutionSource: entry.resolutionSource ?? null,
      priceLookupStatus: entry.priceLookupStatus ?? null,
      usdValuation: entry.usdValuation ?? null,
      hasReliablePrice: entry.hasReliablePrice ?? null,
    }),
  )
}
