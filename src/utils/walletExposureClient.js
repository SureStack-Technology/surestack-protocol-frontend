import { mapWalletExposurePanelStatus } from '@/utils/approvalInventoryStatus.js'

/** @typedef {'exact_spender' | 'canonical_spender' | 'none'} MatchType */

export const APPROVAL_INVENTORY_CACHE_MS = 90_000

const CANONICAL_SPENDERS = {
  '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Permit2',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
  '0x1e0049783f008a0085193e00003d00cd54003c71': 'OpenSea Conduit',
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange Proxy',
  '0x9008d19f58aabd9ed0d60971565aa8510560ab41': 'CowSwap Settlement',
}

const TOKEN_SYMBOLS = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0x6982508145454ce325ddbe47a25d4ec3d2311933': 'PEPE',
}

const EXPOSURE_RECOMMENDATIONS = {
  CLEAR: 'No direct wallet exposure detected.',
  LOW: 'Monitor these approvals and revoke any you no longer use.',
  MODERATE: 'Review approval scope before additional interactions with this contract.',
  HIGH: 'Review or revoke inactive approvals before further interaction.',
}

function scoreWalletExposureLevel({ approvalCount, unlimitedApprovals, estimatedExposureUsd }) {
  const usd = Number(estimatedExposureUsd) || 0
  if (approvalCount <= 0) {
    return { riskLevel: 'CLEAR', recommendation: EXPOSURE_RECOMMENDATIONS.CLEAR }
  }
  if (unlimitedApprovals >= 1 && usd > 1000) {
    return { riskLevel: 'HIGH', recommendation: EXPOSURE_RECOMMENDATIONS.HIGH }
  }
  if (unlimitedApprovals >= 1 || usd > 2500 || approvalCount >= 4) {
    return { riskLevel: 'HIGH', recommendation: EXPOSURE_RECOMMENDATIONS.HIGH }
  }
  if (approvalCount >= 3 || usd > 750) {
    return { riskLevel: 'MODERATE', recommendation: EXPOSURE_RECOMMENDATIONS.MODERATE }
  }
  if (approvalCount <= 2 && usd < 500) {
    return { riskLevel: 'LOW', recommendation: EXPOSURE_RECOMMENDATIONS.LOW }
  }
  return { riskLevel: 'MODERATE', recommendation: EXPOSURE_RECOMMENDATIONS.MODERATE }
}

/**
 * @param {string} scannedAddress
 * @param {object[]} approvalRows
 */
export function matchApprovalsClient(scannedAddress, approvalRows) {
  const target = String(scannedAddress || '').toLowerCase()
  const exact = (approvalRows || []).filter((r) => String(r.spender || '').toLowerCase() === target)
  if (exact.length > 0) return { rows: exact, matchType: 'exact_spender' }
  if (CANONICAL_SPENDERS[target]) {
    const related = (approvalRows || []).filter((r) => {
      const cat = String(r.spenderCategory || '')
      if (cat === 'KNOWN_AGGREGATOR') return true
      const spender = String(r.spender || '').toLowerCase()
      return spender in CANONICAL_SPENDERS
    })
    if (related.length > 0) {
      return {
        rows: related,
        matchType: 'canonical_spender',
        canonicalLabel: CANONICAL_SPENDERS[target],
      }
    }
  }
  return { rows: [], matchType: 'none' }
}

/**
 * @param {object[]} approvalRows
 * @param {string} scannedAddress
 */
export function computeClientWalletExposure(approvalRows, scannedAddress) {
  const { rows, matchType, canonicalLabel } = matchApprovalsClient(scannedAddress, approvalRows)

  if (rows.length === 0) {
    const scored = scoreWalletExposureLevel({
      approvalCount: 0,
      unlimitedApprovals: 0,
      estimatedExposureUsd: 0,
    })
    return {
      hasExposure: false,
      riskLevel: scored.riskLevel,
      approvalCount: 0,
      unlimitedApprovals: 0,
      estimatedExposureUsd: null,
      affectedAssets: [],
      recommendation: scored.recommendation,
      status: 'clear',
      matchType: 'none',
      pendingUsd: false,
    }
  }

  const unlimitedApprovals = rows.filter((r) => r.unlimited).length
  const assetMap = new Map()
  for (const row of rows) {
    const token = String(row.token || '').toLowerCase()
    const symbol = TOKEN_SYMBOLS[token] || `${token.slice(0, 6)}…${token.slice(-4)}`
    if (!assetMap.has(token)) {
      assetMap.set(token, { symbol, token, balanceUsd: null, isUnlimited: row.unlimited })
    } else if (row.unlimited) {
      assetMap.get(token).isUnlimited = true
    }
  }

  const affectedAssets = [...assetMap.values()]
  const scored = scoreWalletExposureLevel({
    approvalCount: rows.length,
    unlimitedApprovals,
    estimatedExposureUsd: 0,
  })

  return {
    hasExposure: true,
    riskLevel: scored.riskLevel,
    approvalCount: rows.length,
    unlimitedApprovals,
    estimatedExposureUsd: null,
    affectedAssets,
    recommendation: scored.recommendation,
    status: 'exposed',
    matchType,
    canonicalSpenderLabel: canonicalLabel || null,
    pendingUsd: true,
  }
}

/**
 * @param {number | string | null | undefined} fetchedAt
 */
export function isApprovalInventoryFresh(fetchedAt) {
  if (!fetchedAt) return false
  const t = typeof fetchedAt === 'number' ? fetchedAt : Date.parse(String(fetchedAt))
  if (!Number.isFinite(t)) return false
  return Date.now() - t < APPROVAL_INVENTORY_CACHE_MS
}

/**
 * @param {object | null | undefined} approvals
 * @param {object | null | undefined} walletExposure
 * @param {boolean} scanBusy
 * @param {number} [scanChainId]
 */
export function resolveWalletExposurePanelStatus(
  approvals,
  walletExposure,
  scanBusy = false,
  scanChainId = 1,
) {
  const fromExposure = mapWalletExposurePanelStatus(walletExposure)
  if (fromExposure) return fromExposure

  if (approvals?.status === 'provider_missing') return 'provider_missing'
  if (approvals?.status === 'rpc_error') return 'rpc_error'
  if (approvals?.status === 'auth_error') return 'auth_error'
  if (approvals?.status === 'rate_limited' && !walletExposure) return 'rate_limited'

  const inventoryChain = Number(approvals?.chainId ?? 1)
  const chainMatches = inventoryChain === Number(scanChainId)

  if (walletExposure) {
    return walletExposure.hasExposure ? 'exposed' : 'clear'
  }

  if (scanBusy && (!chainMatches || approvals?.status === 'loading')) return 'loading'
  if (approvals?.status === 'loading' && !approvals?.rows?.length) return 'loading'
  if (chainMatches && approvals?.rows?.length && scanBusy) return 'loading'
  if (chainMatches && approvals?.status === 'loaded') return 'clear'
  if (scanBusy) return 'loading'
  return 'loading'
}
