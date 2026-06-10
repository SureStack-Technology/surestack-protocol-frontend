import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireClerkAuth } from '../middleware/clerkAuth.js'
import {
  buildSolanaVerificationMessage,
  isValidSolanaAddress,
  resolveSolanaWalletChain,
  solanaChainIdPlaceholder,
  storageSolanaAddress,
  verifySolanaWalletSignature,
} from '../services/wallet/solanaWalletVerify.js'
import {
  formatWalletResponse,
  resolveUserForWalletLink,
  upsertVerifiedWallet,
} from '../services/wallet/walletPersistence.js'

const router = Router()

const CHALLENGE_TTL_MS = 15 * 60 * 1000

function addressPrefix(addr) {
  if (!addr) return null
  const s = String(addr)
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s
}

function mapVerifyError(err) {
  const code = err?.code
  const message = err?.message || String(err)
  if (code === 'P2022' || /column.*does not exist|walletType/i.test(message)) {
    return {
      status: 503,
      error: 'database_schema_out_of_date',
      message:
        'Database schema is behind the API. Apply pending Prisma migrations (prisma migrate deploy) and restart the backend.',
    }
  }
  if (code === 'P2002' || code === 'WALLET_CONFLICT') {
    return {
      status: 409,
      error: 'wallet_conflict',
      message: 'This wallet is already linked to another profile.',
    }
  }
  return {
    status: 500,
    error: 'verify_failed',
    message: 'Unexpected error during Solana wallet verification.',
  }
}

/**
 * GET /api/wallet/solana/nonce
 * Issues a DB-backed Solana signMessage challenge.
 */
router.get('/solana/nonce', requireClerkAuth, async (req, res) => {
  try {
    const addressRaw = (req.query.walletAddress || req.query.address || '').toString().trim()
    if (!addressRaw) {
      return res.status(400).json({ error: 'wallet_address_required' })
    }

    if (!isValidSolanaAddress(addressRaw)) {
      return res.status(400).json({ error: 'invalid_solana_address' })
    }

    const normalized = storageSolanaAddress(addressRaw)
    const walletChain = (req.query.walletChain || resolveSolanaWalletChain()).toString().trim()
    if (walletChain !== 'SOLANA_MAINNET' && walletChain !== 'SOLANA_DEVNET') {
      return res.status(400).json({ error: 'invalid_wallet_chain' })
    }

    const nonce =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const message = buildSolanaVerificationMessage({
      nonce,
      address: normalized,
      walletChain,
    })
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS)
    const chainId = solanaChainIdPlaceholder(walletChain)

    await prisma.walletChallenge.updateMany({
      where: { clerkId: req.clerkUserId, consumedAt: null, walletType: 'SOLANA' },
      data: { consumedAt: new Date() },
    })

    await prisma.walletChallenge.create({
      data: {
        clerkId: req.clerkUserId,
        nonce,
        address: normalized,
        walletType: 'SOLANA',
        walletChain,
        chainId,
        message,
        expiresAt,
      },
    })

    console.log('[solanaWalletVerify] challenge_requested', {
      clerkUserId: req.clerkUserId,
      address: addressPrefix(normalized),
      walletChain,
      noncePrefix: String(nonce).slice(0, 8),
    })

    return res.json({ nonce, message, walletChain, walletType: 'SOLANA' })
  } catch (e) {
    const mapped = mapVerifyError(e)
    console.error('[solanaWalletVerify] challenge_error', e?.message)
    return res.status(mapped.status).json({ error: mapped.error, message: mapped.message })
  }
})

/**
 * POST /api/wallet/verify-solana
 * Verifies Phantom signMessage against stored challenge.
 */
router.post('/verify-solana', requireClerkAuth, async (req, res) => {
  const { walletAddress, signature, message, nonce } = req.body || {}

  try {
    console.log('[solanaWalletVerify] verify_attempt', {
      clerkUserId: req.clerkUserId,
      address: addressPrefix(walletAddress),
      hasSignature: Boolean(signature),
      noncePrefix: nonce ? String(nonce).slice(0, 8) : null,
    })

    if (!walletAddress || !signature || !message || !nonce) {
      return res.status(400).json({
        error: 'wallet_address_signature_message_nonce_required',
        message: 'walletAddress, signature, message, and nonce are required.',
      })
    }

    if (!isValidSolanaAddress(walletAddress)) {
      return res.status(400).json({ error: 'invalid_solana_address' })
    }

    const storedAddr = storageSolanaAddress(walletAddress)

    const challenge = await prisma.walletChallenge.findFirst({
      where: {
        clerkId: req.clerkUserId,
        nonce: String(nonce),
        walletType: 'SOLANA',
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (!challenge) {
      return res.status(400).json({
        error: 'challenge_not_found',
        message: 'No active Solana challenge for this nonce. Request a new nonce from GET /api/wallet/solana/nonce.',
      })
    }

    if (challenge.address !== storedAddr) {
      return res.status(400).json({
        error: 'address_mismatch',
        message: 'Signed address does not match the challenge address.',
      })
    }

    if (String(message) !== String(challenge.message)) {
      return res.status(400).json({
        error: 'message_mismatch',
        message: 'Signed message does not match the issued challenge.',
      })
    }

    const verification = verifySolanaWalletSignature({
      message: challenge.message,
      walletAddress: storedAddr,
      signature,
    })

    if (!verification.ok) {
      return res.status(400).json({
        error: verification.error || 'invalid_signature',
        message: 'Could not verify Solana wallet signature.',
      })
    }

    const user = await resolveUserForWalletLink(req.clerkUserId)
    if (!user) {
      return res.status(404).json({ error: 'user_not_found', message: 'User profile not found for this Clerk account.' })
    }

    const wallet = await upsertVerifiedWallet({
      userId: user.id,
      address: storedAddr,
      walletType: 'SOLANA',
      walletChain: challenge.walletChain,
      chainId: challenge.chainId,
      label: 'Solana Primary',
    })

    await prisma.walletChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    })

    console.log('[solanaWalletVerify] success', {
      clerkUserId: req.clerkUserId,
      userId: user.id,
      walletId: wallet.id,
      address: addressPrefix(wallet.address),
      walletChain: wallet.walletChain,
    })

    prisma.analyticsUsage
      .create({
        data: {
          userId: user.id,
          eventType: 'wallet_verified',
          metadata: {
            address: storedAddr,
            walletType: 'SOLANA',
            walletChain: challenge.walletChain,
          },
        },
      })
      .catch((err) => {
        console.error('[solanaWalletVerify] analytics_error', err?.message)
      })

    return res.json({
      ok: true,
      wallet: formatWalletResponse(wallet),
    })
  } catch (e) {
    const mapped = mapVerifyError(e)
    console.error('[solanaWalletVerify] verify_error', {
      prismaCode: e?.code,
      message: e?.message,
      mapped: mapped.error,
    })
    return res.status(mapped.status).json({ error: mapped.error, message: mapped.message })
  }
})

export default router
