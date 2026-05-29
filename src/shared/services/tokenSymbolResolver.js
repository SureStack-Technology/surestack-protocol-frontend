/**
 * Lightweight EVM token symbol → contract address resolver.
 * Registry auto-selects; DexScreener returns candidates requiring user confirmation.
 */

/** Mainnet registry — lowercase addresses. */
export const ETHEREUM_TOKEN_REGISTRY = {
  LINK: '0x514910771af9ca656af840dff83e8264ecf986ca',
  UNI: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  AAVE: '0x7fc66500c84a76ad7e9c93481fe6c2e88f4923e6',
  PEPE: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  SHIB: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
}

/** Minimum liquidity for DexScreener candidates (default). */
export const MIN_CANDIDATE_LIQUIDITY_USD = 25_000

/** High-confidence threshold for ambiguous symbols (still requires user confirmation). */
export const HIGH_CONFIDENCE_LIQUIDITY_USD = 500_000

/**
 * Symbols that may map to many unrelated contracts — prefer pasted address.
 * Dex candidates only shown when liquidity exceeds HIGH_CONFIDENCE_LIQUIDITY_USD.
 */
export const MANUAL_ONLY_SYMBOLS = new Set(['USD', 'BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'BNB'])

/** @deprecated Use MANUAL_ONLY_SYMBOLS — kept for ambiguous-native messaging. */
export const AMBIGUOUS_NATIVE_SYMBOLS = new Set([
  ...MANUAL_ONLY_SYMBOLS,
  'ADA',
  'DOT',
  'MATIC',
  'POL',
  'AVAX',
  'TRX',
  'LTC',
  'BCH',
  'XLM',
  'TON',
])

const CHAIN_SLUG = {
  ethereum: 'ethereum',
  base: 'base',
  arbitrum: 'arbitrum',
  polygon: 'polygon',
  optimism: 'optimism',
}

const CHAIN_LABEL = {
  ethereum: 'Ethereum',
  base: 'Base',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  optimism: 'Optimism',
}

const MANUAL_ONLY_MESSAGE =
  'Multiple assets may match this symbol. Paste the exact contract address to scan.'

function normalizeSymbol(raw) {
  const sym = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (!sym || sym.length > 16 || !/^[A-Z0-9]+$/.test(sym)) return null
  return sym
}

function checksumNeutral(addr) {
  return String(addr || '').toLowerCase()
}

function pickTokenFromPair(pair, symbol, chainSlug) {
  const base = pair?.baseToken
  const quote = pair?.quoteToken
  const sym = symbol.toUpperCase()
  const matchToken = (t) => (t?.symbol?.toUpperCase() === sym && t?.address ? t : null)

  if (chainSlug) {
    const cid = String(pair?.chainId || '').toLowerCase()
    if (cid && cid !== chainSlug && !cid.includes(chainSlug)) return null
  }

  return matchToken(base) || matchToken(quote)
}

function formatPairName(pair) {
  const base = pair?.baseToken?.symbol
  const quote = pair?.quoteToken?.symbol
  const dex = pair?.dexId ? String(pair.dexId) : 'DEX'
  if (base && quote) return `${base}/${quote} · ${dex}`
  if (base) return `${base} · ${dex}`
  return dex
}

export function formatCandidateLiquidity(usd) {
  const n = Number(usd)
  if (!Number.isFinite(n) || n <= 0) return null
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M liquidity`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K liquidity`
  return `$${Math.round(n)} liquidity`
}

/**
 * @param {string} symbol
 * @param {string | null} chainSlug
 * @param {{ manualOnly?: boolean }} [opts]
 */
async function fetchDexScreenerCandidates(symbol, chainSlug, opts = {}) {
  const manualOnly = Boolean(opts.manualOnly)
  const minLiquidity = manualOnly ? HIGH_CONFIDENCE_LIQUIDITY_USD : MIN_CANDIDATE_LIQUIDITY_USD

  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbol)}`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return null
    const json = await res.json()
    const pairs = Array.isArray(json?.pairs) ? json.pairs : []
    if (!pairs.length) return null

    const ranked = pairs
      .map((pair) => {
        const token = pickTokenFromPair(pair, symbol, chainSlug)
        if (!token?.address) return null
        const liquidityUsd = Number(pair?.liquidity?.usd || 0)
        if (liquidityUsd < minLiquidity) return null
        const chainId = String(pair?.chainId || chainSlug || 'ethereum').toLowerCase()
        return {
          address: checksumNeutral(token.address),
          chainId,
          chainLabel: CHAIN_LABEL[chainId] || chainId,
          liquidityUsd,
          pairName: formatPairName(pair),
          pairUrl: pair?.url || null,
          dexId: pair?.dexId || null,
          tokenName: token.name || token.symbol || symbol,
          liquidityLabel: formatCandidateLiquidity(liquidityUsd),
          highConfidence: liquidityUsd >= HIGH_CONFIDENCE_LIQUIDITY_USD,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.liquidityUsd - a.liquidityUsd)

    const seen = new Set()
    const unique = []
    for (const c of ranked) {
      const key = `${c.chainId}:${c.address}`
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(c)
      if (unique.length >= 3) break
    }

    return unique.length ? { candidates: unique } : null
  } catch {
    return null
  }
}

export function isTokenAutoResolved(tokenResolution) {
  return Boolean(tokenResolution?.resolved && tokenResolution?.autoSelected)
}

export function hasTokenContractProof(tokenResolution, confirmedTokenContract) {
  return isTokenAutoResolved(tokenResolution) || Boolean(confirmedTokenContract?.address)
}

export function isManualOnlySymbol(symbol) {
  return MANUAL_ONLY_SYMBOLS.has(normalizeSymbol(symbol) || '')
}

/**
 * @param {string} symbolInput
 * @param {string} [terminalChainId]
 */
export async function resolveTokenSymbol(symbolInput, terminalChainId = 'ethereum') {
  const symbol = normalizeSymbol(symbolInput)
  if (!symbol) {
    return {
      resolved: false,
      autoSelected: false,
      symbol: null,
      address: null,
      source: null,
      chainSlug: null,
      candidates: [],
      confirmationRequired: false,
      ambiguousNative: false,
      manualOnly: false,
      message: 'Invalid token symbol.',
    }
  }

  const chainSlug = CHAIN_SLUG[terminalChainId] || (terminalChainId === 'ethereum' ? 'ethereum' : null)
  const manualOnlySymbol = MANUAL_ONLY_SYMBOLS.has(symbol)
  const ambiguousNative = AMBIGUOUS_NATIVE_SYMBOLS.has(symbol)

  if (terminalChainId === 'ethereum' && ETHEREUM_TOKEN_REGISTRY[symbol]) {
    return {
      resolved: true,
      autoSelected: true,
      confirmationRequired: false,
      symbol,
      address: checksumNeutral(ETHEREUM_TOKEN_REGISTRY[symbol]),
      source: 'registry',
      chainSlug: 'ethereum',
      candidates: [],
      ambiguousNative: false,
      manualOnly: false,
      message: 'Contract proof available',
    }
  }

  if (terminalChainId === 'solana') {
    return {
      resolved: false,
      autoSelected: false,
      symbol,
      address: null,
      source: null,
      chainSlug: 'solana',
      candidates: [],
      confirmationRequired: false,
      ambiguousNative,
      manualOnly: manualOnlySymbol,
      message: 'EVM contract resolution not available on Solana — use mint address for scanner.',
    }
  }

  if (manualOnlySymbol) {
    const dex = await fetchDexScreenerCandidates(symbol, chainSlug, { manualOnly: true })
    if (dex?.candidates?.length) {
      return {
        resolved: false,
        autoSelected: false,
        confirmationRequired: true,
        symbol,
        address: null,
        source: 'dexscreener',
        chainSlug: chainSlug || 'ethereum',
        candidates: dex.candidates,
        ambiguousNative: true,
        manualOnly: true,
        message: MANUAL_ONLY_MESSAGE,
        bannerTitle: 'High-liquidity candidate found',
        candidateHint: 'Candidates below passed the $500K liquidity safety filter — confirm before scanning.',
      }
    }
    return {
      resolved: false,
      autoSelected: false,
      symbol,
      address: null,
      source: null,
      chainSlug,
      candidates: [],
      confirmationRequired: false,
      ambiguousNative: true,
      manualOnly: true,
      message: MANUAL_ONLY_MESSAGE,
      bannerTitle: 'Manual contract required',
    }
  }

  const dex = await fetchDexScreenerCandidates(symbol, chainSlug)
  if (dex?.candidates?.length) {
    return {
      resolved: false,
      autoSelected: false,
      confirmationRequired: true,
      symbol,
      address: null,
      source: 'dexscreener',
      chainSlug: chainSlug || 'ethereum',
      candidates: dex.candidates,
      ambiguousNative,
      manualOnly: false,
      message: 'Confirm this is the token you want to scan.',
      bannerTitle: 'Candidate contract found',
      candidateHint: 'Candidates below have at least $25K pool liquidity — confirm before scanning.',
    }
  }

  return {
    resolved: false,
    autoSelected: false,
    symbol,
    address: null,
    source: null,
    chainSlug,
    candidates: [],
    confirmationRequired: false,
    ambiguousNative,
    manualOnly: false,
    message: ambiguousNative
      ? `${symbol} may refer to a native or wrapped asset. Contract proof unavailable until you paste the exact contract.`
      : 'Contract proof unavailable until token contract is resolved.',
  }
}
