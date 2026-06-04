/**
 * Re-resolve portfolio rows through wallet holdings catalog (live + cached payloads).
 */

import { normalizeContractAddress } from './normalizeContractAddress.mjs'
import {
  sectorBucketForCatalogCategory,
  taxonomyLabelForCategory,
} from './walletHoldingsCatalog.mjs'
import { resolveWalletHolding } from './walletHoldingsResolution.mjs'
import { applyHoldingDisplayLabels } from './holdingDisplayMeta.mjs'
import { logWalletHoldingResolution } from './walletHoldingsDebugLog.mjs'

/**
 * @param {object[]} rawHoldings
 * @returns {object[]}
 */
export function enrichPortfolioHoldings(rawHoldings = []) {
  return (rawHoldings || []).map((row) => {
    const contract = normalizeContractAddress(row?.contract)
    if (!contract) return row

    const resolved = resolveWalletHolding(contract, row?.symbol)
    const bucket = resolved.catalogCategory
      ? sectorBucketForCatalogCategory(resolved.catalogCategory)
      : null

    const merged = {
      ...row,
      contract,
      catalogCategory: resolved.catalogCategory ?? row.catalogCategory ?? null,
      taxonomyLabel:
        resolved.taxonomyLabel ??
        row.taxonomyLabel ??
        (resolved.catalogCategory ? taxonomyLabelForCategory(resolved.catalogCategory) : null),
      coingeckoId: resolved.coingeckoId ?? row.coingeckoId ?? null,
      category: bucket?.category ?? row.category ?? null,
      resolutionSource: resolved.source ?? row.resolutionSource ?? null,
    }

    const enriched = applyHoldingDisplayLabels(merged)

    logWalletHoldingResolution({
      contract,
      symbolResolved: enriched.symbol,
      nameResolved: enriched.asset,
      categoryResolved: enriched.taxonomyLabel || enriched.category,
      coingeckoId: enriched.coingeckoId,
      resolutionSource: enriched.resolutionSource,
      identityStatus: enriched.identityStatus,
      priceStatus: enriched.priceStatus,
      usdValuation: row.usdValue ?? null,
      hasReliablePrice: Boolean(row.hasReliablePrice),
      priceLookupStatus: enriched.priceLookupStatus ?? null,
      priceSourceLabel: enriched.priceSourceLabel,
    })

    return enriched
  })
}
