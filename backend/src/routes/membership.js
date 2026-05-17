import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireClerkAuth } from '../middleware/clerkAuth.js'
import { syncUserFromClerk } from '../services/clerkSync.js'
import { loadAuthUser } from '../services/authUser.js'
import {
  FOUNDING_COHORT_MAX,
  foundersPassFunnelCompleteForClaim,
} from '../services/foundersPassService.js'

const router = Router()

async function getUserForClerk(clerkUserId) {
  return loadAuthUser(clerkUserId)
}

/**
 * Records Prime Intelligence waitlist intent. Does NOT change membershipTier (Stripe / entitlement later).
 */
router.post('/waitlist/pro', requireClerkAuth, async (req, res) => {
  try {
    const user = await getUserForClerk(req.clerkUserId)
    if (!user) {
      return res.status(404).json({ error: 'user_not_found', message: 'Complete signup so your profile exists.' })
    }

    await prisma.analyticsUsage.create({
      data: {
        userId: user.id,
        eventType: 'membership_waitlist_pro',
        metadata: {
          tier: user.membershipTier,
          note: typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : undefined,
        },
      },
    })

    console.log('[membership] waitlist/pro recorded', { userId: user.id, clerkIdPrefix: String(req.clerkUserId).slice(0, 12) })
    return res.json({ ok: true, message: 'You are on the Prime Intelligence waitlist. Billing is not enabled yet.' })
  } catch (e) {
    console.error('[POST /membership/waitlist/pro]', e)
    return res.status(500).json({ error: 'waitlist_failed' })
  }
})

/**
 * Records Nexus Intelligence request. Does NOT grant STRATEGIC_ACCESS without backend entitlement / sales flow.
 */
router.post('/request/strategic', requireClerkAuth, async (req, res) => {
  try {
    const user = await getUserForClerk(req.clerkUserId)
    if (!user) {
      return res.status(404).json({ error: 'user_not_found', message: 'Complete signup so your profile exists.' })
    }

    await prisma.analyticsUsage.create({
      data: {
        userId: user.id,
        eventType: 'membership_request_strategic',
        metadata: {
          tier: user.membershipTier,
          company: typeof req.body?.company === 'string' ? req.body.company.slice(0, 200) : undefined,
          note: typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : undefined,
        },
      },
    })

    console.log('[membership] request/strategic recorded', { userId: user.id, clerkIdPrefix: String(req.clerkUserId).slice(0, 12) })
    return res.json({
      ok: true,
      message:
        'Nexus Intelligence request received. Our team will follow up when enterprise intelligence onboarding opens.',
    })
  } catch (e) {
    console.error('[POST /membership/request/strategic]', e)
    return res.status(500).json({ error: 'request_failed' })
  }
})

function foundingSummary(user) {
  return {
    foundingMember: user.foundingMember,
    foundingCohort: user.foundingCohort,
    founderCredentialStatus: user.founderCredentialStatus,
    founderClaimedAt: user.founderClaimedAt,
    founderDiscountPercent: user.founderDiscountPercent,
    membershipTier: user.membershipTier,
    foundersPassLinked: user.foundersPassLinked,
  }
}

/**
 * Activate free Founders Pass community credential (full funnel verified, capped cohort).
 * Does NOT grant paid Prime / Nexus tiers — those remain separate billing entitlements.
 */
router.post('/founding-member/claim', requireClerkAuth, async (req, res) => {
  try {
    let user = await prisma.user.findUnique({
      where: { clerkId: req.clerkUserId },
      include: { wallets: true },
    })
    if (!user) {
      await syncUserFromClerk(req.clerkUserId)
      user = await prisma.user.findUnique({
        where: { clerkId: req.clerkUserId },
        include: { wallets: true },
      })
    }
    if (!user) {
      return res.status(404).json({ error: 'user_not_found', message: 'Complete signup so your profile exists.' })
    }

    const hasVerifiedWallet =
      Array.isArray(user.wallets) &&
      user.wallets.some((w) => w.verifiedAt != null)
    const verifiedCount = await prisma.wallet.count({
      where: { userId: user.id, verifiedAt: { not: null } },
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log('[membership] founding-member/claim lookup', {
        clerkUserId: req.clerkUserId,
        userId: user.id,
        walletRows: user.wallets?.length ?? 0,
        hasVerifiedWallet,
        verifiedCount,
        walletSample: (user.wallets || []).slice(0, 3).map((w) => ({
          address: w.address?.slice(0, 10),
          verifiedAt: w.verifiedAt ? w.verifiedAt.toISOString?.() || String(w.verifiedAt) : null,
        })),
      })
    }

    if (user.foundingMember && user.founderCredentialStatus === 'ACTIVE') {
      return res.json({ ok: true, alreadyClaimed: true, summary: foundingSummary(user) })
    }

    if (!hasVerifiedWallet || verifiedCount < 1) {
      return res.status(400).json({
        error: 'wallet_verification_required',
        message: 'Verify a wallet on your account as the first step toward Founders Pass activation.',
        nextStep: '/onboarding',
      })
    }

    const funnelComplete = await foundersPassFunnelCompleteForClaim(user)
    if (!funnelComplete) {
      return res.status(400).json({
        error: 'founders_pass_incomplete',
        message:
          'Complete all Founders Pass community verification steps. Team approval is required for X, engagement, and Telegram. Activation applies automatically once every step is verified.',
        foundersPassPath: '/founders-pass',
      })
    }

    const activeCount = await prisma.user.count({
      where: { foundingMember: true, founderCredentialStatus: 'ACTIVE' },
    })
    if (activeCount >= FOUNDING_COHORT_MAX) {
      return res.status(403).json({
        error: 'cohort_full',
        message: 'Founders Pass capacity for this wave is full. Thank you for your interest.',
      })
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        foundingMember: true,
        foundingCohort: '2026',
        founderClaimedAt: new Date(),
        founderCredentialStatus: 'ACTIVE',
        foundersPassLinked: true,
      },
    })

    await prisma.analyticsUsage.create({
      data: {
        userId: user.id,
        eventType: 'founding_member_claimed',
        metadata: { cohort: '2026' },
      },
    })

    console.log('[membership] founding-member/claim', { userId: user.id })
    return res.json({ ok: true, summary: foundingSummary(updated) })
  } catch (e) {
    console.error('[POST /membership/founding-member/claim]', e)
    return res.status(500).json({ error: 'claim_failed' })
  }
})

export default router
