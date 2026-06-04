/**
 * P4.2.5 — First-class native asset intelligence (ETH, BTC, SOL).
 */

/** @typedef {{ classification: string, narrativeCategory: string, strengths: string[], risks: string[] }} NativeAssetIntelligenceProfile */

/** @type {Record<string, NativeAssetIntelligenceProfile>} */
export const NATIVE_ASSET_INTELLIGENCE_REGISTRY = {
  ETH: {
    classification: 'LAYER 1 ASSET',
    narrativeCategory: 'l2',
    strengths: [
      'Largest smart contract ecosystem',
      'Deep institutional liquidity',
      'Extensive validator network',
      'Long deployment history',
    ],
    risks: [
      'Smart contract ecosystem attack surface',
      'Layer 2 fragmentation risk',
      'Regulatory uncertainty',
    ],
  },
  WETH: {
    classification: 'LAYER 1 ASSET',
    narrativeCategory: 'l2',
    strengths: [
      'Largest smart contract ecosystem',
      'Deep institutional liquidity',
      'Extensive validator network',
      'Long deployment history',
    ],
    risks: [
      'Smart contract ecosystem attack surface',
      'Layer 2 fragmentation risk',
      'Regulatory uncertainty',
    ],
  },
  BTC: {
    classification: 'STORE OF VALUE ASSET',
    narrativeCategory: 'l2',
    strengths: [
      'Most secure proof-of-work network',
      'Deep global liquidity',
      'Institutional adoption',
      'Long deployment history',
    ],
    risks: [
      'Proof-of-work energy scrutiny',
      'Limited native smart contract surface',
      'Regulatory uncertainty',
    ],
  },
  WBTC: {
    classification: 'STORE OF VALUE ASSET',
    narrativeCategory: 'l2',
    strengths: [
      'Most secure proof-of-work network',
      'Deep global liquidity',
      'Institutional adoption',
      'Long deployment history',
    ],
    risks: [
      'Wrapped-asset custodial dependency',
      'Bridge and issuer concentration risk',
      'Regulatory uncertainty',
    ],
  },
  SOL: {
    classification: 'LAYER 1 ASSET',
    narrativeCategory: 'l2',
    strengths: [
      'High throughput architecture',
      'Growing ecosystem adoption',
      'Low transaction costs',
      'Expanding validator network',
    ],
    risks: [
      'Network outage history relative to mature L1s',
      'Ecosystem concentration in high-beta applications',
      'Regulatory uncertainty',
    ],
  },
}

/**
 * @param {string | null | undefined} symbol
 * @returns {NativeAssetIntelligenceProfile | null}
 */
export function lookupNativeAssetIntelligence(symbol) {
  const sym = String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (!sym) return null
  return NATIVE_ASSET_INTELLIGENCE_REGISTRY[sym] || null
}

/**
 * @param {string | null | undefined} symbol
 * @param {object | null | undefined} [canonicalAsset]
 * @returns {string | null}
 */
export function resolveNativeExecutiveClassification(symbol, canonicalAsset = null) {
  if (canonicalAsset?.native) {
    const intel = lookupNativeAssetIntelligence(canonicalAsset.symbol)
    if (intel) return intel.classification
  }
  return lookupNativeAssetIntelligence(symbol)?.classification || null
}
