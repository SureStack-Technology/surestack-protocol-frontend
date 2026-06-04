import { resolveStablecoinMatch } from '../../shared/constants/stablecoinRegistry.mjs'

const GOVERNANCE_SYMBOLS = new Set(['UNI', 'MKR', 'COMP', 'AAVE'])
const MEME_SYMBOLS = new Set([
  'PEPE',
  'SHIB',
  'BONK',
  'WIF',
  'DOGE',
  'FLOKI',
  'BRETT',
  'POPCAT',
  'MEW',
  'BOME',
  'MYRO',
  'WEN',
  'SAMO',
])
const ORACLE_SYMBOLS = new Set(['LINK'])
const DEFI_BLUE_CHIP_SYMBOLS = new Set(['UNI', 'AAVE', 'CRV', 'MKR', 'COMP', 'SUSHI', 'SNX'])
const AI_SYMBOLS = new Set(['FET', 'RNDR', 'RENDER', 'TAO', 'WLD', 'OCEAN', 'AGIX', 'ARKM'])
const L2_ECOSYSTEM_SYMBOLS = new Set(['ARB', 'OP', 'MATIC', 'POL', 'IMX', 'STRK'])

/** @typedef {'ORACLE_INFRASTRUCTURE'|'STABLECOIN'|'MEME_SPECULATIVE'|'AI_ASSET'|'DEFI_ASSET'|'GOVERNANCE_ASSET'|'BLOCKCHAIN_INFRASTRUCTURE'|'UNKNOWN_ASSET'} CanonicalCategoryId */

/**
 * Narrative bucket used by executive + liquidity engines.
 * @param {string | null | undefined} symbol
 * @param {string | null | undefined} [address]
 * @returns {'stablecoin'|'meme'|'oracle'|'ai'|'defi'|'l2'|'governance'|null}
 */
export function resolveRegistryNarrativeCategory(symbol, address = null) {
  const sym = String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (!sym && !address) return null
  const stable = resolveStablecoinMatch({ symbol: sym, address })
  if (stable) return 'stablecoin'
  if (MEME_SYMBOLS.has(sym)) return 'meme'
  if (ORACLE_SYMBOLS.has(sym)) return 'oracle'
  if (AI_SYMBOLS.has(sym)) return 'ai'
  if (GOVERNANCE_SYMBOLS.has(sym)) return 'governance'
  if (DEFI_BLUE_CHIP_SYMBOLS.has(sym)) return 'defi'
  if (L2_ECOSYSTEM_SYMBOLS.has(sym)) return 'l2'
  return null
}

/**
 * @param {'stablecoin'|'meme'|'oracle'|'ai'|'defi'|'l2'|'governance'|null} narrative
 * @returns {CanonicalCategoryId | null}
 */
export function narrativeToCanonicalCategory(narrative) {
  if (!narrative) return null
  const map = {
    stablecoin: 'STABLECOIN',
    meme: 'MEME_SPECULATIVE',
    oracle: 'ORACLE_INFRASTRUCTURE',
    ai: 'AI_ASSET',
    defi: 'DEFI_ASSET',
    governance: 'GOVERNANCE_ASSET',
    l2: 'BLOCKCHAIN_INFRASTRUCTURE',
  }
  return map[narrative] || null
}

/**
 * @param {CanonicalCategoryId | string | null | undefined} categoryId
 * @returns {'stablecoin'|'meme'|'oracle'|'ai'|'defi'|'l2'|'governance'|null}
 */
export function canonicalCategoryToNarrativeCategory(categoryId) {
  const id = String(categoryId || '').toUpperCase()
  const map = {
    STABLECOIN: 'stablecoin',
    MEME_SPECULATIVE: 'meme',
    ORACLE_INFRASTRUCTURE: 'oracle',
    AI_ASSET: 'ai',
    DEFI_ASSET: 'defi',
    GOVERNANCE_ASSET: 'governance',
    BLOCKCHAIN_INFRASTRUCTURE: 'l2',
  }
  return map[id] || null
}

/**
 * @param {CanonicalCategoryId | string | null | undefined} categoryId
 * @returns {string | null}
 */
export function canonicalCategoryToExecutiveClassification(categoryId) {
  const id = String(categoryId || '').toUpperCase()
  const map = {
    STABLECOIN: 'STABLECOIN ASSET',
    MEME_SPECULATIVE: 'MEME SPECULATIVE ASSET',
    ORACLE_INFRASTRUCTURE: 'ORACLE INFRASTRUCTURE',
    AI_ASSET: 'AI ASSET',
    DEFI_ASSET: 'DEFI ASSET',
    GOVERNANCE_ASSET: 'GOVERNANCE ASSET',
    BLOCKCHAIN_INFRASTRUCTURE: 'BLOCKCHAIN INFRASTRUCTURE',
    LAYER_1: 'LAYER 1 ASSET',
    STORE_OF_VALUE: 'STORE OF VALUE ASSET',
    UNKNOWN_ASSET: 'UNKNOWN ASSET',
  }
  return map[id] || null
}

/**
 * @param {string | null | undefined} symbol
 * @param {string | null | undefined} [address]
 * @returns {CanonicalCategoryId}
 */
export function resolveCanonicalCategoryForSymbol(symbol, address = null) {
  const sym = String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (sym === 'ETH' || sym === 'WETH' || sym === 'SOL') return 'BLOCKCHAIN_INFRASTRUCTURE'
  if (sym === 'BTC' || sym === 'WBTC') return 'BLOCKCHAIN_INFRASTRUCTURE'
  const narrative = resolveRegistryNarrativeCategory(symbol, address)
  return narrativeToCanonicalCategory(narrative) || 'DEFI_ASSET'
}

/**
 * Investor-facing taxonomy label for wallet / executive surfaces.
 * @param {string | null | undefined} symbol
 */
export function resolveWalletTaxonomyLabel(symbol) {
  const sym = String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (sym === 'ETH' || sym === 'WETH' || sym === 'SOL') return 'LAYER 1 ASSET'
  if (sym === 'BTC' || sym === 'WBTC') return 'STORE OF VALUE ASSET'
  if (sym === 'LINK') return 'ORACLE INFRASTRUCTURE'
  if (sym === 'USDC' || sym === 'USDT' || sym === 'DAI') return 'STABLECOIN ASSET'
  const narrative = resolveRegistryNarrativeCategory(sym)
  if (narrative === 'meme') return 'MEME SPECULATIVE ASSET'
  if (narrative === 'ai') return 'AI ASSET'
  if (narrative === 'defi') return 'DEFI ASSET'
  if (narrative === 'oracle') return 'ORACLE INFRASTRUCTURE'
  if (narrative === 'stablecoin') return 'STABLECOIN ASSET'
  return null
}
