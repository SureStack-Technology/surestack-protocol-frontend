import { Router } from 'express'
import { requireClerkAuth } from '../middleware/clerkAuth.js'
import { loadAuthUser } from '../services/authUser.js'
import { requireTier } from '../lib/tierAccess.js'
import {
  getTokenBehaviorIntelligence,
  getWatchlistBehaviorIntelligence,
} from '../services/birdeyeService.js'

const router = Router()

router.get('/watchlist', requireClerkAuth, async (req, res) => {
  try {
    const user = await loadAuthUser(req.clerkUserId)
    const gate = requireTier(user, 'prime')
    if (!gate.ok) {
      return res.status(gate.status).json({
        success: false,
        error: gate.error,
        tier: gate.requiredTier || 'INTELLIGENCE_PRO',
        message: 'Prime Intelligence unlocks on-chain behavior intelligence.',
      })
    }

    const data = await getWatchlistBehaviorIntelligence()
    return res.json({ success: true, data })
  } catch (e) {
    console.error('[GET /intelligence/birdeye/watchlist]', e)
    return res.status(500).json({ success: false, error: 'birdeye_watchlist_failed' })
  }
})

router.get('/token/:address', requireClerkAuth, async (req, res) => {
  try {
    const user = await loadAuthUser(req.clerkUserId)
    const gate = requireTier(user, 'prime')
    if (!gate.ok) {
      return res.status(gate.status).json({
        success: false,
        error: gate.error,
        tier: gate.requiredTier || 'INTELLIGENCE_PRO',
        message: 'Prime Intelligence unlocks on-chain behavior intelligence.',
      })
    }

    const address = req.params.address
    const chain = req.query.chain || 'solana'
    const data = await getTokenBehaviorIntelligence(address, chain)
    return res.json({ success: true, data })
  } catch (e) {
    console.error('[GET /intelligence/birdeye/token/:address]', e)
    return res.status(500).json({ success: false, error: 'birdeye_token_failed' })
  }
})

export default router
