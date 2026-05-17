import { resolveContractArchetype } from '../contractIntelligence/contractIntelArchetypes.js'
import { fetchDexScreenerToken } from './dexScreenerProvider.js'
import { fetchGoPlusTokenSecurity, parseGoPlusHolders } from './goPlusTokenProvider.js'
import { buildTokenConcentrationIntel } from './tokenConcentrationScoring.js'

/**
 * Heuristic: ERC20-like token surface (not DEX router infrastructure).
 * @param {object} params
 */
export function isLikelyErc20Token({ onChain, etherscan, address, chainId }) {
  const archetype = resolveContractArchetype(address, chainId)
  if (archetype?.class === 'canonical_token') return true
  if (archetype?.class === 'canonical_infrastructure') return false
  if (!onChain?.isContract) return false

  const sel = onChain?.erc20Selectors || {}
  const hasErc20 = Boolean(sel.transfer && sel.balanceOf)
  if (!hasErc20) return false

  const bytecodeLen = Number(onChain.bytecodeLength || 0)
  if (bytecodeLen > 28000 && !archetype) return false

  return true
}

/**
 * @param {string} address
 * @param {number} chainId
 */
export async function analyzeEvmTokenConcentration(address, chainId) {
  const archetype = resolveContractArchetype(address, chainId)
  const isCanonical = archetype?.class === 'canonical_token'

  const [dex, goPlusRow] = await Promise.all([
    fetchDexScreenerToken(address, chainId),
    fetchGoPlusTokenSecurity(address, chainId),
  ])

  const goPlusParsed = parseGoPlusHolders(goPlusRow)

  return buildTokenConcentrationIntel({
    holderMetrics: goPlusParsed,
    dex,
    goPlusParsed,
    isCanonical,
  })
}
