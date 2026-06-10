import { prisma } from '../../lib/prisma.js'
import { syncUserFromClerk } from '../clerkSync.js'

/**
 * @param {string} userId
 * @param {string} address
 * @param {'EVM'|'SOLANA'} walletType
 */
export async function assertWalletNotLinkedToOtherUser(userId, address, walletType) {
  const where =
    walletType === 'EVM'
      ? {
          address: { equals: address, mode: 'insensitive' },
          userId: { not: userId },
          verifiedAt: { not: null },
        }
      : {
          address,
          walletType: 'SOLANA',
          userId: { not: userId },
          verifiedAt: { not: null },
        }

  const conflict = await prisma.wallet.findFirst({ where })
  if (conflict) {
    const err = new Error('wallet_conflict')
    err.code = 'WALLET_CONFLICT'
    throw err
  }
}

/**
 * @param {string} clerkUserId
 */
export async function resolveUserForWalletLink(clerkUserId) {
  let user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } })
  if (!user) {
    await syncUserFromClerk(clerkUserId)
    user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } })
  }
  return user
}

/**
 * @param {{
 *   userId: string
 *   address: string
 *   walletType: 'EVM'|'SOLANA'
 *   walletChain: string
 *   chainId: number
 *   label?: string
 * }} params
 */
export async function upsertVerifiedWallet({ userId, address, walletType, walletChain, chainId, label }) {
  await assertWalletNotLinkedToOtherUser(userId, address, walletType)

  const existing = await prisma.wallet.findFirst({
    where: {
      userId,
      address: walletType === 'EVM' ? { equals: address, mode: 'insensitive' } : address,
    },
  })

  const verifiedAt = new Date()
  const data = {
    address,
    walletType,
    walletChain,
    chainId,
    verifiedAt,
  }

  if (existing) {
    return prisma.wallet.update({
      where: { id: existing.id },
      data,
    })
  }

  return prisma.wallet.create({
    data: {
      userId,
      ...data,
      label: label || 'Primary',
    },
  })
}

/**
 * @param {import('@prisma/client').Wallet} wallet
 */
export function formatWalletResponse(wallet) {
  return {
    id: wallet.id,
    address: wallet.address,
    walletType: wallet.walletType,
    walletChain: wallet.walletChain,
    chainId: wallet.chainId,
    verifiedAt: wallet.verifiedAt,
  }
}
