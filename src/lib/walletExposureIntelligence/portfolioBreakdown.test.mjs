import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPortfolioBreakdown } from './portfolioBreakdown.mjs'

test('portfolio breakdown ranks holdings and computes sector formulas', () => {
  const profile = {
    exposureScore: 72,
    assetConcentration: 'CRITICAL',
    assetConcentrationReason: 'Largest position represents 95% of sampled wallet exposure.',
    sectorRisk: 'HIGH',
    sectorRiskReason: 'Infrastructure represents ~95% of observed sector allocation.',
    assetAllocation: [
      { category: 'Infrastructure Assets', pct: 90 },
      { category: 'Meme Assets', pct: 10 },
    ],
    exposureDrivers: [{ rank: 'Primary', label: 'Asset concentration', detail: 'Top holder dominates.' }],
  }

  const breakdown = buildPortfolioBreakdown({
    portfolioHoldings: [
      {
        contract: '0xc01154b4ccb518232d6bbfc9b9e6c5068b766f82',
        symbol: 'NEXUS',
        name: 'Nexus Chain',
        quantity: 1000,
        usdValue: 16742,
        hasReliablePrice: true,
      },
      {
        contract: '0xf0939011a9bb95c3b791f0cb546377ed2693a574',
        symbol: 'ZERO',
        name: 'Zero.Exchange Token',
        quantity: 50000,
        usdValue: 139,
        hasReliablePrice: true,
      },
      {
        contract: '0x999',
        symbol: 'UNK',
        name: 'Unknown',
        quantity: 1,
        usdValue: null,
        hasReliablePrice: false,
      },
    ],
    profile,
    exposureHints: { topTokenSharePct: 95 },
  })

  assert.equal(breakdown.top10Holdings[0].symbol, 'NEXUS')
  assert.equal(breakdown.top10Holdings[0].category, 'Infrastructure')
  assert.equal(breakdown.top10Holdings[1].category, 'DeFi')
  assert.ok(breakdown.top10Holdings[0].portfolioPct > 90)
  assert.equal(breakdown.concentrationAsset.symbol, 'NEXUS')
  assert.equal(breakdown.excludedHoldings.length, 1)
  assert.ok(breakdown.sectorMix.some((s) => s.label === 'Stablecoin' && s.formula.includes('÷')))
  assert.ok(breakdown.metricExplainers.some((m) => m.metric === 'Exposure Score'))
})

test('valuation warning when more than 10% of holdings lack price', () => {
  const breakdown = buildPortfolioBreakdown({
    portfolioHoldings: [
      { contract: '0x1', symbol: 'A', name: 'A', quantity: 1, usdValue: 100, hasReliablePrice: true },
      { contract: '0x2', symbol: 'B', name: 'B', quantity: 1, usdValue: null, hasReliablePrice: false },
      { contract: '0x3', symbol: 'C', name: 'C', quantity: 1, usdValue: null, hasReliablePrice: false },
    ],
  })
  assert.ok(breakdown.valuationWarning)
  assert.ok(breakdown.unpricedHoldingsSharePct > 10)
})
