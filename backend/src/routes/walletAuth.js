import { Router } from 'express'
import { verifyMessage, getAddress } from 'ethers'
import { prisma } from '../lib/prisma.js'
import { requireClerkAuth } from '../middleware/clerkAuth.js'
import { syncUserFromClerk } from '../services/clerkSync.js'

const router = Router()

const CHALLENGE_TTL_MS = 15 * 60 * 1000

function addressPrefix(addr) {
  if (!addr) return null
  const s = String(addr)
  return s.length > 12 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s
}

function buildMessage({ nonce, address, chainId }) {
  return [
    'SureStack Wallet Verification',
    `Nonce: ${nonce}`,
    `Address: ${getAddress(address)}`,
    `Chain ID: ${chainId}`,
  ].join('\n')
}

/** Canonical storage form — avoids userId+address unique conflicts across checksum casing. */
function storageAddress(checksummed) {
  return getAddress(checksummed).toLowerCase()
}

function mapPrismaVerifyError(err) {
  const code = err?.code
  const message = err?.message || String(err)
  if (code === 'P2022' || /column.*does not exist|explorerComplimentaryPrimeAnalystConsumed/i.test(message)) {
    return {
      status: 503,
      error: 'database_schema_out_of_date',
      message:
        'Database schema is behind the API. Apply pending Prisma migrations (prisma migrate deploy) and restart the backend.',
    }
  }
  if (code === 'P2002') {
    return {
      status: 409,
      error: 'wallet_conflict',
      message: 'This wallet is already linked to another profile.',
    }
  }
  return {
    status: 500,
    error: 'verify_failed',
    message: 'Unexpected error during wallet verification.',
  }
}

/**
 * GET /api/auth/wallet/nonce
 * Issues a DB-backed EIP-191 message (survives process restarts; safe behind load balancers).
 */
router.get('/nonce', requireClerkAuth, async (req, res) => {
  try {
    const addressRaw = (req.query.address || '').toString().trim()
    if (!addressRaw) {
      return res.status(400).json({ error: 'query_address_required' })
    }
    let normalized
    try {
      normalized = getAddress(addressRaw)
    } catch {
      return res.status(400).json({ error: 'invalid_address' })
    }

    const chainId = Number(req.query.chainId) || 11155111
    const nonce =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const message = buildMessage({ nonce, address: normalized, chainId })
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS)

    await prisma.walletChallenge.updateMany({
      where: { clerkId: req.clerkUserId, consumedAt: null },
      data: { consumedAt: new Date() },
    })

    await prisma.walletChallenge.create({
      data: {
        clerkId: req.clerkUserId,
        nonce,
        address: storageAddress(normalized),
        chainId,
        message,
        expiresAt,
      },
    })

    console.log('[walletVerify] challenge_requested', {
      clerkUserId: req.clerkUserId,
      address: addressPrefix(normalized),
      chainId,
      noncePrefix: String(nonce).slice(0, 8),
    })

    return res.json({ nonce, message, chainId })
  } catch (e) {
    const mapped = mapPrismaVerifyError(e)
    console.error('[walletVerify] error', {
      phase: 'challenge_requested',
      code: e?.code,
      message: e?.message,
    })
    return res.status(mapped.status).json({ error: mapped.error, message: mapped.message })
  }
})

/**
 * POST /api/auth/wallet/verify
 * Verifies signature against the **exact** stored challenge message (no reconstruction drift).
 */
router.post('/verify', requireClerkAuth, async (req, res) => {
  const { address, signature, chainId, nonce } = req.body || {}

  try {
    console.log('[walletVerify] verify_attempt', {
      clerkUserId: req.clerkUserId,
      address: addressPrefix(address),
      chainId: chainId ?? null,
      hasSignature: Boolean(signature),
      noncePrefix: nonce ? String(nonce).slice(0, 8) : null,
    })

    if (!address || !signature || !nonce) {
      return res.status(400).json({
        error: 'address_signature_nonce_required',
        message: 'address, signature, and nonce (from GET /api/auth/wallet/nonce) are required.',
      })
    }

    let normalized
    try {
      normalized = getAddress(address)
    } catch {
      return res.status(400).json({ error: 'invalid_address' })
    }

    const storedAddr = storageAddress(normalized)

    const challenge = await prisma.walletChallenge.findFirst({
      where: {
        clerkId: req.clerkUserId,
        nonce: String(nonce),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (!challenge) {
      console.warn('[walletVerify] error', {
        phase: 'verify_attempt',
        reason: 'challenge_not_found',
        clerkUserId: req.clerkUserId,
        noncePrefix: String(nonce).slice(0, 8),
      })
      return res.status(400).json({
        error: 'challenge_not_found',
        message: 'No active challenge for this nonce. Request a new nonce from GET /api/auth/wallet/nonce.',
      })
    }

    const challengeAddr = storageAddress(challenge.address)
    if (challengeAddr !== storedAddr) {
      return res.status(400).json({
        error: 'address_mismatch',
        message: 'Signed address does not match the challenge address.',
      })
    }

    const cid = Number(chainId) || 11155111
    if (challenge.chainId !== cid) {
      return res.status(400).json({
        error: 'chain_id_mismatch',
        message: `Challenge was issued for chain ID ${challenge.chainId}; verify payload had ${cid}.`,
      })
    }

    const storedMessage = challenge.message

    let recovered
    try {
      recovered = verifyMessage(storedMessage, signature)
    } catch (err) {
      console.warn('[walletVerify] error', {
        phase: 'verify_attempt',
        reason: 'invalid_signature',
        detail: err?.message,
      })
      return res.status(400).json({ error: 'invalid_signature', message: 'Could not recover signer from signature.' })
    }

    const recoveredNorm = getAddress(recovered)
    console.log('[walletVerify] recovered_address', {
      expected: addressPrefix(normalized),
      recovered: addressPrefix(recoveredNorm),
    })

    if (storageAddress(recoveredNorm) !== storedAddr) {
      return res.status(400).json({
        error: 'signature_mismatch',
        message: 'Recovered signer does not match the claimed address.',
      })
    }

    let user = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId } })
    if (!user) {
      await syncUserFromClerk(req.clerkUserId)
      user = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId } })
    }
    if (!user) {
      return res.status(404).json({ error: 'user_not_found', message: 'User profile not found for this Clerk account.' })
    }

    const existing = await prisma.wallet.findFirst({
      where: {
        userId: user.id,
        address: { equals: storedAddr, mode: 'insensitive' },
      },
    })

    const verifiedAt = new Date()
    const wallet = existing
      ? await prisma.wallet.update({
          where: { id: existing.id },
          data: {
            address: storedAddr,
            chainId: cid,
            verifiedAt,
          },
        })
      : await prisma.wallet.create({
          data: {
            userId: user.id,
            address: storedAddr,
            chainId: cid,
            verifiedAt,
            label: 'Primary',
          },
        })

    await prisma.walletChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    })

    console.log('[walletVerify] success', {
      clerkUserId: req.clerkUserId,
      userId: user.id,
      walletId: wallet.id,
      address: addressPrefix(wallet.address),
      chainId: wallet.chainId,
    })

    prisma.analyticsUsage
      .create({
        data: {
          userId: user.id,
          eventType: 'wallet_verified',
          metadata: { address: storedAddr, chainId: cid },
        },
      })
      .catch((err) => {
        console.error('[walletVerify] error', {
          phase: 'analytics',
          message: err?.message,
        })
      })

    return res.json({
      ok: true,
      wallet: {
        id: wallet.id,
        address: wallet.address,
        chainId: wallet.chainId,
        verifiedAt: wallet.verifiedAt,
      },
    })
  } catch (e) {
    const mapped = mapPrismaVerifyError(e)
    console.error('[walletVerify] error', {
      phase: 'verify_attempt',
      prismaCode: e?.code,
      message: e?.message,
      mapped: mapped.error,
    })
    return res.status(mapped.status).json({ error: mapped.error, message: mapped.message })
  }
})

export default router
