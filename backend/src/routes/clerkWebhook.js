import { Router } from 'express'
import { Webhook } from 'svix'
import { prisma } from '../lib/prisma.js'
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
      const u = evt.data
      const email =
        u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address ||
        u.email_addresses?.[0]?.email_address

      if (!email) {
        console.warn('[webhook] user.created without email')
        return res.status(200).json({ received: true })
      }

      const primary = u.email_addresses?.find((e) => e.id === u.primary_email_address_id)
      const verified = primary?.verification?.status === 'verified'

      await prisma.user.upsert({
        where: { clerkId: u.id },
        create: {
          clerkId: u.id,
          email,
          emailVerified: Boolean(verified),
          firstName: u.first_name || null,
          lastName: u.last_name || null,
          imageUrl: u.image_url || null,
          membershipTier: 'EXPLORER_ACCESS',
          subscriptionStatus: 'NONE',
          onboardingCompleted: false,
          onboardingStep: 0,
        },
        update: {
          email,
          firstName: u.first_name || null,
          lastName: u.last_name || null,
          imageUrl: u.image_url || null,
        },
      })

      if (process.env.NODE_ENV !== 'production') {
        console.log('[webhook] user.created synced', {
          clerkId: u.id,
          email,
          onboardingCompleted: false,
          membershipTier: 'EXPLORER_ACCESS',
        })
      }

      await sendWelcomeEmail({ to: email, firstName: u.first_name || undefined }).catch((err) => {
        console.warn('[webhook] welcome email failed:', err?.message || err)
      })
    }

    if (type === 'user.updated') {
      const u = evt.data
      const email =
        u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address ||
        u.email_addresses?.[0]?.email_address

      const primary = u.email_addresses?.find((e) => e.id === u.primary_email_address_id)
      const verified = primary?.verification?.status === 'verified'

      if (!email) {
        return res.status(200).json({ received: true })
      }

      await prisma.user.upsert({
        where: { clerkId: u.id },
        create: {
          clerkId: u.id,
          email,
          emailVerified: Boolean(verified),
          firstName: u.first_name || null,
          lastName: u.last_name || null,
          imageUrl: u.image_url || null,
          membershipTier: 'EXPLORER_ACCESS',
          subscriptionStatus: 'NONE',
          onboardingCompleted: false,
          onboardingStep: 0,
        },
        update: {
          email,
          emailVerified: Boolean(verified),
          firstName: u.first_name || null,
          lastName: u.last_name || null,
          imageUrl: u.image_url || null,
        },
      })

      if (verified && email) {
        await sendEmailVerifiedNotice({ to: email }).catch(() => {})
      }
    }

    return res.status(200).json({ received: true })
  } catch (e) {
    console.error('[webhook] handler error:', e)
    return res.status(500).json({ error: 'webhook_processing_failed' })
  }
})

export default router
