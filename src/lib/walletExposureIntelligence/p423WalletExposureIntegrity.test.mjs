import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeWalletExposureIntelligenceProfile,
  EXPOSURE_STATUS_INSUFFICIENT_VALUATION,
  pricedPortfolioValueFromHoldings,
} from './walletExposureIntelligenceEngine.mjs'
import { buildPortfolioBreakdown } from './portfolioBreakdown.mjs'
import {
  resolveHoldingIdentity,
  coingeckoIdForContract,
} from '../../../shared/lib/walletExposure/holdingClassification.mjs'

test('priced portfolio value sums only reliable marks', () => {
  const total = pricedPortfolioValueFromHoldings([
    { usdValue: 100, hasReliablePrice: true },
    { usdValue: null, hasReliablePrice: false },
    { usdValue: 50, hasReliablePrice: true },
  ])
  assert.equal(total, 150)
})

test('wallet with no priced assets returns insufficient valuation status', () => {
  const profile = computeWalletExposureIntelligenceProfile({
    hasWallet: true,
    exposureHints: {
      portfolioHoldings: [
        {
          contract: '0xabc',
          symbol: 'UNK',
          name: 'Unknown',
          quantity: 10,
          usdValue: null,
          hasReliablePrice: false,
        },
        {
          contract: '0xdef',
          symbol: 'ALT',
          quantity: 5,
          usdValue: null,
          hasReliablePrice: false,
        },
      ],
    },
  })
  assert.equal(profile.exposureStatus, EXPOSURE_STATUS_INSUFFICIENT_VALUATION)
  assert.equal(profile.assetConcentration, 'N/A')
  assert.equal(profile.sectorRisk, 'N/A')
  assert.equal(profile.largestPosition, 'N/A')
  assert.equal(profile.assetAllocation.length, 0)
})

test('wallet with mixed priced/unpriced uses only priced for sector percentages', () => {
  const profile = computeWalletExposureIntelligenceProfile({
    hasWallet: true,
    exposureHints: {
      portfolioHoldings: [
        {
          contract: 'native',
          symbol: 'ETH',
          name: 'Ethereum',
          quantity: 1,
          usdValue: 3000,
          hasReliablePrice: true,
        },
        {
          contract: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
          symbol: 'PEPE',
          name: 'Pepe',
          quantity: 1_000_000,
          usdValue: 200,
          hasReliablePrice: true,
        },
        {
          contract: '0xdead',
          symbol: 'UNK',
          name: 'Unknown',
          quantity: 1,
          usdValue: null,
          hasReliablePrice: false,
        },
      ],
    },
  })
  assert.notEqual(profile.exposureStatus, EXPOSURE_STATUS_INSUFFICIENT_VALUATION)
  assert.ok(profile.pricedPortfolioValue > 0)
  const meme = profile.sectorAllocation.find((r) => r.sector === 'Meme')
  assert.ok(meme && meme.pct > 0 && meme.pct < 50)
  const holdings = [
    {
      contract: 'native',
      symbol: 'ETH',
      name: 'Ethereum',
      quantity: 1,
      usdValue: 3000,
      hasReliablePrice: true,
    },
    {
      contract: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
      symbol: 'PEPE',
      name: 'Pepe',
      quantity: 1_000_000,
      usdValue: 200,
      hasReliablePrice: true,
    },
    {
      contract: '0xdead',
      symbol: 'UNK',
      name: 'Unknown',
      quantity: 1,
      usdValue: null,
      hasReliablePrice: false,
    },
  ]
  const breakdown = buildPortfolioBreakdown({ portfolioHoldings: holdings, profile })
  assert.equal(breakdown.totalPortfolioUsd, 3200)
})

test('recognized assets resolve by contract before unclassified', () => {
  const coti = resolveHoldingIdentity('0xadd5dd305afd76e985e266826b3490235963685')
  assert.equal(coti.symbol, 'COTI')
  assert.equal(coti.name, 'COTI')
  assert.equal(coingeckoIdForContract('0xadd5dd305afd76e985e266826b3490235963685'), 'coti')
})

test('portfolio breakdown does not assign portfolio pct without valuation', () => {
  const breakdown = buildPortfolioBreakdown({
    portfolioHoldings: [
      { contract: '0x1', symbol: 'A', quantity: 1, usdValue: null, hasReliablePrice: false },
    ],
    profile: {
      exposureStatus: EXPOSURE_STATUS_INSUFFICIENT_VALUATION,
      assetConcentration: 'N/A',
      sectorRisk: 'N/A',
    },
  })
  assert.equal(breakdown.totalPortfolioUsd, 0)
  assert.equal(breakdown.top10Holdings.length, 0)
  assert.ok(breakdown.metricExplainers.some((m) => m.metric === 'Exposure Status'))
})
