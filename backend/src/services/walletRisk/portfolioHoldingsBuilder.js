import { WETH_MAINNET } from './walletRiskTypes.js'
import {
  coingeckoIdForContract,
  classifyHoldingCategory,
  decimalsForCatalogContract,
  resolveHoldingIdentity,
} from '../../../../shared/lib/walletExposure/holdingClassification.mjs'
import { isStableToken, normalizedBalanceHuman, stableTokenSymbol } from '../walletExposure/exposureCatalog.js'
import { enrichPortfolioHoldings } from '../../../../shared/lib/walletExposure/enrichPortfolioHoldings.mjs'
import { normalizeContractAddress } from '../../../../shared/lib/walletExposure/normalizeContractAddress.mjs'
import {
  exclusionReasonForPriceStatus,
  fetchCoingeckoUsdByContracts,
  fetchCoingeckoUsdByIds,
  resolveHoldingUsdPrice,
} from '../../../../shared/lib/walletExposure/holdingPriceResolver.mjs'
import {
  logExcludedHoldingsDebug,
  logNexusValuationAudit,
  logWalletExposureValuation,
  summarizeWalletValuation,
} from '../../../../shared/lib/walletExposure/walletExposureValuationLog.mjs'
import { logHoldingPriceResolutionBatch } from './portfolioPricingLog.js'

const NEXUS_CONTRACT = '0xc01154b4ccb518232d6bbfc9b9e6c5068b766f82'

const STABLE_DECIMALS = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6,
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 6,
  '0x6b175474e89094c44da98b954eedeac495271d0f': 18,
}

function formatUnits(wei, decimals) {
  const base = 10n ** BigInt(decimals)
  const whole = wei / base
  const frac = wei % base
  return Number(whole) + Number(frac) / Number(base)
}

function decimalsForContract(contract) {
  const c = String(contract || '').toLowerCase()
  if (isStableToken(c)) return STABLE_DECIMALS[c] ?? 6
  return decimalsForCatalogContract(c)
}

/** Re-export for tests */
export { fetchCoingeckoUsdByIds as fetchCoingeckoUsdPrices }

function unitUsdFromCoingecko(contract, identity, priceById, priceByContract, ethUsd) {
  const c = normalizeContractAddress(contract) || ''
  const id = identity.coingeckoId || coingeckoIdForContract(c)
  if (c === 'native') return ethUsd ?? priceById?.ethereum ?? null
  if (id && priceById?.[id]) return priceById[id]
  if (c && priceByContract?.[c]) return priceByContract[c]
  return null
}

/**
 * @param {string} contract
 * @param {bigint} valueWei
 * @param {number | null} ethUsd
 * @param {Record<string, number>} priceById
 * @param {Record<string, number>} priceByContract
 * @param {ReturnType<typeof resolveHoldingIdentity>} identity
 */
function estimateCoingeckoOnly(contract, valueWei, ethUsd, priceById, priceByContract, identity) {
  const c = normalizeContractAddress(contract) || ''
  if (valueWei <= 0n) {
    return { usd: null, reliable: false, priceLookupStatus: 'zero_balance', exclusionReason: 'zero_balance', priceSource: null }
  }

  if (isStableToken(c)) {
    const decimals = decimalsForContract(c)
    return {
      usd: formatUnits(valueWei, decimals),
      reliable: true,
      priceLookupStatus: 'stablecoin_par',
      exclusionReason: null,
      priceSource: 'stablecoin',
    }
  }

  if (c === WETH_MAINNET && ethUsd) {
    return {
      usd: formatUnits(valueWei, 18) * ethUsd,
      reliable: true,
      priceLookupStatus: 'weth_eth_usd',
      exclusionReason: null,
      priceSource: 'coingecko',
    }
  }

  if (c === 'native' && ethUsd) {
    return {
      usd: formatUnits(valueWei, 18) * ethUsd,
      reliable: true,
      priceLookupStatus: 'native_eth_usd',
      exclusionReason: null,
      priceSource: 'coingecko',
    }
  }

  const unit = unitUsdFromCoingecko(c, identity, priceById, priceByContract, ethUsd)
  if (unit == null) {
    return { usd: null, reliable: false, priceLookupStatus: 'pending_fallback', exclusionReason: null, priceSource: null, unitUsdPrice: null }
  }

  const decimals = decimalsForContract(c)
  const qty = formatUnits(valueWei, decimals)
  const usd = qty * unit
  const reliable = usd > 0
  let priceLookupStatus = priceByContract?.[c] ? 'coingecko_contract_ok' : 'coingecko_ok'
  if (!reliable && identity.coingeckoId) priceLookupStatus = 'identity_ok_price_missing'
  return {
    usd,
    reliable,
    priceLookupStatus,
    exclusionReason: reliable ? null : exclusionReasonForPriceStatus(priceLookupStatus, reliable),
    priceSource: 'coingecko',
    unitUsdPrice: unit,
    decimalsUsed: decimals,
    quantity: qty,
  }
}

/**
 * @param {string} contract
 * @param {bigint} valueWei
 * @param {number | null} ethUsd
 * @param {Record<string, number>} priceById
 * @param {Record<string, number>} priceByContract
 * @param {ReturnType<typeof resolveHoldingIdentity>} identity
 * @param {string | null} alchemyApiKey
 */
async function estimateWithFallbacks(contract, valueWei, ethUsd, priceById, priceByContract, identity, alchemyApiKey) {
  const first = estimateCoingeckoOnly(contract, valueWei, ethUsd, priceById, priceByContract, identity)
  if (first.reliable || first.priceLookupStatus === 'zero_balance') return first

  const c = normalizeContractAddress(contract) || ''
  const resolved = await resolveHoldingUsdPrice({
    contract: c,
    coingeckoId: identity.coingeckoId || coingeckoIdForContract(c),
    priceById: { ...priceById, ethereum: ethUsd ?? priceById?.ethereum },
    priceByContract,
    alchemyApiKey,
  })

  const decimals = decimalsForContract(c)
  const qty = formatUnits(valueWei, decimals)
  const unitUsd = resolved.usd
  const usd = unitUsd != null ? qty * unitUsd : null
  const reliable = usd != null && usd > 0
  let priceLookupStatus = resolved.priceLookupStatus
  if (
    !reliable &&
    (priceLookupStatus === 'coingecko_ok' || priceLookupStatus === 'coingecko_contract_ok') &&
    (identity.coingeckoId || coingeckoIdForContract(c))
  ) {
    priceLookupStatus = 'identity_ok_price_missing'
  }

  return {
    usd,
    reliable,
    priceLookupStatus,
    exclusionReason: resolved.exclusionReason || exclusionReasonForPriceStatus(priceLookupStatus, reliable),
    priceSource: resolved.priceSource,
    unitUsdPrice: unitUsd,
    decimalsUsed: decimals,
    quantity: qty,
  }
}

/**
 * @param {Array<{ contract: string, value: bigint }>} parsed
 * @param {bigint} nativeWei
 * @param {number | null} ethUsd
 */
export async function buildPortfolioHoldingsFromBalances(parsed, nativeWei, ethUsd) {
  const alchemyApiKey = process.env.ALCHEMY_API_KEY || null
  const contracts = []
  const cgIds = new Set(['ethereum'])

  for (const p of parsed) {
    const c = normalizeContractAddress(p.contract)
    if (!c || c === 'native') continue
    contracts.push(c)
    const sym = stableTokenSymbol(c)
    const identity = resolveHoldingIdentity(c, sym)
    const id = identity.coingeckoId || coingeckoIdForContract(c)
    if (id) cgIds.add(id)
  }

  const [priceById, priceByContract] = await Promise.all([
    fetchCoingeckoUsdByIds([...cgIds]),
    fetchCoingeckoUsdByContracts(contracts),
  ])

  /** @type {object[]} */
  const holdings = []
  const pricingLogs = []

  if (nativeWei > 0n) {
    const identity = resolveHoldingIdentity('native')
    const qty = formatUnits(nativeWei, 18)
    const est = await estimateWithFallbacks('native', nativeWei, ethUsd, priceById, priceByContract, identity, alchemyApiKey)
    const cats = classifyHoldingCategory({
      contract: 'native',
      symbol: identity.symbol,
      name: identity.name,
      catalogCategory: identity.catalogCategory || 'LAYER_1',
      taxonomyLabel: identity.taxonomyLabel,
    })
    holdings.push({
      contract: 'native',
      symbol: identity.symbol,
      name: identity.name,
      category: cats.category,
      taxonomyLabel: cats.taxonomyLabel,
      quantity: qty,
      usdValue: est.usd != null ? Math.round(est.usd * 100) / 100 : null,
      hasReliablePrice: est.reliable,
      coingeckoId: identity.coingeckoId,
      resolutionSource: identity.resolutionSource,
      priceLookupStatus: est.priceLookupStatus,
      exclusionReason: est.exclusionReason,
      priceSource: est.priceSource,
    })
    pricingLogs.push({
      asset: identity.name,
      symbol: identity.symbol,
      contract: 'native',
      coingeckoId: identity.coingeckoId,
      priceLookupStatus: est.priceLookupStatus,
      usdValuation: est.usd,
      hasReliablePrice: est.reliable,
      resolutionSource: identity.resolutionSource,
      exclusionReason: est.exclusionReason,
    })
  }

  for (const p of parsed) {
    if (p.contract === 'native') continue
    const c = normalizeContractAddress(p.contract) || ''
    const sym = stableTokenSymbol(c)
    const identity = resolveHoldingIdentity(c, sym)
    const decimals = decimalsForContract(c)
    const est = await estimateWithFallbacks(c, p.value, ethUsd, priceById, priceByContract, identity, alchemyApiKey)
    const qtyFinal = est.quantity ?? formatUnits(p.value, decimals)
    const cats = classifyHoldingCategory({
      contract: c,
      symbol: identity.symbol,
      name: identity.name,
      catalogCategory: identity.catalogCategory,
      taxonomyLabel: identity.taxonomyLabel,
    })
    const row = {
      contract: c,
      symbol: identity.symbol,
      name: identity.name,
      category: cats.category,
      quantity: qtyFinal,
      taxonomyLabel: cats.taxonomyLabel,
      usdValue: est.usd != null ? Math.round(est.usd * 100) / 100 : null,
      hasReliablePrice: est.reliable,
      coingeckoId: identity.coingeckoId || coingeckoIdForContract(c),
      resolutionSource: identity.resolutionSource,
      priceLookupStatus: est.priceLookupStatus,
      exclusionReason: est.exclusionReason,
      priceSource: est.priceSource,
      unitUsdPrice: est.unitUsdPrice ?? null,
      decimalsUsed: est.decimalsUsed ?? decimals,
      rawBalanceWei: p.value.toString(),
    }
    holdings.push(row)
    if (c === NEXUS_CONTRACT) {
      logNexusValuationAudit({
        contract: c,
        coingeckoId: row.coingeckoId,
        rawBalanceWei: row.rawBalanceWei,
        decimals: row.decimalsUsed,
        normalizedQuantity: qtyFinal,
        priceSource: est.priceSource,
        priceLookupStatus: est.priceLookupStatus,
        unitUsdPrice: est.unitUsdPrice,
        totalUsd: row.usdValue,
        hasReliablePrice: row.hasReliablePrice,
      })
    }
    pricingLogs.push({
      asset: identity.name,
      symbol: identity.symbol,
      contract: c,
      coingeckoId: identity.coingeckoId || coingeckoIdForContract(c),
      priceLookupStatus: est.priceLookupStatus,
      usdValuation: est.usd,
      hasReliablePrice: est.reliable,
      resolutionSource: identity.resolutionSource,
      exclusionReason: est.exclusionReason,
    })
  }

  logHoldingPriceResolutionBatch(pricingLogs)

  holdings.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))

  const enrichedHoldings = enrichPortfolioHoldings(holdings)
  const valuationSummary = summarizeWalletValuation(enrichedHoldings)
  logWalletExposureValuation(valuationSummary)
  logExcludedHoldingsDebug(enrichedHoldings)

  const top = enrichedHoldings.find((h) => h.hasReliablePrice && h.usdValue > 0) || enrichedHoldings[0]

  return {
    portfolioHoldings: enrichedHoldings,
    topAssetSymbol: top?.symbol || null,
    topAssetContract: top?.contract || null,
    valuationSummary,
  }
}
