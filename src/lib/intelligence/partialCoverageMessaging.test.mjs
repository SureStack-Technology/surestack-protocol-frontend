import assert from 'node:assert/strict'
import test from 'node:test'
import {
  hasScannerBackedEvidence,
  resolveScanStatusBanner,
  PARTIAL_COVERAGE_TITLE,
  PROVIDER_COVERAGE_PRELIMINARY_NOTE,
} from './partialCoverageMessaging.mjs'
import {
  buildTokenResolutionBanner,
  PRELIMINARY_INTEL_BODY,
  TOKEN_RISK_INTEL_PRESCAN_LEAD,
} from './tokenResolutionCopy.mjs'
import { buildTokenConcentrationIntel } from '../../../backend/src/services/tokenConcentration/tokenConcentrationScoring.js'
import { filterDexScreenerPairsForChain } from '../../../backend/src/services/tokenConcentration/dexScreenerProvider.js'
import { computeLiquidityDepthScore } from '../liquidityIntelligence/liquidityIntelligenceEngine.mjs'

test('partial coverage banner replaces failure messaging when scanner evidence exists', () => {
  const report = {
    modeId: 'contract',
    isFallback: true,
    providersPending: true,
    lunarLive: false,
    birdeyeLive: false,
    scannerSignals: { hasScan: true },
    executiveIntelligence: {
      classification: 'STABLECOIN ASSET',
      executiveRiskBandId: 'moderate',
      pending: false,
    },
  }
  const banner = resolveScanStatusBanner(report, { success: true, trustScore: 82 }, true)
  assert.equal(banner?.type, 'partial')
  assert.equal(banner?.title, PARTIAL_COVERAGE_TITLE)
  assert.match(banner?.body || '', /scanner-backed/i)
})

test('failure banner only when no scanner-backed evidence', () => {
  const report = {
    modeId: 'contract',
    isFallback: true,
    fallbackMessage: 'Retry scan.',
  }
  assert.equal(hasScannerBackedEvidence(report, null), false)
  const banner = resolveScanStatusBanner(report, null, true)
  assert.equal(banner?.type, 'failure')
})

test('pre-scan resolved token suppresses hero coverage banner', () => {
  const report = {
    modeId: 'token',
    isFallback: false,
    query: 'LINK',
    tokenResolution: {
      resolved: true,
      autoSelected: true,
      address: '0x514910771af9ca656af840dff83e8264ecf986ca',
      symbol: 'LINK',
    },
    targetClassification: {
      symbol: 'LINK',
      address: '0x514910771af9ca656af840dff83e8264ecf986ca',
      recommendedModule: 'token',
    },
    executiveIntelligence: {
      classification: 'ORACLE INFRASTRUCTURE',
      preliminary: true,
      pending: false,
      executiveRiskBandId: 'moderate',
    },
    providersPending: true,
    lunarLive: false,
  }
  assert.equal(resolveScanStatusBanner(report, null, false), null)
})

test('resolved token banner uses institutional pre-scan copy', () => {
  const banner = buildTokenResolutionBanner({
    report: {
      modeId: 'token',
      tokenResolution: {
        resolved: true,
        autoSelected: true,
        address: '0x514910771af9ca656af840dff83e8264ecf986ca',
      },
    },
    hasScan: false,
  })
  assert.equal(banner.title, 'Token identified')
  assert.match(banner.subtitle || '', /preliminary intelligence available|Metadata resolved/i)
  assert.match(banner.copy, /preliminary|Intelligence Scan/i)
  assert.match(banner.chainLine || '', /Ethereum contract resolved/i)
  assert.doesNotMatch(banner.copy, /unavailable|unresolved/i)
})

test('token risk intel pre-scan lead avoids unresolved contract language', () => {
  assert.match(TOKEN_RISK_INTEL_PRESCAN_LEAD, /Preliminary token intelligence/i)
  assert.doesNotMatch(TOKEN_RISK_INTEL_PRESCAN_LEAD, /unavailable|unresolved/i)
})

test('provider preliminary note is coverage-tier copy', () => {
  assert.match(PROVIDER_COVERAGE_PRELIMINARY_NOTE, /Preliminary intelligence generated/i)
  assert.doesNotMatch(PROVIDER_COVERAGE_PRELIMINARY_NOTE, /could not complete|coverage limited/i)
})

test('USDT stablecoin concentration avoids no DEX liquidity copy when DexScreener empty', () => {
  const intel = buildTokenConcentrationIntel({
    holderMetrics: null,
    dex: { confirmed: true, hasLiquidity: false, totalLiquidityUsd: 0, pairCount: 0 },
    goPlusParsed: null,
    isCanonical: true,
    isStablecoin: true,
    deploymentMeta: null,
  })
  assert.match(intel.liquidityStatus, /Institutional stablecoin/i)
  assert.doesNotMatch(intel.liquidityStatus, /No DEX liquidity detected/i)
  assert.equal(intel.isStablecoin, true)
})

test('DexScreener chain filter accepts ethereum chainId alias', () => {
  const pairs = [
    {
      chainId: 'ethereum',
      baseToken: { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
      quoteToken: { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' },
      liquidity: { usd: 1000000 },
    },
    {
      chainId: 'pulsechain',
      baseToken: { address: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
      quoteToken: { address: '0x1' },
      liquidity: { usd: 500000 },
    },
  ]
  const filtered = filterDexScreenerPairsForChain(
    pairs,
    'ethereum',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  )
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].chainId, 'ethereum')
})

test('stablecoin liquidity depth score uses institutional profile', () => {
  assert.equal(computeLiquidityDepthScore({ isStablecoin: true, liquidityUsd: 0 }), 92)
})
