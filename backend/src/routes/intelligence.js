import { Router } from 'express'
import { requireClerkAuth } from '../middleware/clerkAuth.js'
import { loadAuthUser } from '../services/authUser.js'
import { requireTier } from '../lib/tierAccess.js'
import {
  getExplorerMarketSentiment,
  getPrimeSocialTrends,
} from '../services/lunarCrushService.js'

const router = Router()

router.get('/market/sentiment', requireClerkAuth, async (req, res) => {
  try {
    const user = await loadAuthUser(req.clerkUserId)
    const gate = requireTier(user, 'explorer')
    if (!gate.ok) {
      return res.status(gate.status).json({
        success: false,
        error: gate.error,
        ...(gate.requiredTier ? { tier: gate.requiredTier } : {}),
      })
    }

    const data = await getExplorerMarketSentiment()
    return res.json({ success: true, data })
  } catch (e) {
    console.error('[GET /intelligence/market/sentiment]', e)
    return res.status(500).json({ success: false, error: 'sentiment_failed' })
  }
})

router.get('/social/trends', requireClerkAuth, async (req, res) => {
  try {
    const user = await loadAuthUser(req.clerkUserId)
    const gate = requireTier(user, 'prime')
    if (!gate.ok) {
      return res.status(gate.status).json({
        success: false,
        error: gate.error,
        tier: gate.requiredTier || 'INTELLIGENCE_PRO',
        message: 'Prime Intelligence unlocks full social trend intelligence.',
      })
    }

    const data = await getPrimeSocialTrends()
    return res.json({ success: true, data })
  } catch (e) {
    console.error('[GET /intelligence/social/trends]', e)
    return res.status(500).json({ success: false, error: 'social_trends_failed' })
  }
})

export default router
