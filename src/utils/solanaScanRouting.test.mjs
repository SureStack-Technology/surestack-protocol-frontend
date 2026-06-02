import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WIF_FIXTURE = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/prime-wif-solana-scan.fixture.json'), 'utf8'),
)

/** Mirrors resolveSolanaScanContext (solanaTokenTarget.js) for regression without Vite aliases. */
function resolveSolanaScanContext({ targetClassification = null, tokenResolution = null, query = '' } = {}) {
  const isSolana =
    targetClassification?.chain === 'solana' || tokenResolution?.chainSlug === 'solana'
  const mint = targetClassification?.address || tokenResolution?.address || null
  const symbol =
    targetClassification?.symbol || tokenResolution?.symbol || String(query || '').trim().toUpperCase()
  return {
    isSolana,
    mint: mint ? String(mint).trim() : null,
    symbol,
    mintResolved: Boolean(isSolana && mint),
    shouldScanSolana: Boolean(isSolana && mint),
  }
}

test('WIF fixture: Solana mint scan routing expectations', () => {
  assert.equal(WIF_FIXTURE.chain, 'solana')
  assert.equal(WIF_FIXTURE.mint, 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm')
  assert.equal(WIF_FIXTURE.scannerRoute, 'POST /api/prime/solana/analyze')
  assert.equal(WIF_FIXTURE.scannerPayload.symbol, 'WIF')
  assert.match(WIF_FIXTURE.expectedUi.contractProofCopy, /Solana mint resolved/)
  assert.equal(WIF_FIXTURE.expectedUi.fallbackBanner, false)
})

test('WIF classification context triggers Solana scanner route', () => {
  const classification = {
    chain: WIF_FIXTURE.chain,
    address: WIF_FIXTURE.mint,
    symbol: WIF_FIXTURE.symbol,
  }
  const tokenResolution = {
    chainSlug: 'solana',
    address: WIF_FIXTURE.mint,
    symbol: WIF_FIXTURE.symbol,
  }
  const ctx = resolveSolanaScanContext({
    targetClassification: classification,
    tokenResolution,
    query: 'WIF',
  })
  assert.equal(ctx.shouldScanSolana, true)
  assert.equal(ctx.mint, WIF_FIXTURE.mint)
  assert.deepEqual(
    {
      address: ctx.mint,
      mint: ctx.mint,
      target: ctx.mint,
      symbol: ctx.symbol,
    },
    WIF_FIXTURE.scannerPayload,
  )
})
