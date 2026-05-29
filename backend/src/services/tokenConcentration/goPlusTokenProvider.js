const EVM_CHAIN_IDS = new Set([1, 8453, 42161, 10, 137])

/**
 * @param {string} address
 * @param {number | 'solana'} chainId
 */
export async function fetchGoPlusTokenSecurity(address, chainId) {
  const key = process.env.GOPLUS_APP_KEY || process.env.GOPLUS_API_KEY
  if (!key) return null

  let url
  if (chainId === 'solana') {
    url = `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${encodeURIComponent(address)}`
  } else if (EVM_CHAIN_IDS.has(Number(chainId))) {
    url = `https://api.gopluslabs.io/api/v1/token_security/${encodeURIComponent(String(chainId))}?contract_addresses=${encodeURIComponent(address)}`
  } else {
    return null
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: key },
    })
    if (!res.ok) return null
    const json = await res.json()
    const row = json?.result?.[address] || json?.result?.[address.toLowerCase()]
    return row || null
  } catch {
    return null
  }
}

/**
 * @param {object | null} row
 */
export function parseGoPlusHolders(row) {
  if (!row) return null
  const holders = Array.isArray(row.holders) ? row.holders : []
  const lpHolders = Array.isArray(row.lp_holders) ? row.lp_holders : []

  const holderPcts = holders.map((h) => Number(h.percent || 0) * 100).filter((n) => Number.isFinite(n))
  const top1 = holderPcts[0] ?? null
  const top10 = holderPcts.slice(0, 10).reduce((s, n) => s + n, 0)

  const creatorPct = row.creator_percent != null ? Number(row.creator_percent) * 100 : null
  const ownerPct = row.owner_percent != null ? Number(row.owner_percent) * 100 : null

  const lpLocked = lpHolders.some((h) => String(h.is_locked) === '1' || String(h.locked) === '1')
  const lpBurned = lpHolders.some((h) =>
    /burn|null/i.test(String(h.tag || '')) || String(h.address || '').toLowerCase().includes('dead'),
  )

  return {
    holderCount: Number(row.holder_count || 0) || null,
    top1HolderPct: top1,
    top10HolderPct: top10 > 0 ? top10 : null,
    top5HolderPct: holderPcts.slice(0, 5).reduce((s, n) => s + n, 0) || null,
    creatorPct,
    ownerPct,
    isInDex: String(row.is_in_dex) === '1',
    lpHolderCount: Number(row.lp_holder_count || 0) || null,
    lpLocked,
    lpBurned,
    lpHolders,
    holders,
  }
}
