import { ethers } from 'ethers'

/**
 * Query recent events with block range optimization
 * @param {ethers.Contract} contract - The contract instance
 * @param {ethers.EventFilter} filter - The event filter
 * @param {ethers.Provider} provider - The provider instance
 * @param {number} lookbackBlocks - Number of blocks to look back (default: 50000)
 * @returns {Promise<ethers.EventLog[]>} Array of event logs
 */
export async function queryRecentEvents(contract, filter, provider, lookbackBlocks = 50000) {
  try {
    const latest = await provider.getBlockNumber()
    const fromBlock = latest > lookbackBlocks ? latest - BigInt(lookbackBlocks) : 0n
    return await contract.queryFilter(filter, fromBlock, latest)
  } catch (error) {
    console.error('Error querying events:', error)
    return []
  }
}

/**
 * Enrich events with timestamps from block data
 * @param {ethers.Provider} provider - The provider instance
 * @param {ethers.EventLog[]} events - Array of event logs
 * @returns {Promise<Array>} Array of enriched events with __timestamp property
 */
export async function withTimestamps(provider, events) {
  const cache = new Map()
  const enriched = []

  for (const e of events) {
    try {
      let block = cache.get(e.blockNumber)
      if (!block) {
        block = await provider.getBlock(e.blockNumber)
        cache.set(e.blockNumber, block)
      }
      enriched.push({
        ...e,
        __timestamp: Number(block.timestamp),
      })
    } catch (error) {
      console.error(`Error fetching block ${e.blockNumber}:`, error)
      // Fallback to blockTimestamp if available
      enriched.push({
        ...e,
        __timestamp: e.blockTimestamp ? Number(e.blockTimestamp) : Date.now() / 1000,
      })
    }
  }

  return enriched
}

/**
 * Format event data for display
 * @param {ethers.EventLog} event - The event log
 * @returns {Object} Formatted event data
 */
export function formatEvent(event) {
  return {
    contract: event.address,
    event: event.eventName || event.event || 'Unknown',
    timestamp: event.__timestamp || (event.blockTimestamp ? Number(event.blockTimestamp) : null),
    txHash: event.transactionHash,
    blockNumber: event.blockNumber?.toString(),
    args: event.args || {},
  }
}

