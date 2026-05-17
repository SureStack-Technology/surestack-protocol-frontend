import {
  isAlchemyRateLimitError,
  throwIfAlchemyHttpLimited,
  throwIfAlchemyRpcLimited,
} from '../walletRisk/alchemyRateLimit.js'
import { resolveAlchemyRpcUrl } from '../walletRisk/alchemyChainResolver.js'
import { getLowerVolatilityTokens, WETH_MAINNET } from '../walletRisk/walletRiskTypes.js'
import { matchApprovalsToScannedAddress } from './walletExposureCanonical.js'
import { scoreWalletExposureLevel } from './walletExposureScoring.js'

const TOKEN_META = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6, usdPerUnit: 1 },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6, usdPerUnit: 1 },
  '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', decimals: 18, usdPerUnit: 1 },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18 },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', decimals: 8 },
  '0x514910771af9ca656af840dff83e8264ecf986ca': { symbol: 'LINK', decimals: 18 },
  '0x6982508145454ce325ddbe47a25d4ec3d2311933': { symbol: 'PEPE', decimals: 18 },
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': { symbol: 'USDC', decimals: 6, usdPerUnit: 1 },
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

function tokenSymbol(token) {
  const lc = String(token || '').toLowerCase()
  if (TOKEN_META[lc]?.symbol) return TOKEN_META[lc].symbol
  return `${lc.slice(0, 6)}…${lc.slice(-4)}`
}

function formatUnits(wei, decimals) {
  const base = 10n ** BigInt(decimals)
  const whole = wei / base
  const frac = wei % base
  return Number(whole) + Number(frac) / Number(base)
}

async function fetchEthUsd() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { headers: { Accept: 'application/json', 'User-Agent': 'SureStack-WalletExposure/1.0' } },
    )
    if (!res.ok) return null
    const json = await res.json()
    const v = json?.ethereum?.usd
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

async function fetchWalletTokenBalanceMap(walletAddress, chainId, apiKey) {
  const url = alchemyRpcUrl(chainId, apiKey)
  if (!url) return new Map()

  const addr = walletAddress.toLowerCase()
  const result = await rpc(url, 'alchemy_getTokenBalances', [addr, 'erc20']).catch((e) => {
    if (isAlchemyRateLimitError(e)) throw e
    return { tokenBalances: [] }
  })
  const map = new Map()
  for (const row of result?.tokenBalances || []) {
    const token = String(row?.contractAddress || '').toLowerCase()
    if (!token) continue
    try {
      map.set(token, BigInt(row?.tokenBalance || '0'))
    } catch {
      map.set(token, 0n)
    }
  }
  return map
}

function estimateTokenBalanceUsd(token, balanceWei, ethUsd) {
  if (balanceWei <= 0n) return 0
  const lc = token.toLowerCase()
  const meta = TOKEN_META[lc]
  const decimals = meta?.decimals ?? 18

  if (meta?.usdPerUnit != null) {
    return formatUnits(balanceWei, decimals) * meta.usdPerUnit
  }

  if (lc === WETH_MAINNET && ethUsd) {
    return formatUnits(balanceWei, 18) * ethUsd
  }

  const stables = getLowerVolatilityTokens(1)
  if (stables.has(lc)) {
    return formatUnits(balanceWei, decimals)
  }

  return null
}

/**
 * @param {object} params
 */
export async function computeWalletExposureFromInventory({
  walletAddress,
  scannedAddress,
  chainId,
  approvalRows,
  alchemyKey,
  skipBalanceFetch = false,
}) {
  const { rows, matchType, canonicalLabel } = matchApprovalsToScannedAddress(
    scannedAddress,
    approvalRows,
  )

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
      estimatedExposureUsd: 0,
      affectedAssets: [],
      lastInteractionAt: null,
      recommendation: scored.recommendation,
      matchType: 'none',
      canonicalSpenderLabel: null,
    }
  }

  const unlimitedApprovals = rows.filter((r) => r.unlimited).length
  let balanceMap = new Map()
  let ethUsd = null
  if (!skipBalanceFetch) {
    try {
      balanceMap = await fetchWalletTokenBalanceMap(walletAddress, chainId, alchemyKey)
      ethUsd = await fetchEthUsd()
    } catch (e) {
      if (!isAlchemyRateLimitError(e)) throw e
    }
  }

  const assetMap = new Map()

  for (const row of rows) {
    const token = String(row.token || '').toLowerCase()
    const balWei = balanceMap.get(token) ?? 0n
    let balanceUsd = estimateTokenBalanceUsd(token, balWei, ethUsd)
    if (balanceUsd == null && row.unlimited) {
      balanceUsd = 0
    }
    const symbol = tokenSymbol(token)
    const prev = assetMap.get(token)
    const nextUsd = (prev?.balanceUsd ?? 0) + (balanceUsd ?? 0)
    assetMap.set(token, {
      symbol,
      token,
      balanceUsd: balanceUsd != null ? nextUsd : null,
      isUnlimited: Boolean(prev?.isUnlimited || row.unlimited),
    })
  }

  const affectedAssets = [...assetMap.values()]
    .map((a) => ({
      symbol: a.symbol,
      token: a.token,
      balanceUsd: a.balanceUsd != null ? Math.round(a.balanceUsd) : null,
      isUnlimited: a.isUnlimited,
    }))
    .sort((a, b) => (b.balanceUsd ?? 0) - (a.balanceUsd ?? 0))

  const estimatedExposureUsd = affectedAssets.reduce((s, a) => s + (a.balanceUsd ?? 0), 0)

  const scored = scoreWalletExposureLevel({
    approvalCount: rows.length,
    unlimitedApprovals,
    estimatedExposureUsd,
  })

  const maxBlock = rows.reduce((m, r) => Math.max(m, Number(r.approximateBlock) || 0), 0)
  const lastInteractionAt = maxBlock > 0 ? new Date().toISOString() : null

  return {
    hasExposure: true,
    riskLevel: scored.riskLevel,
    approvalCount: rows.length,
    unlimitedApprovals,
    estimatedExposureUsd: Math.round(estimatedExposureUsd),
    affectedAssets,
    lastInteractionAt,
    recommendation: scored.recommendation,
    matchType,
    canonicalSpenderLabel: canonicalLabel || null,
  }
}
