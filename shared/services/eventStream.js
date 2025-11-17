import { ethers } from 'ethers'
import { putMany, getAll } from '../utils/idb'
import PolicyManagerABI from '../abi/PolicyManager.json'
import ConsensusStakingV2ABI from '../abi/ConsensusAndStaking.json'
import DAOGovernanceABI from '../abi/DAOGovernance.json'
import RewardPoolABI from '../abi/RewardPool.json'
import { ADDR } from '../constants/addresses'

const MAX_EVENTS = 50
const EVENT_LOG_KEY = 'eventLog'

let wsProvider = null
let listeners = []
let isConnected = false
let reconnectAttempts = 0
const maxReconnectAttempts = 5
let reconnectTimer = null

/**
 * Normalize event data to common format
 * @param {string} type - Event type name
 * @param {Object} event - Ethers event object
 * @param {string} txHash - Transaction hash
 * @returns {Object} Normalized event
 */
function normalizeEvent(type, event, txHash) {
  const blockNumber = event.blockNumber
  const timestamp = Date.now() // Approximate, will be refined with block timestamp
  
  // Extract common fields based on event type
  let policyId = null
  let value = null
  let from = null
  
  if (type === 'PolicyCreated') {
    policyId = event.args.policyId?.toString() || null
    from = event.args.owner || event.args.policyHolder || null
    value = event.args.premium?.toString() || event.args.amount?.toString() || '0'
  } else if (type === 'ClaimProcessed') {
    policyId = event.args.policyId?.toString() || null
    from = event.args.claimant || event.args.owner || null
    value = event.args.payoutAmount?.toString() || event.args.amount?.toString() || '0'
  } else if (type === 'Staked') {
    from = event.args.validator || event.args.user || null
    value = event.args.amount?.toString() || '0'
  } else if (type === 'RewardDistributed') {
    from = event.args.validator || event.args.recipient || null
    value = event.args.amount?.toString() || event.args.reward?.toString() || '0'
  } else if (type === 'ProposalCreated') {
    policyId = event.args.proposalId?.toString() || null
    from = event.args.proposer || null
    value = '0'
  } else if (type === 'VoteCast') {
    policyId = event.args.proposalId?.toString() || null
    from = event.args.voter || null
    value = event.args.weight?.toString() || event.args.votes?.toString() || '0'
  }
  
  return {
    type,
    policyId,
    value,
    from: from || '0x0000000000000000000000000000000000000000',
    timestamp,
    txHash,
    blockNumber
  }
}

/**
 * Store event in IndexedDB
 * @param {Object} event - Normalized event
 */
async function storeEvent(event) {
  try {
    const existing = await getAll(EVENT_LOG_KEY) || []
    const updated = [event, ...existing].slice(0, MAX_EVENTS)
    await putMany(EVENT_LOG_KEY, updated, MAX_EVENTS)
  } catch (err) {
    console.warn('[EventStream] Failed to store event:', err)
  }
}

/**
 * Connect to WebSocket provider
 */
function connectWebSocket() {
  const WS_URL = import.meta.env.VITE_ALCHEMY_WS
  console.info("[EventStream][Diag] WS_URL =", WS_URL)
  if (!WS_URL) {
    console.warn("[EventStream][Diag] Missing VITE_ALCHEMY_WS; event streaming will not start.")
    return null
  }

  try {
    const ws = new ethers.WebSocketProvider(WS_URL)
    wsProvider = ws
    
    ws.on("open", async () => {
      console.log("[EventStream] Connected to Alchemy WS")
      isConnected = true
      reconnectAttempts = 0
      // Setup listeners after connection is established
      await setupEventListeners()
    })

    ws.on("error", (err) => {
      console.warn("[EventStream] WebSocket error:", err)
      isConnected = false
      handleReconnect()
    })

    ws.on("close", () => {
      console.warn("[EventStream] WebSocket closed")
      isConnected = false
      handleReconnect()
    })

    return ws
  } catch (err) {
    console.warn("[EventStream] WebSocket init failed:", err)
    return null
  }
}

/**
 * Handle reconnection logic
 */
function handleReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.warn("[EventStream] Max reconnect attempts reached, falling back to polling")
    return
  }

  reconnectAttempts++
  console.log(`[EventStream] Reconnecting in 15 s… (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)

  reconnectTimer = setTimeout(() => {
    if (wsProvider) {
      wsProvider.destroy()
      wsProvider = null
    }
    connectWebSocket()
    setupEventListeners()
  }, 15000)
}

/**
 * Setup event listeners for all contracts
 */
async function setupEventListeners() {
  if (!wsProvider || !isConnected) {
    return
  }

  const policyManagerAddr = ADDR.POLICY_MANAGER
  const consensusAddr = ADDR.STAKING
  const daoAddr = ADDR.DAO
  const rewardPoolAddr = ADDR.REWARD_POOL

  console.info("[EventStream][Diag] Addresses:", {
    policyManager: policyManagerAddr,
    consensus: consensusAddr,
    rewardPool: rewardPoolAddr,
    dao: daoAddr,
  })

  if (!policyManagerAddr || !consensusAddr || !daoAddr) {
    console.warn('[EventStream] Missing contract addresses')
    return
  }

  // Determine a recent starting block to ensure we see activity soon
  const START_WINDOW = 2000 // ~recent blocks
  let currentBlock = 0
  try {
    currentBlock = await wsProvider.getBlockNumber()
    console.info("[EventStream][Diag] Current block:", currentBlock)
  } catch (e) {
    console.warn("[EventStream][Diag] Could not fetch blockNumber:", e)
  }
  const fromBlock = currentBlock ? Math.max(0, currentBlock - START_WINDOW) : undefined
  if (fromBlock) console.info("[EventStream][Diag] Subscribing fromBlock:", fromBlock)

  try {
    // PolicyManager events
    if (policyManagerAddr) {
      const policyManager = new ethers.Contract(policyManagerAddr, PolicyManagerABI.abi, wsProvider)
      
      // Historical primer fetch (so UI isn't empty if no new tx yet)
      async function primeHistory() {
        try {
          if (fromBlock) {
            const policyCreated = await policyManager.queryFilter("PolicyCreated", fromBlock, "latest")
            policyCreated.slice(-5).forEach(ev => {
              const normalized = normalizeEvent('PolicyCreated', ev, ev.transactionHash)
              storeEvent(normalized).then(() => notifyListeners(normalized))
            })
            console.info("[EventStream][Diag] Primed PolicyCreated:", policyCreated.length)
          }
        } catch (e) {
          console.warn("[EventStream][Diag] Prime error PolicyCreated:", e)
        }
      }
      primeHistory()
      
      policyManager.on("PolicyCreated", async (policyId, owner, event) => {
        const normalized = normalizeEvent('PolicyCreated', event, event.transactionHash)
        await storeEvent(normalized)
        notifyListeners(normalized)
        console.log(`[EventStream] New event: PolicyCreated → Policy #${policyId}`)
      })

      policyManager.on("ClaimProcessed", async (policyId, claimant, payoutAmount, event) => {
        const normalized = normalizeEvent('ClaimProcessed', event, event.transactionHash)
        await storeEvent(normalized)
        notifyListeners(normalized)
        const value = ethers.formatUnits(payoutAmount || 0, 18)
        console.log(`[EventStream] New event: ClaimProcessed → ${value} SST`)
      })
    }

    // ConsensusAndStakingV2 events
    if (consensusAddr) {
      const consensus = new ethers.Contract(consensusAddr, ConsensusStakingV2ABI.abi, wsProvider)
      
      consensus.on("Staked", async (validator, amount, totalStaked, event) => {
        const normalized = normalizeEvent('Staked', event, event.transactionHash)
        await storeEvent(normalized)
        notifyListeners(normalized)
        const value = ethers.formatUnits(amount || 0, 18)
        console.log(`[EventStream] New event: ValidatorStaked → ${value} SST`)
      })
    }

    // RewardPool events
    if (rewardPoolAddr) {
      const rewardPool = new ethers.Contract(rewardPoolAddr, RewardPoolABI.abi, wsProvider)
      
      rewardPool.on("RewardDistributed", async (validator, amount, event) => {
        const normalized = normalizeEvent('RewardDistributed', event, event.transactionHash)
        await storeEvent(normalized)
        notifyListeners(normalized)
        const value = ethers.formatUnits(amount || 0, 18)
        console.log(`[EventStream] New event: RewardDistributed → ${value} SST`)
      })
    }

    // DAOGovernance events
    if (daoAddr) {
      const dao = new ethers.Contract(daoAddr, DAOGovernanceABI.abi, wsProvider)
      
      dao.on("ProposalCreated", async (proposalId, proposer, targets, values, signatures, calldatas, startBlock, endBlock, description, event) => {
        const normalized = normalizeEvent('ProposalCreated', event, event.transactionHash)
        await storeEvent(normalized)
        notifyListeners(normalized)
        console.log(`[EventStream] New event: ProposalCreated → Proposal #${proposalId}`)
      })

      dao.on("VoteCast", async (voter, proposalId, support, weight, reason, event) => {
        const normalized = normalizeEvent('VoteCast', event, event.transactionHash)
        await storeEvent(normalized)
        notifyListeners(normalized)
        console.log(`[EventStream] New event: VoteCast → Proposal #${proposalId}`)
      })
    }

    console.log(`[EventStream] Event count: ${listeners.length} (active listeners)`)
  } catch (err) {
    console.error('[EventStream] Error setting up listeners:', err)
  }
}

/**
 * Notify all listeners of new event
 * @param {Object} event - Normalized event
 */
function notifyListeners(event) {
  listeners.forEach(callback => {
    try {
      callback(event)
    } catch (err) {
      console.warn('[EventStream] Listener error:', err)
    }
  })
}

/**
 * Subscribe to event stream
 * @param {Function} callback - Callback function for new events
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function')
  }

  listeners.push(callback)

  // Initialize WebSocket if not already connected
  if (!wsProvider) {
    connectWebSocket()
    // setupEventListeners will be called in the "open" handler
  } else if (isConnected) {
    setupEventListeners()
  }

  // Load cached events
  getAll(EVENT_LOG_KEY).then(events => {
    if (events && events.length > 0) {
      // Notify with cached events (oldest first)
      events.reverse().forEach(event => {
        callback(event)
      })
    }
  })

  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(cb => cb !== callback)
  }
}

/**
 * Unsubscribe all listeners and cleanup
 */
export function unsubscribe() {
  listeners = []
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  if (wsProvider) {
    wsProvider.removeAllListeners()
    wsProvider.destroy()
    wsProvider = null
  }
  
  isConnected = false
  reconnectAttempts = 0
}

/**
 * Get cached events from IndexedDB
 * @returns {Promise<Array>} Cached events
 */
export async function getCachedEvents() {
  return await getAll(EVENT_LOG_KEY) || []
}

