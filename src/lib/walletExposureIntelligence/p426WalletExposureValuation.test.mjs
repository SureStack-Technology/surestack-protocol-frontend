import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyHoldingCategory } from '../../../shared/lib/walletExposure/holdingClassification.mjs'
import { fetchCoingeckoUsdByContracts, fetchCoingeckoUsdByIds } from '../../../shared/lib/walletExposure/holdingPriceResolver.mjs'
import { buildPortfolioBreakdown } from './portfolioBreakdown.mjs'

const NEXUS = '0xc01154b4ccb518232d6bbfc9b9e6c5068b766f82'
const BMI = '0x725c26324535aed835a1959e27ae4eeb7a95e555'

test('NEXUS maps to Infrastructure sector not Blue Chip', () => {
  const cats = classifyHoldingCategory({
    contract: NEXUS,
    symbol: 'NEXUS',
    catalogCategory: 'INFRASTRUCTURE',
  })
  assert.equal(cats.riskCategory, 'Infrastructure')
  assert.notEqual(cats.riskCategory, 'Blue Chip')

  const breakdown = buildPortfolioBreakdown({
    portfolioHoldings: [
      {
        contract: NEXUS,
        symbol: 'NEXUS',
        name: 'Nexus Chain',
        quantity: 1,
        usdValue: 1000,
        hasReliablePrice: true,
        catalogCategory: 'INFRASTRUCTURE',
      },
      {
        contract: 'native',
        symbol: 'ETH',
        name: 'Ethereum',
        quantity: 1,
        usdValue: 100,
        hasReliablePrice: true,
        catalogCategory: 'LAYER_1',
      },
    ],
  })
  const infra = breakdown.sectorMix.find((s) => s.label === 'Infrastructure')
  const blue = breakdown.sectorMix.find((s) => s.label === 'Blue Chip')
  assert.ok(infra && infra.pct > 80)
  assert.ok(blue && blue.pct < 20)
})

test('catalog tokens have CoinGecko contract price support when API available', async () => {
  const prices = await fetchCoingeckoUsdByContracts([BMI, NEXUS])
  if (Object.keys(prices).length === 0) {
    console.warn('[p426] CoinGecko contract API returned no prices (rate limit?) — skipping live assert')
    return
  }
  assert.ok(typeof prices[BMI] === 'number' || typeof prices[NEXUS] === 'number')
})

test('catalog tokens resolve by CoinGecko id batch when API available', async () => {
  const byId = await fetchCoingeckoUsdByIds(['bridge-mutual', 'oddz', 'coti', 'singularitynet'])
  if (Object.keys(byId).length === 0) {
    console.warn('[p426] CoinGecko id API returned no prices (rate limit?) — skipping live assert')
    return
  }
  assert.ok(Object.keys(byId).length >= 1)
})
