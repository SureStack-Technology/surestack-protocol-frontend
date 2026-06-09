import { Router } from 'express'
import { Webhook } from 'svix'
import {
  extractClerkProfileFromWebhookUser,
  upsertUserFromClerkProfile,
} from '../services/clerkSync.js'
import { sendWelcomeEmail, sendEmailVerifiedNotice } from '../services/email.js'

const router = Router()

router.post('/', async (req, res) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook] CLERK_WEBHOOK_SECRET missing')
    return res.status(500).json({ error: 'webhook_not_configured' })
  }

  const raw = req.body
  const payload =
    Buffer.isBuffer(raw) ? raw.toString('utf8') : typeof raw === 'string' ? raw : JSON.stringify(raw ?? {})
  if (!payload) {
    return res.status(400).json({ error: 'invalid_payload' })
  }

  const svixId = req.headers['svix-id']
  const svixTimestamp = req.headers['svix-timestamp']
  const svixSignature = req.headers['svix-signature']

  let evt
  try {
    const wh = new Webhook(secret)
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch (err) {
    console.warn('[webhook] verification failed:', err?.message)
    return res.status(400).json({ error: 'invalid_signature' })
  }

  const type = evt.type

  try {
    if (type === 'user.created') {
      const profile = extractClerkProfileFromWebhookUser(evt.data)
      if (!profile) {
        console.warn('[webhook] user.created without email')
        return res.status(200).json({ received: true })
      }

      const row = await upsertUserFromClerkProfile(profile)

      if (process.env.NODE_ENV !== 'production') {
        console.log('[webhook] user.created synced', {
          clerkId: profile.clerkId,
          email: profile.email,
          onboardingCompleted: row.onboardingCompleted,
          membershipTier: row.membershipTier,
        })
      }

      await sendWelcomeEmail({ to: profile.email, firstName: profile.firstName || undefined }).catch(
        (err) => {
          console.warn('[webhook] welcome email failed:', err?.message || err)
        },
      )
    }

    if (type === 'user.updated') {
      const profile = extractClerkProfileFromWebhookUser(evt.data)
      if (!profile) {
        return res.status(200).json({ received: true })
      }

      await upsertUserFromClerkProfile(profile)

      if (profile.emailVerified && profile.email) {
        await sendEmailVerifiedNotice({ to: profile.email }).catch(() => {})
      }
    }

    return res.status(200).json({ received: true })
  } catch (e) {
    console.error('[webhook] handler error:', e)
    return res.status(500).json({ error: 'webhook_processing_failed' })
  }
})

export default router
