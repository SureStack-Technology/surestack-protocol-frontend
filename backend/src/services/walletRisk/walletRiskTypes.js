/** @typedef {'LOW'|'MODERATE'|'ELEVATED'|'HIGH'} RiskBand */

export const MAINNET_CHAIN_ID = 1
/** Default verified-wallet chain in SureStack Phase 1 */
export const SEPOLIA_CHAIN_ID = 11155111

export const RISK_BANDS = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  ELEVATED: 'ELEVATED',
  HIGH: 'HIGH',
}

/** Stablecoin / blue-chip style addresses on Ethereum mainnet (lowercase) for volatility proxy */
export const LOWER_VOLATILITY_TOKENS = new Set([
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0x0000000000000000000000000000000000000000', // native placeholder
])

/** Sepolia USDC (Circle test token) — lowercase for comparisons */
const SEPOLIA_LOW_VOL_EXTRA = ['0x1c7d4b196cb0c7b01d743fbc6116a902379c7238']

/**
 * @param {number} chainId
 * @returns {Set<string>}
 */
export function getLowerVolatilityTokens(chainId) {
  const s = new Set(LOWER_VOLATILITY_TOKENS)
  if (chainId === SEPOLIA_CHAIN_ID) {
    for (const a of SEPOLIA_LOW_VOL_EXTRA) s.add(a)
  }
  return s
}

export const WETH_MAINNET = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
