import { Router } from 'express'
import { makeRequireClerkAuth } from '../middleware/clerkAuth.js'
import { loadAuthUser } from '../services/authUser.js'
import { analyzeSolanaRisk } from '../services/solanaRiskScanner/solanaScannerEngine.js'
import { normalizeSolanaAddress } from '../services/solanaRiskScanner/solanaTypes.js'

const router = Router()
const requirePrimeAuth = makeRequireClerkAuth({ unauthorizedError: 'prime_intel_auth_missing' })

function hasPlusIntelligence(tier) {
  return tier === 'INTELLIGENCE_PRO' || tier === 'STRATEGIC_ACCESS'
}

router.post('/analyze', requirePrimeAuth, async (req, res) => {
  try {
    const user = await loadAuthUser(req.clerkUserId)
    if (!user) return res.status(404).json({ success: false, error: 'user_not_found' })

    if (!hasPlusIntelligence(user.membershipTier)) {
      return res.status(402).json({
        success: false,
        error: 'contract_intel_tier_required',
        message: 'Universal Risk Scanner requires Prime Intelligence or higher.',
      })
    }

    const address = normalizeSolanaAddress(req.body?.address)
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'invalid_solana_address',
        message: 'Invalid Solana address format.',
      })
    }

    const report = await analyzeSolanaRisk(address)
    if (!report.success) {
      const status =
        report.error === 'all_providers_failed'
          ? 503
          : report.error === 'address_not_found'
            ? 404
            : 400
      return res.status(status).json(report)
    }

    return res.json(report)
  } catch (e) {
    console.error('[POST /prime/solana/analyze]', e)
    return res.status(500).json({
      success: false,
      error: 'solana_analyze_failed',
      message: 'Solana risk scan could not complete.',
    })
  }
})

export default router
