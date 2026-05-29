import { Router } from 'express'
import { requireClerkAuth } from '../middleware/clerkAuth.js'
import { prisma } from '../lib/prisma.js'
import { syncUserFromClerk } from '../services/clerkSync.js'
import { loadAuthUser } from '../services/authUser.js'
import {
  getFoundersPassStatusForUser,
  submitFoundersPassEngagement,
  submitFoundersPassTelegram,
  submitFoundersPassX,
} from '../services/foundersPassService.js'

const router = Router()

async function loadUserWithWallets(clerkUserId) {
  return loadAuthUser(clerkUserId, {
    include: { wallets: { orderBy: { verifiedAt: 'desc' } } },
  })
}

router.get('/status', requireClerkAuth, async (req, res) => {
  try {
    const user = await loadUserWithWallets(req.clerkUserId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'user_not_found', message: 'Profile not found.' })
    }
    const payload = await getFoundersPassStatusForUser(user)
    return res.json(payload)
  } catch (e) {
    console.error('[GET /founders-pass/status]', e)
    return res.status(500).json({ success: false, error: 'status_failed' })
  }
})

router.post('/submit-x', requireClerkAuth, async (req, res) => {
  try {
    const user = await loadUserWithWallets(req.clerkUserId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'user_not_found' })
    }
    const result = await submitFoundersPassX(user.id, req.body?.xHandle)
    if (!result.ok) {
      return res.status(result.status).json({ success: false, error: result.error, message: result.message })
    }
    const payload = await getFoundersPassStatusForUser(user)
    return res.json({ success: true, ...payload })
  } catch (e) {
    console.error('[POST /founders-pass/submit-x]', e)
    return res.status(500).json({ success: false, error: 'submit_failed' })
  }
})

router.post('/submit-engagement', requireClerkAuth, async (req, res) => {
  try {
    const user = await loadUserWithWallets(req.clerkUserId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'user_not_found' })
    }
    const result = await submitFoundersPassEngagement(user.id, req.body?.engagementProofUrl)
    if (!result.ok) {
      return res.status(result.status).json({ success: false, error: result.error, message: result.message })
    }
    const payload = await getFoundersPassStatusForUser(user)
    return res.json({ success: true, ...payload })
  } catch (e) {
    console.error('[POST /founders-pass/submit-engagement]', e)
    return res.status(500).json({ success: false, error: 'submit_failed' })
  }
})

router.post('/submit-telegram', requireClerkAuth, async (req, res) => {
  try {
    const user = await loadUserWithWallets(req.clerkUserId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'user_not_found' })
    }
    const result = await submitFoundersPassTelegram(user.id, req.body?.telegramUsername)
    if (!result.ok) {
      return res.status(result.status).json({ success: false, error: result.error, message: result.message })
    }
    const payload = await getFoundersPassStatusForUser(user)
    return res.json({ success: true, ...payload })
  } catch (e) {
    console.error('[POST /founders-pass/submit-telegram]', e)
    return res.status(500).json({ success: false, error: 'submit_failed' })
  }
})

export default router
