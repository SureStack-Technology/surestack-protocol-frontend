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
  '0xdac17f958d2ee523a2206206994597c13d831ec7': {
    id: 'usdt',
    label: 'Tether USD (USDT)',
    class: 'canonical_token',
    scoreFloor: 84,
    scoreCeiling: 94,
    narrativeHint:
      'Established fiat-backed stablecoin with broad global liquidity — review issuer attestations and redemption mechanics as standard stablecoin diligence.',
  },
  '0x6b175474e89094c44da98b954eedeac495271d0f': {
    id: 'dai',
    label: 'Dai Stablecoin (DAI)',
    class: 'canonical_token',
    scoreFloor: 84,
    scoreCeiling: 93,
    narrativeHint:
      'Decentralized stablecoin with verified source and long production history — review collateral and governance surfaces as standard DeFi diligence.',
  },
  '0x514910771af9ca656af840dff83e8264ecf986ca': {
    id: 'link',
    label: 'Chainlink (LINK)',
    class: 'canonical_token',
    scoreFloor: 85,
    scoreCeiling: 94,
    narrativeHint:
      'Established oracle network token with verified source and long production history — review admin and proxy controls as standard governance risk.',
  },
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': {
    id: 'uni',
    label: 'Uniswap (UNI)',
    class: 'canonical_token',
    scoreFloor: 84,
    scoreCeiling: 93,
    narrativeHint:
      'Established DeFi governance token — verified production contract with expected administrative surfaces.',
  },
  '0x7fc66500c84a76ad7e9c93481fe6c2e88f4923e6': {
    id: 'aave',
    label: 'Aave (AAVE)',
    class: 'canonical_token',
    scoreFloor: 84,
    scoreCeiling: 93,
    narrativeHint:
      'Established DeFi protocol token — verified source with governance-controlled upgrade paths.',
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
  if (/chainlink|link token/i.test(n)) {
    return {
      id: 'link_name',
      label: contractName,
      class: 'canonical_token',
      scoreFloor: 84,
      scoreCeiling: 93,
      narrativeHint: 'Established oracle network token identified by explorer metadata.',
    }
  }
  if (/uniswap|aave/i.test(n)) {
    return {
      id: 'defi_token_name',
      label: contractName,
      class: 'canonical_token',
      scoreFloor: 83,
      scoreCeiling: 92,
      narrativeHint: 'Established DeFi token identified by explorer metadata.',
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
