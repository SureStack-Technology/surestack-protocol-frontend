import { Router } from 'express'

const router = Router()

/**
 * @deprecated Paid Bronze/Silver/Gold Founders checkout is not part of launch strategy.
 * Founders Pass community credential: complete funnel + POST /api/membership/founding-member/claim (Clerk + verified wallet + team checks).
 * This route is retained only for backwards compatibility; clients should not call it.
 */
router.post('/founders/checkout-stub', (req, res) => {
  return res.status(410).json({
    deprecated: true,
    error: 'deprecated',
    message:
      'Paid Founders checkout is deprecated. Founders Pass is a limited early community credential — use /founders-pass and POST /api/membership/founding-member/claim after the full funnel is verified.',
  })
})

export default router
