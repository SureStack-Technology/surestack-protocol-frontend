/**
 * Known stablecoin registry — symbols and canonical contract/mint addresses.
 * Used for classification, narrative templates, and executive intelligence.
 */

/** @typedef {{ symbol: string, name: string, chain: 'ethereum'|'solana'|'base'|'arbitrum'|'polygon', address: string, issuer?: string }} StablecoinEntry */

/** @type {StablecoinEntry[]} */
export const STABLECOIN_REGISTRY = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    chain: 'ethereum',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    issuer: 'Circle',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    chain: 'ethereum',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    issuer: 'Tether',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chain: 'ethereum',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    issuer: 'MakerDAO',
  },
  {
    symbol: 'USDS',
    name: 'USDS',
    chain: 'ethereum',
    address: '0x3934609586a04929e9988095f9320a1c9b1e4a8d',
    issuer: 'Sky',
  },
  {
    symbol: 'PYUSD',
    name: 'PayPal USD',
    chain: 'ethereum',
    address: '0x6c3ea903ffbd99001c7da61a40000f199dd8276',
    issuer: 'PayPal',
  },
  {
    symbol: 'FRAX',
    name: 'Frax',
    chain: 'ethereum',
    address: '0x853d955acef822db058eb8505911ed77f175b99e',
    issuer: 'Frax Finance',
  },
  {
    symbol: 'LUSD',
    name: 'Liquity USD',
    chain: 'ethereum',
    address: '0x5f98805a4e8be255a32880fdec7f6728c6568ba0',
    issuer: 'Liquity',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin (Solana)',
    chain: 'solana',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    issuer: 'Circle',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD (Solana)',
    chain: 'solana',
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    issuer: 'Tether',
  },
]

export const STABLECOIN_SYMBOLS = new Set(
  STABLECOIN_REGISTRY.map((e) => e.symbol.toUpperCase()),
)

/** @type {Map<string, StablecoinEntry>} lowercase EVM address → entry */
const EVM_ADDRESS_MAP = new Map()
/** @type {Map<string, StablecoinEntry>} Solana mint → entry */
const SOLANA_MINT_MAP = new Map()

for (const entry of STABLECOIN_REGISTRY) {
  if (entry.chain === 'solana') {
    SOLANA_MINT_MAP.set(entry.address, entry)
  } else {
    EVM_ADDRESS_MAP.set(entry.address.toLowerCase(), entry)
  }
}

function normalizeSymbol(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
}

function extractEvmAddress(value) {
  const s = String(value || '').trim()
  const match = s.match(/0x[a-fA-F0-9]{40}/)
  return match ? match[0].toLowerCase() : null
}

function extractSolanaMint(value) {
  const s = String(value || '').trim()
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return s
  return null
}

/**
 * @param {string} symbol
 */
export function isStablecoinSymbol(symbol) {
  return STABLECOIN_SYMBOLS.has(normalizeSymbol(symbol))
}

/**
 * @param {string} address
 * @param {'ethereum'|'solana'|string} [chain]
 */
export function lookupStablecoinByAddress(address, chain = null) {
  const ch = String(chain || '').toLowerCase()
  const evm = extractEvmAddress(address)
  if (evm && (!ch || ch === 'ethereum' || ch === 'eth' || ch === 'mainnet' || ch === 'evm')) {
    return EVM_ADDRESS_MAP.get(evm) || null
  }
  const mint = extractSolanaMint(address) || (ch === 'solana' ? address : null)
  if (mint) {
    return SOLANA_MINT_MAP.get(mint) || null
  }
  return null
}

/**
 * Resolve stablecoin from scan context.
 * @param {object} [ctx]
 * @returns {StablecoinEntry | null}
 */
export function resolveStablecoinMatch({
  symbol,
  query,
  address,
  scannerReport,
  tokenName,
} = {}) {
  const sr = scannerReport || null
  const candidates = [
    address,
    sr?.address,
    sr?.mint,
    query,
    extractEvmAddress(query),
    extractSolanaMint(query),
  ].filter(Boolean)

  for (const addr of candidates) {
    const byAddr = lookupStablecoinByAddress(addr, sr?.chain || null)
    if (byAddr) return byAddr
  }

  const sym = normalizeSymbol(symbol || sr?.symbol || sr?.requestedSymbol)
  if (sym && isStablecoinSymbol(sym)) {
    return STABLECOIN_REGISTRY.find((e) => e.symbol === sym) || null
  }

  const archetypeId = String(sr?.archetypeId || sr?.archetype?.id || '').toLowerCase()
  if (/usdc|usdt|dai|pyusd|usds|stablecoin|regulated_stablecoin/.test(archetypeId)) {
    const fromArchetype = STABLECOIN_REGISTRY.find((e) =>
      archetypeId.includes(e.symbol.toLowerCase()),
    )
    if (fromArchetype) return fromArchetype
  }

  const name = String(tokenName || sr?.archetypeLabel || '').toLowerCase()
  if (/usd coin|tether|dai stable|paypal usd|usds/.test(name)) {
    return STABLECOIN_REGISTRY.find((e) => name.includes(e.symbol.toLowerCase())) || null
  }

  return null
}

/** Executive / narrative risk themes for stablecoins. */
export const STABLECOIN_RISK_THEMES = [
  'Issuer and reserve transparency',
  'Redemption and liquidity dependency on issuer',
  'Depeg sensitivity during market stress',
  'Administrative upgrade and blacklist surfaces',
]
