import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyTargetSync,
  parseTargetInput,
  SYMBOL_REGISTRY,
} from './intelligenceTargetClassifier.js'

describe('intelligenceTargetClassifier sync', () => {
  it('detects protocol domains', () => {
    const parsed = parseTargetInput('uniswap.org')
    assert.equal(parsed.kind, 'protocol')
    const c = classifyTargetSync('uniswap.org')
    assert.equal(c.type, 'protocol')
    assert.equal(c.recommendedModule, 'protocol')
    assert.equal(c.confidence, 100)
  })

  it('detects LINK symbol', () => {
    const c = classifyTargetSync('LINK')
    assert.equal(c.type, 'token')
    assert.equal(c.recommendedModule, 'token')
    assert.equal(c.address, SYMBOL_REGISTRY.LINK.address)
  })

  it('detects BONK solana mint', () => {
    const c = classifyTargetSync('DezXAZ8z7PnrnRJjz3wXBoRgixCa6Y7YaB1pPB263')
    assert.equal(c.type, 'token')
    assert.equal(c.chain, 'solana')
    assert.equal(c.symbol, 'BONK')
  })

  it('pending bytecode for unknown eth address', () => {
    const c = classifyTargetSync('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
    assert.equal(c.recommendedModule, 'contract')
    assert.equal(c.addressSubtype, 'pending_bytecode')
  })
})
