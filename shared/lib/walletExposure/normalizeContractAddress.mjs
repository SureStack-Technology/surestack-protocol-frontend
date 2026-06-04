/**
 * Normalize EVM contract addresses for catalog / registry lookups.
 * @param {string | null | undefined} address
 * @returns {string | null}
 */
export function normalizeContractAddress(address) {
  const raw = String(address || '').trim()
  if (!raw) return null
  if (raw === 'native') return 'native'
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) return raw.toLowerCase()
  return raw.toLowerCase()
}
