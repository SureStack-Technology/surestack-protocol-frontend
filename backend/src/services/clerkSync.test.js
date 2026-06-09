import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractClerkProfileFromApiUser,
  extractClerkProfileFromWebhookUser,
} from './clerkSync.js'

describe('extractClerkProfileFromApiUser', () => {
  it('returns normalized profile for primary email', () => {
    const profile = extractClerkProfileFromApiUser({
      id: 'user_abc',
      firstName: 'Ada',
      lastName: 'Lovelace',
      imageUrl: 'https://example.com/a.png',
      primaryEmailAddressId: 'em_1',
      emailAddresses: [
        {
          id: 'em_1',
          emailAddress: ' Ada@Example.com ',
          verification: { status: 'verified' },
        },
      ],
    })

    assert.equal(profile?.clerkId, 'user_abc')
    assert.equal(profile?.email, 'Ada@Example.com')
    assert.equal(profile?.emailVerified, true)
    assert.equal(profile?.firstName, 'Ada')
  })

  it('returns null when email missing', () => {
    assert.equal(extractClerkProfileFromApiUser({ id: 'user_abc', emailAddresses: [] }), null)
  })
})

describe('extractClerkProfileFromWebhookUser', () => {
  it('maps snake_case webhook payload', () => {
    const profile = extractClerkProfileFromWebhookUser({
      id: 'user_xyz',
      first_name: 'Grace',
      last_name: 'Hopper',
      image_url: null,
      primary_email_address_id: 'em_2',
      email_addresses: [
        {
          id: 'em_2',
          email_address: 'grace@example.com',
          verification: { status: 'verified' },
        },
      ],
    })

    assert.equal(profile?.clerkId, 'user_xyz')
    assert.equal(profile?.email, 'grace@example.com')
    assert.equal(profile?.emailVerified, true)
  })
})
