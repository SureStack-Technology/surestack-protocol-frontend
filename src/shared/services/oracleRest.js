import { getBackendBaseUrl } from '@shared/services/validatorApi'

/**
 * Public GET /api/oracle/price — backend oracle service (Chainlink-backed).
 * Uses same base resolution as authenticated API (VITE_API_URL, VITE_BACKEND_URL, or same-origin /api in dev).
 */
export function getOraclePriceUrl() {
  const base = getBackendBaseUrl()
  if (base) {
    return `${String(base).replace(/\/+$/, '')}/api/oracle/price`
  }
  return '/api/oracle/price'
}

/**
 * @returns {{ price: number, currency?: string, updatedAt: string|Date|null }}
 */
export async function fetchOracleRestPrice(options = {}) {
  const { signal } = options
  const url = getOraclePriceUrl()
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const msg = data?.error || `http_${res.status}`
    throw new Error(msg)
  }
  if (!data?.success || data.price == null || !Number.isFinite(Number(data.price))) {
    throw new Error(data?.error || 'oracle_no_price')
  }
  return {
    price: Number(data.price),
    currency: data.currency,
    updatedAt: data.updatedAt != null ? data.updatedAt : null,
  }
}
