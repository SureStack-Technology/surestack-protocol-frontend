/** Canonical mainnet addresses (lowercase) for wallet exposure classification. */

/** ERC-20 decimals for share-of-wallet normalization (mainnet). */
export const STABLE_TOKEN_DECIMALS = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6,
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 6,
  '0x6b175474e89094c44da98b954eedeac495271d0f': 18,
  '0x0000000000085d47804b73508bbc8eba8b9595a8': 18,
  '0xc5f0f7b85749c2d8bc6b3e8e9dfb423967fd44': 18,
  '0x853d955acef822db058eb8505911ed77f175b99e': 18,
  '0x6c3ea903ffbd99001c7da61a40000f199dd8276': 6,
  '0x4c9edd5852cd905f18654dc2a5015e090033f4e': 18,
}

export const STABLE_TOKENS = new Set([
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0x0000000000085d47804b73508bbc8eba8b9595a8', // TUSD
  '0xc5f0f7b85749c2d8bc6b3e8e9dfb423967fd44', // FDUSD
  '0x853d955acef822db058eb8505911ed77f175b99e', // LUSD
  '0x6c3ea903ffbd99001c7da61a40000f199dd8276', // PYUSD
  '0x4c9edd5852cd905f18654dc2a5015e090033f4e', // USDe
])

/** DEX routers, aggregators, and swap infrastructure. */
export const DEX_SPENDERS = new Set([
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
  '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b',
  '0x198ef79f1f83f42eedd21d16ed00b6cd96f66bb8',
  '0x1111111254eeb25477b68fb85ed929f73a960582',
  '0x111111125421ca6dc452d289314280a0f8842a65',
  '0x7a250d5630b4cf539739df2c5dacb4c659faff1',
  '0xe592427a0aece92de3e8ee346f58c85e7c2c2b7',
  '0xdef1c0ded9bec7f1a1670819833240f027b28eff',
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
  '0x9008d19f58aabd9ed0d60971565aa8510560ab41',
  '0x6352a56b72d610e746a7da6f89777939ad5eaa9f',
])

export const PROTOCOL_SPENDERS = new Set([
  '0x7d2768dee7b33081b9c7ad80a366623d20c9b0c8',
  '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2',
  '0xba12222222228d8ba445958a75a0704d566bf2c8',
  '0x3d9819210a31b4961b30ef54c17a5ff095337a5d',
])

export const NFT_MARKETPLACE_SPENDERS = new Set([
  '0x0000000000000068f116a894984e18d9a7aeaf4',
  '0x00000000000000adc04c56bf30ac9d3c56a1b2fe',
  '0x00000000000001ad428e4906ae43d8f9852d2d4',
  '0x00000000000000777202c7e4fca1fdfd7e6d9e1',
  '0x1e0049783f008a0085193e00003d00cd54003c71',
  '0xb5a3f2267d8d30c86337a04a548c47b064f94e44',
  '0x00000000000000182c4c7c6c4795f6c9c002be4d',
])

const STABLE_SYMBOL_MAP = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0x0000000000085d47804b73508bbc8eba8b9595a8': 'TUSD',
  '0xc5f0f7b85749c2d8bc6b3e8e9dfb423967fd44': 'FDUSD',
  '0x853d955acef822db058eb8505911ed77f175b99e': 'LUSD',
  '0x6c3ea903ffbd99001c7da61a40000f199dd8276': 'PYUSD',
  '0x4c9edd5852cd905f18654dc2a5015e090033f4e': 'USDe',
}

/**
 * @param {string} addr
 */
export function stableTokenSymbol(addr) {
  return STABLE_SYMBOL_MAP[String(addr || '').toLowerCase()] || null
}

/**
 * @param {string} spender
 */
export function dexSpenderLabel(spender) {
  const s = String(spender || '').toLowerCase()
  const labels = [
    ['0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', 'Uniswap'],
    ['0x1111111254eeb25477b68fb85ed929f73a960582', '1inch'],
    ['0xdef1c0ded9bec7f1a1670819833240f027b28eff', '0x'],
    ['0x9008d19f58aabd9ed0d60971565aa8510560ab41', 'CoW Swap'],
    ['0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', 'SushiSwap'],
    ['0x6352a56b72d610e746a7da6f89777939ad5eaa9f', 'PancakeSwap'],
  ]
  for (const [addr, label] of labels) {
    if (s === addr) return label
  }
  return DEX_SPENDERS.has(s) ? 'DEX router' : null
}

/**
 * @param {string} addr
 */
export function isStableToken(addr) {
  return STABLE_TOKENS.has(String(addr || '').toLowerCase())
}

/**
 * Human-scale token amount from raw balance wei (for portfolio share only).
 * @param {string} contract
 * @param {bigint} valueWei
 */
export function normalizedBalanceHuman(contract, valueWei) {
  const c = String(contract || '').toLowerCase()
  if (c === 'native') {
    return Number(valueWei) / 1e18
  }
  const decimals = STABLE_TOKEN_DECIMALS[c] ?? 18
  const v = typeof valueWei === 'bigint' ? valueWei : BigInt(valueWei || 0)
  if (v <= 0n) return 0
  const divisor = 10 ** Math.min(decimals, 18)
  return Number(v) / divisor
}

/**
 * @param {string} spender
 * @param {string} [spenderCategory]
 */
export function isDexSpender(spender, spenderCategory) {
  if (spenderCategory === 'KNOWN_AGGREGATOR') return true
  return DEX_SPENDERS.has(String(spender || '').toLowerCase())
}

/**
 * @param {string} addr
 */
export function isProtocolSpender(addr) {
  return PROTOCOL_SPENDERS.has(String(addr || '').toLowerCase())
}

/**
 * @param {string} addr
 */
export function isNftMarketplace(addr) {
  return NFT_MARKETPLACE_SPENDERS.has(String(addr || '').toLowerCase())
}
