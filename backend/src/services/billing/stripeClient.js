import Stripe from 'stripe'

let stripeSingleton = null

/**
 * @returns {Stripe}
 */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !String(key).trim()) {
    const err = new Error('stripe_not_configured')
    err.code = 'STRIPE_NOT_CONFIGURED'
    throw err
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
    })
  }
  return stripeSingleton
}

export function getPrimePriceId() {
  const id = process.env.STRIPE_PRIME_PRICE_ID
  if (!id || !String(id).trim()) {
    const err = new Error('stripe_price_not_configured')
    err.code = 'STRIPE_PRICE_NOT_CONFIGURED'
    throw err
  }
  return String(id).trim()
}

export function getFrontendUrl() {
  const url = (process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:3000')
    .trim()
    .replace(/\/$/, '')
  return url
}

/** Reset singleton (tests only). */
export function __resetStripeClientForTests() {
  stripeSingleton = null
}
