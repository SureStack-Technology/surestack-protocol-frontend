import { buildNarrative } from '../walletRisk/walletRiskNarrative.js'
import {
  analyzeEvmTokenConcentration,
  isLikelyErc20Token,
} from '../tokenConcentration/evmTokenConcentration.js'
import { mergeTokenConcentrationIntoCore } from '../tokenConcentration/tokenConcentrationScoring.js'
import {
  fetchContractDeploymentMeta,
  fetchEtherscanContractMeta,
  fetchGoPlusAddressSecurity,
  fetchOnChainContractSignals,
} from './contractIntelProviders.js'
import { applyConfidenceCalibration } from '../scannerConfidence/scannerConfidenceEngine.js'
import { attachLiquidityIntelligence } from '../liquidityIntelligence/attachLiquidityIntelligence.js'
import { attachExecutiveIntelligence } from '../executiveIntelligence/attachExecutiveIntelligence.js'
import { scoreFromSignals } from './contractIntelScoring.js'

function finalizeEvmReport(payload, ctx = {}) {
  let report = payload
  if (payload?.trustScore != null) {
    report = applyConfidenceCalibration(payload, 'evm')
  }
  report = attachLiquidityIntelligence(report)
  return attachExecutiveIntelligence(report, ctx)
}

function buildAlphaExtensions(core, tier) {
  if (tier !== 'alpha_advanced') return {}

  const privileged = core.privilegedFunctions || {}
  return {
    functionPrivilegeMap: [
      privileged.owner && { fn: 'owner()', risk: 'centralization', note: 'Single or multisig owner pattern' },
      privileged.pause && { fn: 'pause() / unpause()', risk: 'circuit_breaker', note: 'Transfer freeze risk' },
      privileged.mint && { fn: 'mint()', risk: 'supply_inflation', note: 'Verify max supply guards' },
      privileged.blacklist && { fn: 'blacklist()', risk: 'censorship', note: 'Address-level blocking' },
    ].filter(Boolean),

    protocolDependencyGraph: {
      nodes: [
        { id: 'target', label: 'Target contract', role: 'subject' },
        ...(core.proxyImplementation
          ? [{ id: 'impl', label: core.proxyImplementation, role: 'implementation' }]
          : []),
      ],
      edges: core.proxyImplementation
        ? [{ from: 'target', to: 'impl', type: 'EIP1967_IMPLEMENTATION' }]
        : [],
    },

    exploitSimilarityHeuristics: {
      score: privileged.pause && privileged.blacklist ? 72 : privileged.mint ? 58 : 34,
      labels:
        privileged.pause && privileged.blacklist
          ? ['admin_trap_pattern', 'liquidity_gate_pattern']
          : privileged.mint
            ? ['supply_inflation_pattern']
            : ['standard_token_surface'],
      note: 'Heuristic similarity to known exploit classes — not a guarantee of safety.',
    },

    smartMoneyInteractionConfidence:
      core.ownershipConcentration === 'DISPERSED' ? 62 : core.ownershipConcentration === 'CONCENTRATED' ? 28 : 45,

    advancedAiBreakdown: {
      executiveSummary: null,
      privilegePosture: privileged,
      upgradePath: core.upgradeableProxy
        ? 'Proxy upgrade path requires admin review'
        : 'No proxy detected',
      retentionRisk:
        core.trustScore != null && core.trustScore < 45
          ? 'Elevated — restrict treasury exposure'
          : 'Moderate — monitor privileged events',
    },
  }
}

/**
 * @param {{ address: string, chainId: number, tier: 'prime_lite' | 'alpha_advanced', relatedAddresses?: string[] }} opts
 */
export async function analyzeContractIntelligence(opts) {
  const { address, chainId, tier, relatedAddresses = [] } = opts

  const [onChain, goPlus, etherscan] = await Promise.all([
    fetchOnChainContractSignals(address, chainId),
    fetchGoPlusAddressSecurity(address, chainId),
    fetchEtherscanContractMeta(address, chainId),
  ])

  let core = scoreFromSignals({ onChain, goPlus, etherscan, tier, address, chainId })

  let deploymentMeta = { available: false }
  if (core.isContract && isLikelyErc20Token({ onChain, etherscan, address, chainId })) {
    deploymentMeta = await fetchContractDeploymentMeta(address, chainId).catch(() => ({
      available: false,
    }))
    try {
      const concentration = await analyzeEvmTokenConcentration(address, chainId, deploymentMeta)
      core = mergeTokenConcentrationIntoCore(core, concentration, {
        isCanonical: Boolean(core.archetypeId),
      })
    } catch (e) {
      console.warn('[contract-intel] token concentration skipped', e?.message || e)
    }
  }

  if (!core.isContract) {
    return {
      success: true,
      product: 'surestack_contract_intelligence_engine',
      tier,
      address,
      chainId,
      analyzedAt: new Date().toISOString(),
      ...finalizeEvmReport(core, { address, chainId }),
      aiSummary: core.interpretationSummary,
    }
  }

  const narrativeFindings = core.findings.map((f) => ({
    code: f.code,
    severity: f.severity,
    title: f.title,
    detail: f.detail,
  }))

  const aiSummary =
    (await buildNarrative(narrativeFindings, process.env.OPENAI_API_KEY)) ||
    core.interpretationSummary

  const alphaExtras = buildAlphaExtensions(core, tier)
  if (tier === 'alpha_advanced' && alphaExtras.advancedAiBreakdown) {
    const advancedNarrative = await buildNarrative(
      [
        ...narrativeFindings,
        {
          code: 'ALPHA_BREAKDOWN',
          severity: 'INFO',
          title: 'Advanced analyst context',
          detail: `Exploit similarity ${alphaExtras.exploitSimilarityHeuristics?.score}; smart-money confidence ${alphaExtras.smartMoneyInteractionConfidence}.`,
        },
      ],
      process.env.OPENAI_API_KEY,
    )
    alphaExtras.advancedAiBreakdown.executiveSummary = advancedNarrative || aiSummary
  }

  const multiContractTrust = []
  const peers = (relatedAddresses || []).slice(0, tier === 'alpha_advanced' ? 5 : 0)
  for (const peer of peers) {
    const pOn = await fetchOnChainContractSignals(peer, chainId).catch(() => null)
    const pGp = await fetchGoPlusAddressSecurity(peer, chainId).catch(() => null)
    const pEs = await fetchEtherscanContractMeta(peer, chainId).catch(() => null)
    const pCore = scoreFromSignals({
      onChain: pOn,
      goPlus: pGp,
      etherscan: pEs,
      tier: 'prime_lite',
      address: peer,
      chainId,
    })
    if (pCore.isContract) {
      multiContractTrust.push({
        address: peer,
        trustScore: pCore.trustScore,
        trustBand: pCore.trustBand,
      })
    }
  }

  const finalized = finalizeEvmReport(
    {
      ...core,
      ...alphaExtras,
      aiSummary,
      multiContractTrust: multiContractTrust.length ? multiContractTrust : undefined,
      deploymentMeta,
    },
    { address, chainId },
  )

  return {
    success: true,
    product: 'surestack_contract_intelligence_engine',
    tier,
    address,
    chainId,
    analyzedAt: new Date().toISOString(),
    ...finalized,
  }
}
