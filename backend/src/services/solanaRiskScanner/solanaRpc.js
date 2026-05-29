import { getSolanaRpcUrl } from './solanaTypes.js'

/**
 * @param {string} method
 * @param {unknown[]} params
 */
export async function solanaRpc(method, params = []) {
  const url = getSolanaRpcUrl()
  if (!url) {
    const err = new Error('solana_rpc_unavailable')
    err.code = 'solana_rpc_unavailable'
    throw err
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })

  if (!res.ok) {
    const err = new Error(`solana_rpc_http_${res.status}`)
    err.code = 'solana_rpc_unavailable'
    throw err
  }

  const json = await res.json()
  if (json.error) {
    const err = new Error(json.error.message || 'solana_rpc_error')
    err.code = 'solana_rpc_unavailable'
    throw err
  }
  return json.result
}

/**
 * @param {string} address
 */
export async function fetchSolanaAccountParsed(address) {
  const result = await solanaRpc('getAccountInfo', [
    address,
    { encoding: 'jsonParsed', commitment: 'confirmed' },
  ])
  return result?.value || null
}

/**
 * Fail-soft account fetch — never throws to scanner engine.
 * @param {string} address
 */
export async function tryFetchSolanaAccountParsed(address) {
  try {
    const data = await fetchSolanaAccountParsed(address)
    return { ok: true, data, unavailable: false }
  } catch (e) {
    return {
      ok: false,
      data: null,
      unavailable: true,
      error_code: e?.code || 'solana_rpc_error',
      error_message: e?.message || 'rpc_failed',
    }
  }
}

/**
 * @param {string} mintAddress
 */
export async function fetchTokenLargestAccounts(mintAddress) {
  try {
    const result = await solanaRpc('getTokenLargestAccounts', [mintAddress, { commitment: 'confirmed' }])
    return result?.value || []
  } catch {
    return []
  }
}

/**
 * @param {string} address
 * @param {number} [limit]
 */
export async function fetchRecentSignatureCount(address, limit = 25) {
  try {
    const sigs = await solanaRpc('getSignaturesForAddress', [
      address,
      { limit, commitment: 'confirmed' },
    ])
    return Array.isArray(sigs) ? sigs.length : 0
  } catch {
    return 0
  }
}
