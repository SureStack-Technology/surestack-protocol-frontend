import test from 'node:test'
import assert from 'node:assert/strict'
import { applyHoldingDisplayLabels } from '../../../shared/lib/walletExposure/holdingDisplayMeta.mjs'
import { buildPortfolioBreakdown } from './portfolioBreakdown.mjs'

const NEXUS = '0xc01154b4ccb518232d6bbfc9b9e6c5068b766f82'
const UNKNOWN_PRICED = '0xee50123456789012345678901234567890471c'

test('priced unknown token renders as Unknown priced token, not Unclassified token', () => {
  const row = applyHoldingDisplayLabels({
    contract: UNKNOWN_PRICED,
    symbol: '0xee50…471c',
    name: 'Unclassified token',
    quantity: 1000,
    usdValue: 42.5,
    hasReliablePrice: true,
    priceLookupStatus: 'alchemy_ok',
    priceSource: 'alchemy',
  })
  assert.equal(row.asset, 'Unknown priced token')
  assert.match(row.symbol, /^0xee50/)
  assert.equal(row.priceSourceLabel, 'Alchemy')
  assert.ok(!/unclassified/i.test(row.asset))
})

test('coingecko_ok with missing price renders precise identity/price message', () => {
  const row = applyHoldingDisplayLabels({
    contract: '0x07bac35846e5ed502aa91adf6a9e7aa210f2dcbe',
    symbol: 'EROWAN',
    name: 'Sifchain',
    quantity: 50000,
    usdValue: null,
    hasReliablePrice: false,
    coingeckoId: 'sifchain',
    priceLookupStatus: 'identity_ok_price_missing',
    exclusionReason: 'no_market_price',
  })
  assert.equal(row.priceStatus, 'price_identity_only')
  assert.match(row.priceStatusDisplay, /CoinGecko identity resolved/)
  assert.match(row.exclusionReason, /no usable USD price/i)
})

test('NEXUS valuation calculation shows raw balance × unit price = total USD', () => {
  const rawWei = '11070000000000000000000'
  const decimals = 18
  const qty = Number(rawWei) / 10 ** decimals
  const unitUsd = 0.000128
  const totalUsd = Math.round(qty * unitUsd * 100) / 100

  const breakdown = buildPortfolioBreakdown({
    portfolioHoldings: [
      {
        contract: NEXUS,
        symbol: 'NEXUS',
        name: 'Nexus Chain',
        quantity: qty,
        usdValue: totalUsd,
        hasReliablePrice: true,
        coingeckoId: 'nexus-2',
        priceLookupStatus: 'coingecko_ok',
        priceSource: 'coingecko',
        unitUsdPrice: unitUsd,
        decimalsUsed: decimals,
        rawBalanceWei: rawWei,
      },
    ],
  })

  const nexus = breakdown.top10Holdings[0]
  assert.equal(nexus.symbol, 'NEXUS')
  assert.equal(nexus.usdValue, totalUsd)
  assert.ok(Math.abs(qty * unitUsd - totalUsd) < 0.02)
  assert.match(nexus.priceSourceDisplay, /NEXUS — priced by CoinGecko ID/)
})

test('portfolio breakdown displays price source on priced rows', () => {
  const breakdown = buildPortfolioBreakdown({
    portfolioHoldings: [
      {
        contract: '0x159751323a9e0415dd3d6d42a1212fe9f4a0848c',
        symbol: 'INFI',
        name: 'Insured Finance',
        quantity: 10,
        usdValue: 5,
        hasReliablePrice: true,
        priceLookupStatus: 'coingecko_contract_ok',
        priceSource: 'coingecko',
      },
      {
        contract: UNKNOWN_PRICED,
        symbol: '0xee50…471c',
        name: 'Unclassified token',
        quantity: 1,
        usdValue: 3,
        hasReliablePrice: true,
        priceLookupStatus: 'dexscreener_ok',
        priceSource: 'dexscreener',
      },
    ],
  })

  assert.equal(breakdown.top10Holdings.length, 2)
  const infi = breakdown.top10Holdings.find((h) => h.symbol === 'INFI')
  const unknown = breakdown.top10Holdings.find((h) => h.asset === 'Unknown priced token')
  assert.match(infi?.priceSourceDisplay, /INFI — priced by CoinGecko contract/)
  assert.match(unknown?.priceSourceDisplay, /priced by DexScreener/)
})
