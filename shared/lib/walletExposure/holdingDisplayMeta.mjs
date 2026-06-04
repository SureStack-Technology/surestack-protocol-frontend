/**
 * P4.2.7 — Display labels, identity/price status, and exclusion copy for portfolio holdings.
 */

import { normalizeContractAddress } from './normalizeContractAddress.mjs'
import { resolveWalletHolding, RESOLUTION_SOURCE } from './walletHoldingsResolution.mjs'

/**
 * @param {string | null | undefined} contract
 */
export function shortContractLabel(contract) {
  const c = normalizeContractAddress(contract)
  if (!c || c === 'native') return 'native'
  return `${c.slice(0, 6)}…${c.slice(-4)}`
}

/**
 * @param {string | null | undefined} status
 * @param {string | null | undefined} [source]
 */
export function formatPriceSourceLabel(status, source = null) {
  const s = String(status || '').toLowerCase()
  switch (s) {
    case 'coingecko_ok':
      return 'CoinGecko ID'
    case 'coingecko_contract_ok':
      return 'CoinGecko contract'
    case 'coingecko_native_eth':
    case 'native_eth_usd':
    case 'weth_eth_usd':
      return 'CoinGecko (ETH/USD)'
    case 'dexscreener_ok':
      return 'DexScreener'
    case 'alchemy_ok':
      return 'Alchemy'
    case 'stablecoin_par':
      return 'Stablecoin $1 peg'
    default:
      if (source === 'coingecko') return 'CoinGecko'
      if (source === 'dexscreener') return 'DexScreener'
      if (source === 'alchemy') return 'Alchemy'
      return null
  }
}

/**
 * @param {object} identity
 */
export function identityStatusFromResolution(identity) {
  if (!identity?.resolved) {
    return identity?.source === RESOLUTION_SOURCE.UNCLASSIFIED
      ? 'identity_unclassified'
      : 'identity_partial'
  }
  switch (identity?.source) {
    case RESOLUTION_SOURCE.CONTRACT_CATALOG:
      return 'identity_catalog'
    case RESOLUTION_SOURCE.REGISTRY_ADDRESS:
    case RESOLUTION_SOURCE.REGISTRY_SYMBOL:
      return 'identity_registry'
    case RESOLUTION_SOURCE.SYMBOL_CATALOG:
    case RESOLUTION_SOURCE.SYMBOL_HINT:
      return 'identity_symbol'
    case RESOLUTION_SOURCE.NATIVE:
      return 'identity_native'
    default:
      return 'identity_resolved'
  }
}

/**
 * @param {boolean} hasReliablePrice
 * @param {string | null | undefined} priceLookupStatus
 */
export function priceStatusFromRow(hasReliablePrice, priceLookupStatus) {
  if (hasReliablePrice) {
    const s = String(priceLookupStatus || '')
    if (s.startsWith('coingecko')) return 'price_ok_coingecko'
    if (s.startsWith('dexscreener')) return 'price_ok_dexscreener'
    if (s.startsWith('alchemy')) return 'price_ok_alchemy'
    if (s === 'stablecoin_par') return 'price_ok_stablecoin'
    return 'price_ok'
  }
  const s = String(priceLookupStatus || '').toLowerCase()
  if (s === 'identity_ok_price_missing') return 'price_identity_only'
  if (s === 'pending_fallback' || s === 'coingecko_miss') return 'price_missing'
  if (s === 'no_coingecko_id') return 'price_no_id'
  if (s === 'zero_balance') return 'price_zero_balance'
  if (s.startsWith('coingecko') && !hasReliablePrice) return 'price_identity_only'
  return 'price_missing'
}

/**
 * Human-readable identity status.
 * @param {string} identityStatus
 * @param {object} identity
 */
export function identityStatusDisplay(identityStatus, identity) {
  switch (identityStatus) {
    case 'identity_catalog':
      return `Catalog match (${identity?.symbol || '—'})`
    case 'identity_registry':
      return `Registry match (${identity?.symbol || '—'})`
    case 'identity_native':
      return 'Native asset'
    case 'identity_symbol':
      return `Symbol hint (${identity?.symbol || '—'})`
    case 'identity_unclassified':
      return 'No catalog/registry match'
    default:
      return identity?.resolved ? 'Identity resolved' : 'Identity unknown'
  }
}

/**
 * Human-readable price status.
 * @param {string} priceStatus
 * @param {string | null | undefined} priceLookupStatus
 */
export function priceStatusDisplay(priceStatus, priceLookupStatus) {
  if (priceStatus === 'price_identity_only') {
    return 'CoinGecko identity resolved, but no usable USD price returned.'
  }
  if (priceStatus.startsWith('price_ok')) {
    const label = formatPriceSourceLabel(priceLookupStatus)
    return label ? `Priced via ${label}` : 'Priced'
  }
  if (priceStatus === 'price_no_id') return 'No CoinGecko ID for price lookup'
  if (priceStatus === 'price_zero_balance') return 'Zero balance'
  return 'No usable USD price from any provider'
}

/**
 * @param {object} row
 * @param {object} [identity]
 */
export function exclusionReasonMessage(row, identity = null) {
  const id = identity || resolveWalletHolding(row?.contract, row?.symbol)
  const priceStatus = priceStatusFromRow(Boolean(row?.hasReliablePrice), row?.priceLookupStatus)
  const identityResolved = Boolean(id?.resolved || row?.coingeckoId)

  if (priceStatus === 'price_identity_only' || (identityResolved && id?.coingeckoId && !row?.hasReliablePrice)) {
    return 'CoinGecko identity resolved, but no usable USD price returned.'
  }
  if (!identityResolved) {
    return 'Token identity unknown — add contract to wallet holdings catalog.'
  }
  switch (row?.exclusionReason) {
    case 'no_market_id':
      return 'No market ID — cannot query CoinGecko or fallbacks.'
    case 'no_market_price':
      return 'Market ID known, but no usable USD price returned.'
    default:
      return priceStatusDisplay(priceStatus, row?.priceLookupStatus)
  }
}

/**
 * Apply display names/symbols — priced unknown tokens never show "Unclassified token".
 * @param {object} row
 */
export function applyHoldingDisplayLabels(row) {
  const contract = normalizeContractAddress(row?.contract) || row?.contract
  const identity = resolveWalletHolding(contract, row?.symbol)
  const hasPrice = Boolean(row?.hasReliablePrice && row?.usdValue != null && Number(row.usdValue) > 0)
  const identityResolved = Boolean(identity.resolved)
  const unclassifiedName = /unclassified\s+token/i.test(String(row?.name || identity?.name || ''))

  let asset
  let symbol

  if (hasPrice && (!identityResolved || unclassifiedName)) {
    asset = 'Unknown priced token'
    symbol = shortContractLabel(contract)
  } else if (identityResolved) {
    asset = identity.name
    symbol = identity.symbol
  } else {
    asset = unclassifiedName ? 'Unclassified token' : row?.name || identity.name || 'Unclassified token'
    symbol = identity.symbol || shortContractLabel(contract)
  }

  const identityStatus = identityStatusFromResolution(identity)
  const priceStatus = priceStatusFromRow(hasPrice, row?.priceLookupStatus)
  const priceSourceLabel = hasPrice ? formatPriceSourceLabel(row?.priceLookupStatus, row?.priceSource) : null

  let priceLookupStatus = row?.priceLookupStatus ?? null
  if (!hasPrice && identity?.coingeckoId && String(priceLookupStatus || '').startsWith('coingecko')) {
    priceLookupStatus = 'identity_ok_price_missing'
  }

  return {
    ...row,
    contract,
    asset,
    symbol,
    name: asset,
    identityResolved,
    identityStatus,
    priceStatus,
    identityStatusDisplay: identityStatusDisplay(identityStatus, identity),
    priceStatusDisplay: priceStatusDisplay(priceStatus, priceLookupStatus),
    priceSourceLabel,
    priceLookupStatus,
    coingeckoId: row?.coingeckoId ?? identity?.coingeckoId ?? null,
    resolutionSource: row?.resolutionSource ?? identity?.source ?? null,
    exclusionReason: hasPrice ? null : exclusionReasonMessage({ ...row, priceLookupStatus }, identity),
    unitUsdPrice: row?.unitUsdPrice ?? null,
    decimalsUsed: row?.decimalsUsed ?? null,
    rawBalanceWei: row?.rawBalanceWei ?? null,
  }
}
