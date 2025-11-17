import { ethers } from 'ethers'
import { getRotatingProvider } from '../utils/resilientProvider'
import { putMany, getAll } from '../utils/idb'
import aggregatorAbi from '../abi/AggregatorV3Interface.json'

const FEED = import.meta.env.VITE_CHAINLINK_ETHUSD || '0x694AA1769357215DE4FAC081bf1f309aDC325306'

/**
 * Fetch initial price history from Chainlink rounds
 * @param {Object} options
 * @param {number} options.minSamples - Minimum samples required (default: 60)
 * @param {number} options.maxLookbackRounds - Maximum rounds to look back (default: 120)
 * @returns {Promise<{history: Array<{t:number, p:number}>, warmup: boolean}>}
 */
export async function fetchInitialHistory({ minSamples = 60, maxLookbackRounds = 60 } = {}) {
  try {
    const provider = getRotatingProvider()
    const contract = new ethers.Contract(FEED, aggregatorAbi, provider)
    
    // Get latest round
    const [latestRoundId, latestAnswer, , latestUpdatedAt] = await contract.latestRoundData()
    const decimals = await contract.decimals()
    
    const history = []
    let currentRoundId = Number(latestRoundId)
    let fetched = 0
    
    // Walk back through rounds (limited to 60)
    const maxRounds = Math.min(maxLookbackRounds, 60)
    
    while (fetched < maxRounds && currentRoundId > 0) {
      try {
        const [roundId, answer, , updatedAt] = await contract.getRoundData(currentRoundId)
        
        if (Number(answer) > 0 && Number(updatedAt) > 0) {
          history.push({
            t: Number(updatedAt) * 1000, // Convert to ms
            p: Number(ethers.formatUnits(answer, decimals))
          })
          fetched++
        }
        
        currentRoundId--
        
        // Add delay between each round fetch to avoid blocking
        await new Promise(res => setTimeout(res, 200))
      } catch (err) {
        // Check for rate limit
        const isRateLimit = err?.code === -32005 || err?.code === 429 || 
                           `${err}`.includes('Too Many Requests')
        
        if (isRateLimit) {
          console.warn('[priceHistory] Rate limited, falling back to cache')
          break
        }
        
        // Round doesn't exist or invalid, skip
        currentRoundId--
        if (currentRoundId <= 0) break
        
        // Add delay even on error
        await new Promise(res => setTimeout(res, 200))
      }
    }
    
    // Reverse to chronological order
    history.reverse()
    
    // Dedupe by timestamp
    const deduped = []
    const seen = new Set()
    for (const item of history) {
      if (!seen.has(item.t)) {
        seen.add(item.t)
        deduped.push(item)
      }
    }
    
    // Load cached data
    const cached = await getAll('ethusd')
    
    // Merge with cache
    const merged = [...cached, ...deduped]
      .sort((a, b) => a.t - b.t)
      .filter((item, idx, arr) => {
        // Dedupe by timestamp
        return idx === 0 || item.t !== arr[idx - 1].t
      })
    
    // Persist (keep last 500)
    const pruned = merged.slice(-500)
    await putMany('ethusd', pruned, 500)
    
    const warmup = pruned.length < minSamples
    
    return {
      history: pruned,
      warmup
    }
  } catch (err) {
    console.warn('[priceHistory] fetchInitialHistory error, using cache:', err)
    
    // Fallback to cache
    const cached = await getAll('ethusd')
    const warmup = cached.length < minSamples
    
    return {
      history: cached,
      warmup
    }
  }
}

/**
 * Append latest price to history
 * @param {Array<{t:number, p:number}>} existingHistory - Current history array
 * @returns {Promise<Array<{t:number, p:number}>>} Updated history array
 */
export async function appendLatestPrice(existingHistory = []) {
  try {
    const provider = getRotatingProvider()
    const contract = new ethers.Contract(FEED, aggregatorAbi, provider)
    
    const [roundId, answer, , updatedAt] = await contract.latestRoundData()
    const decimals = await contract.decimals()
    
    const timestamp = Number(updatedAt) * 1000
    const price = Number(ethers.formatUnits(answer, decimals))
    
    // Check if this is a new timestamp
    const lastItem = existingHistory[existingHistory.length - 1]
    if (lastItem && lastItem.t >= timestamp) {
      // No new data
      return existingHistory
    }
    
    // Append new price
    const updated = [...existingHistory, { t: timestamp, p: price }]
    
    // Prune to last 500
    const pruned = updated.slice(-500)
    
    // Persist
    await putMany('ethusd', pruned, 500)
    
    return pruned
  } catch (err) {
    console.warn('[priceHistory] appendLatestPrice error:', err)
    return existingHistory
  }
}

/**
 * Subscribe to live price updates via WebSocket
 * @param {ethers.WebSocketProvider} provider - WebSocket provider
 * @param {string} oracleAddress - Chainlink oracle address
 * @param {Function} callback - Callback function (newPrice, blockNumber)
 * @returns {Function} Unsubscribe function
 */
export function subscribeToLiveUpdates(provider, oracleAddress, callback) {
  let lastPrice = null
  let lastTimestamp = 0
  let unsubscribe = null

  const handleBlock = async (blockNumber) => {
    try {
      const contract = new ethers.Contract(oracleAddress, aggregatorAbi, provider)
      const [roundId, answer, , updatedAt] = await contract.latestRoundData()
      const decimals = await contract.decimals()
      
      const timestamp = Number(updatedAt) * 1000
      const price = Number(ethers.formatUnits(answer, decimals))
      
      // Only call callback if price or timestamp changed
      if (price !== lastPrice || timestamp !== lastTimestamp) {
        lastPrice = price
        lastTimestamp = timestamp
        callback(price, blockNumber, timestamp)
      }
    } catch (err) {
      console.warn('[priceHistory] subscribeToLiveUpdates error:', err)
    }
  }

  provider.on("block", handleBlock)
  
  unsubscribe = () => {
    provider.off("block", handleBlock)
  }

  return unsubscribe
}

