import assert from 'node:assert/strict'
import test from 'node:test'
import {
  lookupPrimeToken,
  VALIDATION_MATRIX_SYMBOLS,
  toTokenResolutionPayload,
} from '../../../shared/constants/primeTokenRegistry.mjs'
import {
  buildTokenResolutionBanner,
  isTokenContractResolved,
  UNRESOLVED_ASSET_TITLE,
} from './tokenResolutionCopy.mjs'
import { isTokenIdentified, resolveTokenResolutionState } from './tokenResolutionState.mjs'
import { buildPreliminaryExecutiveIntel } from '../executiveIntelligence/preliminaryExecutiveIntel.mjs'

const CONTRADICTORY = /identification pending|identity not yet confirmed|Enter a known token symbol|contract proof unavailable/i

function stubReport(symbol, chain = 'ethereum') {
  const reg = lookupPrimeToken(symbol)
  assert.ok(reg, `${symbol} must be in registry`)
  const tokenResolution = toTokenResolutionPayload(reg)
  const classification = {
    type: 'token',
    chain: reg.chain,
    confidence: 96,
    recommendedModule: 'token',
    symbol: reg.symbol,
    name: reg.name,
    address: reg.address,
  }
  const isSolana = reg.chain === 'solana'
  return {
    modeId: 'token',
    query: symbol,
    displayTarget: symbol,
    chainId: isSolana ? 'solana' : chain,
    isSolanaToken: isSolana,
    solanaMintResolved: isSolana,
    solanaMintAddress: isSolana ? reg.address : null,
    tokenResolution,
    targetClassification: classification,
    scannerSignals: { hasScan: false },
  }
}

test('validation matrix symbols resolve in registry', () => {
  for (const sym of VALIDATION_MATRIX_SYMBOLS) {
    assert.ok(lookupPrimeToken(sym), `${sym} missing from PRIME_TOKEN_REGISTRY`)
  }
})

test('TAO resolves to Bittensor with Solana mint address', () => {
  const tao = lookupPrimeToken('TAO')
  assert.equal(tao.name, 'Bittensor')
  assert.equal(tao.chain, 'solana')
  assert.ok(tao.address)
})

test('TAO registry entry includes name and address for classifier handoff', () => {
  const tao = lookupPrimeToken('TAO')
  assert.equal(tao.name, 'Bittensor')
  assert.equal(tao.symbol, 'TAO')
  assert.ok(tao.address)
  assert.equal(tao.chain, 'solana')
})

test('identified TAO never shows unresolved banner copy', () => {
  const report = stubReport('TAO')
  assert.equal(isTokenIdentified(report), true)
  assert.equal(resolveTokenResolutionState(report), 'symbol_resolved')
  const banner = buildTokenResolutionBanner({
    report,
    isSolana: true,
    solanaMintResolved: true,
    hasScan: false,
  })
  assert.equal(banner.title, 'Token identified')
  assert.doesNotMatch(banner.copy, CONTRADICTORY)
  assert.doesNotMatch(banner.subtitle || '', CONTRADICTORY)
})

test('FET and RNDR resolve on Ethereum with identified state', () => {
  for (const sym of ['FET', 'RNDR']) {
    const report = stubReport(sym)
    assert.equal(isTokenContractResolved(report), true)
    assert.equal(isTokenIdentified(report), true)
    const banner = buildTokenResolutionBanner({ report, hasScan: false })
    assert.equal(banner.title, 'Token identified')
    assert.doesNotMatch(JSON.stringify(banner), CONTRADICTORY)
  }
})

test('unknown symbol uses unresolved asset copy only', () => {
  const banner = buildTokenResolutionBanner({
    report: { modeId: 'token', tokenResolution: { status: 'unresolved', resolved: false } },
  })
  assert.equal(banner.title, UNRESOLVED_ASSET_TITLE)
  assert.match(banner.copy, /valid token symbol/i)
})

test('preliminary executive for TAO does not imply unresolved contract', () => {
  const report = stubReport('TAO')
  const executive = buildPreliminaryExecutiveIntel(report)
  assert.equal(executive.classification, 'AI ASSET')
  assert.equal(executive.preliminary, true)
  assert.ok(Number(executive.confidenceScore) > 0)
  const blob = [
    executive.executiveConclusion,
    ...(executive.keyFindings || []),
  ].join(' ')
  assert.doesNotMatch(blob, CONTRADICTORY)
})
