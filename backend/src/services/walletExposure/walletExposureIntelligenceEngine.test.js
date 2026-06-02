import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assetConcentrationLevel,
  computeWalletExposureIntelligenceProfile,
  sectorRiskLevel,
  walletExposureBandFromScore,
  walletExposureProfileFromRiskData,
  WALLET_EXPOSURE_DISCLAIMER,
} from '../../../../src/lib/walletExposureIntelligence/walletExposureIntelligenceEngine.mjs'

test('exposure score bands map to institutional labels', () => {
  assert.equal(walletExposureBandFromScore(18).label, 'LOW EXPOSURE')
  assert.equal(walletExposureBandFromScore(40).label, 'MODERATE EXPOSURE')
  assert.equal(walletExposureBandFromScore(60).label, 'HIGH EXPOSURE')
  assert.equal(walletExposureBandFromScore(82).label, 'CRITICAL EXPOSURE')
})

test('concentration and sector risk thresholds', () => {
  assert.equal(assetConcentrationLevel(42), 'HIGH')
  assert.equal(assetConcentrationLevel(55), 'CRITICAL')
  assert.equal(sectorRiskLevel(52), 'HIGH')
  assert.equal(sectorRiskLevel(45), 'MODERATE')
})

test('meme-heavy wallet profile surfaces drivers and threats', () => {
  const profile = computeWalletExposureIntelligenceProfile({
    hasWallet: true,
    exposureHints: {
      stableSharePct: 8,
      volatileSharePct: 72,
      topTokenSharePct: 42,
      dexInteractionCount: 6,
      nftHoldingsCount: 0,
      approvalCount: 4,
      unlimitedApprovalUnknownCount: 2,
    },
    exposureIntelligence: {
      provenance: 'LIVE',
      bands: [
        { id: 'dex', level: 6 },
        { id: 'protocol', level: 5 },
        { id: 'unknown', level: 4 },
        { id: 'nft', level: 1 },
        { id: 'stable', level: 2 },
      ],
    },
    approvalRows: [
      { unlimited: true, spenderCategory: 'UNKNOWN_SPENDER' },
      { unlimited: true, spenderCategory: 'UNKNOWN_SPENDER' },
    ],
  })

  assert.ok(profile.exposureScore >= 51)
  assert.equal(profile.assetConcentration, 'HIGH')
  assert.ok(profile.exposureDrivers.length >= 1)
  assert.ok(profile.threatIndicators.some((t) => /meme|approval|concentration/i.test(t.label)))
  assert.ok(!/\b(buy|sell|hold|guarantee|recommend)\b/i.test(profile.analystCommentary))
  assert.equal(profile.disclaimer, WALLET_EXPOSURE_DISCLAIMER)
})

test('walletExposureProfileFromRiskData maps API payload', () => {
  const profile = walletExposureProfileFromRiskData(
    {
      score: 40,
      assessmentPending: false,
      exposureHints: {
        stableSharePct: 35,
        volatileSharePct: 45,
        topTokenSharePct: 28,
        dexInteractionCount: 2,
        approvalCount: 1,
      },
      exposureIntelligence: {
        provenance: 'LIVE',
        bands: [
          { id: 'stable', level: 5 },
          { id: 'dex', level: 3 },
          { id: 'protocol', level: 2 },
        ],
      },
    },
    { hasWallet: true, approvalRows: [] },
  )

  assert.ok(profile.assetAllocation.length > 0)
  assert.ok(profile.sectorAllocation.length > 0)
  assert.ok(Number.isFinite(profile.contractExposureScore))
})

test('no wallet returns non-live profile', () => {
  const profile = walletExposureProfileFromRiskData(null, { hasWallet: false })
  assert.notEqual(profile.dataQuality, 'live')
  assert.ok(profile.exposureScore == null || profile.exposureBandId === 'pending' || profile.dataQuality === 'partial')
})
