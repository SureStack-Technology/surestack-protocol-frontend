import { prisma } from '../../lib/prisma.js'
import { getStripe } from './stripeClient.js'
import { applySubscriptionEntitlement } from './primeCheckout.js'

/**
 * @param {string} stripeEventId
 * @returns {Promise<boolean>} true if already processed
 */
async function alreadyProcessed(stripeEventId) {
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId },
  })
  return Boolean(existing)
}

/**
 * @param {string} stripeEventId
 * @param {string} type
 */
async function markProcessed(stripeEventId, type) {
  try {
    await prisma.stripeWebhookEvent.create({
      data: { stripeEventId, type },
    })
  } catch (e) {
    if (e?.code === 'P2002') return // race — already marked
    throw e
  }
}

/**
 * Resolve SureStack user id from common Stripe object shapes.
 * @param {Record<string, unknown>} obj
 */
function extractUserId(obj) {
  const meta = /** @type {Record<string, string>|undefined} */ (obj?.metadata)
  if (meta?.surestackUserId) return meta.surestackUserId
  if (typeof obj?.client_reference_id === 'string') return obj.client_reference_id
  return null
}

/**
 * @param {import('stripe').Stripe.Event} event
 */
async function handleCheckoutSessionCompleted(event) {
  const session = /** @type {import('stripe').Stripe.Checkout.Session} */ (event.data.object)
  const userId = extractUserId(session)
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

  let stripeStatus = 'active'
  if (subscriptionId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId)
      stripeStatus = sub.status
    } catch (e) {
      console.warn('[stripe] checkout.session.completed: could not fetch subscription', e?.message)
    }
  }

  await applySubscriptionEntitlement({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeStatus,
  })
}

/**
 * @param {import('stripe').Stripe.Event} event
 */
async function handleSubscriptionEvent(event) {
  const sub = /** @type {import('stripe').Stripe.Subscription} */ (event.data.object)
  const userId = extractUserId(sub)
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id

  await applySubscriptionEntitlement({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    stripeStatus: sub.status,
  })
}

/**
 * @param {import('stripe').Stripe.Event} event
 */
async function handleInvoiceEvent(event, { failed }) {
  const invoice = /** @type {import('stripe').Stripe.Invoice} */ (event.data.object)
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id

  let stripeStatus = failed ? 'past_due' : 'active'
  let userId = null

  if (subscriptionId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId)
      stripeStatus = failed ? (sub.status === 'active' ? 'past_due' : sub.status) : sub.status
      userId = extractUserId(sub)
    } catch (e) {
      console.warn('[stripe] invoice handler: subscription retrieve failed', e?.message)
    }
  }

  await applySubscriptionEntitlement({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeStatus,
  })
}

/**
 * Process a verified Stripe event. Idempotent on event.id.
 * @param {import('stripe').Stripe.Event} event
 */
export async function processStripeEvent(event) {
  if (!event?.id || !event?.type) {
    return { ok: false, reason: 'invalid_event' }
  }

  if (await alreadyProcessed(event.id)) {
    return { ok: true, duplicate: true }
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event)
      break
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionEvent(event)
      break
    case 'invoice.paid':
      await handleInvoiceEvent(event, { failed: false })
      break
    case 'invoice.payment_failed':
      await handleInvoiceEvent(event, { failed: true })
      break
    default:
      // Acknowledge unknown types without error (forward-compat)
      break
  }

  await markProcessed(event.id, event.type)
  return { ok: true, duplicate: false, type: event.type }
}

/**
 * Construct and verify Stripe event from raw body + signature header.
 * @param {Buffer|string} rawBody
 * @param {string} signature
 */
export function constructStripeEvent(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !String(secret).trim()) {
    const err = new Error('stripe_webhook_not_configured')
    err.code = 'STRIPE_WEBHOOK_NOT_CONFIGURED'
    throw err
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, secret)
}
