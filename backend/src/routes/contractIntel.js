import { Router } from 'express'
import { loadAuthUser } from '../services/authUser.js'
import { prisma } from '../lib/prisma.js'
import { makePrimeAuthWithDevBypass, loadPrimeUserForRequest } from '../middleware/primeAuthDevBypass.js'
import { analyzeContractIntelligence } from '../services/contractIntelligence/contractIntelEngine.js'
import { applyConfidenceCalibration } from '../services/scannerConfidence/scannerConfidenceEngine.js'
import { resolveWalletExposureForScan } from '../services/walletExposure/walletExposureResolve.js'
import {
  getCachedContractReport,
  listContractHistory,
  persistContractIntelligenceReport,
} from '../services/contractIntelligence/contractIntelPersistence.js'
import {
  isSupportedContractChain,
  normalizeContractAddress,
} from '../services/contractIntelligence/contractIntelTypes.js'

const router = Router()
const requirePrimeAuth = makePrimeAuthWithDevBypass({ unauthorizedError: 'prime_intel_auth_missing' })

async function loadUser(clerkUserId) {
  return loadAuthUser(clerkUserId, {
    include: { wallets: { orderBy: { verifiedAt: 'desc' } } },
  })
}

function hasPlusIntelligence(tier) {
  return tier === 'INTELLIGENCE_PRO' || tier === 'STRATEGIC_ACCESS'
}

/** Atlas / operator tier receives Alpha-advanced contract intel in current schema. */
function hasAlphaContractIntel(tier) {
  return tier === 'STRATEGIC_ACCESS'
}

function resolveContractTier(membershipTier) {
  if (hasAlphaContractIntel(membershipTier)) return 'alpha_advanced'
  if (hasPlusIntelligence(membershipTier)) return 'prime_lite'
  return null
}

router.post('/analyze', requirePrimeAuth, async (req, res) => {
  try {
    const user = await loadPrimeUserForRequest(req, loadAuthUser)
    if (!user) return res.status(404).json({ success: false, error: 'user_not_found' })

    const tier = resolveContractTier(user.membershipTier)
    if (!tier) {
      return res.status(402).json({
        success: false,
        error: 'contract_intel_tier_required',
        message: 'Contract Intelligence Engine requires Prime Intelligence or higher.',
      })
    }

    const address = normalizeContractAddress(req.body?.address)
    const chainId = Number(req.body?.chainId) || 1
    if (!address) {
      return res.status(400).json({ success: false, error: 'invalid_contract_address' })
    }
    if (!isSupportedContractChain(chainId)) {
      return res.status(400).json({ success: false, error: 'unsupported_chain' })
    }

    const related = Array.isArray(req.body?.relatedAddresses)
      ? req.body.relatedAddresses.map(normalizeContractAddress).filter(Boolean)
      : []

    const report = await analyzeContractIntelligence({
      address,
      chainId,
      tier,
      relatedAddresses: related,
    })

    const clientInventory = req.body?.approvalInventory
    const walletExposure = await resolveWalletExposureForScan(
      user,
      address,
      chainId,
      clientInventory,
    )
    let enriched = { ...report, walletExposure }
    if (enriched.trustScore != null) {
      enriched = applyConfidenceCalibration(enriched, 'evm')
    }

    if (req.devPrimeAuthBypass) {
      return res.json({
        ...enriched,
        reportId: null,
        cached: false,
        devBypass: true,
      })
    }

    const row = await persistContractIntelligenceReport(user.id, enriched)

    return res.json({
      ...enriched,
      reportId: row.id,
      cached: false,
    })
  } catch (e) {
    console.error('[POST /prime/contracts/analyze]', e)
    return res.status(500).json({ success: false, error: 'contract_analyze_failed' })
  }
})

router.get('/:address', requirePrimeAuth, async (req, res) => {
  try {
    const user = await loadUser(req.clerkUserId)
    if (!user) return res.status(404).json({ success: false, error: 'user_not_found' })

    const tier = resolveContractTier(user.membershipTier)
    if (!tier) {
      return res.status(402).json({
        success: false,
        error: 'contract_intel_tier_required',
        message: 'Contract Intelligence Engine requires Prime Intelligence or higher.',
      })
    }

    const address = normalizeContractAddress(req.params.address)
    const chainId = Number(req.query.chainId) || 1
    if (!address) {
      return res.status(400).json({ success: false, error: 'invalid_contract_address' })
    }
    if (!isSupportedContractChain(chainId)) {
      return res.status(400).json({ success: false, error: 'unsupported_chain' })
    }

    const cached = await getCachedContractReport(user.id, address, chainId)
    const history = await listContractHistory(user.id, address, chainId)

    if (!cached) {
      return res.status(404).json({
        success: false,
        error: 'report_not_found',
        message: 'No cached report — run POST /api/prime/contracts/analyze first.',
        history,
      })
    }

    return res.json({
      success: true,
      cached: true,
      reportId: cached.id,
      updatedAt: cached.updatedAt,
      history,
      ...(typeof cached.report === 'object' && cached.report ? cached.report : {}),
    })
  } catch (e) {
    console.error('[GET /prime/contracts/:address]', e)
    return res.status(500).json({ success: false, error: 'contract_report_failed' })
  }
})

export default router
