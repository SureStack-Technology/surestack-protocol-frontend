/** @typedef {'canonical_mint'|'canonical_program'} ArchetypeKind */

/**
 * @typedef {object} SolanaArchetype
 * @property {string} id
 * @property {string} label
 * @property {ArchetypeKind} kind
 * @property {number} scoreFloor
 * @property {number} scoreCeiling
 * @property {string} narrativeHint
 * @property {boolean} [regulatedStablecoin]
 */

/** @type {Record<string, SolanaArchetype>} */
const KNOWN = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    id: 'usdc_solana',
    label: 'USD Coin (USDC)',
    kind: 'canonical_mint',
    regulatedStablecoin: true,
    scoreFloor: 86,
    scoreCeiling: 96,
    narrativeHint:
      'Established Solana USDC mint with institutional usage and issuer controls typical of regulated stablecoins.',
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    id: 'usdt_solana',
    label: 'Tether USD (USDT)',
    kind: 'canonical_mint',
    regulatedStablecoin: true,
    scoreFloor: 84,
    scoreCeiling: 94,
    narrativeHint:
      'Established Solana USDT mint with institutional usage and issuer controls typical of regulated stablecoins.',
  },
  So11111111111111111111111111111111111111112: {
    id: 'wrapped_sol',
    label: 'Wrapped SOL',
    kind: 'canonical_mint',
    scoreFloor: 90,
    scoreCeiling: 98,
    narrativeHint: 'Canonical wrapped SOL mint used across Solana DeFi.',
  },
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: {
    id: 'spl_token_program',
    label: 'SPL Token Program',
    kind: 'canonical_program',
    scoreFloor: 92,
    scoreCeiling: 98,
    narrativeHint: 'Core Solana SPL Token program — system-level infrastructure.',
  },
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: {
    id: 'token_2022_program',
    label: 'Token-2022 Program',
    kind: 'canonical_program',
    scoreFloor: 88,
    scoreCeiling: 96,
    narrativeHint: 'Solana Token-2022 program extension — standard token infrastructure.',
  },
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: {
    id: 'jupiter_v6',
    label: 'Jupiter Aggregator v6',
    kind: 'canonical_program',
    scoreFloor: 85,
    scoreCeiling: 94,
    narrativeHint: 'Battle-tested Jupiter swap program on Solana mainnet.',
  },
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: {
    id: 'jupiter_v4',
    label: 'Jupiter Aggregator',
    kind: 'canonical_program',
    scoreFloor: 84,
    scoreCeiling: 93,
    narrativeHint: 'Established Jupiter routing program.',
  },
}

/**
 * @param {string} address
 * @returns {SolanaArchetype | null}
 */
export function resolveSolanaArchetype(address) {
  return KNOWN[address] || null
}
