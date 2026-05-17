import { getAddress, id, zeroPadValue, toBeHex } from 'ethers'
import {
  isAlchemyRateLimitError,
  throwIfAlchemyHttpLimited,
  throwIfAlchemyRpcLimited,
} from './alchemyRateLimit.js'
import { redactAlchemyUrl, resolveAlchemyRpcUrl } from './alchemyChainResolver.js'
import { logApprovalInventoryFetch } from './approvalInventoryLogger.js'
import { MAINNET_CHAIN_ID, SEPOLIA_CHAIN_ID } from './walletRiskTypes.js'

const APPROVAL_TOPIC = id('Approval(address,address,uint256)')

/** Common spenders we treat as lower operational surprise (not “safe”, just contextualized). */
const KNOWN_SPENDER_PREFIXES = new Set(
  [
    // Uniswap v3 SwapRouter + Universal Router family (mainnet + common L2 deploys)
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b',
    '0x198ef79f1f83f42eedd21d16ed00b6cd96f66bb8',
    // 1inch v5 router (common)
    '0x1111111254eeb25477b68fb85ed929f73a960582',
  ].map((a) => a.toLowerCase()),
)

function spenderCategory(spenderLc) {
  if (KNOWN_SPENDER_PREFIXES.has(spenderLc)) return 'KNOWN_AGGREGATOR'
  return 'UNKNOWN_SPENDER'
}

function unpackTopicAddress(topicHex) {
  if (!topicHex || typeof topicHex !== 'string' || topicHex.length < 66) return null
  return `0x${topicHex.slice(-40)}`.toLowerCase()
}

function alchemyRpcUrl(chainId, apiKey) {
  return resolveAlchemyRpcUrl(chainId, apiKey)?.url ?? null
}

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) {
    throwIfAlchemyHttpLimited(res.status, `rpc_http_${res.status}`)
    throw new Error(`rpc_http_${res.status}`)
  }
  const json = await res.json()
  if (json.error) {
    throwIfAlchemyRpcLimited(json.error)
    throw new Error(json.error.message || 'rpc_error')
  }
  return json.result
}

function parseLookbackBlocks() {
  const raw = Number(process.env.WALLET_APPROVAL_LOG_LOOKBACK_BLOCKS)
  if (Number.isFinite(raw) && raw > 512 && raw < 5_000_000) return Math.floor(raw)
  return chainIdApproxDefault()
}

/** Sepolia archives are noisy and expensive to scan — tighter window. */
function chainIdApproxDefault() {
  return 25000
}

export function walletChainSupportsApprovalLogScan(chainId) {
  const c = Number(chainId)
  return c === MAINNET_CHAIN_ID || c === 10 || c === 8453 || c === 42161 || c === 137 || c === SEPOLIA_CHAIN_ID
}

function isSepolia(chainId) {
  return Number(chainId) === SEPOLIA_CHAIN_ID
}

/**
 * Lightweight ERC20 Approval log sweep for UX inventory + scoring amplification.
 * This is deliberately bounded by block windows; exhaustive approval discovery is tier-2 infra.
 *
 * @param {string} ownerAddress
 * @param {number} chainId
 * @param {string} apiKey
 * @returns {Promise<{
 *   rows: Array<{
 *     token: string
 *     spender: string
 *     allowanceWei: string
 *     unlimited: boolean
 *     spenderCategory: string
 *     approximateBlock: number
 *     riskLevel: 'LOW'|'WATCH'|'HIGH'
 *     recommendation: string
 *   }>
 *   approvalLogPenalty: number
 *   unlimitedUnknownCount: number
 *   staleUnknownFiniteCount: number
 * }>}
 */
export async function fetchApprovalSignalsFromLogs(ownerAddress, chainId, apiKey) {
  const started = Date.now()
  const resolved = resolveAlchemyRpcUrl(chainId, apiKey)
  const url = resolved?.url ?? null
  if (!url || !walletChainSupportsApprovalLogScan(chainId)) {
    logApprovalInventoryFetch({
      wallet: ownerAddress,
      chainId,
      rpcUrl: redactAlchemyUrl(url),
      status: 'unsupported_chain',
      durationMs: Date.now() - started,
      rowCount: 0,
    })
    return {
      rows: [],
      approvalLogPenalty: 0,
      unlimitedUnknownCount: 0,
      staleUnknownFiniteCount: 0,
    }
  }

  const ownerLc = String(ownerAddress).toLowerCase()
  let checksumOwner
  try {
    checksumOwner = getAddress(ownerLc)
  } catch {
    return {
      rows: [],
      approvalLogPenalty: 0,
      unlimitedUnknownCount: 0,
      staleUnknownFiniteCount: 0,
    }
  }

  let lookback = parseLookbackBlocks()
  if (isSepolia(chainId)) lookback = Math.min(lookback, 7000)

  const latestHex = await rpc(url, 'eth_blockNumber', [])
  const latest = Number.parseInt(latestHex, 16)
  const from = Math.max(0, latest - lookback)
  const fromHex = toBeHex(from)
  const toHex = latestHex

  const topicOwner = zeroPadValue(checksumOwner, 32)

  /** @type {Array<{address: string, topics: string[], data: string, blockNumber: string}>} */
  let logs = []
  try {
    logs = await rpc(url, 'eth_getLogs', [
      {
        fromBlock: fromHex,
        toBlock: toHex,
        topics: [APPROVAL_TOPIC, topicOwner],
      },
    ])
  } catch (e) {
    if (isAlchemyRateLimitError(e)) throw e
    logs = []
  }

  if (!Array.isArray(logs) || logs.length === 0) {
    return {
      rows: [],
      approvalLogPenalty: 0,
      unlimitedUnknownCount: 0,
      staleUnknownFiniteCount: 0,
    }
  }

  /** @type {Map<string, { spender: string, allowance: bigint, block: number, token: string }>} */
  const best = new Map()

  const maxUint = (1n << 256n) - 1n
  const staleThresholdWei = 10n ** 24n

  for (const lg of logs) {
    const token = String(lg?.address || '').toLowerCase()
    const spenderTopic = lg?.topics?.[2]
    const spender = unpackTopicAddress(spenderTopic || '')
    if (!token || !spender) continue
    let allowance = 0n
    try {
      const hex = lg?.data || '0x0'
      allowance = BigInt(hex === '0x' ? '0' : hex)
    } catch {
      allowance = 0n
    }
    if (allowance <= 0n) continue
    let block = 0
    try {
      block = Number.parseInt(String(lg.blockNumber || '0x0'), 16)
    } catch {
      block = 0
    }
    const unlimited = allowance > maxUint / 2n
    const key = `${token}:${spender}:${unlimited ? 'u' : 'f'}:${allowance.toString()}`
    const prev = best.get(`${token}:${spender}`)
    const better = !prev || block >= prev.block
    if (better) {
      best.set(`${token}:${spender}`, { spender, allowance, block, token, unlimited })
    }
  }

  /** @type {Array<{token: string, spender: string, allowance: bigint, block: number, unlimited: boolean}>} */
  const merged = [...best.values()]

  let unlimitedUnknownCount = 0
  let staleUnknownFiniteCount = 0

  const rows = merged.map((row) => {
    const spenderLc = row.spender.toLowerCase()
    const cat = spenderCategory(spenderLc)
    const unlimited = row.allowance > maxUint / 2n
    let riskLevel = 'LOW'
    let recommendation =
      cat === 'KNOWN_AGGREGATOR'
        ? 'Review whether this aggregator approval is still required for your operational workflow.'
        : 'Verify you recognize this spender. Revoke allowances outside your wallet/client if uncertain.'

    if (unlimited && cat === 'UNKNOWN_SPENDER') {
      unlimitedUnknownCount += 1
      riskLevel = 'HIGH'
      recommendation =
        'Unlimited approval granted to an unknown spender — treat as materially sensitive until revoked or replaced.'
    } else if (unlimited && cat === 'KNOWN_AGGREGATOR') {
      riskLevel = 'WATCH'
      recommendation =
        'Unlimited approval detected for a commonly used router category — reduce scope when possible.'
    } else if (!unlimited && cat === 'UNKNOWN_SPENDER' && row.allowance >= staleThresholdWei) {
      staleUnknownFiniteCount += 1
      riskLevel = 'HIGH'
      recommendation =
        'Large finite allowance retained for an unknown spender — reconcile intent and revoke if dormant.'
    } else if (!unlimited && cat === 'UNKNOWN_SPENDER') {
      riskLevel = 'WATCH'
      recommendation =
        'Finite approval to an unknown spender — confirm expected access and revoke if unused.'
    }

    return {
      token: row.token,
      spender: row.spender,
      allowanceWei: row.allowance.toString(),
      unlimited,
      spenderCategory: cat,
      approximateBlock: row.block,
      riskLevel,
      recommendation,
    }
  })

  rows.sort((a, b) => {
    const rank = { HIGH: 0, WATCH: 1, LOW: 2 }
    return (rank[a.riskLevel] ?? 9) - (rank[b.riskLevel] ?? 9)
  })

  /** Deterministic capped drag added to coarse allowance probes. */
  let approvalLogPenalty =
    unlimitedUnknownCount * 10 + staleUnknownFiniteCount * 7 + rows.filter((r) => !r.unlimited && r.riskLevel === 'WATCH').length * 3
  approvalLogPenalty = Math.min(38, approvalLogPenalty)

  logApprovalInventoryFetch({
    wallet: ownerAddress,
    chainId,
    rpcUrl: redactAlchemyUrl(url),
    status: 'loaded',
    durationMs: Date.now() - started,
    rowCount: rows.length,
  })

  return {
    rows,
    approvalLogPenalty,
    unlimitedUnknownCount,
    staleUnknownFiniteCount,
  }
}
