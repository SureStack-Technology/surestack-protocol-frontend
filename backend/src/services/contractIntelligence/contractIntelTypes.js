/** Supported EVM chains for Contract Intelligence Engine (mainnet). */
export const CONTRACT_INTEL_CHAINS = {
  1: { key: 'eth', label: 'Ethereum', explorer: 'etherscan' },
  8453: { key: 'base', label: 'Base', explorer: 'basescan' },
  42161: { key: 'arb', label: 'Arbitrum', explorer: 'arbiscan' },
  10: { key: 'op', label: 'Optimism', explorer: 'optimistic.etherscan' },
  137: { key: 'polygon', label: 'Polygon', explorer: 'polygonscan' },
}

export const EIP1967_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'

export const EIP1967_ADMIN_SLOT =
  '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d4a9f49aa11109d7'

export function normalizeContractAddress(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (!/^0x[a-f0-9]{40}$/.test(s)) return null
  return s
}

export function isSupportedContractChain(chainId) {
  return Object.prototype.hasOwnProperty.call(CONTRACT_INTEL_CHAINS, Number(chainId))
}

/**
 * Calibrated trust bands (0–100):
 * 75–100 TRUSTED (institutional / established)
 * 50–74  MODERATE (operator review)
 * 25–49  ELEVATED
 * 0–24   HIGH_RISK
 */
export function trustBandFromScore(score) {
  const s = Number(score)
  if (s == null || Number.isNaN(s)) return null
  if (s >= 75) return 'TRUSTED'
  if (s >= 50) return 'MODERATE'
  if (s >= 25) return 'ELEVATED'
  return 'HIGH_RISK'
}
