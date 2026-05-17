import { walletChainSupportsApprovalLogScan } from '../walletRisk/walletApprovalSignals.js'
import { fetchApprovalInventoryResilient } from '../walletRisk/approvalInventoryCache.js'
import { isAlchemyRateLimitError } from '../walletRisk/alchemyRateLimit.js'
import {
  redactAlchemyUrl,
  resolveAlchemyRpcUrl,
  resolvePrimeApprovalChainId,
} from '../walletRisk/alchemyChainResolver.js'
import { computeWalletExposureFromInventory } from './walletExposureEngine.js'
import { logWalletExposure } from './walletExposureLog.js'

export const APPROVAL_INVENTORY_CACHE_MS = 90_000

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
 * @param {object | null | undefined} user
 */
export function verifiedWalletForUser(user) {
  const v = user?.wallets?.find((w) => w.verifiedAt)
  if (!v?.address) return null
  return { address: String(v.address).toLowerCase(), chainId: Number(v.chainId) || 1 }
}

/**
 * @param {{ rows?: object[], fetchedAt?: number | string, chainId?: number } | null} clientInventory
 * @param {number} scanChainId
 */
export function normalizeClientInventoryForScan(clientInventory, scanChainId) {
  if (!clientInventory?.rows?.length) return null
  if (
    clientInventory.chainId != null &&
    Number(clientInventory.chainId) !== Number(scanChainId)
  ) {
    return null
  }
  return clientInventory
}

/**
 * @param {object} user
 * @param {string} scannedAddress
 * @param {number} chainId — chain selected in Universal Risk Scanner
 * @param {{ rows?: object[], fetchedAt?: number | string, chainId?: number } | null} [clientInventory]
 */
export async function resolveWalletExposureForScan(user, scannedAddress, chainId, clientInventory = null) {
  const started = Date.now()
  const scanChain = Number(chainId)
  const wallet = verifiedWalletForUser(user)

  if (!wallet) {
    logWalletExposure({
      wallet: null,
      scannedAddress,
      scanChain,
      approvalInventoryStatus: 'no_verified_wallet',
      matchType: 'none',
      status: 'unavailable',
      error: 'no_verified_wallet',
      durationMs: Date.now() - started,
    })
    return { status: 'unavailable', unavailableReason: 'no_verified_wallet' }
  }

  if (!walletChainSupportsApprovalLogScan(scanChain)) {
    logWalletExposure({
      wallet: wallet.address,
      scannedAddress,
      scanChain,
      approvalInventoryStatus: 'unsupported_chain',
      matchType: 'none',
      status: 'unavailable',
      error: 'unsupported_chain',
      durationMs: Date.now() - started,
    })
    return { status: 'unavailable', unavailableReason: 'unsupported_chain' }
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY?.trim()
  if (!alchemyKey) {
    logWalletExposure({
      wallet: wallet.address,
      scannedAddress,
      scanChain,
      approvalInventoryStatus: 'provider_missing',
      matchType: 'none',
      status: 'provider_missing',
      error: 'provider_missing',
      durationMs: Date.now() - started,
    })
    return { status: 'provider_missing', unavailableReason: 'provider_missing' }
  }

  const inventoryChainId = resolvePrimeApprovalChainId(scanChain, wallet.chainId)
  const rpc = resolveAlchemyRpcUrl(inventoryChainId, alchemyKey)
  const inventoryForScan = normalizeClientInventoryForScan(
    { ...clientInventory, chainId: clientInventory?.chainId ?? inventoryChainId },
    inventoryChainId,
  )

  try {
    const inv = await fetchApprovalInventoryResilient(
      wallet.address,
      inventoryChainId,
      alchemyKey,
      inventoryForScan,
    )

    if (inv.rateLimited && !inv.rows?.length) {
      logWalletExposure({
        wallet: wallet.address,
        scannedAddress,
        scanChain,
        approvalInventoryStatus: 'rate_limited',
        matchType: 'none',
        status: 'rate_limited',
        error: null,
        cacheHit: inv.cacheHit,
        durationMs: Date.now() - started,
        rateLimited: true,
        resolvedRpc: redactAlchemyUrl(rpc?.url),
      })
      return { status: 'rate_limited', unavailableReason: 'rate_limited' }
    }

    const exposure = await computeWalletExposureFromInventory({
      walletAddress: wallet.address,
      scannedAddress,
      chainId: inventoryChainId,
      approvalRows: inv.rows,
      alchemyKey,
      skipBalanceFetch: inv.rateLimited,
    })

    const status = exposure.hasExposure ? 'exposed' : 'clear'
    const result = {
      ...exposure,
      status,
      inventoryStale: inv.stale || false,
      inventorySource: inv.source,
      rateLimited: inv.rateLimited || false,
      scanChainId: scanChain,
      inventoryChainId,
    }

    logWalletExposure({
      wallet: wallet.address,
      scannedAddress,
      scanChain,
      approvalInventoryStatus: inv.rateLimited ? 'rate_limited_stale_cache' : 'loaded',
      approvalCount: result.approvalCount,
      unlimitedApprovals: result.unlimitedApprovals,
      estimatedExposureUsd: result.estimatedExposureUsd,
      matchType: result.matchType,
      cacheHit: inv.cacheHit,
      durationMs: Date.now() - started,
      status: result.status,
      rateLimited: result.rateLimited,
      inventoryStale: result.inventoryStale,
      resolvedRpc: redactAlchemyUrl(rpc?.url),
    })

    return result
  } catch (e) {
    if (isAlchemyRateLimitError(e)) {
      logWalletExposure({
        wallet: wallet.address,
        scannedAddress,
        scanChain,
        approvalInventoryStatus: 'rate_limited',
        matchType: 'none',
        status: 'rate_limited',
        error: e?.message,
        durationMs: Date.now() - started,
      })
      return { status: 'rate_limited', unavailableReason: 'rate_limited' }
    }

    console.warn('[walletExposure] resolve failed', e?.message || e)
    logWalletExposure({
      wallet: wallet.address,
      scannedAddress,
      scanChain,
      approvalInventoryStatus: 'rpc_error',
      matchType: 'none',
      status: 'rpc_error',
      error: e?.message || 'resolve_failed',
      durationMs: Date.now() - started,
    })
    return { status: 'rpc_error', unavailableReason: 'rpc_error' }
  }
}
