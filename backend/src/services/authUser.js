import { prisma } from '../lib/prisma.js'
import { applyDevMembershipOverride } from '../lib/devMembershipOverride.js'
import { syncUserFromClerk } from './clerkSync.js'

/**
 * Load user by Clerk id and apply dev-only membership override (in-memory; never persisted).
 * @param {string} clerkUserId
 * @param {{ include?: object }} [opts]
 */
export async function loadAuthUser(clerkUserId, opts = {}) {
  const query = { where: { clerkId: clerkUserId } }
  if (opts.include) query.include = opts.include

  let user = await prisma.user.findUnique(query)
  if (!user) {
    const synced = await syncUserFromClerk(clerkUserId)
    if (synced && opts.include) {
      user = await prisma.user.findUnique(query)
    } else {
      user = synced
    }
  }

  return applyDevMembershipOverride(user)
}

export { applyDevMembershipOverride }
