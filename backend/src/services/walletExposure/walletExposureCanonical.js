/** Canonical EVM spender surfaces (mainnet — lowercase keys). */
export const CANONICAL_SPENDERS = {
  '0x000000000022d473030f116ddee9f6b43ac78ba3': {
    id: 'permit2',
    label: 'Permit2',
  },
  '0xe592427a0aece92de3edee1f18e0157c05861564': {
    id: 'uniswap_v3_router',
    label: 'Uniswap V3 Router',
  },
  '0x1e0049783f008a0085193e00003d00cd54003c71': {
    id: 'opensea_conduit',
    label: 'OpenSea Conduit',
  },
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': {
    id: 'zeroex_proxy',
    label: '0x Exchange Proxy',
  },
  '0x9008d19f58aabd9ed0d60971565aa8510560ab41': {
    id: 'cowswap_settlement',
    label: 'CowSwap Settlement',
  },
}

/**
 * @param {string} scannedAddress
 * @param {object[]} approvalRows
 * @returns {{ rows: object[], matchType: 'exact_spender' | 'canonical_spender' | 'none', canonicalLabel?: string }}
 */
export function matchApprovalsToScannedAddress(scannedAddress, approvalRows) {
  const target = String(scannedAddress || '').toLowerCase()
  if (!target) {
    return { rows: [], matchType: 'none' }
  }

  const exact = (approvalRows || []).filter((r) => String(r.spender || '').toLowerCase() === target)
  if (exact.length > 0) {
    return { rows: exact, matchType: 'exact_spender' }
  }

  const canonical = CANONICAL_SPENDERS[target]
  if (!canonical) {
    return { rows: [], matchType: 'none' }
  }

  const related = (approvalRows || []).filter((r) => {
    const cat = String(r.spenderCategory || '')
    if (cat === 'KNOWN_AGGREGATOR') return true
    const spender = String(r.spender || '').toLowerCase()
    return spender in CANONICAL_SPENDERS
  })

  if (related.length > 0) {
    return { rows: related, matchType: 'canonical_spender', canonicalLabel: canonical.label }
  }

  return { rows: [], matchType: 'none' }
}
