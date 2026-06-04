/**
 * P4.2.4 — Wallet holding identity resolution (strict priority order).
 */

import { lookupPrimeToken, lookupPrimeTokenByAddress } from '../../constants/primeTokenRegistry.mjs'
import { lookupNativeAssetBySymbol } from '../../constants/nativeAssetRegistry.mjs'
import {
  lookupWalletHoldingByContract,
  lookupWalletHoldingBySymbol,
  taxonomyLabelForCategory,
} from './walletHoldingsCatalog.mjs'
import { normalizeContractAddress } from './normalizeContractAddress.mjs'

export const RESOLUTION_SOURCE = {
  NATIVE: 'native',
  CONTRACT_CATALOG: 'contract_catalog',
  REGISTRY_ADDRESS: 'registry_address',
  SYMBOL_CATALOG: 'symbol_catalog',
  REGISTRY_SYMBOL: 'registry_symbol',
  SYMBOL_HINT: 'symbol_hint',
  UNCLASSIFIED: 'unclassified',
}

/**
 * @param {string} contract
 * @param {string} [symbolHint]
 */
export function resolveWalletHolding(contract, symbolHint = null) {
  const c = normalizeContractAddress(contract) || ''
  const hintSym = String(symbolHint || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')

  if (c === 'native') {
    const native = lookupNativeAssetBySymbol('ETH')
    return {
      symbol: 'ETH',
      name: 'Ethereum',
      contract: 'native',
      coingeckoId: native?.coingeckoId || 'ethereum',
      catalogCategory: 'LAYER_1',
      taxonomyLabel: taxonomyLabelForCategory('LAYER_1'),
      source: RESOLUTION_SOURCE.NATIVE,
      resolved: true,
    }
  }

  const byContract = lookupWalletHoldingByContract(c)
  if (byContract) {
    return {
      symbol: byContract.symbol,
      name: byContract.name,
      contract: c,
      coingeckoId: byContract.coingeckoId,
      catalogCategory: byContract.category,
      taxonomyLabel: taxonomyLabelForCategory(byContract.category),
      source: RESOLUTION_SOURCE.CONTRACT_CATALOG,
      resolved: true,
    }
  }

  const registryAddr = lookupPrimeTokenByAddress(c)
  if (registryAddr) {
    return {
      symbol: registryAddr.symbol,
      name: registryAddr.name,
      contract: c,
      coingeckoId: null,
      catalogCategory: null,
      taxonomyLabel: null,
      source: RESOLUTION_SOURCE.REGISTRY_ADDRESS,
      resolved: true,
    }
  }

  if (hintSym) {
    const bySym = lookupWalletHoldingBySymbol(hintSym)
    if (bySym) {
      return {
        symbol: bySym.symbol,
        name: bySym.name,
        contract: c,
        coingeckoId: bySym.coingeckoId,
        catalogCategory: bySym.category,
        taxonomyLabel: taxonomyLabelForCategory(bySym.category),
        source: RESOLUTION_SOURCE.SYMBOL_CATALOG,
        resolved: true,
      }
    }

    const native = lookupNativeAssetBySymbol(hintSym)
    if (native) {
      return {
        symbol: native.symbol,
        name: native.name,
        contract: c,
        coingeckoId: native.coingeckoId,
        catalogCategory: native.category,
        taxonomyLabel: taxonomyLabelForCategory(native.category),
        source: RESOLUTION_SOURCE.NATIVE,
        resolved: true,
      }
    }

    const regSym = lookupPrimeToken(hintSym)
    if (regSym && regSym.address.toLowerCase() === c) {
      return {
        symbol: regSym.symbol,
        name: regSym.name,
        contract: c,
        coingeckoId: null,
        catalogCategory: null,
        taxonomyLabel: null,
        source: RESOLUTION_SOURCE.REGISTRY_SYMBOL,
        resolved: true,
      }
    }

    if (hintSym.length <= 12 && /^[A-Z0-9]+$/.test(hintSym)) {
      return {
        symbol: hintSym,
        name: hintSym,
        contract: c,
        coingeckoId: null,
        catalogCategory: null,
        taxonomyLabel: null,
        source: RESOLUTION_SOURCE.SYMBOL_HINT,
        resolved: true,
      }
    }
  }

  const short = c ? `${c.slice(0, 6)}…${c.slice(-4)}` : 'Unknown'
  return {
    symbol: short,
    name: 'Unclassified token',
    contract: c,
    coingeckoId: null,
    catalogCategory: null,
    taxonomyLabel: null,
    source: RESOLUTION_SOURCE.UNCLASSIFIED,
    resolved: false,
  }
}
