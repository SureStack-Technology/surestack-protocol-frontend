import assert from 'node:assert/strict'
import test from 'node:test'
import {
  lookupPrimeToken,
  toTokenResolutionPayload,
  VALIDATION_MATRIX_SYMBOLS,
} from '../../../shared/constants/primeTokenRegistry.mjs'
import {
  ASSET_INTEL_STATES,
  allowsAssetClassification,
  allowsExecutiveRisk,
  resolveAssetIntelligenceState,
} from './assetIntelligenceState.mjs'
import { buildTokenResolutionBanner } from './tokenResolutionCopy.mjs'
import { isTokenIdentified, isMintDetectedOnly } from './tokenResolutionState.mjs'
import { canBuildPreliminaryExecutiveIntel, buildPreliminaryExecutiveIntel } from '../executiveIntelligence/preliminaryExecutiveIntel.mjs'
import { buildUnverifiedAssetExecutiveIntel } from '../executiveIntelligence/buildUnverifiedAssetIntel.mjs'

const PUMP_MINT = 'VGz5JN59ozf2Mtsv8R4FbCDUWxtEgmAdKEBZL4Epump'
const FABRICATED_CLASSIFICATIONS = /DEFI ASSET|AI ASSET|MEME SPECULATIVE|GOVERNANCE ASSET|STABLECOIN ASSET|BLUE CHIP ASSET/i

function stubRegistryReport(symbol) {
  const reg = lookupPrimeToken(symbol)
  assert.ok(reg, `${symbol} must be in registry`)
  return {
    modeId: 'token',
    query: symbol,
    displayTarget: symbol,
    chainId: reg.chain === 'solana' ? 'solana' : 'ethereum',
    isSolanaToken: reg.chain === 'solana',
    solanaMintResolved: reg.chain === 'solana',
    solanaMintAddress: reg.chain === 'solana' ? reg.address : null,
    tokenResolution: toTokenResolutionPayload(reg),
    targetClassification: {
      type: 'token',
      chain: reg.chain,
      confidence: 96,
      recommendedModule: 'token',
      symbol: reg.symbol,
      name: reg.name,
      address: reg.address,
    },
    scannerSignals: { hasScan: false },
  }
}

function stubUnknownPumpReport() {
  return {
    modeId: 'token',
    query: PUMP_MINT,
    displayTarget: PUMP_MINT,
    chainId: 'solana',
    isSolanaToken: true,
    solanaMintResolved: true,
    solanaMintAddress: PUMP_MINT,
    targetClassification: {
      type: 'token',
      chain: 'solana',
      recommendedModule: 'token',
      address: PUMP_MINT,
      confidence: 65,
    },
    scannerSignals: { hasScan: false },
    scannerReport: { success: false, address: PUMP_MINT, partialMarketScan: true, trustScore: 48 },
  }
}

test('unknown pump mint resolves to MINT_DETECTED state', () => {
  const report = stubUnknownPumpReport()
  const state = resolveAssetIntelligenceState({ report, scannerReport: report.scannerReport })
  assert.equal(state, ASSET_INTEL_STATES.MINT_DETECTED)
  assert.equal(isMintDetectedOnly(report), true)
  assert.equal(isTokenIdentified(report), false)
  assert.equal(allowsExecutiveRisk(state), false)
  assert.equal(allowsAssetClassification(state), false)
})

test('unknown pump mint never receives fabricated executive intelligence', () => {
  const report = stubUnknownPumpReport()
  assert.equal(canBuildPreliminaryExecutiveIntel(report), false)
  const executive = buildUnverifiedAssetExecutiveIntel(report)
  assert.equal(executive.classification, 'UNKNOWN ASSET')
  assert.equal(executive.unverified, true)
  assert.ok(Number(executive.confidenceScore) <= 20)
  assert.match(executive.executiveConclusion, /No verified intelligence profile available/i)
  assert.doesNotMatch(executive.classification, FABRICATED_CLASSIFICATIONS)
})

test('unknown pump mint shows mint detected banner', () => {
  const report = stubUnknownPumpReport()
  const banner = buildTokenResolutionBanner({
    report,
    isSolana: true,
    solanaMintResolved: true,
    scannerReport: report.scannerReport,
  })
  assert.equal(banner.title, 'Mint detected')
  assert.match(banner.subtitle || '', /Metadata and market intelligence pending/i)
})

test('validation matrix registry assets allow preliminary executive intelligence', () => {
  for (const sym of ['LINK', 'WIF', 'BONK', 'JUP', 'TAO', 'USDC']) {
    if (!VALIDATION_MATRIX_SYMBOLS.includes(sym)) continue
    const report = stubRegistryReport(sym)
    const state = resolveAssetIntelligenceState({ report })
    assert.equal(allowsExecutiveRisk(state), true, `${sym} should allow executive risk path`)
    assert.equal(canBuildPreliminaryExecutiveIntel(report), true, `${sym} preliminary allowed`)
    const executive = buildPreliminaryExecutiveIntel(report)
    assert.notEqual(executive.classification, 'UNKNOWN ASSET', `${sym} should classify`)
    assert.doesNotMatch(executive.classification, /^Assessment pending$/i)
  }
})

test('random EVM contract without metadata stays unverified', () => {
  const addr = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
  const report = {
    modeId: 'token',
    query: addr,
    chainId: 'ethereum',
    targetClassification: { address: addr, recommendedModule: 'token', type: 'token' },
    scannerSignals: { hasScan: false },
  }
  const state = resolveAssetIntelligenceState({ report })
  assert.equal(state, ASSET_INTEL_STATES.MINT_DETECTED)
  const executive = buildUnverifiedAssetExecutiveIntel(report)
  assert.equal(executive.classification, 'UNKNOWN ASSET')
  assert.equal(canBuildPreliminaryExecutiveIntel(report), false)
})
