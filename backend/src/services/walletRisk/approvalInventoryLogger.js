/**
 * @param {string} tag
 * @param {object} payload
 */
function logInventory(tag, payload) {
  console.info(tag, JSON.stringify({ ts: new Date().toISOString(), ...payload }))
}

/** @type {Map<string, number>} */
const initLogAt = new Map()

/**
 * @param {string} wallet
 * @param {number} chainId
 */
function shouldLogInit(wallet, chainId) {
  const key = `${String(wallet).toLowerCase()}:${Number(chainId)}`
  const last = initLogAt.get(key) || 0
  if (Date.now() - last < 90_000) return false
  initLogAt.set(key, Date.now())
  return true
}

/**
 * @param {object} entry
 */
export function logApprovalInventoryInit(entry) {
  if (!shouldLogInit(entry.wallet, entry.selectedChain ?? entry.resolvedChain)) return
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
  const cacheHit = Boolean(entry.cacheHit)
  const skippedFetch = Boolean(entry.skippedFetch)

  if (cacheHit && skippedFetch) {
    logInventory('[approvalInventory:cache]', {
      wallet: entry.wallet ? `${String(entry.wallet).slice(0, 6)}…${String(entry.wallet).slice(-4)}` : null,
      chainId: entry.chainId ?? null,
      status: entry.status ?? 'served_from_cache',
      source: entry.source ?? 'server_cache',
      rowCount: entry.rowCount ?? null,
      cacheHit: true,
      skippedFetch: true,
    })
    return
  }

  logInventory('[approvalInventory:fetch]', {
    wallet: entry.wallet ? `${String(entry.wallet).slice(0, 6)}…${String(entry.wallet).slice(-4)}` : null,
    chainId: entry.chainId ?? null,
    provider: entry.provider ?? 'alchemy',
    rpcUrl: entry.rpcUrl ?? null,
    status: entry.status ?? null,
    error: entry.error ?? null,
    durationMs: entry.durationMs ?? null,
    rowCount: entry.rowCount ?? null,
    cacheHit,
    skippedFetch,
    source: entry.source ?? null,
  })
}
