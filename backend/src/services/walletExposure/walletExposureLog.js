/**
 * @param {object} entry
 */
export function logWalletExposure(entry) {
  const payload = {
    tag: 'walletExposure',
    ts: new Date().toISOString(),
    wallet: entry.wallet ? `${String(entry.wallet).slice(0, 6)}…${String(entry.wallet).slice(-4)}` : null,
    scannedAddress: entry.scannedAddress
      ? `${String(entry.scannedAddress).slice(0, 6)}…${String(entry.scannedAddress).slice(-4)}`
      : null,
    scanChain: entry.scanChain ?? entry.chainId ?? null,
    chainId: entry.chainId ?? entry.scanChain ?? null,
    approvalInventoryStatus: entry.approvalInventoryStatus ?? null,
    approvalCount: entry.approvalCount ?? 0,
    unlimitedApprovals: entry.unlimitedApprovals ?? 0,
    estimatedExposureUsd: entry.estimatedExposureUsd ?? null,
    matchType: entry.matchType ?? 'none',
    cacheHit: Boolean(entry.cacheHit),
    durationMs: entry.durationMs ?? null,
    status: entry.status ?? null,
    error: entry.error ?? null,
    rateLimited: Boolean(entry.rateLimited),
    inventoryStale: Boolean(entry.inventoryStale),
    resolvedRpc: entry.resolvedRpc ?? null,
  }
  console.info('[walletExposure]', JSON.stringify(payload))
}
