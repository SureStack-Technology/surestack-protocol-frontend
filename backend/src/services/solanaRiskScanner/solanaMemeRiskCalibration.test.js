import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applySolanaNarrativeRiskLayers,
  resolveSolanaNarrativeCategory,
} from './solanaMemeRiskCalibration.js'

const BONK_MINT_REPORT = {
  addressType: 'SPL_TOKEN_MINT',
  archetypeId: 'bonk',
  trustScore: 100,
  trustScoreUncapped: 100,
  trustBand: 'TRUSTED',
  tokenConcentration: {
    liquidityUsd: 2_200_000,
    marketCapUsd: 477_000_000,
    top10HolderPct: 73,
    largestWalletPct: 12,
    holderCount: 900_000,
  },
}

const WIF_REPORT = {
  addressType: 'SPL_TOKEN_MINT',
  archetypeId: 'wif',
  trustScore: 98,
  trustScoreUncapped: 98,
  trustBand: 'TRUSTED',
  tokenConcentration: {
    liquidityUsd: 8_000_000,
    top10HolderPct: 40,
  },
}

const USDC_REPORT = {
  addressType: 'SPL_TOKEN_MINT',
  archetypeId: 'usdc_solana',
  regulatedStablecoin: true,
  trustScore: 92,
  trustBand: 'TRUSTED',
  tokenConcentration: { liquidityUsd: 50_000_000 },
}

test('resolveSolanaNarrativeCategory identifies BONK meme', () => {
  assert.equal(resolveSolanaNarrativeCategory({ archetypeId: 'bonk' }), 'meme_speculative')
  assert.equal(
    resolveSolanaNarrativeCategory({ requestedSymbol: 'BONK' }),
    'meme_speculative',
  )
})

test('BONK does not return trustScore 100', () => {
  const out = applySolanaNarrativeRiskLayers(BONK_MINT_REPORT)
  assert.notEqual(out.trustScore, 100)
  assert.ok(out.trustScore >= 68 && out.trustScore <= 82, `trust=${out.trustScore}`)
  assert.equal(out.scannerVerdict, 'MODERATE WATCH')
  assert.match(out.scannerVerdictDetail || '', /SPECULATIVE NARRATIVE/i)
})

test('WIF does not return trustScore 100', () => {
  const out = applySolanaNarrativeRiskLayers(WIF_REPORT)
  assert.notEqual(out.trustScore, 100)
  assert.ok(out.trustScore <= 82, `trust=${out.trustScore}`)
})

test('major meme with high narrative risk caps composite at 82', () => {
  const out = applySolanaNarrativeRiskLayers({
    ...WIF_REPORT,
    trustScore: 100,
    trustScoreUncapped: 100,
    tokenConcentration: {
      liquidityUsd: 12_000_000,
      top10HolderPct: 30,
      largestWalletPct: 5,
    },
  })
  assert.ok(out.trustScore <= 82)
  assert.equal(out.narrativeRiskLabel, 'High')
})

test('revoked authorities improve technical trust without clearing narrative', () => {
  const weakMint = applySolanaNarrativeRiskLayers({
    addressType: 'SPL_TOKEN_MINT',
    archetypeId: 'bonk',
    trustScore: 62,
    trustScoreUncapped: 62,
    tokenConcentration: { liquidityUsd: 1_000_000 },
  })
  const strongMint = applySolanaNarrativeRiskLayers({
    ...BONK_MINT_REPORT,
    trustScore: 88,
    trustScoreUncapped: 88,
  })
  assert.ok(strongMint.technicalTrustScore > weakMint.technicalTrustScore)
  assert.equal(strongMint.narrativeRiskLabel, 'High')
  assert.equal(weakMint.narrativeRiskLabel, 'High')
  assert.ok(strongMint.compositeTrustScore > weakMint.compositeTrustScore)
})

test('unknown holder concentration tightens meme cap to 78', () => {
  const out = applySolanaNarrativeRiskLayers({
    addressType: 'SPL_TOKEN_MINT',
    archetypeId: 'wif',
    trustScore: 100,
    trustScoreUncapped: 100,
    tokenConcentration: {
      liquidityUsd: 12_000_000,
    },
  })
  assert.ok(out.trustScore <= 78, `expected <=78, got ${out.trustScore}`)
})

test('USDC stablecoin path unchanged by meme caps', () => {
  const out = applySolanaNarrativeRiskLayers(USDC_REPORT)
  assert.equal(out.trustScore, 92)
  assert.equal(out.narrativeCategory, 'stablecoin')
  assert.notEqual(out.scannerVerdict, 'MODERATE WATCH')
})
