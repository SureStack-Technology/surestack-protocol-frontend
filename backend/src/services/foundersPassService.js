import { prisma } from '../lib/prisma.js'

export const FOUNDING_COHORT_MAX = 500

function verifiedWalletFromUser(user) {
  const w = user.wallets?.find((x) => x.verifiedAt)
  if (!w) return null
  return { address: String(w.address).toLowerCase(), verified: true }
}

/**
 * @param {import('@prisma/client').User & { wallets?: import('@prisma/client').Wallet[] }} user
 */
export async function ensureFoundersPassRecord(user) {
  const wallet = verifiedWalletFromUser(user)
  const legacyActive = Boolean(user.foundingMember && user.founderCredentialStatus === 'ACTIVE')

  let fp = await prisma.foundersPass.findUnique({ where: { userId: user.id } })
  if (!fp) {
    fp = await prisma.foundersPass.create({
      data: {
        userId: user.id,
        walletAddress: wallet?.address ?? null,
        walletVerified: Boolean(wallet),
        ...(legacyActive
          ? {
              xFollowSubmitted: true,
              xFollowVerified: true,
              engagementVerified: true,
              telegramVerified: true,
              status: 'ACTIVE',
              activatedAt: user.founderClaimedAt ?? new Date(),
            }
          : {}),
      },
    })
    return fp
  }

  const data = {
    walletAddress: wallet?.address ?? fp.walletAddress,
    walletVerified: Boolean(wallet),
  }
  if (!wallet && !fp.walletVerified) {
    data.walletAddress = null
  }

  if (legacyActive && fp.status !== 'ACTIVE') {
    data.xFollowSubmitted = true
    data.xFollowVerified = true
    data.engagementVerified = true
    data.telegramVerified = true
    data.status = 'ACTIVE'
    data.activatedAt = user.founderClaimedAt ?? new Date()
  }

  return prisma.foundersPass.update({
    where: { userId: user.id },
    data,
  })
}

function allStepsVerified(fp) {
  return (
    fp.walletVerified &&
    fp.xFollowVerified &&
    fp.engagementVerified &&
    fp.telegramVerified
  )
}

/**
 * When all verification flags are true and cohort has capacity, promote FoundersPass + User.
 * @returns {Promise<{ fp: import('@prisma/client').FoundersPass, activated: boolean, cohortFull?: boolean }>}
 */
export async function maybeActivateFoundersPass(userId) {
  const fp = await prisma.foundersPass.findUnique({ where: { userId } })
  if (!fp || fp.status === 'ACTIVE') {
    return { fp, activated: false }
  }
  if (!allStepsVerified(fp)) {
    return { fp, activated: false }
  }

  const activeCount = await prisma.user.count({
    where: { foundingMember: true, founderCredentialStatus: 'ACTIVE' },
  })
  if (activeCount >= FOUNDING_COHORT_MAX) {
    return { fp, activated: false, cohortFull: true }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const pass = await tx.foundersPass.update({
      where: { userId },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    })
    await tx.user.update({
      where: { id: userId },
      data: {
        foundingMember: true,
        foundingCohort: '2026',
        founderClaimedAt: new Date(),
        founderCredentialStatus: 'ACTIVE',
        foundersPassLinked: true,
      },
    })
    await tx.analyticsUsage.create({
      data: {
        userId,
        eventType: 'founders_pass_activated',
        metadata: { cohort: '2026' },
      },
    })
    return pass
  })

  return { fp: updated, activated: true }
}

function normalizeXHandle(raw) {
  const s = String(raw || '').trim()
  if (!s) return null
  const h = s.startsWith('@') ? s : `@${s}`
  if (h.length > 33) return null
  if (h.length < 2) return null
  return h
}

function normalizeTelegram(raw) {
  const s = String(raw || '').trim()
  if (!s) return null
  const u = s.startsWith('@') ? s : `@${s}`
  if (u.length < 2 || u.length > 64) return null
  return u
}

function isHttpUrl(s) {
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * @param {import('@prisma/client').FoundersPass} fp
 */
export function foundersPassStatusPayload(fp) {
  const completedSteps = [
    fp.walletVerified,
    fp.xFollowVerified,
    fp.engagementVerified,
    fp.telegramVerified,
  ].filter(Boolean).length

  return {
    success: true,
    progress: {
      walletVerified: fp.walletVerified,
      xFollowVerified: fp.xFollowVerified,
      engagementVerified: fp.engagementVerified,
      telegramVerified: fp.telegramVerified,
    },
    submitted: {
      xFollow: fp.xFollowSubmitted,
      engagement: Boolean(fp.engagementProofUrl),
      telegram: Boolean(fp.telegramUsername),
    },
    xHandle: fp.xHandle,
    engagementProofUrl: fp.engagementProofUrl,
    telegramUsername: fp.telegramUsername,
    completedSteps,
    totalSteps: 4,
    status: fp.status === 'ACTIVE' ? 'active' : 'pending',
  }
}

/**
 * @param {import('@prisma/client').User & { wallets?: import('@prisma/client').Wallet[] }} user
 */
export async function getFoundersPassStatusForUser(user) {
  const fp = await ensureFoundersPassRecord(user)
  const activation = await maybeActivateFoundersPass(user.id)
  const finalFp = activation.fp
  const payload = foundersPassStatusPayload(finalFp)
  if (activation.cohortFull && allStepsVerified(finalFp) && finalFp.status !== 'ACTIVE') {
    return { ...payload, activationBlockedReason: 'cohort_full' }
  }
  return payload
}

export async function submitFoundersPassX(userId, xHandleRaw) {
  const h = normalizeXHandle(xHandleRaw)
  if (!h) {
    return { ok: false, status: 400, error: 'invalid_x_handle', message: 'Provide a valid X handle (e.g. @username).' }
  }
  const fp = await prisma.foundersPass.findUnique({ where: { userId } })
  if (!fp) return { ok: false, status: 404, error: 'not_found', message: 'Founders Pass record missing.' }
  if (fp.status === 'ACTIVE') {
    return { ok: false, status: 400, error: 'already_active', message: 'Founders Pass is already active.' }
  }
  if (fp.xFollowVerified) {
    return { ok: false, status: 400, error: 'already_verified', message: 'X follow is already verified.' }
  }
  await prisma.foundersPass.update({
    where: { userId },
    data: {
      xHandle: h,
      xFollowSubmitted: true,
      xFollowVerified: false,
    },
  })
  await maybeActivateFoundersPass(userId)
  return { ok: true }
}

export async function submitFoundersPassEngagement(userId, urlRaw) {
  const url = String(urlRaw || '').trim()
  if (!url || url.length > 500 || !isHttpUrl(url)) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_engagement_url',
      message: 'Provide a valid https URL to your post or engagement proof.',
    }
  }
  const fp = await prisma.foundersPass.findUnique({ where: { userId } })
  if (!fp) return { ok: false, status: 404, error: 'not_found', message: 'Founders Pass record missing.' }
  if (fp.status === 'ACTIVE') {
    return { ok: false, status: 400, error: 'already_active', message: 'Founders Pass is already active.' }
  }
  if (fp.engagementVerified) {
    return { ok: false, status: 400, error: 'already_verified', message: 'Engagement is already verified.' }
  }
  await prisma.foundersPass.update({
    where: { userId },
    data: {
      engagementProofUrl: url,
      engagementVerified: false,
    },
  })
  await maybeActivateFoundersPass(userId)
  return { ok: true }
}

export async function submitFoundersPassTelegram(userId, usernameRaw) {
  const u = normalizeTelegram(usernameRaw)
  if (!u) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_telegram_username',
      message: 'Provide a valid Telegram username (e.g. @name).',
    }
  }
  const fp = await prisma.foundersPass.findUnique({ where: { userId } })
  if (!fp) return { ok: false, status: 404, error: 'not_found', message: 'Founders Pass record missing.' }
  if (fp.status === 'ACTIVE') {
    return { ok: false, status: 400, error: 'already_active', message: 'Founders Pass is already active.' }
  }
  if (fp.telegramVerified) {
    return { ok: false, status: 400, error: 'already_verified', message: 'Telegram is already verified.' }
  }
  await prisma.foundersPass.update({
    where: { userId },
    data: {
      telegramUsername: u,
      telegramVerified: false,
    },
  })
  await maybeActivateFoundersPass(userId)
  return { ok: true }
}

/**
 * Used by legacy POST /membership/founding-member/claim — only succeeds if funnel already complete.
 * @param {import('@prisma/client').User & { wallets?: import('@prisma/client').Wallet[] }} user
 */
export async function foundersPassFunnelCompleteForClaim(user) {
  await ensureFoundersPassRecord(user)
  const fp = await prisma.foundersPass.findUnique({ where: { userId: user.id } })
  if (!fp) return false
  return allStepsVerified(fp)
}
