import { createClerkClient } from '@clerk/backend'
import { prisma } from '../lib/prisma.js'

export async function syncUserFromClerk(clerkUserId) {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) return null

  const clerk = createClerkClient({ secretKey })
  const u = await clerk.users.getUser(clerkUserId)

  const email =
    u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ||
    u.emailAddresses?.[0]?.emailAddress

  if (!email) return null

  const primary = u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)
  const verified = primary?.verification?.status === 'verified'

  const row = await prisma.user.upsert({
    where: { clerkId: u.id },
    create: {
      clerkId: u.id,
      email,
      emailVerified: Boolean(verified),
      firstName: u.firstName || null,
      lastName: u.lastName || null,
      imageUrl: u.imageUrl || null,
      membershipTier: 'EXPLORER_ACCESS',
      subscriptionStatus: 'NONE',
      onboardingCompleted: false,
      onboardingStep: 0,
    },
    update: {
      email,
      emailVerified: Boolean(verified),
      firstName: u.firstName || null,
      lastName: u.lastName || null,
      imageUrl: u.imageUrl || null,
    },
  })
  if (process.env.NODE_ENV !== 'production') {
    console.log('[clerkSync] user upserted', {
      clerkId: u.id,
      onboardingCompleted: row.onboardingCompleted,
      membershipTier: row.membershipTier,
    })
  }
  return row
}
