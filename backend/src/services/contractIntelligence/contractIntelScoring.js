import {
  archetypeFromContractName,
  resolveContractArchetype,
} from './contractIntelArchetypes.js'
import { trustBandFromScore } from './contractIntelTypes.js'

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * @param {object} params
 * @returns {'UNDETERMINED'|'LOW'|'HIGH'}
 */
function normalizeHoneypotRisk(goPlus) {
  if (!goPlus) return 'UNDETERMINED'
  const hp = String(goPlus.honeypot ?? goPlus.is_honeypot ?? '')
  if (hp === '1' || hp === 'true') return 'HIGH'
  if (hp === '0' || hp === 'false') return 'LOW'
  return 'UNDETERMINED'
}

/**
 * @param {object | null} goPlus
 * @returns {'NOT_DISCLOSED'|'CONCENTRATED'|'DISPERSED'}
 */
function normalizeOwnershipConcentration(goPlus) {
  if (!goPlus) return 'NOT_DISCLOSED'
  const holderCount = Number(goPlus.holder_count ?? goPlus.holders ?? 0)
  if (holderCount <= 0) return 'NOT_DISCLOSED'
  if (holderCount < 25) return 'CONCENTRATED'
  return 'DISPERSED'
}

/**
 * Large production contracts often contain selector byte patterns as substrings.
 * Suppress token-admin heuristics on heavy bytecode unless unverified.
 */
function shouldApplyTokenAdminHeuristics(onChain, etherscan) {
  const len = Number(onChain?.bytecodeLength || 0)
  const verified = Boolean(etherscan?.verified)
  if (!onChain?.isContract) return false
  if (verified && len > 12000) return false
  return len < 12000 || !verified
}

/**
 * @param {object} input
 * @param {import('./contractIntelArchetypes.js').ContractArchetype | null} archetype
 */
const ARCHETYPE_ADMIN_CODES = new Set([
  'UPGRADEABLE_PROXY',
  'OWNER_PRIVILEGE',
  'PAUSE_PRIVILEGE',
  'MINT_PRIVILEGE',
  'BLACKLIST_PRIVILEGE',
])

function applyArchetypeCalibration(raw, archetype) {
  if (!archetype) return raw

  let score = clamp(Math.max(raw.trustScore, archetype.scoreFloor), archetype.scoreFloor, archetype.scoreCeiling)
  const findings = raw.findings.map((f) => {
    if (
      archetype.class === 'canonical_infrastructure' &&
      ['UPGRADEABLE_PROXY', 'OWNER_PRIVILEGE'].includes(f.code)
    ) {
      return { ...f, severity: 'INFO', title: f.title, detail: `${f.detail} (expected for this infrastructure class.)` }
    }
    if (archetype.class === 'canonical_token' && ARCHETYPE_ADMIN_CODES.has(f.code)) {
      return {
        ...f,
        severity: 'INFO',
        detail: `${f.detail} Expected administrative surface for established tokens — review governance policy.`,
      }
    }
    return f
  })

  if (score < archetype.scoreFloor) score = archetype.scoreFloor

  return {
    ...raw,
    trustScore: score,
    trustBand: trustBandFromScore(score),
    archetypeId: archetype.id,
    archetypeLabel: archetype.label,
    interpretationSummary: archetype.narrativeHint,
  }
}

/**
 * @param {{ onChain: object, goPlus: object|null, etherscan: object|null, tier: string, address: string, chainId: number }} params
 */
export function scoreFromSignals({ onChain, goPlus, etherscan, tier, address, chainId }) {
  const findings = []
  const privileged = { mint: false, pause: false, blacklist: false, owner: false }

  let score = 70
  const verified = Boolean(etherscan?.verified)
  const txCount = Number(onChain?.onChainActivityCount ?? 0)
  const applyAdminHeuristics = shouldApplyTokenAdminHeuristics(onChain, etherscan)

  const archetype =
    resolveContractArchetype(address, chainId) ||
    (etherscan?.contractName ? archetypeFromContractName(etherscan.contractName) : null)

  if (onChain?.mode === 'reference') {
    score = 52
    findings.push({
      code: 'REFERENCE_MODE',
      severity: 'WATCH',
      title: 'Limited on-chain telemetry',
      detail: 'Configure ALCHEMY_API_KEY for live bytecode and proxy inspection.',
    })
  } else if (onChain?.mode === 'live' && onChain.isContract === false) {
    return {
      isContract: false,
      addressType: 'EOA',
      trustScore: null,
      trustBand: null,
      honeypotRisk: 'NOT_APPLICABLE',
      ownershipConcentration: 'NOT_APPLICABLE',
      upgradeableProxy: false,
      proxyImplementation: null,
      privilegedFunctions: privileged,
      deployerHeuristics: 'Externally owned account — contract trust scoring does not apply.',
      findings: [
        {
          code: 'NOT_CONTRACT',
          severity: 'INFO',
          title: 'Externally owned account',
          detail: 'No contract bytecode at this address. Use wallet risk modules for EOA exposure.',
        },
      ],
      interpretationSummary:
        'This address is an externally owned account (EOA), not a deployed smart contract. Trust scores apply to contract bytecode only.',
      dataSources: {
        onChain: onChain?.mode || 'unavailable',
        goPlus: 'skipped',
        etherscan: etherscan ? 'etherscan_v2' : 'skipped',
      },
    }
  }

  if (verified) {
    score += 10
    findings.push({
      code: 'VERIFIED_SOURCE',
      severity: 'INFO',
      title: 'Verified source on explorer',
      detail: `Contract name: ${etherscan.contractName || 'verified'}.`,
    })
  } else if (etherscan && !etherscan.verified) {
    score -= 12
    findings.push({
      code: 'UNVERIFIED_SOURCE',
      severity: 'WATCH',
      title: 'Unverified contract source',
      detail: 'Bytecode-only review — privilege mapping relies on heuristics.',
    })
  }

  if (txCount > 5000) score += 8
  else if (txCount > 500) score += 5
  else if (txCount > 100) score += 3
  else if (txCount > 0 && txCount < 5) score -= 4

  const honeypotRisk = normalizeHoneypotRisk(goPlus)
  if (honeypotRisk === 'HIGH') {
    score -= 32
    findings.push({
      code: 'HONEYPOT_SIGNAL',
      severity: 'HIGH',
      title: 'Honeypot risk signal',
      detail: 'Third-party heuristics flag sell-side or transfer traps.',
    })
  } else if (honeypotRisk === 'LOW') {
    score += 4
  }

  const ownershipConcentration = normalizeOwnershipConcentration(goPlus)
  if (ownershipConcentration === 'CONCENTRATED') {
    score -= 8
    findings.push({
      code: 'CONCENTRATED_HOLDERS',
      severity: 'WATCH',
      title: 'Concentrated holder set',
      detail: 'Low holder count may indicate centralized supply — review allocation.',
    })
  } else if (ownershipConcentration === 'DISPERSED') {
    score += 2
  }

  const isEstablished = Boolean(archetype?.class === 'canonical_token' || archetype?.class === 'canonical_infrastructure')
  const isProxy = Boolean(onChain?.upgradeableProxy || etherscan?.proxy)
  if (isProxy) {
    const proxyPenalty = verified && isEstablished ? 2 : verified && txCount > 200 ? 4 : 8
    score -= proxyPenalty
    findings.push({
      code: 'UPGRADEABLE_PROXY',
      severity: verified && isEstablished ? 'INFO' : 'WATCH',
      title: 'Upgradeable proxy detected',
      detail: verified
        ? 'Upgradeable architecture detected — review admin controls and timelocks; common for established protocols.'
        : 'Implementation may be upgraded by admin — verify timelock and multisig controls.',
    })
  }

  if (applyAdminHeuristics) {
    const sel = onChain?.privilegedSelectors || {}
    const adminSeverity = (base) => (verified && isEstablished ? 'INFO' : verified ? 'WATCH' : base)
    if (sel.owner) {
      privileged.owner = true
      score -= verified && isEstablished ? 1 : verified ? 2 : 5
      findings.push({
        code: 'OWNER_PRIVILEGE',
        severity: adminSeverity('WATCH'),
        title: 'Ownership controls present',
        detail: 'owner() detected — assess admin concentration and timelock policy.',
      })
    }
    if (sel.pause || sel.unpause) {
      privileged.pause = true
      score -= verified && isEstablished ? 2 : verified ? 4 : 10
      findings.push({
        code: 'PAUSE_PRIVILEGE',
        severity: adminSeverity('WATCH'),
        title: 'Pause / unpause capability',
        detail: 'Privileged roles can halt transfers or interactions — standard for regulated stablecoins and governance tokens.',
      })
    }
    if (sel.mint) {
      privileged.mint = true
      score -= verified && isEstablished ? 3 : verified ? 5 : 12
      findings.push({
        code: 'MINT_PRIVILEGE',
        severity: adminSeverity('WATCH'),
        title: 'Mint capability detected',
        detail: 'Supply can be inflated by privileged callers — verify caps and timelocks.',
      })
    }
    if (sel.blacklist) {
      privileged.blacklist = true
      score -= verified && isEstablished ? 3 : verified ? 5 : 14
      findings.push({
        code: 'BLACKLIST_PRIVILEGE',
        severity: adminSeverity('WATCH'),
        title: 'Blacklist / blocklist controls',
        detail: 'Addresses may be restricted from transferring or interacting.',
      })
    }
  } else if (onChain?.privilegedSelectors?.owner) {
    findings.push({
      code: 'ADMIN_PATTERN_COMPLEX',
      severity: 'INFO',
      title: 'Complex bytecode surface',
      detail:
        'Administrative selectors not scored as token-style privileges due to large verified production bytecode.',
    })
  }

  if (archetype) {
    score += archetype.class === 'canonical_token' ? 6 : 8
  }

  let deployerHeuristics = 'Insufficient deployer telemetry'
  if (txCount > 5000) {
    deployerHeuristics = 'Extensive on-chain usage — consistent with production infrastructure'
  } else if (txCount > 200) {
    deployerHeuristics = 'Established on-chain activity — review privileged role changes'
  } else if (txCount > 0) {
    deployerHeuristics = 'Moderate activity — standard footprint for orientation'
  } else {
    deployerHeuristics = 'Low on-chain activity — newly deployed or dormant surface'
    score -= 4
  }

  const trustScore = clamp(Math.round(score), 0, 100)
  const trustBand = trustBandFromScore(trustScore)

  const raw = {
    isContract: true,
    addressType: 'CONTRACT',
    trustScore,
    trustBand,
    honeypotRisk,
    ownershipConcentration,
    upgradeableProxy: isProxy,
    proxyImplementation: onChain?.proxyImplementation || etherscan?.implementation || null,
    privilegedFunctions: privileged,
    deployerHeuristics,
    findings: findings.slice(0, tier === 'alpha_advanced' ? 16 : 10),
    interpretationSummary: buildInterpretationSummary({
      trustScore,
      trustBand,
      verified,
      isProxy,
      honeypotRisk,
      archetype,
      privileged,
    }),
    dataSources: {
      onChain: onChain?.mode || 'unavailable',
      goPlus: goPlus ? 'goplus' : 'skipped',
      etherscan: etherscan ? 'etherscan_v2' : 'skipped',
    },
  }

  return applyArchetypeCalibration(raw, archetype)
}

/**
 * @param {object} ctx
 */
function buildInterpretationSummary(ctx) {
  const { trustScore, trustBand, verified, isProxy, honeypotRisk, archetype, privileged } = ctx

  if (archetype?.narrativeHint) return archetype.narrativeHint

  if (honeypotRisk === 'HIGH') {
    return 'Elevated risk: third-party heuristics suggest honeypot or transfer-restriction patterns. Avoid approvals until reviewed.'
  }

  if (trustBand === 'TRUSTED' && verified) {
    if (isProxy) {
      return 'Verified production contract with upgradeable architecture. Administrative controls should be reviewed; no obvious malicious bytecode indicators.'
    }
    return 'Verified contract with favorable heuristics and no obvious malicious bytecode indicators.'
  }

  if (trustBand === 'TRUSTED') {
    return 'Established trust posture from on-chain signals — confirm verification and admin controls before large exposures.'
  }

  if (trustBand === 'MODERATE') {
    if (privileged.mint || privileged.blacklist || privileged.pause) {
      return 'Moderate trust: privileged admin functions detected. Operator review recommended before treasury use.'
    }
    if (!verified) {
      return 'Moderate trust: source is not verified on explorer. Heuristic privilege mapping only — manual review required.'
    }
    return `Moderate trust (score ${trustScore}): mixed signals — review structured findings before signing or approving.`
  }

  if (trustBand === 'ELEVATED') {
    return 'Elevated risk: unverified or suspicious privilege surface. Restrict exposure until manual security review.'
  }

  return 'High risk: multiple adverse heuristics. Do not approve or interact without independent verification.'
}

export { buildInterpretationSummary }
