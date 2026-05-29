import { resolveContractArchetype } from '../contractIntelligence/contractIntelArchetypes.js'
import { fetchContractDeploymentMeta } from '../contractIntelligence/contractIntelProviders.js'
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
/**
 * @param {string} address
 * @param {number} chainId
 * @param {object | null} [deploymentMetaIn] — reuse when already fetched by contract intel engine
 */
export async function analyzeEvmTokenConcentration(address, chainId, deploymentMetaIn = null) {
  const archetype = resolveContractArchetype(address, chainId)
  const isCanonical = archetype?.class === 'canonical_token'

  const deploymentMetaPromise =
    deploymentMetaIn != null
      ? Promise.resolve(deploymentMetaIn)
      : fetchContractDeploymentMeta(address, chainId)

  const [dex, goPlusRow, deploymentMeta] = await Promise.all([
    fetchDexScreenerToken(address, chainId),
    fetchGoPlusTokenSecurity(address, chainId),
    deploymentMetaPromise,
  ])

  const goPlusParsed = parseGoPlusHolders(goPlusRow)

  return buildTokenConcentrationIntel({
    holderMetrics: goPlusParsed,
    dex,
    goPlusParsed,
    isCanonical,
    deploymentMeta,
  })
}
