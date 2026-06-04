import {
  getAssetDisplayName,
  isRawBlockchainTarget,
  resolveRegistryCanonicalFromRaw,
} from '@/lib/intelligence/assetDisplayLabel.mjs'

/** Known token aliases → clean display labels (UI only; scan uses raw input). */
const TOKEN_ALIASES = {
  dogecoin: { symbol: 'DOGE', name: 'Dogecoin' },
  doge: { symbol: 'DOGE', name: 'Dogecoin' },
  pepe: { symbol: 'PEPE', name: 'PEPE' },
  btc: { symbol: 'BTC', name: 'BTC' },
  bitcoin: { symbol: 'BTC', name: 'BTC' },
  eth: { symbol: 'ETH', name: 'ETH' },
  ethereum: { symbol: 'ETH', name: 'ETH' },
  wif: { symbol: 'WIF', name: 'WIF' },
  bonk: { symbol: 'BONK', name: 'BONK' },
  sol: { symbol: 'SOL', name: 'SOL' },
  solana: { symbol: 'SOL', name: 'SOL' },
}

/**
 * @param {string} raw User-entered token query
 * @returns {string} Display label, e.g. "Dogecoin (DOGE)" or "PEPE"
 */
export function formatTokenDisplayLabel(raw, canonicalAsset = null) {
  const input = String(raw || '').trim()
  if (!input) return ''

  const asset = canonicalAsset || resolveRegistryCanonicalFromRaw(input)
  if (asset?.resolved) {
    return getAssetDisplayName(asset, input)
  }

  const key = input.toLowerCase().replace(/^\$/, '').replace(/\s+/g, '')
  const known = TOKEN_ALIASES[key]
  if (known) {
    if (known.name === known.symbol) return known.symbol
    return `${known.name} (${known.symbol})`
  }

  if (isRawBlockchainTarget(input)) {
    return getAssetDisplayName(resolveRegistryCanonicalFromRaw(input), input) || 'Intelligence target'
  }

  if (/^[a-z0-9]{2,12}$/i.test(input)) return input.toUpperCase()

  return input
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * First complete sentence, optionally capped without mid-word clips.
 * @param {string} text
 * @param {number} [maxLen]
 */
export function narrativeSummarySentence(text, maxLen = 240) {
  const raw = String(text || '').trim()
  if (!raw) return ''

  const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (!sentences.length) return ''

  let combined = sentences[0]
  for (let i = 1; i < sentences.length; i += 1) {
    const next = `${combined} ${sentences[i]}`
    if (next.length <= maxLen) combined = next
    else break
  }

  if (combined.length <= maxLen) return combined

  const trimmed = combined.slice(0, maxLen - 1)
  const lastSpace = trimmed.lastIndexOf(' ')
  const safe = lastSpace > maxLen * 0.5 ? trimmed.slice(0, lastSpace) : trimmed
  return `${safe}…`
}
