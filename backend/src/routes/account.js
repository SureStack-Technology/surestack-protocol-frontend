import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireClerkAuth } from '../middleware/clerkAuth.js'
import { syncUserFromClerk } from '../services/clerkSync.js'
import { applyDevMembershipOverride } from '../lib/devMembershipOverride.js'

const router = Router()

router.get('/me', requireClerkAuth, async (req, res) => {
  try {
    let user = await prisma.user.findUnique({
      where: { clerkId: req.clerkUserId },
      include: {
        wallets: { orderBy: { verifiedAt: 'desc' } },
      },
    })

    if (!user) {
      user = await syncUserFromClerk(req.clerkUserId)
      if (user) {
        user = await prisma.user.findUnique({
          where: { clerkId: req.clerkUserId },
          include: {
            wallets: { orderBy: { verifiedAt: 'desc' } },
          },
        })
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'user_not_synced', message: 'Complete sign-up; profile syncs via webhook.' })
    }

    user = applyDevMembershipOverride(user)

    if (process.env.NODE_ENV !== 'production') {
      console.log('[account] GET /me', {
        clerkUserId: req.clerkUserId,
        userId: user.id,
        wallets: user.wallets.map((w) => ({
          address: `${String(w.address).slice(0, 8)}…`,
          verifiedAt: w.verifiedAt ? w.verifiedAt.toISOString() : null,
        })),
        foundingMember: user.foundingMember,
        founderCredentialStatus: user.founderCredentialStatus,
      })
    }

    return res.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      emailVerified: user.emailVerified,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      membershipTier: user.membershipTier,
      subscriptionStatus: user.subscriptionStatus,
      onboardingCompleted: user.onboardingCompleted,
      onboardingStep: user.onboardingStep,
      foundersPassLinked: user.foundersPassLinked,
      foundingMember: user.foundingMember,
      foundingCohort: user.foundingCohort,
      founderClaimedAt: user.founderClaimedAt,
      founderDiscountPercent: user.founderDiscountPercent,
      founderCredentialStatus: user.founderCredentialStatus,
      institutionalIntent: user.institutionalIntent,
      governanceAccessEligible: user.governanceAccessEligible,
      explorerComplimentaryPrimeAnalystConsumed: user.explorerComplimentaryPrimeAnalystConsumed,
      ...(user.devMembershipOverrideActive ? { devMembershipOverrideActive: true } : {}),
      wallets: user.wallets.map((w) => ({
        id: w.id,
        address: w.address,
        chainId: w.chainId,
        verifiedAt: w.verifiedAt,
      })),
    })
  } catch (e) {
    console.error('[GET /me]', e)
    return res.status(500).json({ error: 'me_failed' })
  }
})

router.patch('/me/onboarding', requireClerkAuth, async (req, res) => {
  try {
    const { onboardingCompleted, onboardingStep, skipWallet } = req.body || {}

    let user = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId } })
    if (!user) {
      await syncUserFromClerk(req.clerkUserId)
      user = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId } })
    }
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    const data = {}
    if (typeof onboardingCompleted === 'boolean') data.onboardingCompleted = onboardingCompleted
    if (typeof onboardingStep === 'number') data.onboardingStep = onboardingStep

    const updated = await prisma.user.update({
      where: { clerkId: req.clerkUserId },
      data,
    })

    await prisma.analyticsUsage.create({
      data: {
        userId: updated.id,
        eventType: 'onboarding_step',
        metadata: { skipWallet: Boolean(skipWallet), step: updated.onboardingStep },
      },
    })

    return res.json({
      onboardingCompleted: updated.onboardingCompleted,
      onboardingStep: updated.onboardingStep,
    })
  } catch (e) {
    console.error('[PATCH /me/onboarding]', e)
    return res.status(500).json({ error: 'onboarding_update_failed' })
  }
})

router.post('/analytics/track', requireClerkAuth, async (req, res) => {
  try {
    const { eventType, metadata } = req.body || {}
    if (!eventType || typeof eventType !== 'string') {
      return res.status(400).json({ error: 'invalid_event_type' })
    }

    const user = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId } })
    if (!user) return res.status(404).json({ error: 'user_not_found' })

    await prisma.analyticsUsage.create({
      data: {
        userId: user.id,
        eventType,
        metadata: metadata ?? undefined,
      },
    })

    return res.json({ ok: true })
  } catch (e) {
    console.error('[POST /analytics/track]', e)
    return res.status(500).json({ error: 'track_failed' })
  }
})

export default router
