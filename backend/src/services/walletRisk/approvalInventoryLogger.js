/**
 * @param {string} tag
 * @param {object} payload
 */
function logInventory(tag, payload) {
  console.info(tag, JSON.stringify({ ts: new Date().toISOString(), ...payload }))
}

/**
 * @param {object} entry
 */
export function logApprovalInventoryInit(entry) {
  logInventory('[approvalInventory:init]', {
    wallet: entry.wallet ? `${String(entry.wallet).slice(0, 6)}…${String(entry.wallet).slice(-4)}` : null,
    selectedChain: entry.selectedChain ?? null,
    resolvedChain: entry.resolvedChain ?? null,
    walletChain: entry.walletChain ?? null,
    resolvedRpc: entry.resolvedRpc ?? null,
    status: entry.status ?? null,
  })
}

/**
 * @param {object} entry
 */
export function logApprovalInventoryFetch(entry) {
  logInventory('[approvalInventory:fetch]', {
    wallet: entry.wallet ? `${String(entry.wallet).slice(0, 6)}…${String(entry.wallet).slice(-4)}` : null,
    chainId: entry.chainId ?? null,
    provider: entry.provider ?? 'alchemy',
    rpcUrl: entry.rpcUrl ?? null,
    status: entry.status ?? null,
    error: entry.error ?? null,
    durationMs: entry.durationMs ?? null,
    rowCount: entry.rowCount ?? null,
    cacheHit: Boolean(entry.cacheHit),
  })
}
