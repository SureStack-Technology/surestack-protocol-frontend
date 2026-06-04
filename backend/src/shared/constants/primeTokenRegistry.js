/**
 * Backend re-export — single import point for repo-root shared registry.
 * Source of truth: /shared/constants/primeTokenRegistry.mjs
 */
export {
  PRIME_TOKEN_REGISTRY,
  ETHEREUM_REGISTRY_BY_SYMBOL,
  VALIDATION_MATRIX_SYMBOLS,
  lookupPrimeToken,
  lookupPrimeTokenByAddress,
  lookupPrimeTokenByName,
  buildSymbolRegistryMap,
  toTokenResolutionPayload,
} from '../../../../shared/constants/primeTokenRegistry.mjs'
