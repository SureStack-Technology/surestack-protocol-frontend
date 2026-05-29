const WSOL = 'So11111111111111111111111111111111111111112'
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

/**
 * @param {object} probe
 */
async function probeQuote(probe) {
  try {
    const params = new URLSearchParams({
      inputMint: probe.inputMint,
      outputMint: probe.outputMint,
      amount: probe.amount,
      slippageBps: '800',
    })
    const res = await fetch(`https://lite-api.jup.ag/swap/v1/quote?${params}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return { ok: false }
    const json = await res.json()
    if (json?.error || json?.errorCode) return { ok: false, error: json.error || json.errorCode }
    if (!json?.outAmount && !(json?.routePlan?.length > 0)) return { ok: false }
    const venues = new Set(['Jupiter'])
    for (const step of json.routePlan || []) {
      const label = String(step?.swapInfo?.label || step?.swapInfo?.ammKey || '')
      if (/raydium/i.test(label)) venues.add('Raydium')
      if (/orca/i.test(label)) venues.add('Orca')
      if (/meteora/i.test(label)) venues.add('Meteora')
      if (/pump/i.test(label)) venues.add('Pump')
    }
    return { ok: true, venues: [...venues] }
  } catch {
    return { ok: false }
  }
}

/**
 * Public Jupiter quote probes — routing / tradability confidence.
 * @param {string} mint
 */
export async function fetchJupiterRoutingSignal(mint) {
  if (!mint || mint === WSOL) {
    return {
      classification: 'ROUTABLE',
      confidence: 'HIGH',
      solToToken: true,
      tokenToUsdc: true,
      routable: true,
      sparse: false,
      venues: ['Jupiter'],
      source: 'JUPITER',
    }
  }

  const [solToToken, tokenToUsdc] = await Promise.all([
    probeQuote({ inputMint: WSOL, outputMint: mint, amount: '50000000' }),
    probeQuote({ inputMint: mint, outputMint: USDC, amount: '1000000' }),
  ])

  const venues = new Set()
  if (solToToken.ok) for (const v of solToToken.venues || []) venues.add(v)
  if (tokenToUsdc.ok) for (const v of tokenToUsdc.venues || []) venues.add(v)

  let classification = 'NOT_ROUTABLE'
  let confidence = 'LOW'

  if (solToToken.ok && tokenToUsdc.ok) {
    classification = 'ROUTABLE'
    confidence = 'HIGH'
  } else if (solToToken.ok || tokenToUsdc.ok) {
    classification = 'LIMITED_ROUTING'
    confidence = 'MEDIUM'
  }

  return {
    classification,
    confidence,
    solToToken: Boolean(solToToken.ok),
    tokenToUsdc: Boolean(tokenToUsdc.ok),
    routable: classification !== 'NOT_ROUTABLE',
    sparse: classification === 'LIMITED_ROUTING',
    venues: [...venues],
    source: 'JUPITER',
  }
}
