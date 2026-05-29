import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeClientInventoryForScan,
  verifiedWalletForUser,
} from './walletExposureResolve.js'

test('normalizeClientInventory rejects wrong-chain preload', () => {
  const inv = normalizeClientInventoryForScan(
    { rows: [{ spender: '0xabc' }], chainId: 11155111 },
    1,
  )
  assert.equal(inv, null)
})

test('normalizeClientInventory accepts matching chain', () => {
  const inv = normalizeClientInventoryForScan(
    { rows: [{ spender: '0xabc' }], chainId: 1 },
    1,
  )
  assert.ok(inv?.rows?.length === 1)
})

test('verified wallet may be Sepolia while scan uses mainnet inventory path', () => {
  const wallet = verifiedWalletForUser({
    wallets: [{ address: '0x1234567890123456789012345678901234567890', chainId: 11155111, verifiedAt: new Date() }],
  })
  assert.equal(wallet.chainId, 11155111)
  assert.notEqual(wallet.chainId, 1)
})
