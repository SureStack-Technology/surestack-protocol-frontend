import { resolveStablecoinMatch } from '../../../src/shared/constants/stablecoinRegistry.mjs'
import { resolveRegistryNarrativeCategory } from '../../../src/lib/intelligence/assetCategoryRegistry.mjs'
import {
  coingeckoIdForCatalogContract,
  decimalsForCatalogContract,
  lookupWalletHoldingByContract,
  sectorBucketForCatalogCategory,
  taxonomyLabelForCategory,
} from './walletHoldingsCatalog.mjs'
import { resolveWalletHolding } from './walletHoldingsResolution.mjs'
import { lookupNativeAssetBySymbol } from '../../constants/nativeAssetRegistry.mjs'
import { normalizeContractAddress } from './normalizeContractAddress.mjs'

/** @typedef {'Stablecoin'|'Meme'|'Blue Chip'|'AI'|'DeFi'|'Governance'|'Infrastructure'|'NFT'|'Other'|'Unknown'} HoldingCategory */

export { coingeckoIdForCatalogContract as coingeckoIdForContract }
export { decimalsForCatalogContract }

/**
 * @param {string} contract
 * @param {string} [symbolHint]
 */
export function resolveHoldingIdentity(contract, symbolHint = null) {
  const resolved = resolveWalletHolding(contract, symbolHint)
  return {
    symbol: resolved.symbol,
    name: resolved.name,
    contract: resolved.contract,
    coingeckoId: resolved.coingeckoId,
    taxonomyLabel: resolved.taxonomyLabel,
    resolutionSource: resolved.source,
    catalogCategory: resolved.catalogCategory,
  }
}

/**
 * @param {object} params
 */
export function classifyHoldingCategory({ contract, symbol, name, catalogCategory = null, taxonomyLabel = null }) {
  const c = normalizeContractAddress(contract) || ''
  const sym = String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')

  if (catalogCategory) {
    const bucket = sectorBucketForCatalogCategory(catalogCategory)
    return {
      ...bucket,
      taxonomyLabel: taxonomyLabel || taxonomyLabelForCategory(catalogCategory),
    }
  }

  if (c === 'native' || sym === 'ETH' || sym === 'WETH') {
    const native = lookupNativeAssetBySymbol(sym === 'WETH' ? 'WETH' : 'ETH')
    const bucket = sectorBucketForCatalogCategory(native?.category || 'LAYER_1')
    return {
      ...bucket,
      taxonomyLabel: taxonomyLabelForCategory(native?.category || 'LAYER_1'),
    }
  }

  const catalog = lookupWalletHoldingByContract(c)
  if (catalog) {
    const bucket = sectorBucketForCatalogCategory(catalog.category)
    return {
      ...bucket,
      taxonomyLabel: taxonomyLabelForCategory(catalog.category),
    }
  }

  if (resolveStablecoinMatch({ symbol: sym, address: c })) {
    return {
      category: 'Stablecoin',
      riskCategory: 'Stablecoin',
      taxonomyLabel: taxonomyLabelForCategory('STABLECOIN'),
    }
  }

  const narrative = resolveRegistryNarrativeCategory(sym, c)
  switch (narrative) {
    case 'stablecoin':
      return {
        category: 'Stablecoin',
        riskCategory: 'Stablecoin',
        taxonomyLabel: taxonomyLabelForCategory('STABLECOIN'),
      }
    case 'meme':
      return { category: 'Meme', riskCategory: 'Meme', taxonomyLabel: taxonomyLabelForCategory('MEME') }
    case 'oracle':
      return {
        category: 'Infrastructure',
        riskCategory: 'Infrastructure',
        taxonomyLabel: taxonomyLabelForCategory('ORACLE_INFRASTRUCTURE'),
      }
    case 'l2':
      return {
        category: 'Infrastructure',
        riskCategory: 'Infrastructure',
        taxonomyLabel: taxonomyLabelForCategory('INFRASTRUCTURE'),
      }
    case 'ai':
      return { category: 'AI', riskCategory: 'AI', taxonomyLabel: taxonomyLabelForCategory('AI') }
    case 'governance':
      return {
        category: 'Governance',
        riskCategory: 'Governance',
        taxonomyLabel: taxonomyLabelForCategory('GOVERNANCE'),
      }
    case 'defi':
      return { category: 'DeFi', riskCategory: 'DeFi', taxonomyLabel: taxonomyLabelForCategory('DEFI') }
    default:
      if (/^(WBTC|BTC)$/i.test(sym)) {
        return {
          category: 'Blue Chip',
          riskCategory: 'Blue Chip',
          taxonomyLabel: taxonomyLabelForCategory('STORE_OF_VALUE'),
        }
      }
      if (/^(SOL)$/i.test(sym)) {
        return {
          category: 'Infrastructure',
          riskCategory: 'Infrastructure',
          taxonomyLabel: taxonomyLabelForCategory('LAYER_1'),
        }
      }
      return { category: 'Other', riskCategory: 'Unknown', taxonomyLabel: 'Other' }
  }
}
