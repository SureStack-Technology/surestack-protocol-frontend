import assert from 'node:assert/strict'
import test from 'node:test'
import {
  lookupWalletHoldingByContract,
  coingeckoIdForCatalogContract,
  taxonomyLabelForCategory,
} from '../../../shared/lib/walletExposure/walletHoldingsCatalog.mjs'
import { resolveWalletHolding, RESOLUTION_SOURCE } from '../../../shared/lib/walletExposure/walletHoldingsResolution.mjs'
import {
  resolveHoldingIdentity,
  classifyHoldingCategory,
  coingeckoIdForContract,
} from '../../../shared/lib/walletExposure/holdingClassification.mjs'
import {
  computeWalletExposureIntelligenceProfile,
  pricedPortfolioValueFromHoldings,
} from './walletExposureIntelligenceEngine.mjs'
import { buildPortfolioBreakdown } from './portfolioBreakdown.mjs'

const HOLDINGS = {
  NEXUS: '0xc01154b4ccb518232d6bbfc9b9e6c5068b766f82',
  ZERO: '0xf0939011a9bb95c3b791f0cb546377ed2693a574',
  BMI: '0x725c26324535aed835a1959e27ae4eeb7a95e555',
  ODDZ: '0xc5217817e8315fc9acaa83d862ddb6071a98f9c2',
  COTI: '0xadd5dd305afd76e985e266826b3490235963685',
  AGI: '0x5b753dc273739b13f9ae62f9397091ed596acb4',
}

for (const [label, contract] of Object.entries(HOLDINGS)) {
  test(`${label} resolves from contract catalog`, () => {
    const entry = lookupWalletHoldingByContract(contract)
    assert.ok(entry, `${label} catalog entry`)
    assert.equal(entry.symbol, label)

    const resolved = resolveWalletHolding(contract)
    assert.equal(resolved.source, RESOLUTION_SOURCE.CONTRACT_CATALOG)
    assert.equal(resolved.symbol, label)
    assert.notEqual(resolved.name, 'Unclassified token')
    assert.ok(resolved.coingeckoId)

    const identity = resolveHoldingIdentity(contract)
    assert.equal(identity.symbol, label)
    assert.equal(identity.name, entry.name)
  })
}

test('NEXUS on-chain alias NEX resolves to NEXUS', () => {
  const resolved = resolveWalletHolding(HOLDINGS.NEXUS, 'NEX')
  assert.equal(resolved.symbol, 'NEXUS')
})

test('ZERO resolves as DeFi / utility taxonomy', () => {
  const cats = classifyHoldingCategory({
    contract: HOLDINGS.ZERO,
    symbol: 'ZERO',
    catalogCategory: 'DEFI',
  })
  assert.equal(cats.taxonomyLabel, 'DeFi')
})

test('NEXUS category is Infrastructure', () => {
  const cats = classifyHoldingCategory({
    contract: HOLDINGS.NEXUS,
    symbol: 'NEXUS',
    catalogCategory: 'INFRASTRUCTURE',
  })
  assert.equal(cats.taxonomyLabel, 'Infrastructure')
})

test('CoinGecko IDs are defined for wallet catalog assets', () => {
  assert.equal(coingeckoIdForContract(HOLDINGS.COTI), 'coti')
  assert.equal(coingeckoIdForContract(HOLDINGS.BMI), 'bridge-mutual')
  assert.equal(coingeckoIdForContract(HOLDINGS.ODDZ), 'oddz')
  assert.equal(coingeckoIdForContract(HOLDINGS.AGI), 'singularitynet')
  assert.equal(coingeckoIdForContract(HOLDINGS.NEXUS), 'nexus-2')
  assert.equal(coingeckoIdForContract(HOLDINGS.ZERO), 'zero-exchange')
  assert.equal(coingeckoIdForCatalogContract('native'), 'ethereum')
})

test('ETH native taxonomy is Layer 1', () => {
  const cats = classifyHoldingCategory({ contract: 'native', symbol: 'ETH' })
  assert.equal(cats.taxonomyLabel, taxonomyLabelForCategory('LAYER_1'))
})

test('wallet with recognized priced holdings computes portfolio percentages', () => {
  const holdings = [
    {
      contract: HOLDINGS.NEXUS,
      symbol: 'NEXUS',
      name: 'Nexus Chain',
      quantity: 100_000,
      usdValue: 16742,
      hasReliablePrice: true,
      catalogCategory: 'INFRASTRUCTURE',
    },
    {
      contract: HOLDINGS.ZERO,
      symbol: 'ZERO',
      name: 'Zero.Exchange Token',
      quantity: 500_000,
      usdValue: 139,
      hasReliablePrice: true,
      catalogCategory: 'DEFI',
    },
    {
      contract: HOLDINGS.BMI,
      symbol: 'BMI',
      name: 'Bridge Mutual',
      quantity: 10_000,
      usdValue: 50,
      hasReliablePrice: true,
      catalogCategory: 'DEFI',
    },
    {
      contract: HOLDINGS.ODDZ,
      symbol: 'ODDZ',
      name: 'Oddz',
      quantity: 20_000,
      usdValue: 40,
      hasReliablePrice: true,
      catalogCategory: 'DEFI',
    },
  ]

  assert.ok(pricedPortfolioValueFromHoldings(holdings) > 0)
  const breakdown = buildPortfolioBreakdown({ portfolioHoldings: holdings })
  assert.equal(breakdown.top10Holdings[0].symbol, 'NEXUS')
  assert.ok(breakdown.top10Holdings[0].portfolioPct > 90)
  assert.ok(breakdown.sectorMix.some((s) => s.pct > 0 && s.formula.includes('÷')))
})

test('wallet with no priced assets does not compute sector allocation in profile', () => {
  const profile = computeWalletExposureIntelligenceProfile({
    hasWallet: true,
    exposureHints: {
      portfolioHoldings: [
        {
          contract: HOLDINGS.NEXUS,
          symbol: 'NEXUS',
          name: 'Nexus Chain',
          quantity: 1,
          usdValue: null,
          hasReliablePrice: false,
        },
      ],
    },
  })
  assert.equal(profile.assetAllocation.length, 0)
  assert.equal(profile.assetConcentration, 'N/A')
})

test('mixed priced/unpriced wallet percentages use priced subset only', () => {
  const holdings = [
    {
      contract: HOLDINGS.NEXUS,
      symbol: 'NEXUS',
      usdValue: 1000,
      hasReliablePrice: true,
      quantity: 1,
    },
    {
      contract: HOLDINGS.COTI,
      symbol: 'COTI',
      usdValue: null,
      hasReliablePrice: false,
      quantity: 1,
    },
  ]
  const breakdown = buildPortfolioBreakdown({ portfolioHoldings: holdings })
  assert.equal(breakdown.top10Holdings.length, 1)
  assert.equal(breakdown.top10Holdings[0].portfolioPct, 100)
  assert.equal(breakdown.excludedHoldings.length, 1)
})
