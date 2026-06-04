/**
 * P4.2 — Canonical Asset Resolution Engine.
 * Single identity for symbol, name, contract, and mint inputs.
 */

import {
  lookupPrimeToken,
  lookupPrimeTokenByAddress,
  lookupPrimeTokenByName,
  toTokenResolutionPayload,
} from '../../../shared/constants/primeTokenRegistry.mjs'
import {
  lookupNativeAssetByAlias,
  lookupNativeAssetBySymbol,
  resolveNativeAssetInput,
} from '../../../shared/constants/nativeAssetRegistry.mjs'
import {
  narrativeToCanonicalCategory,
  resolveCanonicalCategoryForSymbol,
  resolveRegistryNarrativeCategory,
} from './assetCategoryRegistry.mjs'
import { mergeProviderAssets } from './providerAssetAdapters.mjs'

export const RESOLUTION_SOURCE = {
  REGISTRY: 'registry',
  SCANNER: 'scanner',
  PROVIDER: 'provider',
  MARKET: 'market',
  UNKNOWN: 'unknown',
}

export const INPUT_TYPE = {
  SYMBOL: 'symbol',
  NAME: 'name',
  CONTRACT: 'contract',
  MINT: 'mint',
  UNKNOWN: 'unknown',
}

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const SOLANA_BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

const NAME_ALIASES = {
  chainlink: 'LINK',
  uniswap: 'UNI',
  aave: 'AAVE',
  'usd coin': 'USDC',
  usdcoin: 'USDC',
  tether: 'USDT',
  dai: 'DAI',
  bittensor: 'TAO',
  dogwifhat: 'WIF',
  bonk: 'BONK',
  jupiter: 'JUP',
  pepe: 'PEPE',
  arbitrum: 'ARB',
  optimism: 'OP',
}

function normalizeInput(raw) {
  return String(raw || '').trim()
}

function normalizeSymbol(raw) {
  const sym = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (!sym || sym.length > 16 || !/^[A-Z0-9]+$/.test(sym)) return null
  return sym
}

/**
 * @param {string} input
 * @returns {{ type: string, normalized: string, symbol?: string, address?: string }}
 */
export function detectInputType(input) {
  const normalized = normalizeInput(input)
  if (!normalized) return { type: INPUT_TYPE.UNKNOWN, normalized: '' }

  if (ETH_ADDRESS_RE.test(normalized)) {
    return { type: INPUT_TYPE.CONTRACT, normalized, address: normalized }
  }

  if (SOLANA_BASE58_RE.test(normalized) && !normalized.startsWith('0x')) {
    return { type: INPUT_TYPE.MINT, normalized, address: normalized }
  }

  const symbol = normalizeSymbol(normalized)
  if (symbol && (lookupNativeAssetBySymbol(symbol) || lookupPrimeToken(symbol))) {
    return { type: INPUT_TYPE.SYMBOL, normalized, symbol }
  }

  const aliasKey = normalized.toLowerCase().replace(/\s+/g, ' ')
  if (
    lookupNativeAssetByAlias(normalized) ||
    NAME_ALIASES[aliasKey] ||
    lookupPrimeTokenByName(normalized)
  ) {
    return { type: INPUT_TYPE.NAME, normalized }
  }

  if (symbol) return { type: INPUT_TYPE.SYMBOL, normalized, symbol }

  return { type: INPUT_TYPE.NAME, normalized }
}

/**
 * @param {import('../../../shared/constants/primeTokenRegistry.mjs').PrimeTokenEntry} entry
 * @param {{ inputType: string, rawInput: string }} meta
 */
/**
 * @param {import('../../../shared/constants/nativeAssetRegistry.mjs').NativeAssetEntry} native
 * @param {{ inputType: string, rawInput: string }} meta
 */
function nativeToCanonicalCategory(native) {
  const key = String(native?.category || '').toUpperCase()
  const map = {
    LAYER_1: 'BLOCKCHAIN_INFRASTRUCTURE',
    STORE_OF_VALUE: 'BLOCKCHAIN_INFRASTRUCTURE',
    BLUE_CHIP: 'BLOCKCHAIN_INFRASTRUCTURE',
  }
  return map[key] || 'BLOCKCHAIN_INFRASTRUCTURE'
}

function buildCanonicalFromNative(native, meta) {
  return {
    assetId: native.assetId,
    symbol: native.symbol,
    name: native.name,
    chain: native.chain,
    address: null,
    category: nativeToCanonicalCategory(native),
    narrativeCategory: native.symbol === 'BTC' || native.symbol === 'WBTC' ? null : 'l2',
    source: RESOLUTION_SOURCE.REGISTRY,
    resolved: true,
    confidence: 98,
    inputType: meta.inputType,
    rawInput: meta.rawInput,
    native: true,
    registryBacked: true,
  }
}

function buildCanonicalFromRegistryEntry(entry, meta) {
  const narrative = resolveRegistryNarrativeCategory(entry.symbol, entry.address)
  const category =
    narrativeToCanonicalCategory(narrative) || resolveCanonicalCategoryForSymbol(entry.symbol, entry.address)
  const address =
    entry.chain === 'ethereum' ? entry.address.toLowerCase() : entry.address

  return {
    assetId: entry.symbol,
    symbol: entry.symbol,
    name: entry.name,
    chain: entry.chain,
    address,
    category,
    narrativeCategory: narrative,
    source: RESOLUTION_SOURCE.REGISTRY,
    resolved: true,
    confidence: 96,
    inputType: meta.inputType,
    rawInput: meta.rawInput,
  }
}

/**
 * @param {string} rawInput
 * @param {object} [opts]
 * @param {import('./providerAssetAdapters.mjs').NormalizedProviderAsset[]} [opts.providerRows]
 * @param {object} [opts.scannerMeta] optional scanner symbol/name/address
 */
export function resolveCanonicalAsset(rawInput, opts = {}) {
  const raw = normalizeInput(rawInput)
  const detected = detectInputType(raw)
  const meta = { inputType: detected.type, rawInput: raw }

  if (!raw) {
    return buildUnknownCanonical(meta)
  }

  const nativeEarly =
    (detected.type === INPUT_TYPE.SYMBOL && detected.symbol
      ? lookupNativeAssetBySymbol(detected.symbol)
      : null) || resolveNativeAssetInput(raw)
  if (nativeEarly) {
    return buildCanonicalFromNative(nativeEarly, meta)
  }

  let entry = null
  if (detected.type === INPUT_TYPE.SYMBOL && detected.symbol) {
    entry = lookupPrimeToken(detected.symbol)
    if (!entry) {
      const aliasKey = detected.normalized.toLowerCase().replace(/\s+/g, ' ')
      const aliasSym = NAME_ALIASES[aliasKey]
      entry = aliasSym ? lookupPrimeToken(aliasSym) : lookupPrimeTokenByName(detected.normalized)
    }
  } else if (detected.type === INPUT_TYPE.CONTRACT || detected.type === INPUT_TYPE.MINT) {
    entry = lookupPrimeTokenByAddress(detected.address)
  } else if (detected.type === INPUT_TYPE.NAME) {
    const aliasSym = NAME_ALIASES[detected.normalized.toLowerCase().replace(/\s+/g, ' ')]
    entry = aliasSym ? lookupPrimeToken(aliasSym) : lookupPrimeTokenByName(detected.normalized)
  }

  if (entry) {
    return buildCanonicalFromRegistryEntry(entry, meta)
  }

  const provider = mergeProviderAssets(opts.providerRows || [])
  if (provider?.symbol || provider?.address) {
    const sym = provider.symbol || normalizeSymbol(provider.name)
    const narrative = sym ? resolveRegistryNarrativeCategory(sym, provider.address) : null
    return {
      assetId: sym || provider.address || raw,
      symbol: sym,
      name: provider.name,
      chain: provider.chain,
      address: provider.address,
      category: narrativeToCanonicalCategory(narrative) || 'DEFI_ASSET',
      narrativeCategory: narrative,
      source: RESOLUTION_SOURCE.PROVIDER,
      resolved: Boolean(sym && provider.address),
      confidence: sym && provider.address ? 72 : 40,
      inputType: detected.type,
      rawInput: raw,
    }
  }

  const scanner = opts.scannerMeta
  if (scanner?.symbol && scanner?.address) {
    const sym = normalizeSymbol(scanner.symbol)
    const narrative = resolveRegistryNarrativeCategory(sym, scanner.address)
    return {
      assetId: sym || scanner.address,
      symbol: sym,
      name: scanner.name || null,
      chain: scanner.chain || detected.type === INPUT_TYPE.MINT ? 'solana' : 'ethereum',
      address: scanner.address,
      category: narrativeToCanonicalCategory(narrative) || 'DEFI_ASSET',
      narrativeCategory: narrative,
      source: RESOLUTION_SOURCE.SCANNER,
      resolved: true,
      confidence: 78,
      inputType: detected.type,
      rawInput: raw,
    }
  }

  if (detected.type === INPUT_TYPE.SYMBOL && detected.symbol) {
    return {
      assetId: detected.symbol,
      symbol: detected.symbol,
      name: null,
      chain: 'ethereum',
      address: null,
      category: 'UNKNOWN_ASSET',
      narrativeCategory: null,
      source: RESOLUTION_SOURCE.MARKET,
      resolved: false,
      confidence: 35,
      inputType: detected.type,
      rawInput: raw,
    }
  }

  return buildUnknownCanonical(meta)
}

/** Sync path — registry + name aliases only (no network). */
export function resolveCanonicalAssetSync(rawInput) {
  return resolveCanonicalAsset(rawInput)
}

function buildUnknownCanonical(meta) {
  return {
    assetId: null,
    symbol: null,
    name: null,
    chain: null,
    address: null,
    category: 'UNKNOWN_ASSET',
    narrativeCategory: null,
    source: RESOLUTION_SOURCE.UNKNOWN,
    resolved: false,
    confidence: 15,
    inputType: meta.inputType,
    rawInput: meta.rawInput,
  }
}

/**
 * @param {ReturnType<typeof resolveCanonicalAsset>} asset
 */
export function classificationFromCanonical(asset) {
  if (!asset?.resolved) {
    return {
      type: 'unknown',
      chain: asset?.chain || null,
      confidence: asset?.confidence ?? 15,
      recommendedModule: 'token',
      displayLabel: 'Digital Asset Target',
      symbol: asset?.symbol,
      name: asset?.name,
      address: asset?.address,
      canonicalAsset: asset,
      syncOnly: true,
    }
  }

  const isSolana = asset.chain === 'solana'
  return {
    type: 'token',
    chain: asset.chain,
    confidence: asset.confidence,
    recommendedModule: 'token',
    displayLabel: isSolana ? 'Solana Token' : 'Token',
    symbol: asset.symbol,
    name: asset.name,
    address: asset.address,
    canonicalAsset: asset,
    syncOnly: true,
  }
}

/**
 * @param {ReturnType<typeof resolveCanonicalAsset>} asset
 */
export function tokenResolutionFromCanonical(asset) {
  if (!asset?.resolved || !asset.address) return null
  const entry = lookupPrimeToken(asset.symbol) || {
    symbol: asset.symbol,
    name: asset.name,
    chain: asset.chain,
    address: asset.address,
  }
  return toTokenResolutionPayload(entry, asset.source)
}

/**
 * Prefer canonical identity on scan reports.
 * @param {object} report
 * @param {ReturnType<typeof resolveCanonicalAsset>} [asset]
 */
export function enrichReportWithCanonical(report, asset) {
  if (!report || !asset) return report
  const symbol = asset.symbol || report.targetClassification?.symbol || null
  const displayTarget =
    asset.name && asset.symbol
      ? asset.name.toUpperCase() === String(asset.symbol).toUpperCase()
        ? String(asset.symbol).toUpperCase()
        : `${asset.name} (${String(asset.symbol).toUpperCase()})`
      : asset.symbol || report?.displayTarget || report?.query
  return {
    ...report,
    canonicalAsset: asset,
    displayTarget,
    targetClassification: {
      ...(report.targetClassification || {}),
      symbol,
      name: asset.name || report.targetClassification?.name,
      address: asset.address || report.targetClassification?.address,
      canonicalAsset: asset,
    },
    narrativeCategory:
      asset.narrativeCategory ||
      report.narrativeCategory ||
      resolveRegistryNarrativeCategory(symbol, asset.address),
  }
}
