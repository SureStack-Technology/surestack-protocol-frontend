import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Stripe from 'stripe'
import { constructStripeEvent } from './stripeWebhookHandler.js'
import { __resetStripeClientForTests } from './stripeClient.js'
import {
  mapStripeSubscriptionStatus,
  resolveMembershipTierAfterStripe,
} from './stripeEntitlements.js'

const TEST_SECRET = 'whsec_test_secret_surestack_prime'
const stripe = new Stripe('sk_test_placeholder', { apiVersion: '2025-02-24.acacia' })

describe('checkout authorization contract', () => {
  it('requires Clerk auth on POST /api/billing/prime/checkout', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const src = fs.readFileSync(join(here, '../../routes/billing.js'), 'utf8')
    assert.match(src, /router\.post\(\s*['"]\/prime\/checkout['"]\s*,\s*requireClerkAuth/)
    assert.match(src, /createPrimeCheckoutSession/)
  })

  it('registers Stripe webhook before express.json in server.js', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const src = fs.readFileSync(join(here, '../../server.js'), 'utf8')
    const stripeMount = src.indexOf("app.use('/api/webhooks/stripe'")
    const jsonMount = src.indexOf('app.use(express.json()')
    assert.ok(stripeMount > -1 && jsonMount > -1)
    assert.ok(stripeMount < jsonMount, 'Stripe webhook must mount before express.json()')
    assert.match(src, /express\.raw\(\s*\{\s*type:\s*['"]application\/json['"]/)
  })
})

describe('webhook signature rejection', () => {
  it('rejects invalid signatures', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
    process.env.STRIPE_WEBHOOK_SECRET = TEST_SECRET
    __resetStripeClientForTests()
    assert.throws(() => constructStripeEvent(Buffer.from('{"id":"evt_x"}'), 't=1,v1=bad'))
  })

  it('rejects missing webhook secret configuration', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
    delete process.env.STRIPE_WEBHOOK_SECRET
    __resetStripeClientForTests()
    assert.throws(() => constructStripeEvent(Buffer.from('{}'), 't=1,v1=x'), /webhook_not_configured|Webhook/i)
  })

  it('accepts valid Stripe test header signatures', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
    process.env.STRIPE_WEBHOOK_SECRET = TEST_SECRET
    __resetStripeClientForTests()
    const event = {
      id: 'evt_sig_ok',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_1', object: 'checkout.session' } },
    }
    const payload = JSON.stringify(event)
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: TEST_SECRET })
    const verified = constructStripeEvent(Buffer.from(payload), header)
    assert.equal(verified.id, 'evt_sig_ok')
  })
})

describe('successful activation mapping', () => {
  it('maps active/trialing to Prime grant', () => {
    assert.equal(mapStripeSubscriptionStatus('active').grantsPrime, true)
    assert.equal(mapStripeSubscriptionStatus('trialing').grantsPrime, true)
    assert.equal(
      resolveMembershipTierAfterStripe({ currentTier: 'EXPLORER_ACCESS', grantsPrime: true }),
      'INTELLIGENCE_PRO',
    )
  })
})

describe('failed payment and cancellation mapping', () => {
  it('revokes Prime for past_due and canceled', () => {
    assert.equal(mapStripeSubscriptionStatus('past_due').grantsPrime, false)
    assert.equal(mapStripeSubscriptionStatus('canceled').grantsPrime, false)
    assert.equal(
      resolveMembershipTierAfterStripe({ currentTier: 'INTELLIGENCE_PRO', grantsPrime: false }),
      'EXPLORER_ACCESS',
    )
  })

  it('never demotes Atlas (STRATEGIC_ACCESS)', () => {
    assert.equal(
      resolveMembershipTierAfterStripe({ currentTier: 'STRATEGIC_ACCESS', grantsPrime: false }),
      undefined,
    )
    assert.equal(
      resolveMembershipTierAfterStripe({ currentTier: 'STRATEGIC_ACCESS', grantsPrime: true }),
      undefined,
    )
  })
})

describe('duplicate webhook delivery contract', () => {
  it('StripeWebhookEvent model exists for idempotency', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const schema = fs.readFileSync(join(here, '../../../prisma/schema.prisma'), 'utf8')
    assert.match(schema, /model StripeWebhookEvent/)
    assert.match(schema, /stripeEventId\s+String\s+@unique/)

    const handler = fs.readFileSync(join(here, './stripeWebhookHandler.js'), 'utf8')
    assert.match(handler, /alreadyProcessed/)
    assert.match(handler, /duplicate:\s*true/)
  })
})
