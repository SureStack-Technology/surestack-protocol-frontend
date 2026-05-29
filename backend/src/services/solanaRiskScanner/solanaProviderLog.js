/**
 * Structured logging for Solana scanner provider calls.
 * @param {object} entry
 */
export function logSolanaProvider(entry) {
  const payload = {
    tag: 'solanaScanner',
    ts: new Date().toISOString(),
    mint: entry.mint || null,
    provider: entry.provider,
    status: entry.status,
    error_code: entry.error_code ?? null,
    error_message: entry.error_message ?? null,
    response_shape: entry.response_shape ?? null,
  }
  console.info('[solanaScanner]', JSON.stringify(payload))
}

/**
 * @template T
 * @param {string} mint
 * @param {string} provider
 * @param {() => Promise<T>} fn
 * @param {(data: T) => string} [shapeFn]
 */
export async function safeProviderCall(mint, provider, fn, shapeFn) {
  try {
    const data = await fn()
    logSolanaProvider({
      mint,
      provider,
      status: 'ok',
      response_shape: shapeFn ? shapeFn(data) : describeShape(data),
    })
    return { ok: true, data }
  } catch (e) {
    logSolanaProvider({
      mint,
      provider,
      status: 'error',
      error_code: e?.code || 'provider_error',
      error_message: e?.message || String(e),
    })
    return {
      ok: false,
      error_code: e?.code || 'provider_error',
      error_message: e?.message || String(e),
    }
  }
}

/**
 * @param {unknown} data
 */
function describeShape(data) {
  if (data == null) return 'null'
  if (Array.isArray(data)) return `array[${data.length}]`
  if (typeof data === 'object') {
    const keys = Object.keys(data).slice(0, 12)
    return `object{${keys.join(',')}}`
  }
  return typeof data
}

/**
 * @param {object | null | undefined} concentration
 */
export function hasSolanaMarketIntel(concentration) {
  if (!concentration) return false
  if (concentration.liquidityConfirmed && concentration.liquidityUsd > 0) return true
  if (concentration.jupiterRoutable) return true
  if (
    concentration.jupiterClassification === 'LIMITED_ROUTING' ||
    concentration.jupiterClassification === 'ROUTABLE'
  ) {
    return true
  }
  if (concentration.dataSources?.dexscreener) return true
  if (concentration.dataSources?.jupiter) return true
  if (concentration.available && concentration.liquidityStatus?.includes('DEXSCREENER')) return true
  return false
}
