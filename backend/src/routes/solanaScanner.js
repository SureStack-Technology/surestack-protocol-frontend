import { Router } from 'express'
import { loadAuthUser } from '../services/authUser.js'
import { makePrimeAuthWithDevBypass, loadPrimeUserForRequest } from '../middleware/primeAuthDevBypass.js'
import { analyzeSolanaRisk } from '../services/solanaRiskScanner/solanaScannerEngine.js'
import { normalizeSolanaAddress } from '../services/solanaRiskScanner/solanaTypes.js'

const router = Router()
const requirePrimeAuth = makePrimeAuthWithDevBypass({ unauthorizedError: 'prime_intel_auth_missing' })

function hasPlusIntelligence(tier) {
  return tier === 'INTELLIGENCE_PRO' || tier === 'STRATEGIC_ACCESS'
}

function resolveScanAddress(body) {
  return normalizeSolanaAddress(body?.address || body?.target || body?.mint)
}

router.post('/analyze', requirePrimeAuth, async (req, res) => {
  console.log('[solanaScanner]', {
    body: req.body,
    devBypass: Boolean(req.devPrimeAuthBypass),
    hasRpc: Boolean(process.env.SOLANA_RPC_URL || process.env.HELIUS_API_KEY),
    hasBirdeye: Boolean(process.env.BIRDEYE_API_KEY && process.env.BIRDEYE_API_KEY !== 'real_key_here'),
    hasLunarCrush: Boolean(process.env.LUNARCRUSH_API_KEY),
  })

  try {
    const user = await loadPrimeUserForRequest(req, loadAuthUser)
    if (!user) return res.status(404).json({ success: false, error: 'user_not_found' })

    if (!hasPlusIntelligence(user.membershipTier)) {
      return res.status(402).json({
        success: false,
        error: 'contract_intel_tier_required',
        message: 'Universal Risk Scanner requires Prime Intelligence or higher.',
      })
    }

    const address = resolveScanAddress(req.body)
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'invalid_solana_address',
        message: 'Invalid Solana address format.',
      })
    }

    const symbol = req.body?.symbol ? String(req.body.symbol).trim().toUpperCase() : null
    console.log('[solanaScanner] analyze start', { address, symbol })

    const report = await analyzeSolanaRisk(address, { symbol })

    console.log('[solanaScanner] analyze done', {
      address,
      success: report?.success,
      error: report?.error,
      trustScore: report?.trustScore,
      compositeTrustScore: report?.compositeTrustScore,
      technicalTrustScore: report?.technicalTrustScore,
      scannerVerdict: report?.scannerVerdict,
      trustBand: report?.trustBand,
      hasTokenConcentration: Boolean(report?.tokenConcentration?.available),
      jupiter: report?.tokenConcentration?.jupiterClassification,
      marketCap: report?.tokenConcentration?.marketCapUsd,
      liquidity: report?.tokenConcentration?.liquidityUsd,
    })

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
