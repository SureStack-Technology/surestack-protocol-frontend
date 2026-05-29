import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PRIME_APPROVAL_DEFAULT_CHAIN_ID,
  resolveAlchemyRpcUrl,
  resolvePrimeApprovalChainId,
} from './alchemyChainResolver.js'
import { SEPOLIA_CHAIN_ID } from './walletRiskTypes.js'

test('Prime approval defaults to Ethereum mainnet when wallet is Sepolia', () => {
  const chain = resolvePrimeApprovalChainId(1, SEPOLIA_CHAIN_ID)
  assert.equal(chain, 1)
})

test('resolveAlchemyRpcUrl returns mainnet endpoint for chain 1', () => {
  const hit = resolveAlchemyRpcUrl(1, 'test-key')
  assert.ok(hit?.url?.includes('eth-mainnet.g.alchemy.com'))
  assert.equal(hit.network, 'ethereum')
  assert.equal(hit.chainId, PRIME_APPROVAL_DEFAULT_CHAIN_ID)
})

test('scan chain is used when supported', () => {
  assert.equal(resolvePrimeApprovalChainId(8453, SEPOLIA_CHAIN_ID), 8453)
})
