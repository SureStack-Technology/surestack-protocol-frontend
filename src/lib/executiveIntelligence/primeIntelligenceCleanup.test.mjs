import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeExecutiveIntelligence,
  resolveExecutiveClassification,
  resolveEffectiveNarrativeCategory,
} from './executiveIntelligenceEngine.mjs'
import { buildExecutiveSummary } from './buildExecutiveSummary.mjs'
import { buildInstitutionalAnalystAssessment } from './buildInstitutionalAnalystAssessment.mjs'
import {
  lookupStablecoinByAddress,
  resolveStablecoinMatch,
  isStablecoinSymbol,
} from '../../shared/constants/stablecoinRegistry.mjs'
import { isSolanaScannerReport, isEvmScannerReport, resolveIntelligenceChain } from '../intelligence/chainIntelligence.mjs'
import {
  resolveLunarCrushProviderStatus,
  resolveBirdeyeProviderStatus,
  PROVIDER_STATUS,
} from '../intelligence/providerCoverageStatus.mjs'

const USDC_ETH = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const USDT_ETH = '0xdac17f958d2ee523a2206206994597c13d831ec7'

const EVM_USDC_SCANNER = {
  success: true,
  chain: 'ethereum',
  chainId: 1,
  address: USDC_ETH,
  symbol: 'USDC',
  verifiedSource: true,
  upgradeableProxy: false,
  ownershipConcentration: 'CONCENTRATED',
  honeypotRisk: 'LOW',
  providerCoverage: { goPlus: 'goplus', etherscan: 'etherscan', alchemy: 'alchemy' },
  trustScore: 88,
  compositeTrustScore: 88,
  tokenConcentration: { deploymentAge: '3+ years' },
  liquidityIntelligence: { liquidityDepthLabel: 'Strong', concentrationLabel: 'LOW' },
}

test('stablecoin registry resolves USDC and USDT by address and symbol', () => {
  assert.ok(lookupStablecoinByAddress(USDC_ETH))
  assert.ok(lookupStablecoinByAddress(USDT_ETH))
  assert.ok(isStablecoinSymbol('USDC'))
  assert.ok(isStablecoinSymbol('USDS'))
  assert.ok(isStablecoinSymbol('PYUSD'))
  assert.equal(resolveStablecoinMatch({ symbol: 'USDT' })?.symbol, 'USDT')
})

test('USDC Ethereum classifies as STABLECOIN ASSET not DEFI ASSET', () => {
  const category = resolveEffectiveNarrativeCategory({
    symbol: 'USDC',
    query: USDC_ETH,
    scannerReport: EVM_USDC_SCANNER,
  })
  assert.equal(category, 'stablecoin')

  const intel = computeExecutiveIntelligence({
    modeId: 'token',
    symbol: 'USDC',
    query: USDC_ETH,
    narrativeCategory: category,
    composite: { score: 22, subscores: { contractRisk: 18, narrativeRisk: 20, liquidityRisk: 15 } },
    scannerReport: EVM_USDC_SCANNER,
    providerFlags: { hasScan: true },
    executiveRiskScore: 22,
  })

  assert.equal(intel.classification, 'STABLECOIN ASSET')
  assert.notEqual(intel.classification, 'DEFI ASSET')
  assert.ok(intel.keyFindings.some((f) => /issuer|reserve|depeg|redemption/i.test(f)))
})

test('Ethereum scan key findings exclude mint/freeze/Jupiter language', () => {
  const intel = computeExecutiveIntelligence({
    modeId: 'token',
    symbol: 'USDC',
    narrativeCategory: 'stablecoin',
    scannerReport: EVM_USDC_SCANNER,
    composite: { score: 22 },
    providerFlags: { hasScan: true },
    executiveRiskScore: 22,
  })
  const blob = intel.keyFindings.join(' ')
  assert.doesNotMatch(blob, /mint authority|freeze authority|jupiter routing/i)
  assert.match(blob, /issuer|reserve|verified|GoPlus/i)
})

test('Token mode excludes wallet exposure from key findings', () => {
  const intel = computeExecutiveIntelligence({
    modeId: 'token',
    symbol: 'UNI',
    narrativeCategory: 'defi',
    scannerReport: { trustScore: 70, chain: 'ethereum', verifiedSource: true },
    walletExposureProfile: {
      exposureScore: 72,
      exposureDrivers: [{ label: 'Meme asset concentration', detail: '40% meme' }],
    },
    composite: { score: 48, subscores: { walletExposureRisk: 72 } },
    providerFlags: { hasScan: true },
    executiveRiskScore: 48,
  })
  const blob = intel.keyFindings.join(' ')
  assert.doesNotMatch(blob, /wallet exposure|meme-asset concentration/i)
})

test('Ethereum executive summary excludes Solana terminology', () => {
  const executive = computeExecutiveIntelligence({
    modeId: 'token',
    symbol: 'USDC',
    narrativeCategory: 'stablecoin',
    scannerReport: EVM_USDC_SCANNER,
    executiveRiskScore: 22,
    providerFlags: { hasScan: true },
  })
  const summary = buildExecutiveSummary({
    report: { query: 'USDC', narrativeCategory: 'stablecoin', chainId: 'ethereum' },
    executive,
    scannerReport: EVM_USDC_SCANNER,
  })
  const blob = [...summary.primaryStrengths, ...summary.primaryRisks].join(' ')
  assert.doesNotMatch(blob, /mint authority|freeze authority|jupiter/i)
  assert.match(blob, /stablecoin|issuer|depeg|reserve/i)
})

test('Ethereum analyst assessment uses contract trust language', () => {
  const analyst = buildInstitutionalAnalystAssessment({
    report: { query: USDC_ETH, chainId: 'ethereum', scannerSignals: { hasScan: true } },
    scannerReport: EVM_USDC_SCANNER,
    executive: { classification: 'STABLECOIN ASSET' },
  })
  assert.doesNotMatch(analyst.technicalAssessment, /mint authority|jupiter/i)
  assert.match(analyst.technicalAssessment, /contract|scanner-backed/i)
})

test('Ethereum Birdeye status is unsupported; Solana chain resolves correctly', () => {
  assert.equal(
    resolveBirdeyeProviderStatus({ status: 'unsupported' }, { chain: 'ethereum', unsupportedChain: true }),
    PROVIDER_STATUS.UNSUPPORTED,
  )
  assert.equal(resolveIntelligenceChain({ chainId: 'ethereum', query: USDC_ETH }, EVM_USDC_SCANNER), 'ethereum')
  assert.equal(
    resolveIntelligenceChain(
      { isSolanaToken: true, chainId: 'solana' },
      { chain: 'solana', product: 'surestack_solana_risk_scanner' },
    ),
    'solana',
  )
})

test('LunarCrush rate_limited maps to rate_limited provider status', () => {
  assert.equal(
    resolveLunarCrushProviderStatus({ status: 'fallback', providerStatus: 'rate_limited' }),
    'rate_limited',
  )
})

test('chain helpers distinguish Solana and EVM scans', () => {
  assert.equal(isSolanaScannerReport({ chain: 'solana', product: 'surestack_solana_risk_scanner' }), true)
  assert.equal(isEvmScannerReport({ chain: 'ethereum', address: USDC_ETH }), true)
  assert.equal(isSolanaScannerReport({ chain: 'ethereum', address: USDC_ETH }), false)
})

test('LINK classifies as ORACLE INFRASTRUCTURE not DEFI ASSET', () => {
  const category = resolveEffectiveNarrativeCategory({ symbol: 'LINK', query: 'LINK' })
  assert.equal(category, 'oracle')

  const intel = computeExecutiveIntelligence({
    modeId: 'token',
    symbol: 'LINK',
    query: 'LINK',
    narrativeCategory: category,
    composite: { score: 32, subscores: { contractRisk: 28, narrativeRisk: 30, liquidityRisk: 25 } },
    scannerReport: {
      chain: 'ethereum',
      address: '0x514910771af9ca656af840dff83e8264ecf986ca',
      verifiedSource: true,
      trustScore: 82,
    },
    providerFlags: { hasScan: true },
    executiveRiskScore: 32,
  })

  assert.equal(intel.classification, 'ORACLE INFRASTRUCTURE')
  assert.notEqual(intel.classification, 'DEFI ASSET')
})
