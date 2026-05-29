import { Router } from 'express'
import { makeRequireClerkAuth } from '../middleware/clerkAuth.js'
import { prisma } from '../lib/prisma.js'
import { syncUserFromClerk } from '../services/clerkSync.js'
import { getWalletRiskIndexResponse } from '../services/walletRisk/walletRiskService.js'

const requireWalletRiskAuth = makeRequireClerkAuth({ unauthorizedError: 'wallet_risk_auth_missing' })

const router = Router()

router.get('/risk-index', requireWalletRiskAuth, async (req, res) => {
  const logBase = { route: 'GET /api/wallet/risk-index', clerkUserId: req.clerkUserId }
  try {
    let user = await prisma.user.findUnique({ where: { clerkId: req.clerkUserId } })
    if (!user) {
      user = await syncUserFromClerk(req.clerkUserId)
    }
    if (!user) {
      console.warn('[walletRisk]', JSON.stringify({ ...logBase, auth: 'ok', userSync: 'failed' }))
      return res.status(404).json({ success: false, error: 'user_not_synced' })
    }

    const refresh = String(req.query.refresh || '') === 'true'
    const { status, json } = await getWalletRiskIndexResponse({ userId: user.id, refresh })

    const hasAlchemyKey = Boolean(process.env.ALCHEMY_API_KEY && String(process.env.ALCHEMY_API_KEY).trim())
    console.log(
      '[walletRisk]',
      JSON.stringify({
        ...logBase,
        auth: 'ok',
        userId: user.id,
        resolvedWallet: json?.wallet ?? null,
        resolvedChainId: json?.chainId ?? null,
        hasAlchemyKey,
        responseSuccess: Boolean(json?.success),
        httpStatus: status,
        errorCode: json?.success ? undefined : json?.error,
        providerMessage: json?.success ? undefined : json?.message,
      }),
    )

    return res.status(status).json(json)
  } catch (e) {
    const msg = e?.message || String(e)
    console.error('[walletRisk]', JSON.stringify({ ...logBase, exception: msg }))
    return res.status(500).json({
      success: false,
      error: 'risk_index_failed',
      message: 'Unexpected error computing Wallet Risk Index.',
    })
  }
})

export default router
