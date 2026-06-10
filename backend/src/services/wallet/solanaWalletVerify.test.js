import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import {
  buildSolanaVerificationMessage,
  isValidSolanaAddress,
  verifySolanaWalletSignature,
} from './solanaWalletVerify.js'

describe('solanaWalletVerify', () => {
  it('builds deterministic challenge message', () => {
    const msg = buildSolanaVerificationMessage({
      nonce: 'abc-123',
      address: '11111111111111111111111111111111',
      walletChain: 'SOLANA_DEVNET',
    })
    assert.match(msg, /SureStack Wallet Verification/)
    assert.match(msg, /Nonce: abc-123/)
    assert.match(msg, /Wallet Chain: SOLANA_DEVNET/)
  })

  it('validates known Solana system program address', () => {
    assert.equal(isValidSolanaAddress('11111111111111111111111111111111'), true)
    assert.equal(isValidSolanaAddress('not-a-wallet'), false)
  })

  it('verifies ed25519 detached signature', () => {
    const keyPair = nacl.sign.keyPair()
    const walletAddress = bs58.encode(keyPair.publicKey)
    const message = buildSolanaVerificationMessage({
      nonce: 'test-nonce',
      address: walletAddress,
      walletChain: 'SOLANA_DEVNET',
    })
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = nacl.sign.detached(messageBytes, keyPair.secretKey)
    const signatureBase64 = Buffer.from(signatureBytes).toString('base64')

    const result = verifySolanaWalletSignature({
      message,
      walletAddress,
      signature: signatureBase64,
    })

    assert.equal(result.ok, true)
    assert.equal(result.address, walletAddress)
  })
})
