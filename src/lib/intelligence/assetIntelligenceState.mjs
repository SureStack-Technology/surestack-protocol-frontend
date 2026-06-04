/**
 * Asset intelligence state machine — gates classification, risk, and narrative synthesis.
 */

import { lookupPrimeToken, lookupPrimeTokenByAddress } from '../../../shared/constants/primeTokenRegistry.mjs'

export const ASSET_INTEL_STATES = {
  UNKNOWN_ASSET: 'UNKNOWN_ASSET',
  MINT_DETECTED: 'MINT_DETECTED',
  METADATA_RESOLVED: 'METADATA_RESOLVED',
  MARKET_INDEXED: 'MARKET_INDEXED',
  SCANNER_VALIDATED: 'SCANNER_VALIDATED',
  FULLY_VALIDATED: 'FULLY_VALIDATED',
}

const SOLANA_MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const EVM_ADDR_RE = /^0x[a-fA-F0-9]{40}$/

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {string | null | undefined} raw
 */
export function isLikelyTokenSymbol(raw) {
  const v = String(raw || '')
    .trim()
    .replace(/^\$/, '')
  if (!v || v.length > 16) return false
  if (EVM_ADDR_RE.test(v)) return false
  if (SOLANA_MINT_RE.test(v)) return false
  return /^[A-Za-z0-9._-]{2,12}$/.test(v)
}

/**
 * @param {object} [report]
 * @param {object} [scannerReport]
 */
export function extractVerifiedSymbol(report, scannerReport = null) {
  const sr = scannerReport || report?.scannerReport || null
  const tc = sr?.tokenConcentration || {}
  const candidates = [
    report?.tokenResolution?.symbol,
    report?.targetClassification?.symbol,
    sr?.symbol,
    tc?.symbol,
  ]
  for (const c of candidates) {
    if (isLikelyTokenSymbol(c)) {
      return String(c).trim().toUpperCase().replace(/^\$/, '')
    }
  }
  const query = String(report?.displayTarget || report?.query || '').trim()
  if (isLikelyTokenSymbol(query)) return query.toUpperCase().replace(/^\$/, '')
  return null
}

/**
 * @param {object} [report]
 * @param {object} [scannerReport]
 */
export function extractVerifiedName(report, scannerReport = null) {
  const sr = scannerReport || report?.scannerReport || null
  const tc = sr?.tokenConcentration || {}
  const candidates = [
    report?.tokenResolution?.name,
    report?.targetClassification?.name,
    sr?.tokenName,
    tc?.name,
    tc?.tokenName,
  ]
  for (const c of candidates) {
    const name = String(c || '').trim()
    if (name && name.length >= 2 && !EVM_ADDR_RE.test(name) && !SOLANA_MINT_RE.test(name)) {
      return name
    }
  }
  return null
}

/**
 * @param {object} [report]
 */
export function hasRegistryMatch(report) {
  if (!report) return false
  if (report.tokenResolution?.source === 'registry') return true

  const symbol = extractVerifiedSymbol(report)
  if (symbol && lookupPrimeToken(symbol)) {
    const addr =
      report.tokenResolution?.address ||
      report.targetClassification?.address ||
      report.solanaMintAddress
    const entry = lookupPrimeToken(symbol)
    if (!addr) return true
    if (entry.chain === 'ethereum') return entry.address.toLowerCase() === String(addr).toLowerCase()
    return entry.address === addr
  }

  const addr =
    report.tokenResolution?.address ||
    report.targetClassification?.address ||
    report.solanaMintAddress ||
    (SOLANA_MINT_RE.test(String(report?.query || '')) || EVM_ADDR_RE.test(String(report?.query || ''))
      ? report.query
      : null)
  return Boolean(addr && lookupPrimeTokenByAddress(addr))
}

/**
 * @param {object} [report]
 * @param {object} [scannerReport]
 */
export function hasVerifiedMetadata(report, scannerReport = null) {
  if (hasRegistryMatch(report)) return true
  const symbol = extractVerifiedSymbol(report, scannerReport)
  const name = extractVerifiedName(report, scannerReport)
  return Boolean(symbol && name)
}

/**
 * @param {object} [report]
 */
export function isMintOrContractDetected(report) {
  if (!report) return false
  const addr =
    report.solanaMintAddress ||
    report.tokenResolution?.address ||
    report.targetClassification?.address
  if (addr && (SOLANA_MINT_RE.test(addr) || EVM_ADDR_RE.test(addr))) return true
  const q = String(report.query || '').trim()
  return SOLANA_MINT_RE.test(q) || EVM_ADDR_RE.test(q)
}

/**
 * @param {object} [report]
 * @param {object} [scannerReport]
 */
export function hasMarketData(report, scannerReport = null) {
  const sr = scannerReport || report?.scannerReport || null
  const tc = sr?.tokenConcentration || {}
  const liq = sr?.liquidityIntelligence || report?.liquidityIntelligence
  return Boolean(
    (num(tc.liquidityUsd) != null && num(tc.liquidityUsd) > 0) ||
      (num(tc.marketCapUsd) != null && num(tc.marketCapUsd) > 0) ||
      (num(tc.volume24hUsd) != null && num(tc.volume24hUsd) > 0) ||
      (num(liq?.liquidityUsd) != null && num(liq.liquidityUsd) > 0) ||
      (num(tc.pairCount) != null && num(tc.pairCount) > 0) ||
      tc.hasLiquidity === true ||
      sr?.partialMarketScan === true,
  )
}

/**
 * @param {object} [report]
 * @param {object} [scannerReport]
 */
export function hasScannerValidation(report, scannerReport = null) {
  const sr = scannerReport || report?.scannerReport || null
  if (!sr) return Boolean(report?.scannerSignals?.hasScan)
  if (sr.partialMarketScan && !hasVerifiedMetadata(report, sr)) return false
  return Boolean(
    sr.success === true ||
      report?.scannerSignals?.hasScan ||
      sr.scannerValidation === 'Complete' ||
      ((sr.trustScore != null ||
        sr.compositeTrustScore != null ||
        sr.technicalTrustScore != null) &&
        sr.success !== false &&
        !sr.partialMarketScan),
  )
}

/**
 * @param {object} [params]
 */
export function resolveAssetIntelligenceState({
  report = null,
  scannerReport = null,
  primeTrends = null,
  watchlist = null,
} = {}) {
  if (!report) return ASSET_INTEL_STATES.UNKNOWN_ASSET

  const sr = scannerReport || report.scannerReport || null
  const mintDetected = isMintOrContractDetected(report)
  const metadata = hasVerifiedMetadata(report, sr)
  const market = hasMarketData(report, sr)
  const scanner = hasScannerValidation(report, sr)
  const lunarLive = Boolean(
    primeTrends?.status === 'live' ||
      primeTrends?.providerStatus === 'live' ||
      primeTrends?.live === true ||
      report.lunarLive === true,
  )
  const behaviorLive = Boolean(watchlist?.status === 'live' || report.birdeyeLive === true)

  if (!mintDetected && !metadata) return ASSET_INTEL_STATES.UNKNOWN_ASSET
  if (mintDetected && !metadata) return ASSET_INTEL_STATES.MINT_DETECTED
  if (scanner && lunarLive && behaviorLive) return ASSET_INTEL_STATES.FULLY_VALIDATED
  if (scanner) return ASSET_INTEL_STATES.SCANNER_VALIDATED
  if (market) return ASSET_INTEL_STATES.MARKET_INDEXED
  return ASSET_INTEL_STATES.METADATA_RESOLVED
}

/**
 * @param {string} state
 */
export function allowsAssetClassification(state) {
  return (
    state !== ASSET_INTEL_STATES.UNKNOWN_ASSET && state !== ASSET_INTEL_STATES.MINT_DETECTED
  )
}

/**
 * @param {string} state
 */
export function allowsExecutiveRisk(state) {
  return allowsAssetClassification(state)
}

/**
 * @param {string} state
 */
export function allowsNarrativeAssessment(state) {
  return allowsAssetClassification(state)
}

/**
 * @param {string} state
 */
export function confidenceCapForState(state) {
  switch (state) {
    case ASSET_INTEL_STATES.UNKNOWN_ASSET:
      return 10
    case ASSET_INTEL_STATES.MINT_DETECTED:
      return 20
    case ASSET_INTEL_STATES.METADATA_RESOLVED:
      return 55
    case ASSET_INTEL_STATES.MARKET_INDEXED:
      return 68
    case ASSET_INTEL_STATES.SCANNER_VALIDATED:
      return 85
    case ASSET_INTEL_STATES.FULLY_VALIDATED:
      return 92
    default:
      return 10
  }
}

/**
 * @param {string} state
 */
export function assetIntelligenceUiCopy(state) {
  switch (state) {
    case ASSET_INTEL_STATES.UNKNOWN_ASSET:
      return {
        title: 'Asset detected',
        subtitle: 'Metadata unavailable. Scanner validation required.',
        body: 'No verified intelligence profile available. Run Intelligence Scan after metadata is indexed.',
      }
    case ASSET_INTEL_STATES.MINT_DETECTED:
      return {
        title: 'Mint detected',
        subtitle: 'Metadata and market intelligence pending scanner validation.',
        body: 'No verified intelligence profile available. Scanner validation is required before classification or risk synthesis.',
      }
    case ASSET_INTEL_STATES.METADATA_RESOLVED:
      return {
        title: 'Token identified',
        subtitle: 'Metadata resolved — preliminary intelligence available.',
        body: 'Preliminary profile generated from resolved metadata. Run Intelligence Scan for scanner-backed validation.',
      }
    case ASSET_INTEL_STATES.MARKET_INDEXED:
      return {
        title: 'Token identified',
        subtitle: 'Market data indexed — scanner validation recommended.',
        body: 'Liquidity and market context available. Run Intelligence Scan for contract and security validation.',
      }
    case ASSET_INTEL_STATES.SCANNER_VALIDATED:
      return {
        title: 'Token identified',
        subtitle: 'Scanner validated — evidence-backed intelligence available.',
        body: 'Scanner-backed contract, liquidity, and trust analysis available.',
      }
    case ASSET_INTEL_STATES.FULLY_VALIDATED:
      return {
        title: 'Token identified',
        subtitle: 'Fully validated — scanner, narrative, and behavior feeds active.',
        body: 'Institutional intelligence profile backed by scanner evidence and live provider feeds.',
      }
    default:
      return assetIntelligenceUiCopy(ASSET_INTEL_STATES.UNKNOWN_ASSET)
  }
}

/**
 * @param {object} [executive]
 */
export function isUnverifiedExecutiveIntel(executive) {
  return Boolean(
    executive?.unverified ||
      executive?.classification === 'UNKNOWN ASSET' ||
      executive?.assetIntelligenceState === ASSET_INTEL_STATES.UNKNOWN_ASSET ||
      executive?.assetIntelligenceState === ASSET_INTEL_STATES.MINT_DETECTED,
  )
}
