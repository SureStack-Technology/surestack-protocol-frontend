import { resolveEffectiveNarrativeCategory } from '../executiveIntelligence/executiveIntelligenceEngine.mjs'
import { resolveStablecoinMatch } from '../../shared/constants/stablecoinRegistry.mjs'

/** Known blue-chip symbols with deep global liquidity. */
const BLUE_CHIP_SYMBOLS = new Set([
  'LINK',
  'UNI',
  'AAVE',
  'WETH',
  'WBTC',
  'ETH',
  'BTC',
  'MKR',
  'CRV',
  'LDO',
  'SNX',
  'COMP',
  'ENS',
  'ARB',
  'OP',
  'MATIC',
  'POL',
])

/** Meme / speculative symbols — strict DEX-only scoring. */
const MEME_SYMBOLS = new Set(['PEPE', 'BONK', 'WIF', 'DOGE', 'SHIB', 'FLOKI', 'BRETT', 'POPCAT'])

/**
 * @typedef {'blue_chip'|'stablecoin'|'defi'|'meme'|'unknown'} AssetLiquidityTier
 */

/**
 * @param {object} [params]
 * @returns {{ tier: AssetLiquidityTier, isCanonical: boolean, isMajorAsset: boolean, isStablecoin: boolean }}
 */
export function resolveAssetLiquidityTier({
  symbol = null,
  address = null,
  narrativeCategory = null,
  tokenName = null,
  query = null,
} = {}) {
  const sym = String(symbol || query || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
    .split(/[\s(/]/)[0]

  const stable = Boolean(resolveStablecoinMatch({ symbol: sym, address }))
  const category =
    narrativeCategory ||
    resolveEffectiveNarrativeCategory({ symbol: sym, tokenName, query, address })

  if (stable || category === 'stablecoin') {
    return { tier: 'stablecoin', isCanonical: true, isMajorAsset: true, isStablecoin: true }
  }
  if (BLUE_CHIP_SYMBOLS.has(sym) || category === 'oracle' || category === 'l2') {
    return { tier: 'blue_chip', isCanonical: true, isMajorAsset: true, isStablecoin: false }
  }
  if (category === 'defi' && sym && sym.length <= 6) {
    return { tier: 'defi', isCanonical: true, isMajorAsset: true, isStablecoin: false }
  }
  if (category === 'meme' || MEME_SYMBOLS.has(sym)) {
    return { tier: 'meme', isCanonical: false, isMajorAsset: false, isStablecoin: false }
  }
  return { tier: 'unknown', isCanonical: false, isMajorAsset: false, isStablecoin: false }
}
