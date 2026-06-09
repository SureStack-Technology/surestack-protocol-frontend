import { createClerkClient } from '@clerk/backend'
import { prisma } from '../lib/prisma.js'

/** @typedef {{ clerkId: string; email: string; emailVerified: boolean; firstName: string|null; lastName: string|null; imageUrl: string|null }} ClerkUserProfile */

/**
 * Resolve Clerk primary email from REST API user payload.
 * @param {import('@clerk/backend').User} u
 */
export function extractClerkProfileFromApiUser(u) {
  const email =
    u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ||
    u.emailAddresses?.[0]?.emailAddress

  if (!email) return null

  const primary = u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)
  const verified = primary?.verification?.status === 'verified'

  return {
    clerkId: u.id,
    email: email.trim(),
    emailVerified: Boolean(verified),
    firstName: u.firstName || null,
    lastName: u.lastName || null,
    imageUrl: u.imageUrl || null,
  }
}

/**
 * Resolve Clerk primary email from webhook payload (snake_case).
 * @param {Record<string, unknown>} u
 */
export function extractClerkProfileFromWebhookUser(u) {
  const addresses = /** @type {Array<{ id: string; email_address?: string; verification?: { status?: string } }>} */ (
    u.email_addresses || []
  )
  const primaryId = /** @type {string|undefined} */ (u.primary_email_address_id)
  const email =
    addresses.find((e) => e.id === primaryId)?.email_address || addresses[0]?.email_address

  if (!email) return null

  const primary = addresses.find((e) => e.id === primaryId)
  const verified = primary?.verification?.status === 'verified'

  return {
    clerkId: String(u.id),
    email: email.trim(),
    emailVerified: Boolean(verified),
    firstName: (u.first_name && String(u.first_name)) || null,
    lastName: (u.last_name && String(u.last_name)) || null,
    imageUrl: (u.image_url && String(u.image_url)) || null,
  }
}

/**
 * @param {ClerkUserProfile} profile
 */
function profileUpdateFields(profile) {
  return {
    email: profile.email,
    emailVerified: profile.emailVerified,
    firstName: profile.firstName,
    lastName: profile.lastName,
    imageUrl: profile.imageUrl,
  }
}

/**
 * @param {ClerkUserProfile} profile
 */
async function findUserByEmailInsensitive(email) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  })
}

/**
 * Idempotent Clerk → Postgres sync:
 * 1. clerkId match → update profile
 * 2. else email match → attach clerkId + update profile (preserves membership tier)
 * 3. else create with EXPLORER_ACCESS
 * Handles P2002 races without surfacing 500s to /api/auth/me.
 *
 * @param {ClerkUserProfile} profile
 */
export async function upsertUserFromClerkProfile(profile) {
  const { clerkId } = profile
  const fields = profileUpdateFields(profile)

  const byClerk = await prisma.user.findUnique({ where: { clerkId } })
  if (byClerk) {
    return prisma.user.update({
      where: { id: byClerk.id },
      data: fields,
    })
  }

  const byEmail = await findUserByEmailInsensitive(profile.email)
  if (byEmail) {
    try {
      return await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          clerkId,
          ...fields,
        },
      })
    } catch (err) {
      if (err?.code !== 'P2002') throw err
      const raced = await prisma.user.findUnique({ where: { clerkId } })
      if (raced) {
        return prisma.user.update({
          where: { id: raced.id },
          data: fields,
        })
      }
      throw err
    }
  }

  try {
    return await prisma.user.create({
      data: {
        clerkId,
        ...fields,
        membershipTier: 'EXPLORER_ACCESS',
        subscriptionStatus: 'NONE',
        onboardingCompleted: false,
        onboardingStep: 0,
      },
    })
  } catch (err) {
    if (err?.code !== 'P2002') throw err

    const racedByClerk = await prisma.user.findUnique({ where: { clerkId } })
    if (racedByClerk) {
      return prisma.user.update({
        where: { id: racedByClerk.id },
        data: fields,
      })
    }

    const racedByEmail = await findUserByEmailInsensitive(profile.email)
    if (racedByEmail) {
      return prisma.user.update({
        where: { id: racedByEmail.id },
        data: {
          clerkId,
          ...fields,
        },
      })
    }

    throw err
  }
}

export async function syncUserFromClerk(clerkUserId) {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) return null

  const clerk = createClerkClient({ secretKey })
  const u = await clerk.users.getUser(clerkUserId)
  const profile = extractClerkProfileFromApiUser(u)
  if (!profile) return null

  const row = await upsertUserFromClerkProfile(profile)

  if (process.env.NODE_ENV !== 'production') {
    console.log('[clerkSync] user upserted', {
      clerkId: profile.clerkId,
      onboardingCompleted: row.onboardingCompleted,
      membershipTier: row.membershipTier,
    })
  }

  return row
}
