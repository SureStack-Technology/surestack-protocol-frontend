import { fetchOnChainContractSignals } from '../contractIntelligence/contractIntelProviders.js'
import { tryFetchSolanaAccountParsed } from '../solanaRiskScanner/solanaRpc.js'
import {
  BPF_LOADER,
  BPF_UPGRADEABLE_LOADER,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  normalizeSolanaAddress,
} from '../solanaRiskScanner/solanaTypes.js'
import { resolveSolanaArchetype } from '../solanaRiskScanner/solanaArchetypes.js'
import {
  buildSymbolRegistryMap,
  lookupPrimeToken,
  lookupPrimeTokenByAddress,
} from '../../shared/constants/primeTokenRegistry.js'
import {
  classificationFromCanonical,
  resolveCanonicalAssetSync,
} from '../../../../src/lib/intelligence/canonicalAssetResolver.mjs'

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const SOLANA_BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/** @type {Record<string, { symbol: string, name: string }>} */
export const SOLANA_MINT_REGISTRY = {
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: { symbol: 'BONK', name: 'Bonk' },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6Y7YaB1pPB263: { symbol: 'BONK', name: 'Bonk' },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6Y7YaB1pPB2637: { symbol: 'BONK', name: 'Bonk' },
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: { symbol: 'WIF', name: 'dogwifhat' },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: 'JUP', name: 'Jupiter' },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: 'USDC', name: 'USD Coin' },
  So11111111111111111111111111111111111111112: { symbol: 'SOL', name: 'Wrapped SOL' },
}

/** @type {Record<string, { symbol: string, name: string, chain: string, address: string }>} */
export const SYMBOL_REGISTRY = buildSymbolRegistryMap()

const PROTOCOL_HOSTS = [
  { hosts: ['app.uniswap.org', 'uniswap.org'], name: 'Uniswap' },
  { hosts: ['app.aave.com', 'aave.com'], name: 'Aave' },
  { hosts: ['curve.fi', 'www.curve.fi'], name: 'Curve' },
  { hosts: ['app.1inch.io', '1inch.io'], name: '1inch' },
  { hosts: ['jup.ag', 'www.jup.ag'], name: 'Jupiter' },
  { hosts: ['raydium.io', 'www.raydium.io'], name: 'Raydium' },
  { hosts: ['hyperliquid.xyz', 'app.hyperliquid.xyz'], name: 'Hyperliquid' },
  { hosts: ['bitfinex.com', 'www.bitfinex.com'], name: 'Bitfinex' },
  { hosts: ['app.sushi.com', 'sushi.com'], name: 'Sushi' },
]

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

const MODULE_BY_TYPE = {
  protocol: 'protocol',
  wallet: 'wallet',
  contract: 'contract',
  token: 'token',
  approval: 'approval',
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

function matchProtocolHost(host) {
  if (!host) return null
  for (const entry of PROTOCOL_HOSTS) {
    if (entry.hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      return entry.name
    }
  }
  return null
}

/**
 * Synchronous parse — no RPC.
 * @param {string} raw
 */
export function parseTargetInput(raw) {
  const input = String(raw || '').trim()
  if (!input) {
    return { kind: 'empty', input }
  }

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
    const protocolName = matchProtocolHost(host) || (host ? 'Protocol' : null)
    return {
      kind: 'protocol',
      input,
      host,
      protocolName,
      url: looksLikeUrl ? input : host ? `https://${host}` : input,
    }
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

function buildResult({
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
 * @param {string | ReturnType<typeof parseTargetInput>} rawOrParsed
 * @param {string | null} [connectedWalletAddress]
 */
export function classifyTargetSync(rawOrParsed, connectedWalletAddress = null) {
  const parsed =
    typeof rawOrParsed === 'string' ? parseTargetInput(rawOrParsed) : rawOrParsed

  if (parsed.kind === 'empty') {
    return buildResult({
      type: 'unknown',
      confidence: 0,
      recommendedModule: 'default',
      displayLabel: 'Enter a target',
      syncOnly: true,
    })
  }

  if (parsed.kind === 'approval') {
    return buildResult({
      type: 'approval',
      chain: 'ethereum',
      confidence: 88,
      recommendedModule: 'approval',
      displayLabel: 'Approval / Spender',
      syncOnly: true,
    })
  }

  if (parsed.kind === 'protocol') {
    return buildResult({
      type: 'protocol',
      chain: null,
      confidence: parsed.protocolName && parsed.protocolName !== 'Protocol' ? 100 : 72,
      recommendedModule: 'protocol',
      displayLabel: 'Protocol',
      protocolName: parsed.protocolName || 'Protocol',
      url: parsed.url,
      syncOnly: true,
    })
  }

  if (parsed.kind === 'evm_address') {
    const canonical = resolveCanonicalAssetSync(parsed.address)
    if (canonical.resolved && canonical.source === 'registry') {
      return { ...classificationFromCanonical(canonical), syncOnly: true }
    }
    return buildResult({
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

  if (parsed.kind === 'name') {
    const canonical = resolveCanonicalAssetSync(parsed.name || parsed.input)
    if (canonical.resolved) {
      return { ...classificationFromCanonical(canonical), syncOnly: true }
    }
  }

  if (parsed.kind === 'solana_address') {
    const canonical = resolveCanonicalAssetSync(parsed.address)
    if (canonical.resolved && canonical.source === 'registry') {
      return { ...classificationFromCanonical(canonical), syncOnly: true }
    }
    const known = SOLANA_MINT_REGISTRY[parsed.address]
    if (known) {
      return buildResult({
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
    return buildResult({
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
      const isSolana = reg.chain === 'solana'
      return buildResult({
        type: 'token',
        chain: reg.chain,
        confidence: 96,
        recommendedModule: 'token',
        displayLabel: isSolana ? 'Solana Token' : 'Token',
        symbol: reg.symbol,
        name: reg.name,
        address: reg.address,
        syncOnly: true,
      })
    }
    return buildResult({
      type: 'token',
      chain: 'ethereum',
      confidence: 70,
      recommendedModule: 'token',
      displayLabel: 'Token Symbol',
      symbol: parsed.symbol,
      syncOnly: true,
    })
  }

  return buildResult({
    type: 'unknown',
    confidence: 40,
    recommendedModule: 'token',
    displayLabel: 'Digital Asset Target',
    syncOnly: true,
  })
}

/**
 * @param {string} address
 */
async function classifyEthereumAddress(address) {
  const addr = String(address).toLowerCase()
  const registryHit = lookupPrimeTokenByAddress(addr)
  if (registryHit) {
    const canonical = resolveCanonicalAssetSync(addr)
    return { ...classificationFromCanonical(canonical), syncOnly: false }
  }

  const signals = await fetchOnChainContractSignals(addr, 1)

  if (signals.mode === 'reference') {
    return buildResult({
      type: 'contract',
      chain: 'ethereum',
      confidence: 50,
      recommendedModule: 'contract',
      displayLabel: 'Ethereum Address',
      address: addr,
      addressSubtype: 'rpc_unavailable',
    })
  }

  if (!signals.isContract) {
    return buildResult({
      type: 'wallet',
      chain: 'ethereum',
      confidence: 99,
      recommendedModule: 'wallet',
      displayLabel: 'Ethereum Wallet',
      address: addr,
      addressSubtype: 'eoa',
    })
  }

  if (signals.isContract) {
    return buildResult({
      type: 'contract',
      chain: 'ethereum',
      confidence: 98,
      recommendedModule: 'contract',
      displayLabel: 'Ethereum Contract',
      address: addr,
      addressSubtype: 'smart_contract',
    })
  }

  return buildResult({
    type: 'contract',
    chain: 'ethereum',
    confidence: 55,
    recommendedModule: 'contract',
    displayLabel: 'Ethereum Address',
    address: addr,
    addressSubtype: 'unverified',
  })
}

/**
 * @param {string} address
 */
async function classifySolanaAddress(address) {
  const normalized = normalizeSolanaAddress(address)
  const registryCanonical = resolveCanonicalAssetSync(address)
  if (registryCanonical.resolved && registryCanonical.source === 'registry') {
    return { ...classificationFromCanonical(registryCanonical), syncOnly: false }
  }

  if (!normalized) {
    return buildResult({
      type: 'unknown',
      chain: 'solana',
      confidence: 0,
      recommendedModule: 'token',
      displayLabel: 'Invalid Solana Address',
    })
  }

  const known = SOLANA_MINT_REGISTRY[normalized]
  const archetype = resolveSolanaArchetype(normalized)

  const rpcResult = await tryFetchSolanaAccountParsed(normalized)
  const account = rpcResult.ok ? rpcResult.data : null

  if (!account) {
    if (known) {
      return buildResult({
        type: 'token',
        chain: 'solana',
        confidence: 92,
        recommendedModule: 'token',
        displayLabel: 'Solana Token',
        symbol: known.symbol,
        name: known.name,
        address: normalized,
        addressSubtype: 'spl_mint',
      })
    }
    return buildResult({
      type: 'token',
      chain: 'solana',
      confidence: 20,
      recommendedModule: 'token',
      displayLabel: 'Solana Mint (metadata pending)',
      address: normalized,
      addressSubtype: 'mint_market_only',
    })
  }

  const owner = account.owner
  const parsedType = account.data?.parsed?.type

  if (
    (owner === TOKEN_PROGRAM_ID || owner === TOKEN_2022_PROGRAM_ID) &&
    parsedType === 'mint'
  ) {
    const sym = known?.symbol || archetype?.label?.match(/\(([^)]+)\)/)?.[1] || null
    const name = known?.name || (archetype?.label && !archetype.label.includes('(') ? archetype.label : null)
    const hasMetadata = Boolean(sym && name)
    return buildResult({
      type: 'token',
      chain: 'solana',
      confidence: hasMetadata ? 97 : 20,
      recommendedModule: 'token',
      displayLabel: hasMetadata ? 'Solana Token' : 'Solana Mint (metadata pending)',
      symbol: sym,
      name,
      address: normalized,
      addressSubtype: hasMetadata ? 'spl_mint' : 'mint_detected',
    })
  }

  if (account.executable) {
    return buildResult({
      type: 'contract',
      chain: 'solana',
      confidence: 94,
      recommendedModule: 'contract',
      displayLabel: 'Solana Program',
      address: normalized,
      addressSubtype: 'program',
    })
  }

  return buildResult({
    type: 'wallet',
    chain: 'solana',
    confidence: 93,
    recommendedModule: 'wallet',
    displayLabel: 'Solana Wallet',
    address: normalized,
    addressSubtype: 'system_account',
  })
}

/**
 * Full classification with on-chain probes where applicable.
 * @param {string} raw
 */
export async function classifyIntelligenceTarget(raw, connectedWalletAddress = null) {
  const parsed = parseTargetInput(raw)
  const sync = classifyTargetSync(parsed, connectedWalletAddress)

  if (parsed.kind === 'empty' || parsed.kind === 'approval' || parsed.kind === 'protocol') {
    return { ...sync, syncOnly: false }
  }

  if (parsed.kind === 'symbol') {
    const canonical = resolveCanonicalAssetSync(parsed.symbol)
    if (canonical.resolved && canonical.source === 'registry') {
      return { ...classificationFromCanonical(canonical), syncOnly: false }
    }
    const reg = SYMBOL_REGISTRY[parsed.symbol]
    if (reg) {
      return buildResult({
        type: 'token',
        chain: reg.chain,
        confidence: 96,
        recommendedModule: 'token',
        displayLabel: reg.chain === 'solana' ? 'Solana Token' : 'Token',
        symbol: reg.symbol,
        name: reg.name,
        address: reg.address,
        syncOnly: false,
      })
    }
    return { ...sync, syncOnly: false }
  }

  if (parsed.kind === 'evm_address') {
    try {
      return await classifyEthereumAddress(parsed.address)
    } catch {
      return { ...sync, confidence: 50, syncOnly: false }
    }
  }

  if (parsed.kind === 'name') {
    const canonical = resolveCanonicalAssetSync(parsed.name || parsed.input)
    if (canonical.resolved) {
      return { ...classificationFromCanonical(canonical), syncOnly: false }
    }
    return { ...sync, syncOnly: false }
  }

  if (parsed.kind === 'solana_address') {
    try {
      return await classifySolanaAddress(parsed.address)
    } catch {
      return { ...sync, syncOnly: false }
    }
  }

  return { ...sync, syncOnly: false }
}

export { MODULE_BY_TYPE, ETH_ADDRESS_RE, SOLANA_BASE58_RE }
