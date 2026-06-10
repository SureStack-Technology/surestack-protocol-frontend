/** @typedef {'EVM' | 'SOLANA'} WalletType */

export const WALLET_TYPES = /** @type {const} */ ({
  EVM: 'EVM',
  SOLANA: 'SOLANA',
})

export const SOLANA_WALLET_CHAINS = /** @type {const} */ ({
  MAINNET: 'SOLANA_MAINNET',
  DEVNET: 'SOLANA_DEVNET',
})

/** Default Solana chain for wallet verification UI (matches backend dev default). */
export const DEFAULT_SOLANA_WALLET_CHAIN =
  import.meta.env.PROD ? SOLANA_WALLET_CHAINS.MAINNET : SOLANA_WALLET_CHAINS.DEVNET

/**
 * @param {WalletType | string | null | undefined} walletType
 */
export function formatWalletTypeLabel(walletType) {
  if (walletType === WALLET_TYPES.SOLANA) return 'Solana'
  return 'EVM'
}

/**
 * @param {{ walletType?: string; walletChain?: string; chainId?: number }} wallet
 */
export function formatWalletChainLabel(wallet) {
  if (wallet?.walletType === WALLET_TYPES.SOLANA) {
    return wallet.walletChain === SOLANA_WALLET_CHAINS.MAINNET ? 'Solana Mainnet' : 'Solana Devnet'
  }
  const chainId = Number(wallet?.chainId ?? wallet?.walletChain)
  if (chainId === 11155111) return 'Sepolia'
  if (chainId === 1) return 'Ethereum Mainnet'
  return wallet?.walletChain ? `Chain ${wallet.walletChain}` : `Chain ${chainId || '—'}`
}
