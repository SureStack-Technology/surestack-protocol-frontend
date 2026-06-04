/**
 * P4.2.1 — Canonical display labels for Prime intelligence UI.
 */

import {
  lookupPrimeToken,
  lookupPrimeTokenByAddress,
  lookupPrimeTokenByName,
} from '../../../shared/constants/primeTokenRegistry.mjs'
import { resolveNativeAssetInput } from '../../../shared/constants/nativeAssetRegistry.mjs'

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/i
const SOLANA_MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/** @param {string | null | undefined} value */
export function isEvmContractAddress(value) {
  return ETH_ADDRESS_RE.test(String(value || '').trim())
}

/** @param {string | null | undefined} value */
export function isSolanaMintAddress(value) {
  const v = String(value || '').trim()
  return Boolean(v) && SOLANA_MINT_RE.test(v) && !v.startsWith('0x')
}

/** @param {string | null | undefined} value */
export function isRawBlockchainTarget(value) {
  return isEvmContractAddress(value) || isSolanaMintAddress(value)
}

/**
 * @param {object | null | undefined} report
 */
/** @param {string | null | undefined} raw */
export function resolveRegistryCanonicalFromRaw(raw) {
  const input = String(raw || '').trim()
  if (!input) return null
  if (isEvmContractAddress(input) || isSolanaMintAddress(input)) {
    const entry = lookupPrimeTokenByAddress(input)
    if (!entry) return null
    return {
      assetId: entry.symbol,
      symbol: entry.symbol,
      name: entry.name,
      chain: entry.chain,
      address: entry.chain === 'ethereum' ? entry.address.toLowerCase() : entry.address,
      source: 'registry',
      resolved: true,
    }
  }
  const native = resolveNativeAssetInput(input)
  if (native) {
    return {
      assetId: native.assetId,
      symbol: native.symbol,
      name: native.name,
      chain: native.chain,
      address: null,
      source: 'native',
      resolved: true,
    }
  }

  const sym = input.toUpperCase().replace(/^\$/, '')
  if (/^[A-Z0-9]{2,16}$/.test(sym)) {
    const entry = lookupPrimeToken(sym)
    if (entry) {
      return {
        assetId: entry.symbol,
        symbol: entry.symbol,
        name: entry.name,
        chain: entry.chain,
        address: entry.chain === 'ethereum' ? entry.address.toLowerCase() : entry.address,
        source: 'registry',
        resolved: true,
      }
    }
  }
  const byName = lookupPrimeTokenByName(input)
  if (byName) {
    return {
      assetId: byName.symbol,
      symbol: byName.symbol,
      name: byName.name,
      chain: byName.chain,
      address: byName.chain === 'ethereum' ? byName.address.toLowerCase() : byName.address,
      source: 'registry',
      resolved: true,
    }
  }
  return null
}

/**
 * @param {object | null | undefined} report
 */
export function getReportCanonicalAsset(report) {
  if (!report) return null
  return (
    report.canonicalAsset ||
    report.targetClassification?.canonicalAsset ||
    resolveRegistryCanonicalFromRaw(report.query || report.displayTarget)
  )
}

/**
 * Marketing / narrative / executive: `Chainlink (LINK)`.
 * @param {object | null | undefined} canonicalAsset
 * @param {string} [fallback]
 */
export function getAssetDisplayName(canonicalAsset, fallback = '') {
  if (canonicalAsset?.name && canonicalAsset?.symbol) {
    const sym = String(canonicalAsset.symbol).trim().toUpperCase()
    const name = String(canonicalAsset.name).trim()
    if (name.toUpperCase() === sym) return sym
    if (new RegExp(`\\(${sym}\\)`, 'i').test(name)) return name
    return `${name} (${sym})`
  }
  if (canonicalAsset?.symbol) {
    return String(canonicalAsset.symbol).trim().toUpperCase()
  }

  const fb = String(fallback || '').trim()
  if (fb && !isRawBlockchainTarget(fb)) {
    if (/^[a-z0-9]{2,16}$/i.test(fb)) return fb.toUpperCase()
    return fb
  }
  return 'Intelligence target'
}

/**
 * Compact badges: `LINK`.
 * @param {object | null | undefined} canonicalAsset
 * @param {string} [fallback]
 */
export function getAssetShortSymbol(canonicalAsset, fallback = '') {
  if (canonicalAsset?.symbol) {
    return String(canonicalAsset.symbol).trim().toUpperCase()
  }
  const fb = String(fallback || '').trim()
  if (fb && !isRawBlockchainTarget(fb) && /^[A-Z0-9]{2,16}$/i.test(fb)) {
    return fb.toUpperCase().replace(/^\$/, '')
  }
  return ''
}

/**
 * Technical target / evidence — may show raw contract or mint.
 * @param {string | null | undefined} rawInput
 * @param {object | null | undefined} canonicalAsset
 */
export function getTechnicalTargetLabel(rawInput, canonicalAsset = null) {
  const raw = String(rawInput || '').trim()
  if (raw && isRawBlockchainTarget(raw)) return raw
  if (canonicalAsset?.address) return canonicalAsset.address
  return raw || null
}

/**
 * @param {object | null | undefined} report
 */
export function resolveReportDisplayLabels(report) {
  const canonical = getReportCanonicalAsset(report)
  const raw = String(report?.query || report?.displayTarget || '').trim()
  return {
    canonicalAsset: canonical,
    displayName: getAssetDisplayName(
      canonical,
      report?.targetClassification?.symbol ||
        report?.tokenResolution?.symbol ||
        report?.displayTarget ||
        report?.query,
    ),
    shortSymbol: getAssetShortSymbol(
      canonical,
      report?.targetClassification?.symbol || report?.tokenResolution?.symbol,
    ),
    technicalTarget: getTechnicalTargetLabel(raw, canonical),
    narrativeSymbol:
      getAssetShortSymbol(
        canonical,
        report?.targetClassification?.symbol || report?.tokenResolution?.symbol,
      ) || (isRawBlockchainTarget(raw) ? '' : raw),
  }
}

/**
 * @param {object | null | undefined} report
 */
export function resolveNarrativeTargetSymbol(report) {
  return resolveReportDisplayLabels(report).narrativeSymbol || null
}
