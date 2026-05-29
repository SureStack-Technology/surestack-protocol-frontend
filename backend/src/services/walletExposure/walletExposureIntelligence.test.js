import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeWalletExposureIntelligence,
  formatStablecoinBalanceReason,
} from './walletExposureIntelligence.js'
import { buildExposureMetrics } from './walletExposureMetrics.js'

/** Wallet A — stablecoin-heavy */
const walletASignals = {
  providerLive: true,
  hasBalances: true,
  hasTransfers: true,
  hasApprovals: true,
  hasNftScan: true,
  volatileSharePct: 15,
  stableSharePct: 85,
  stableShareComputed: true,
  stableSymbolsHeld: ['USDC', 'USDT', 'DAI'],
  stablecoinBalanceCount: 3,
  stableTransferCount: 6,
  dexInteractionCount: 1,
  nftHoldingsCount: 0,
  uniqueCounterparties: 12,
}

/** Wallet B — DeFi-heavy */
const walletBSignals = {
  providerLive: true,
  hasBalances: true,
  hasTransfers: true,
  hasApprovals: true,
  hasNftScan: true,
  volatileSharePct: 70,
  stableSharePct: 30,
  stableSymbolsHeld: ['USDC'],
  stablecoinBalanceCount: 1,
  dexInteractionCount: 9,
  dexTransferCount: 9,
  probeDexApproval: 1,
  nftHoldingsCount: 1,
  uniqueCounterparties: 32,
  topSpenderApprovalSharePct: 42,
}

/** Wallet C — unknown approvals */
const walletCSignals = {
  providerLive: true,
  hasBalances: true,
  hasTransfers: true,
  hasApprovals: true,
  hasNftScan: false,
  volatileSharePct: 55,
  stableSharePct: 45,
  stablecoinBalanceCount: 1,
  stableSymbolsHeld: ['USDC'],
  unlimitedApprovalUnknownCount: 2,
  uniqueCounterparties: 14,
}

const walletCRows = [
  {
    token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    spender: '0xabadabadabadabadabadabadabadabadabadabad',
    unlimited: true,
    spenderCategory: 'UNKNOWN_SPENDER',
    riskLevel: 'HIGH',
  },
  {
    token: '0x6b175474e89094c44da98b954eedeac495271d0f',
    spender: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    unlimited: true,
    spenderCategory: 'UNKNOWN_SPENDER',
    riskLevel: 'HIGH',
  },
]

const walletBRows = [
  {
    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    spender: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
    unlimited: true,
    spenderCategory: 'KNOWN_AGGREGATOR',
    riskLevel: 'WATCH',
  },
  {
    token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    spender: '0x1111111254eeb25477b68fb85ed929f73a960582',
    unlimited: true,
    spenderCategory: 'KNOWN_AGGREGATOR',
    riskLevel: 'WATCH',
  },
  {
    token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    spender: '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2',
    unlimited: false,
    spenderCategory: 'UNKNOWN_SPENDER',
    riskLevel: 'WATCH',
  },
]

describe('computeWalletExposureIntelligence', () => {
  it('Wallet A: stablecoin-heavy → Stablecoins > 5/7', () => {
    const out = computeWalletExposureIntelligence(walletASignals, [])
    const stable = out.bands.find((b) => b.id === 'stable')
    assert.ok(stable.level > 5, `expected stable > 5, got ${stable.level}`)
    assert.equal(out.provenance, 'LIVE')
  })

  it('Wallet B: DeFi-heavy → DEX > 5/7 and Protocol > 3/7', () => {
    const out = computeWalletExposureIntelligence(walletBSignals, walletBRows)
    const dex = out.bands.find((b) => b.id === 'dex')
    const protocol = out.bands.find((b) => b.id === 'protocol')
    assert.ok(dex.level > 5, `expected dex > 5, got ${dex.level}`)
    assert.ok(protocol.level > 3, `expected protocol > 3, got ${protocol.level}`)
    assert.equal(out.provenance, 'LIVE')
  })

  it('Wallet C: unknown approvals → Unknown contracts > 5/7', () => {
    const out = computeWalletExposureIntelligence(walletCSignals, walletCRows)
    const unknown = out.bands.find((b) => b.id === 'unknown')
    assert.ok(unknown.level >= 5, `expected unknown >= 5, got ${unknown.level}`)
    assert.ok(['LIVE', 'PARTIAL_DATA'].includes(out.provenance))
  })

  it('empty wallet: 0/7 acceptable with clear reasons', () => {
    const empty = {
      providerLive: true,
      hasBalances: false,
      hasTransfers: false,
      hasApprovals: false,
      hasNftScan: true,
    }
    const out = computeWalletExposureIntelligence(empty, [])
    assert.ok(out.bands.every((b) => b.level === 0))
    assert.equal(out.provenance, 'PROVIDER_PENDING')
    assert.ok(out.bands[0].reasons[0].length > 10)
  })

  it('marks provider pending when not live', () => {
    const out = computeWalletExposureIntelligence({ providerLive: false }, [])
    assert.equal(out.provenance, 'PROVIDER_PENDING')
    assert.equal(out.bands.length, 0)
  })

  it('formatStablecoinBalanceReason avoids 0% share when tokens present', () => {
    assert.equal(
      formatStablecoinBalanceReason(['DAI', 'USDC'], 0, { shareComputed: false }),
      'Stable balances detected: DAI, USDC. Value share unavailable.',
    )
    assert.equal(
      formatStablecoinBalanceReason(['USDC'], 42, { shareComputed: true }),
      'Stable balances detected: USDC (42% of sampled wallet value)',
    )
  })

  it('stable band reason includes computed share percentage', () => {
    const out = computeWalletExposureIntelligence(
      { ...walletASignals, stableSharePct: 62, stableShareComputed: true },
      [],
    )
    const stable = out.bands.find((b) => b.id === 'stable')
    assert.ok(
      stable.reasons.some((r) => r.includes('62%')),
      `expected 62% in reasons: ${stable.reasons.join(' | ')}`,
    )
  })

  it('buildExposureMetrics counts approval dimensions', () => {
    const m = buildExposureMetrics(walletBSignals, walletBRows)
    assert.equal(m.dexApprovalCount, 2)
    assert.equal(m.approvalCount, 3)
    assert.ok(m.protocolSpenderCount >= 1)
  })
})
