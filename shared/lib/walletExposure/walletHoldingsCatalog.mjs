/**
 * P4.2.4 / P4.2.5 — Wallet holdings catalog (contract-first identity + pricing metadata).
 */

import { normalizeContractAddress } from './normalizeContractAddress.mjs'

/** Bump when catalog entries change to invalidate wallet risk cache. */
export const WALLET_HOLDINGS_CATALOG_VERSION = 'p427-v1'

/**
 * @typedef {'LAYER_1'|'STORE_OF_VALUE'|'STABLECOIN'|'ORACLE_INFRASTRUCTURE'|'DEFI'|'AI'|'MEME'|'INFRASTRUCTURE'|'GOVERNANCE'|'UTILITY'} WalletCatalogCategory
 * @typedef {{
 *   symbol: string,
 *   name: string,
 *   contractAddress: string,
 *   coingeckoId: string,
 *   category: WalletCatalogCategory,
 *   decimals?: number,
 *   aliases?: string[],
 * }} WalletCatalogEntry
 */

/** @type {WalletCatalogEntry[]} */
export const WALLET_HOLDINGS_CATALOG = [
  {
    symbol: 'NEXUS',
    name: 'Nexus Chain',
    contractAddress: '0xc01154b4ccb518232d6bbfc9b9e6c5068b766f82',
    coingeckoId: 'nexus-2',
    category: 'INFRASTRUCTURE',
    decimals: 18,
    aliases: ['NEX'],
  },
  {
    symbol: 'ZERO',
    name: 'Zero.Exchange Token',
    contractAddress: '0xf0939011a9bb95c3b791f0cb546377ed2693a574',
    coingeckoId: 'zero-exchange',
    category: 'DEFI',
    decimals: 18,
    aliases: ['0EX'],
  },
  {
    symbol: 'BMI',
    name: 'Bridge Mutual',
    contractAddress: '0x725c26324535aed835a1959e27ae4eeb7a95e555',
    coingeckoId: 'bridge-mutual',
    category: 'DEFI',
    decimals: 18,
  },
  {
    symbol: 'ODDZ',
    name: 'Oddz',
    contractAddress: '0xc5217817e8315fc9acaa83d862ddb6071a98f9c2',
    coingeckoId: 'oddz',
    category: 'DEFI',
    decimals: 18,
  },
  {
    symbol: 'COTI',
    name: 'COTI',
    contractAddress: '0xadd5dd305afd76e985e266826b3490235963685',
    coingeckoId: 'coti',
    category: 'INFRASTRUCTURE',
    decimals: 18,
  },
  {
    symbol: 'INFI',
    name: 'Insured Finance',
    contractAddress: '0x159751323a9e0415dd3d6d42a1212fe9f4a0848c',
    coingeckoId: 'insured-finance',
    category: 'DEFI',
    decimals: 18,
  },
  {
    symbol: 'EROWAN',
    name: 'Sifchain',
    contractAddress: '0x07bac35846e5ed502aa91adf6a9e7aa210f2dcbe',
    coingeckoId: 'sifchain',
    category: 'DEFI',
    decimals: 18,
    aliases: ['EROWAN'],
  },
  {
    symbol: 'SHR',
    name: 'Share',
    contractAddress: '0xd98f75b1a3261dab9eed4956c93f33749027a964',
    coingeckoId: 'sharetoken',
    category: 'UTILITY',
    decimals: 2,
  },
  {
    symbol: 'RAPTOR',
    name: 'Raptor Finance',
    contractAddress: '0x44c99ca267c2b2646ceec72e898273085ab87ca5',
    coingeckoId: 'raptor-finance-2',
    category: 'MEME',
    decimals: 18,
    aliases: ['RPTR'],
  },
  {
    symbol: 'SIMPSON',
    name: 'Homer',
    contractAddress: '0x63e80c6f0a6f91a3c1f35800a5caf9f1e5912d62',
    coingeckoId: 'homer',
    category: 'MEME',
    decimals: 9,
  },
  {
    symbol: 'AGI',
    name: 'SingularityNET',
    contractAddress: '0x5b753dc273739b13f9ae62f9397091ed596acb4',
    coingeckoId: 'singularitynet',
    category: 'AI',
    decimals: 8,
    aliases: ['AGIX'],
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    contractAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
    coingeckoId: 'chainlink',
    category: 'ORACLE_INFRASTRUCTURE',
    decimals: 18,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    contractAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    coingeckoId: 'weth',
    category: 'LAYER_1',
    decimals: 18,
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    contractAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    coingeckoId: 'wrapped-bitcoin',
    category: 'STORE_OF_VALUE',
    decimals: 8,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    coingeckoId: 'usd-coin',
    category: 'STABLECOIN',
    decimals: 6,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    coingeckoId: 'tether',
    category: 'STABLECOIN',
    decimals: 6,
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
    coingeckoId: 'dai',
    category: 'STABLECOIN',
    decimals: 18,
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    coingeckoId: 'uniswap',
    category: 'DEFI',
    decimals: 18,
  },
  {
    symbol: 'AAVE',
    name: 'Aave',
    contractAddress: '0x7fc66500c84a76ad7e9c93481fe6c2e88f4923e6',
    coingeckoId: 'aave',
    category: 'DEFI',
    decimals: 18,
  },
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    contractAddress: '0xb50721bcf8d667c67912441f4d70b32f0802e3c',
    coingeckoId: 'arbitrum',
    category: 'LAYER_1',
    decimals: 18,
  },
  {
    symbol: 'OP',
    name: 'Optimism',
    contractAddress: '0x4200000000000000000000000000000000000042',
    coingeckoId: 'optimism',
    category: 'LAYER_1',
    decimals: 18,
  },
  {
    symbol: 'MATIC',
    name: 'Polygon',
    contractAddress: '0x7d1afa7b718fb893db30a3b0c5203a6195dbfe5d',
    coingeckoId: 'matic-network',
    category: 'LAYER_1',
    decimals: 18,
    aliases: ['POL'],
  },
  {
    symbol: 'PEPE',
    name: 'Pepe',
    contractAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
    coingeckoId: 'pepe',
    category: 'MEME',
    decimals: 18,
  },
  {
    symbol: 'FET',
    name: 'Artificial Superintelligence Alliance',
    contractAddress: '0xaea46a60368a7bd06006146a4107a6490e122342',
    coingeckoId: 'fetch-ai',
    category: 'AI',
    decimals: 18,
  },
  {
    symbol: 'RNDR',
    name: 'Render',
    contractAddress: '0x6de037ef9ad2725eb1694d337882399c32785661',
    coingeckoId: 'render-token',
    category: 'AI',
    decimals: 18,
  },
]

/** @type {Record<string, WalletCatalogEntry>} */
export const WALLET_HOLDINGS_BY_CONTRACT = Object.fromEntries(
  WALLET_HOLDINGS_CATALOG.map((e) => [e.contractAddress.toLowerCase(), e]),
)

/** @type {Record<string, WalletCatalogEntry>} */
const BY_SYMBOL = {}
for (const entry of WALLET_HOLDINGS_CATALOG) {
  BY_SYMBOL[entry.symbol.toUpperCase()] = entry
  for (const alias of entry.aliases || []) {
    BY_SYMBOL[String(alias).toUpperCase()] = entry
  }
}

/**
 * @param {string} contract
 * @returns {WalletCatalogEntry | null}
 */
export function lookupWalletHoldingByContract(contract) {
  const c = normalizeContractAddress(contract)
  if (!c || c === 'native') return null
  return WALLET_HOLDINGS_BY_CONTRACT[c] || null
}

/**
 * @param {string} symbol
 * @returns {WalletCatalogEntry | null}
 */
export function lookupWalletHoldingBySymbol(symbol) {
  const sym = String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (!sym) return null
  return BY_SYMBOL[sym] || null
}

/**
 * @param {string} symbol
 */
export function coingeckoIdForSymbol(symbol) {
  return lookupWalletHoldingBySymbol(symbol)?.coingeckoId || null
}

/**
 * @param {string} contract
 */
export function coingeckoIdForCatalogContract(contract) {
  const c = String(contract || '').toLowerCase()
  if (c === 'native') return 'ethereum'
  return lookupWalletHoldingByContract(c)?.coingeckoId || null
}

/**
 * @param {string} contract
 */
export function decimalsForCatalogContract(contract) {
  const c = String(contract || '').toLowerCase()
  if (c === 'native') return 18
  const entry = lookupWalletHoldingByContract(c)
  return entry?.decimals ?? 18
}

/** @type {Record<WalletCatalogCategory, string>} */
export const WALLET_TAXONOMY_LABELS = {
  LAYER_1: 'Layer 1',
  STORE_OF_VALUE: 'Store of Value',
  STABLECOIN: 'Stablecoin',
  ORACLE_INFRASTRUCTURE: 'Oracle Infrastructure',
  DEFI: 'DeFi',
  AI: 'AI',
  MEME: 'Meme',
  INFRASTRUCTURE: 'Infrastructure',
  GOVERNANCE: 'Governance',
  UTILITY: 'Utility',
}

/**
 * @param {WalletCatalogCategory | string | null | undefined} category
 */
export function taxonomyLabelForCategory(category) {
  const key = String(category || '').toUpperCase()
  return WALLET_TAXONOMY_LABELS[key] || 'Other'
}

/**
 * Maps catalog taxonomy to portfolio sector risk bucket.
 * @param {WalletCatalogCategory | string} category
 */
export function sectorBucketForCatalogCategory(category) {
  const key = String(category || '').toUpperCase()
  switch (key) {
    case 'STABLECOIN':
      return { category: 'Stablecoin', riskCategory: 'Stablecoin' }
    case 'MEME':
      return { category: 'Meme', riskCategory: 'Meme' }
    case 'AI':
      return { category: 'AI', riskCategory: 'AI' }
    case 'DEFI':
    case 'GOVERNANCE':
    case 'UTILITY':
      return { category: 'DeFi', riskCategory: 'DeFi' }
    case 'LAYER_1':
    case 'STORE_OF_VALUE':
    case 'ORACLE_INFRASTRUCTURE':
      return { category: 'Blue Chip', riskCategory: 'Blue Chip' }
    case 'INFRASTRUCTURE':
      return { category: 'Infrastructure', riskCategory: 'Infrastructure' }
    default:
      return { category: 'Other', riskCategory: 'Unknown' }
  }
}
