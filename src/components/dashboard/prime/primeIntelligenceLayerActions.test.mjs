import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CONTRACT_SAMPLE_ADDRESS,
  resolveLayerLaunch,
  LAYER_ACTION_TYPES,
} from './primeIntelligenceLayerActions.mjs'

test('contract layer launch with empty query does not inject sample address', () => {
  const launch = resolveLayerLaunch(LAYER_ACTION_TYPES.CONTRACT, { query: '' })
  assert.equal(launch.query, '')
  assert.equal(launch.skipQueryPrefill, true)
  assert.equal(launch.awaitingInput, true)
  assert.equal(launch.modeId, 'contract')
  assert.match(launch.previewMessage, /Enter a contract address/i)
  assert.notEqual(launch.query, CONTRACT_SAMPLE_ADDRESS)
})

test('contract layer launch retains user-provided contract address', () => {
  const address = '0xabcdef1234567890abcdef1234567890abcdef12'
  const launch = resolveLayerLaunch(LAYER_ACTION_TYPES.CONTRACT, { query: address })
  assert.equal(launch.query, address)
  assert.notEqual(launch.skipQueryPrefill, true)
  assert.notEqual(launch.awaitingInput, true)
})

test('contract sample address is only exposed for explicit sample actions', () => {
  const launch = resolveLayerLaunch(LAYER_ACTION_TYPES.CONTRACT, { query: '' })
  assert.equal(launch.sampleContract, CONTRACT_SAMPLE_ADDRESS)
  assert.equal(launch.query, '')
})
