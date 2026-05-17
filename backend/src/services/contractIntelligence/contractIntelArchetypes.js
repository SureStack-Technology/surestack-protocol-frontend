/**
 * Curated mainnet contract archetypes for trust-score calibration.
 * Keys: lowercase address (chain 1 default; extend per chain as needed).
 */

/** @typedef {'canonical_infrastructure'|'canonical_token'|'canonical_utility'} ArchetypeClass */

/**
 * @typedef {object} ContractArchetype
 * @property {string} id
 * @property {string} label
 * @property {ArchetypeClass} class
 * @property {number} scoreFloor
 * @property {number} scoreCeiling
 * @property {string} narrativeHint
 */

/** @type {Record<string, ContractArchetype>} */
const ETHEREUM_MAINNET = {
  '0xe592427a0aece92de3edee1f18e0157c05861564': {
    id: 'uniswap_v3_swap_router',
    label: 'Uniswap V3 SwapRouter02',
    class: 'canonical_infrastructure',
    scoreFloor: 88,
    scoreCeiling: 96,
    narrativeHint:
      'Battle-tested Uniswap V3 swap router — verified production infrastructure with deep on-chain usage.',
  },
  '0x000000000022d473030f116ddee9f6b43ac78ba3': {
    id: 'permit2',
    label: 'Permit2',
    class: 'canonical_utility',
    scoreFloor: 84,
    scoreCeiling: 93,
    narrativeHint:
      'Canonical Permit2 allowance contract — widely adopted signing surface; review spender approvals, not core bytecode trust.',
  },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    id: 'usdc',
    label: 'USD Coin (USDC)',
    class: 'canonical_token',
    scoreFloor: 86,
    scoreCeiling: 95,
    narrativeHint:
      'Established fiat-backed stablecoin with verified source and institutional usage — administrative upgrade paths exist by design.',
  },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
    id: 'weth',
    label: 'Wrapped Ether (WETH)',
    class: 'canonical_token',
    scoreFloor: 92,
    scoreCeiling: 98,
    narrativeHint:
      'Canonical wrapped ETH token — minimal privileged surface relative to DeFi routers; long production history.',
  },
}

/** @type {Record<number, Record<string, ContractArchetype>>} */
const BY_CHAIN = {
  1: ETHEREUM_MAINNET,
}

/**
 * @param {string} address
 * @param {number} chainId
 * @returns {ContractArchetype | null}
 */
export function resolveContractArchetype(address, chainId = 1) {
  const map = BY_CHAIN[Number(chainId)] || BY_CHAIN[1]
  if (!map) return null
  const key = String(address || '').toLowerCase()
  return map[key] || null
}

/**
 * Heuristic name-based archetype when explorer returns known labels.
 * @param {string | null | undefined} contractName
 */
export function archetypeFromContractName(contractName) {
  const n = String(contractName || '').toLowerCase()
  if (!n) return null
  if (/uniswap.*router|swaprouter/i.test(n)) {
    return {
      id: 'uniswap_router_name',
      label: contractName,
      class: 'canonical_infrastructure',
      scoreFloor: 85,
      scoreCeiling: 94,
      narrativeHint: 'Verified Uniswap router contract identified by explorer metadata.',
    }
  }
  if (/permit2/i.test(n)) {
    return {
      id: 'permit2_name',
      label: contractName,
      class: 'canonical_utility',
      scoreFloor: 83,
      scoreCeiling: 92,
      narrativeHint: 'Permit2-style allowance contract — standard DeFi approval infrastructure.',
    }
  }
  if (/usd coin|usdc|tether|dai|wrapped ether|weth/i.test(n)) {
    return {
      id: 'bluechip_token_name',
      label: contractName,
      class: 'canonical_token',
      scoreFloor: 84,
      scoreCeiling: 95,
      narrativeHint: 'Established token contract with verified explorer metadata.',
    }
  }
  return null
}
