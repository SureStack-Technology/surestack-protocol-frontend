/**
 * Prime Intelligence target classifier — sync heuristics + optional API bytecode / Solana probes.
 */

import { resolveProtocolUrl } from '@/shared/services/protocolUrlResolver.js'

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const SOLANA_BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/** @type {Record<string, { symbol: string, name: string }>} */
export const SOLANA_MINT_REGISTRY = {
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: { symbol: 'BONK', name: 'Bonk' },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6Y7YaB1pPB263: { symbol: 'BONK', name: 'Bonk' },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6Y7YaB1pPB2637: { symbol: 'BONK', name: 'Bonk' },
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: { symbol: 'WIF', name: 'dogwifhat' },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: 'JUP', name: 'Jupiter' },
}

import { buildSymbolRegistryMap, lookupPrimeToken } from '../../shared/constants/primeTokenRegistry.mjs'
import {
  classificationFromCanonical,
  resolveCanonicalAssetSync,
} from '@/lib/intelligence/canonicalAssetResolver.mjs'

/** @type {Record<string, { symbol: string, name: string, chain: string, address: string }>} */
export const SYMBOL_REGISTRY = buildSymbolRegistryMap()

const PROTOCOL_NAME_ALIASES = {
  uniswap: 'Uniswap',
  aave: 'Aave',
  curve: 'Curve',
  jupiter: 'Jupiter',
  raydium: 'Raydium',
  hyperliquid: 'Hyperliquid',
  '1inch': '1inch',
  sushi: 'Sushi',
}

function normalizeSymbol(raw) {
  const sym = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (!sym || sym.length > 16 || !/^[A-Z0-9]+$/.test(sym)) return null
  return sym
}

function normalizeHost(input) {
  const raw = String(input || '').trim()
  if (!raw) return null
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const u = new URL(withProto)
    return u.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    const stripped = raw.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    return stripped || null
  }
}

/**
 * @param {string} raw
 */
export function parseTargetInput(raw) {
  const input = String(raw || '').trim()
  if (!input) return { kind: 'empty', input }

  const lower = input.toLowerCase()

  if (lower.includes('permit') || lower.includes('spender') || lower.includes('approval')) {
    return { kind: 'approval', input }
  }

  const host = normalizeHost(input)
  const looksLikeUrl =
    /^https?:\/\//i.test(input) ||
    /^www\./i.test(input) ||
    /^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(\/|$|\?)/i.test(lower)

  if (looksLikeUrl || (host && host.includes('.'))) {
    return { kind: 'protocol', input, host, url: looksLikeUrl ? input : host ? `https://${host}` : input }
  }

  const protocolAlias = PROTOCOL_NAME_ALIASES[lower.replace(/\s+/g, '')]
  if (protocolAlias) {
    return { kind: 'protocol', input, protocolName: protocolAlias, url: input }
  }

  if (ETH_ADDRESS_RE.test(input)) {
    return { kind: 'evm_address', input, address: input }
  }

  if (SOLANA_BASE58_RE.test(input) && !input.startsWith('0x')) {
    return { kind: 'solana_address', input, address: input }
  }

  const symbol = normalizeSymbol(input)
  if (symbol) {
    if (lookupPrimeToken(symbol)) {
      return { kind: 'symbol', input, symbol }
    }
    if (/[a-z]|\s/.test(input)) {
      return { kind: 'name', input, name: input }
    }
    return { kind: 'symbol', input, symbol }
  }

  return { kind: 'name', input, name: input }
}

function buildClassification({
  type,
  chain = null,
  confidence,
  recommendedModule,
  displayLabel,
  symbol = null,
  name = null,
  address = null,
  protocolName = null,
  url = null,
  addressSubtype = null,
  syncOnly = false,
}) {
  return {
    type,
    chain,
    confidence: Math.round(Math.max(0, Math.min(100, Number(confidence) || 0))),
    recommendedModule,
    displayLabel,
    symbol,
    name,
    address,
    protocolName,
    url,
    addressSubtype,
    syncOnly,
  }
}

/**
 * Instant classification (no network).
 * @param {string} raw
 */
export function classifyTargetSync(raw, connectedWalletAddress = null) {
  const parsed = parseTargetInput(raw)

  if (parsed.kind === 'empty') {
    return buildClassification({
      type: 'unknown',
      confidence: 0,
      recommendedModule: 'default',
      displayLabel: 'Enter a target',
      syncOnly: true,
    })
  }

  if (parsed.kind === 'approval') {
    return buildClassification({
      type: 'approval',
      chain: 'ethereum',
      confidence: 88,
      recommendedModule: 'approval',
      displayLabel: 'Approval / Spender',
      syncOnly: true,
    })
  }

  if (parsed.kind === 'protocol') {
    const profile = resolveProtocolUrl(parsed.url || parsed.input)
    return buildClassification({
      type: 'protocol',
      chain: null,
      confidence: profile.matched ? 100 : 72,
      recommendedModule: 'protocol',
      displayLabel: 'Protocol',
      protocolName: profile.name || parsed.protocolName || 'Protocol',
      url: profile.inputUrl || parsed.url,
      syncOnly: true,
    })
  }

  if (parsed.kind === 'name') {
    const canonical = resolveCanonicalAssetSync(parsed.name || parsed.input)
    if (canonical.resolved) {
      return { ...classificationFromCanonical(canonical), syncOnly: true }
    }
  }

  if (parsed.kind === 'evm_address') {
    const inputNorm = String(parsed.address || '').toLowerCase()
    const walletNorm = String(connectedWalletAddress || '').trim().toLowerCase()
    if (walletNorm && inputNorm === walletNorm) {
      return buildClassification({
        type: 'wallet',
        chain: 'ethereum',
        confidence: 100,
        recommendedModule: 'wallet',
        displayLabel: 'Ethereum Wallet',
        address: parsed.address,
        addressSubtype: 'eoa',
        syncOnly: true,
      })
    }
    const canonical = resolveCanonicalAssetSync(parsed.address)
    if (canonical.resolved && canonical.source === 'registry') {
      return { ...classificationFromCanonical(canonical), syncOnly: true }
    }
    return buildClassification({
      type: 'contract',
      chain: 'ethereum',
      confidence: 55,
      recommendedModule: 'contract',
      displayLabel: 'Ethereum Address',
      address: parsed.address,
      addressSubtype: 'pending_bytecode',
      syncOnly: true,
    })
  }

  if (parsed.kind === 'solana_address') {
    const canonical = resolveCanonicalAssetSync(parsed.address)
    if (canonical.resolved && canonical.source === 'registry') {
      return { ...classificationFromCanonical(canonical), syncOnly: true }
    }
    const known = SOLANA_MINT_REGISTRY[parsed.address]
    if (known) {
      return buildClassification({
        type: 'token',
        chain: 'solana',
        confidence: 97,
        recommendedModule: 'token',
        displayLabel: 'Solana Token',
        symbol: known.symbol,
        name: known.name,
        address: parsed.address,
        addressSubtype: 'spl_mint',
        syncOnly: true,
      })
    }
    return buildClassification({
      type: 'solana_address',
      chain: 'solana',
      confidence: 60,
      recommendedModule: 'token',
      displayLabel: 'Solana Address',
      address: parsed.address,
      addressSubtype: 'pending_account',
      syncOnly: true,
    })
  }

  if (parsed.kind === 'symbol') {
    const canonical = resolveCanonicalAssetSync(parsed.symbol)
    if (canonical.resolved && canonical.source === 'registry') {
      return { ...classificationFromCanonical(canonical), syncOnly: true }
    }
    const reg = SYMBOL_REGISTRY[parsed.symbol]
    if (reg) {
      return buildClassification({
        type: 'token',
        chain: reg.chain,
        confidence: 96,
        recommendedModule: 'token',
        displayLabel: reg.chain === 'solana' ? 'Solana Token' : 'Token',
        symbol: reg.symbol,
        name: reg.name,
        address: reg.address,
        syncOnly: true,
      })
    }
    return buildClassification({
      type: 'token',
      chain: 'ethereum',
      confidence: 70,
      recommendedModule: 'token',
      displayLabel: 'Token Symbol',
      symbol: parsed.symbol,
      syncOnly: true,
    })
  }

  return buildClassification({
    type: 'unknown',
    confidence: 40,
    recommendedModule: 'token',
    displayLabel: 'Digital Asset Target',
    syncOnly: true,
  })
}

async function readJson(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/**
 * Full classification — uses Prime API for EVM bytecode + Solana account type when available.
 * @param {string} raw
 * @param {{ api?: (path: string, opts?: object) => Promise<Response> }} [opts]
 */
export async function classifyIntelligenceTarget(raw, opts = {}) {
  const { api, connectedWalletAddress = null } = opts
  const sync = classifyTargetSync(raw, connectedWalletAddress)
  if (!api || sync.recommendedModule === 'default' || sync.recommendedModule === 'approval') {
    return { ...sync, syncOnly: false }
  }

  if (sync.canonicalAsset?.resolved && sync.canonicalAsset.source === 'registry') {
    return { ...sync, syncOnly: false }
  }

  if (sync.syncOnly === false) {
    return sync
  }

  const parsed = parseTargetInput(raw)
  if (
    parsed.kind !== 'evm_address' &&
    parsed.kind !== 'solana_address' &&
    parsed.kind !== 'symbol' &&
    parsed.kind !== 'name'
  ) {
    return { ...sync, syncOnly: false }
  }

  try {
    const r = await api('/api/prime/intelligence/classify', {
      method: 'POST',
      body: { input: raw },
    })
    const j = await readJson(r)
    if (r.ok && j?.classification) {
      return { ...j.classification, syncOnly: false }
    }
  } catch {
    /* fall through to sync */
  }

  return { ...sync, syncOnly: false }
}

/**
 * Map classifier output to terminal analysis mode id.
 * @param {{ recommendedModule?: string } | null | undefined} classification
 */
export function recommendedModuleToModeId(classification) {
  const mod = String(classification?.recommendedModule || '').toLowerCase()
  if (mod === 'wallet') return 'wallet'
  if (mod === 'contract') return 'contract'
  if (mod === 'protocol') return 'protocol'
  if (mod === 'approval') return 'approval'
  if (mod === 'token') return 'token'
  return null
}

export { ETH_ADDRESS_RE, SOLANA_BASE58_RE }
