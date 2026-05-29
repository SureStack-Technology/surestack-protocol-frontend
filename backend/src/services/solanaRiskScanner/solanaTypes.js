/** Solana chain identifier for Universal Risk Scanner (not an EVM chainId). */
export const SOLANA_CHAIN_KEY = 'solana'

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
export const BPF_UPGRADEABLE_LOADER = 'BPFLoaderUpgradeab1e11111111111111111111111'
export const BPF_LOADER = 'BPFLoader21111111111111111111111111111111'

/**
 * @param {string} raw
 * @returns {string | null}
 */
export function normalizeSolanaAddress(raw) {
  const s = String(raw || '').trim()
  if (!BASE58_RE.test(s)) return null
  return s
}

export function getSolanaRpcUrl() {
  const env = process.env.SOLANA_RPC_URL?.trim()
  if (env) return env
  if (process.env.NODE_ENV === 'development') {
    return 'https://api.mainnet-beta.solana.com'
  }
  return null
}

/**
 * @param {string} band
 */
export function solanaTrustBandFromScore(score) {
  const s = Number(score)
  if (s == null || Number.isNaN(s)) return null
  if (s >= 75) return 'TRUSTED'
  if (s >= 50) return 'MODERATE'
  if (s >= 25) return 'ELEVATED'
  return 'HIGH_RISK'
}
