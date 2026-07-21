import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  mapStripeSubscriptionStatus,
  resolveMembershipTierAfterStripe,
} from './stripeEntitlements.js'

describe('mapStripeSubscriptionStatus', () => {
  it('grants Prime for active and trialing', () => {
    assert.deepEqual(mapStripeSubscriptionStatus('active'), {
      subscriptionStatus: 'ACTIVE',
      grantsPrime: true,
    })
    assert.deepEqual(mapStripeSubscriptionStatus('trialing'), {
      subscriptionStatus: 'TRIALING',
      grantsPrime: true,
    })
  })

  it('revokes Prime for past_due, canceled, unpaid', () => {
    assert.equal(mapStripeSubscriptionStatus('past_due').grantsPrime, false)
    assert.equal(mapStripeSubscriptionStatus('past_due').subscriptionStatus, 'PAST_DUE')
    assert.equal(mapStripeSubscriptionStatus('canceled').grantsPrime, false)
    assert.equal(mapStripeSubscriptionStatus('unpaid').grantsPrime, false)
  })
})

describe('resolveMembershipTierAfterStripe', () => {
  it('upgrades Explorer to INTELLIGENCE_PRO when grantsPrime', () => {
    assert.equal(
      resolveMembershipTierAfterStripe({ currentTier: 'EXPLORER_ACCESS', grantsPrime: true }),
      'INTELLIGENCE_PRO',
    )
  })

  it('does not overwrite STRATEGIC_ACCESS when granting', () => {
    assert.equal(
      resolveMembershipTierAfterStripe({ currentTier: 'STRATEGIC_ACCESS', grantsPrime: true }),
      undefined,
    )
  })

  it('does not overwrite STRATEGIC_ACCESS when revoking', () => {
    assert.equal(
      resolveMembershipTierAfterStripe({ currentTier: 'STRATEGIC_ACCESS', grantsPrime: false }),
      undefined,
    )
  })

  it('demotes INTELLIGENCE_PRO to Explorer when revoking', () => {
    assert.equal(
      resolveMembershipTierAfterStripe({ currentTier: 'INTELLIGENCE_PRO', grantsPrime: false }),
      'EXPLORER_ACCESS',
    )
  })

  it('leaves INTELLIGENCE_PRO unchanged when already granting', () => {
    assert.equal(
      resolveMembershipTierAfterStripe({ currentTier: 'INTELLIGENCE_PRO', grantsPrime: true }),
      undefined,
    )
  })
})
