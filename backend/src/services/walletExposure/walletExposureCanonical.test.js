import assert from 'node:assert/strict'
import test from 'node:test'
import { matchApprovalsToScannedAddress } from './walletExposureCanonical.js'

const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3'
const UNISWAP = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const OPENSEA = '0x1E0049783F008A0085193E00003D00cd54003c71'

const SAMPLE_ROWS = [
  {
    spender: PERMIT2.toLowerCase(),
    token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    unlimited: true,
  },
  {
    spender: UNISWAP.toLowerCase(),
    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    unlimited: false,
  },
  {
    spender: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    token: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
    unlimited: true,
    spenderCategory: 'KNOWN_AGGREGATOR',
  },
]

test('exact spender match — Permit2', () => {
  const r = matchApprovalsToScannedAddress(PERMIT2, SAMPLE_ROWS)
  assert.equal(r.matchType, 'exact_spender')
  assert.equal(r.rows.length, 1)
  assert.equal(r.rows[0].spender, PERMIT2.toLowerCase())
})

test('exact spender match — Uniswap V3 Router', () => {
  const r = matchApprovalsToScannedAddress(UNISWAP, SAMPLE_ROWS)
  assert.equal(r.matchType, 'exact_spender')
  assert.equal(r.rows.length, 1)
})

test('canonical spender match — OpenSea Conduit via aggregators', () => {
  const r = matchApprovalsToScannedAddress(OPENSEA, SAMPLE_ROWS)
  assert.equal(r.matchType, 'canonical_spender')
  assert.ok(r.rows.length >= 1)
})

test('no match for unrelated contract', () => {
  const r = matchApprovalsToScannedAddress('0x1111111111111111111111111111111111111111', SAMPLE_ROWS)
  assert.equal(r.matchType, 'none')
  assert.equal(r.rows.length, 0)
})
