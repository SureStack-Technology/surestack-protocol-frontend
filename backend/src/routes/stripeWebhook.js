import { Router } from 'express'
import {
  constructStripeEvent,
  processStripeEvent,
} from '../services/billing/stripeWebhookHandler.js'

const router = Router()

/**
 * POST /api/webhooks/stripe
 * Must be mounted with express.raw({ type: 'application/json' }) BEFORE express.json().
 */
router.post('/', async (req, res) => {
  const signature = req.headers['stripe-signature']
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'missing_stripe_signature' })
  }

  let event
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '')
    event = constructStripeEvent(rawBody, signature)
  } catch (err) {
    console.warn('[stripe webhook] signature verification failed:', err?.message)
    return res.status(400).json({ error: 'invalid_signature' })
  }

  try {
    const result = await processStripeEvent(event)
    return res.json({ received: true, ...result })
  } catch (e) {
    console.error('[stripe webhook] handler error:', e)
    return res.status(500).json({ error: 'webhook_processing_failed' })
  }
})

export default router
