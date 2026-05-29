import { ethers } from 'ethers'
import { getProvider } from '../config/blockchain.js'

/**
 * Oracle Service — Chainlink ETH/USD (Sepolia / mainnet).
 * Throttled RPC + in-memory last-good snapshot to avoid Infura -32005 spam.
 */

const ORACLE_ABI = [
  'function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)',
  'function decimals() view returns (uint8)',
  'function description() view returns (string)',
  'function version() view returns (uint256)',
]

const ORACLE_ADDRESSES = {
  mainnet: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  sepolia: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  localhost: process.env.CHAINLINK_ORACLE_ADDRESS || '0x694AA1769357215DE4FAC081bf1f309aDC325306',
}

const DEFAULT_CACHE_TTL_MS = 75_000
const MIN_CACHE_TTL_MS = 60_000
const MAX_CACHE_TTL_MS = 90_000

function readCacheTtlMs() {
  const raw = Number(process.env.ORACLE_CACHE_TTL_MS)
  if (Number.isFinite(raw) && raw >= MIN_CACHE_TTL_MS && raw <= MAX_CACHE_TTL_MS) {
    return raw
  }
  if (Number.isFinite(raw) && raw > 0) {
    return Math.min(MAX_CACHE_TTL_MS, Math.max(MIN_CACHE_TTL_MS, raw))
  }
  return DEFAULT_CACHE_TTL_MS
}

const CACHE_TTL_MS = readCacheTtlMs()

/** Last successful on-chain snapshot (plain fields only). */
let lastGoodData = null
/** wall-clock ms when lastGoodData was written */
let lastGoodWrittenAt = 0
/** wall-clock ms when the last on-chain attempt started (success or fail) */
let lastRpcAttemptAt = 0
/** single in-flight chain read */
let oracleInflight = null
/** Throttle all soft oracle warnings (rate limit, stale fallback, etc.) */
let lastOracleSoftLogAt = 0

function getOracleAddress() {
  const network = process.env.NETWORK || 'sepolia'
  return ORACLE_ADDRESSES[network] || ORACLE_ADDRESSES.sepolia
}

function isRateLimitError(error) {
  if (!error) return false
  const code = error.code ?? error?.error?.code ?? error?.info?.error?.code
  if (code === -32005 || code === 429) return true
  const msg = String(error?.message || error?.shortMessage || error?.info?.error?.message || '').toLowerCase()
  return (
    msg.includes('too many requests') ||
    msg.includes('rate limit') ||
    msg.includes('request exceeded') ||
    msg.includes('exceeded')
  )
}

function maybeSoftLog(...args) {
  const t = Date.now()
  if (t - lastOracleSoftLogAt >= CACHE_TTL_MS) {
    lastOracleSoftLogAt = t
    console.warn(...args)
  }
}

function buildSuccessPayload(data, { cached, stale }) {
  return {
    success: true,
    data,
    cached: Boolean(cached),
    stale: Boolean(stale),
  }
}

function cloneData(data) {
  if (!data) return null
  return { ...data }
}

/**
 * Raw Chainlink reads (multiple eth_call). Throws on failure.
 */
async function fetchOracleFromChain() {
  const provider = getProvider()
  const oracleAddress = getOracleAddress()
  const oracle = new ethers.Contract(oracleAddress, ORACLE_ABI, provider)

  const [roundId, answer, startedAt, updatedAt, answeredInRound] = await oracle.latestRoundData()
  const decimals = await oracle.decimals()
  const description = await oracle.description()
  const version = await oracle.version()

  return {
    roundId: roundId.toString(),
    price: Number(answer) / 10 ** Number(decimals),
    priceRaw: answer.toString(),
    startedAt: new Date(Number(startedAt) * 1000).toISOString(),
    updatedAt: new Date(Number(updatedAt) * 1000).toISOString(),
    updatedAtTimestamp: Number(updatedAt),
    answeredInRound: answeredInRound.toString(),
    decimals: Number(decimals),
    description,
    version: version.toString(),
    oracleAddress,
  }
}

/**
 * @param {{ forceRefresh?: boolean }} [options]
 */
export async function getOracleData(options = {}) {
  const forceRefresh = options.forceRefresh === true
  const now = Date.now()

  if (!forceRefresh && lastGoodData && lastGoodWrittenAt && now - lastGoodWrittenAt < CACHE_TTL_MS) {
    return buildSuccessPayload(cloneData(lastGoodData), { cached: true, stale: false })
  }

  if (oracleInflight) {
    return oracleInflight
  }

  if (
    !forceRefresh &&
    lastRpcAttemptAt &&
    now - lastRpcAttemptAt < CACHE_TTL_MS
  ) {
    if (lastGoodData) {
      return buildSuccessPayload(cloneData(lastGoodData), { cached: true, stale: true })
    }
    return {
      success: false,
      error: 'oracle_unavailable',
      data: null,
      cached: false,
      stale: false,
    }
  }

  lastRpcAttemptAt = now

  oracleInflight = (async () => {
    try {
      const data = await fetchOracleFromChain()
      lastGoodData = data
      lastGoodWrittenAt = Date.now()
      return buildSuccessPayload(cloneData(data), { cached: false, stale: false })
    } catch (error) {
      const rateLimited = isRateLimitError(error)

      if (rateLimited) {
        maybeSoftLog(
          '[oracleService] RPC rate limited (-32005 / too many requests); serving cache or unavailable:',
          error?.message || error?.shortMessage || 'rate_limited'
        )
        if (lastGoodData) {
          return buildSuccessPayload(cloneData(lastGoodData), { cached: true, stale: true })
        }
        return {
          success: false,
          error: 'oracle_unavailable',
          data: null,
          cached: false,
          stale: false,
        }
      }

      if (lastGoodData) {
        maybeSoftLog('[oracleService] fetch failed; serving stale cache:', error?.message || error)
        return buildSuccessPayload(cloneData(lastGoodData), { cached: true, stale: true })
      }

      maybeSoftLog('[oracleService] fetch failed (no cache):', error?.message || error)
      return {
        success: false,
        error: error?.message || 'oracle_fetch_failed',
        data: null,
        cached: false,
        stale: false,
      }
    } finally {
      oracleInflight = null
    }
  })()

  return oracleInflight
}

/**
 * Same as getOracleData plus wall-clock fetchedAt for clients.
 */
export async function getPriceWithRefresh(options = {}) {
  const result = await getOracleData(options)
  return {
    ...result,
    fetchedAt: new Date().toISOString(),
  }
}
