import { trustBandFromScore } from '../contractIntelligence/contractIntelTypes.js'
import { solanaTrustBandFromScore } from '../solanaRiskScanner/solanaTypes.js'
import {
  formatDeploymentAgeFromTimestamp,
  liquidityDepthLabel,
} from './tokenConcentrationTypes.js'

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * @param {object} signals
 */
export function computeWhaleRisk(signals) {
  const { top10Pct, top1Pct, lpUnlocked, deploymentAgeHours, isCanonical } = signals
  if (isCanonical) return 'LOW'
  let risk = 0
  if (top10Pct != null && top10Pct > 80) risk += 3
  else if (top10Pct != null && top10Pct > 70) risk += 2
  else if (top10Pct != null && top10Pct > 55) risk += 1
  if (top1Pct != null && top1Pct > 25) risk += 2
  else if (top1Pct != null && top1Pct > 18) risk += 1
  if (lpUnlocked) risk += 2
  if (deploymentAgeHours != null && deploymentAgeHours < 48) risk += 1
  if (risk >= 4) return 'CRITICAL'
  if (risk >= 2) return 'ELEVATED'
  if (risk >= 1) return 'MODERATE'
  return 'LOW'
}

/**
 * @param {string | null | undefined} band
 * @param {object} concentration
 * @param {boolean} [isCanonical]
 */
export function verdictActionFrame(band, concentration, isCanonical = false) {
  if (isCanonical && (band === 'TRUSTED' || band === 'MODERATE')) return 'STRUCTURALLY SOUND'
  const whale = concentration?.whaleRisk
  if (band === 'HIGH_RISK' || whale === 'CRITICAL') return 'AVOID INTERACTION'
  if (band === 'ELEVATED' || whale === 'ELEVATED') return 'HIGH CONCENTRATION / EXIT LIQUIDITY RISK'
  if (band === 'MODERATE' || whale === 'MODERATE') return 'SPECULATIVE — VERIFY LIQUIDITY & HOLDER DISTRIBUTION'
  if (band === 'TRUSTED') return 'STRUCTURALLY SOUND'
  return 'VERIFY BEFORE INTERACTION'
}

/**
 * Solana meme-token verdict framing (free-provider MVP).
 * @param {string | null | undefined} band
 * @param {object} concentration
 * @param {boolean} [isCanonical]
 */
export function solanaVerdictActionFrame(band, concentration, isCanonical = false) {
  if (isCanonical && (band === 'TRUSTED' || band === 'MODERATE')) return 'STRUCTURALLY SOUND'
  if (
    concentration?.limitedMarketIntelligence &&
    !concentration?.liquidityConfirmed &&
    concentration?.liquidityConfidence === 'UNKNOWN'
  ) {
    return 'LIMITED MARKET INTELLIGENCE'
  }

  const whale = concentration?.whaleRisk
  const top10 = concentration?.top10HolderPct
  const top1 = concentration?.largestWalletPct
  const liq = concentration?.liquidityUsd
  const routing = concentration?.jupiterClassification
  const major = concentration?.isMajorAsset

  if (band === 'HIGH_RISK' || whale === 'CRITICAL') return 'AVOID INTERACTION'
  if (
    whale === 'ELEVATED' ||
    (top10 != null && top10 > 70) ||
    (top1 != null && top1 > 15 && band === 'ELEVATED')
  ) {
    return 'HIGH CONCENTRATION RISK'
  }
  if (
    (liq != null && liq < 50_000) ||
    routing === 'NOT_ROUTABLE' ||
    concentration?.liquidityConfidence === 'LOW'
  ) {
    return 'SPECULATIVE — LOW LIQUIDITY'
  }
  if (band === 'TRUSTED') return 'STRUCTURALLY SOUND'
  if (band === 'MODERATE') {
    if (major && (liq >= 100_000 || concentration?.liquidityConfidence === 'HIGH')) {
      return 'MODERATE RISK — MAJOR ASSET'
    }
    if (routing === 'ROUTABLE' && liq != null && liq >= 50_000) {
      return 'MODERATE RISK — VERIFY HOLDER DISTRIBUTION'
    }
    return 'SPECULATIVE — LOW LIQUIDITY'
  }
  return 'LIMITED MARKET INTELLIGENCE'
}

/**
 * @param {object} params
 */
/**
 * @param {object} [deploymentMeta] — from fetchContractDeploymentMeta
 */
export function resolveDeploymentAgeDisplay(deploymentMeta, pairCreatedAt) {
  const contractAge = formatDeploymentAgeFromTimestamp(deploymentMeta?.contractCreatedAtMs)
  const poolAge = formatDeploymentAgeFromTimestamp(pairCreatedAt)

  if (contractAge) {
    const proxyNote =
      deploymentMeta?.isProxy && deploymentMeta?.implementationCreatedAtMs
        ? ` (proxy; implementation deployed separately)`
        : deploymentMeta?.isProxy
          ? ' (proxy contract)'
          : ''
    return {
      deploymentAge: `${contractAge}${proxyNote}`,
      contractDeploymentAge: contractAge,
      primaryPoolAge: poolAge || null,
      deploymentAgeSource: 'contract_creation',
    }
  }

  if (poolAge) {
    return {
      deploymentAge: `Primary pool ~${poolAge} — contract deployment age unavailable`,
      contractDeploymentAge: null,
      primaryPoolAge: poolAge,
      deploymentAgeSource: 'dex_pool_approx',
    }
  }

  return {
    deploymentAge: 'Deployment age unavailable',
    contractDeploymentAge: null,
    primaryPoolAge: null,
    deploymentAgeSource: 'unavailable',
  }
}

export function buildTokenConcentrationIntel({
  holderMetrics,
  dex,
  goPlusParsed,
  isCanonical = false,
  deploymentMeta = null,
}) {
  const top10Pct = holderMetrics?.top10HolderPct ?? goPlusParsed?.top10HolderPct ?? null
  const top1Pct = holderMetrics?.top1HolderPct ?? goPlusParsed?.top1HolderPct ?? null
  const liquidityUsd = dex?.totalLiquidityUsd ?? null

  const lpLocked = Boolean(goPlusParsed?.lpLocked || goPlusParsed?.lpBurned)
  const lpUnlocked = goPlusParsed?.isInDex && !lpLocked && (goPlusParsed?.lpHolderCount || 0) > 0
  const lpStatus = !goPlusParsed?.isInDex && !dex?.hasLiquidity
    ? 'unknown'
    : lpLocked
      ? goPlusParsed?.lpBurned
        ? 'burned'
        : 'locked'
      : lpUnlocked
        ? 'unlocked'
        : 'unknown'

  const pairCreatedAt = dex?.pairCreatedAt || null
  const contractCreatedAtMs = deploymentMeta?.contractCreatedAtMs || null
  const ageAnchorMs = contractCreatedAtMs || pairCreatedAt
  const deploymentAgeHours = ageAnchorMs ? (Date.now() - ageAnchorMs) / (1000 * 60 * 60) : null
  const ageDisplay = resolveDeploymentAgeDisplay(deploymentMeta, pairCreatedAt)

  const whaleRisk = computeWhaleRisk({
    top10Pct,
    top1Pct,
    lpUnlocked: lpStatus === 'unlocked',
    deploymentAgeHours,
    isCanonical,
  })

  let tradingBehavior = 'Standard transfer patterns'
  if (top10Pct != null && top10Pct > 70) tradingBehavior = 'Highly concentrated ownership — exit liquidity risk elevated'
  else if (top1Pct != null && top1Pct > 20) tradingBehavior = 'Single-wallet dominance detected'
  else if (
    deploymentAgeHours != null &&
    deploymentAgeHours < 72 &&
    !contractCreatedAtMs
  ) {
    tradingBehavior = 'Recently launched — early transfer clustering possible'
  } else if (
    deploymentAgeHours != null &&
    deploymentAgeHours < 72 &&
    contractCreatedAtMs
  ) {
    tradingBehavior = 'Newly listed pool on established contract — verify pool liquidity'
  }
  else if (lpStatus === 'unlocked') tradingBehavior = 'DEX liquidity present — LP not locked'
  else if (isCanonical) tradingBehavior = 'Established token distribution'

  const holderConcentration =
    top10Pct != null
      ? `Top 10 holders control ${top10Pct.toFixed(1)}%`
      : top1Pct != null
        ? `Largest holder concentration ${top1Pct.toFixed(1)}% (top 10 unavailable)`
        : 'Holder concentration unavailable'

  const largestWallet =
    top1Pct != null ? `${top1Pct.toFixed(1)}%` : 'Unavailable'

  const liquidityStatus =
    liquidityUsd != null && liquidityUsd > 0
      ? liquidityDepthLabel(liquidityUsd)
      : goPlusParsed?.isInDex
        ? 'DEX listing detected — depth estimate unavailable'
        : dex?.confirmed === true && !dex?.hasLiquidity
          ? 'No DEX liquidity detected'
          : 'Liquidity intelligence unavailable'

  let liquidityConcentration = 'Liquidity concentration unavailable'
  if (lpStatus === 'locked') liquidityConcentration = 'LP locked or burned (heuristic)'
  else if (lpStatus === 'unlocked') liquidityConcentration = 'LP not locked — exit liquidity risk'
  else if (dex?.confirmed === true && !dex?.hasLiquidity) {
    liquidityConcentration = 'No pooled liquidity detected'
  }

  return {
    available: top10Pct != null || top1Pct != null || dex != null || goPlusParsed != null,
    holderConcentration,
    largestWallet,
    largestWalletPct: top1Pct,
    top10HolderPct: top10Pct,
    liquidityStatus,
    liquidityConcentration,
    whaleRisk,
    tradingBehavior,
    deploymentAge: ageDisplay.deploymentAge,
    contractDeploymentAge: ageDisplay.contractDeploymentAge,
    primaryPoolAge: ageDisplay.primaryPoolAge,
    deploymentAgeSource: ageDisplay.deploymentAgeSource,
    deploymentAgeHours,
    bundledWallets: 'Not detected from available sources',
    lpStatus,
    liquidityUsd,
    creatorPct: goPlusParsed?.creatorPct ?? null,
    ownerPct: goPlusParsed?.ownerPct ?? null,
    dataSources: {
      dexscreener: Boolean(dex),
      goplus: Boolean(goPlusParsed),
    },
  }
}

/**
 * @param {object} core — scored contract/solana report
 * @param {import('./tokenConcentrationTypes.js').TokenConcentrationIntel} concentration
 * @param {{ isSolana?: boolean, isCanonical?: boolean }} opts
 */
export function mergeTokenConcentrationIntoCore(core, concentration, opts = {}) {
  if (!concentration?.available) {
    const frame = opts.isSolana && concentration?.limitedMarketIntelligence
      ? 'LIMITED MARKET INTELLIGENCE'
      : null
    return { ...core, tokenConcentration: concentration, verdictActionFrame: frame }
  }

  const isCanonical = opts.isCanonical || Boolean(core.archetypeId)
  let score = Number(core.trustScore ?? 70)
  const findings = [...(core.findings || [])]

  const top10 = concentration.top10HolderPct
  const top1 = concentration.largestWalletPct

  if (top10 != null && top10 > 70 && !isCanonical) {
    score -= 22
    findings.push({
      code: 'TOP10_CONCENTRATION',
      severity: 'HIGH',
      title: 'Top 10 holder concentration',
      detail: `Top 10 holders control ${top10.toFixed(1)}% of supply.`,
    })
  } else if (top10 != null && top10 > 50 && !isCanonical) {
    score -= 12
    findings.push({
      code: 'TOP10_CONCENTRATION',
      severity: 'WATCH',
      title: 'Elevated top 10 concentration',
      detail: `Top 10 holders control ${top10.toFixed(1)}% of supply.`,
    })
  } else if (top10 != null && top10 < 35 && !isCanonical) {
    score += 4
    findings.push({
      code: 'HEALTHY_DISTRIBUTION',
      severity: 'INFO',
      title: 'Healthy holder distribution',
      detail: 'Top 10 holders control a minority of sampled supply.',
    })
  }

  const top1MajorThreshold = opts.isSolana ? 15 : 20
  const top1WatchThreshold = opts.isSolana ? 10 : 10

  if (top1 != null && top1 > top1MajorThreshold && !isCanonical) {
    score -= opts.isSolana ? 18 : 16
    findings.push({
      code: 'WHALE_DOMINANCE',
      severity: 'HIGH',
      title: 'Single-wallet dominance',
      detail: `Largest wallet holds ${top1.toFixed(1)}% of supply.`,
    })
  } else if (top1 != null && top1 > top1WatchThreshold && !isCanonical) {
    score -= 8
    findings.push({
      code: 'WHALE_DOMINANCE',
      severity: 'WATCH',
      title: 'Large single-holder position',
      detail: `Largest wallet controls ${top1.toFixed(1)}% of supply.`,
    })
  }

  if (concentration.lpStatus === 'unlocked' && !isCanonical) {
    score -= 18
    findings.push({
      code: 'LP_UNLOCKED',
      severity: 'HIGH',
      title: 'Liquidity not locked',
      detail: 'DEX liquidity detected without locked or burned LP signals.',
    })
  } else if (concentration.lpStatus === 'locked' || concentration.lpStatus === 'burned') {
    score += 5
    findings.push({
      code: 'LP_LOCKED',
      severity: 'INFO',
      title: 'Liquidity locked / burned',
      detail: 'LP lock or burn signal detected for primary pool.',
    })
  }

  if (
    concentration.deploymentAgeHours != null &&
    concentration.deploymentAgeHours < 48 &&
    !isCanonical &&
    concentration.deploymentAgeSource !== 'contract_creation'
  ) {
    score -= 12
    findings.push({
      code: 'FRESH_DEPLOY',
      severity: 'WATCH',
      title: 'Recently deployed token',
      detail: `Market surface age ~${concentration.deploymentAge}.`,
    })
  }

  if (concentration.whaleRisk === 'CRITICAL' && !isCanonical) score -= 6
  else if (concentration.whaleRisk === 'ELEVATED' && !isCanonical) score -= 4

  if (opts.isSolana && !isCanonical) {
    const liq = concentration.liquidityUsd
    const vol = concentration.volume24hUsd ?? 0
    const ageHours = concentration.deploymentAgeHours

    if (concentration.jupiterClassification === 'NOT_ROUTABLE') {
      score -= 14
      findings.push({
        code: 'NO_JUPITER_ROUTING',
        severity: 'HIGH',
        title: 'No Jupiter routing',
        detail: 'Token did not return viable Jupiter quotes in either direction.',
      })
    } else if (concentration.jupiterClassification === 'LIMITED_ROUTING') {
      score -= 6
      findings.push({
        code: 'LIMITED_JUPITER_ROUTING',
        severity: 'WATCH',
        title: 'Limited routing',
        detail: 'One-sided Jupiter routing only — exit path may be constrained.',
      })
    }

    if (vol === 0 && concentration.liquidityConfirmed) {
      score -= 10
      findings.push({
        code: 'ZERO_VOLUME_24H',
        severity: 'WATCH',
        title: 'Zero 24h volume',
        detail: 'No 24h volume observed on indexed pools (DexScreener).',
      })
    } else if (vol >= 50_000) {
      score += 5
      findings.push({
        code: 'STRONG_VOLUME_24H',
        severity: 'INFO',
        title: 'Strong 24h volume',
        detail: `24h volume ~$${Math.round(vol).toLocaleString('en-US')} (DexScreener).`,
      })
    }

    if (ageHours != null && ageHours >= 30 * 24) {
      score += 5
      findings.push({
        code: 'ESTABLISHED_TOKEN_AGE',
        severity: 'INFO',
        title: 'Established token age',
        detail: `Primary pool / market age ~${concentration.tokenAge || concentration.deploymentAge}.`,
      })
    }

    if (liq != null && liq > 0 && liq < 10_000) {
      score -= 20
      findings.push({
        code: 'LOW_LIQUIDITY_DEPTH',
        severity: 'HIGH',
        title: 'Low liquidity depth',
        detail: `Estimated liquidity ~$${Math.round(liq).toLocaleString('en-US')} — elevated exit slippage risk.`,
      })
    } else if (liq != null && liq > 0 && liq < 50_000) {
      score -= 10
      findings.push({
        code: 'MODERATE_LIQUIDITY_DEPTH',
        severity: 'WATCH',
        title: 'Moderate liquidity depth',
        detail: `Estimated liquidity ~$${Math.round(liq).toLocaleString('en-US')}.`,
      })
    } else if (liq != null && liq >= 100_000) {
      score += 4
      findings.push({
        code: 'HEALTHY_LIQUIDITY_DEPTH',
        severity: 'INFO',
        title: 'Healthy liquidity depth',
        detail: `Estimated liquidity ~$${Math.round(liq).toLocaleString('en-US')}.`,
      })
    }

    if (concentration.jupiterRoutable) {
      score += 5
      findings.push({
        code: 'JUPITER_ROUTING_ACTIVE',
        severity: 'INFO',
        title: 'Active Jupiter routing',
        detail: 'Token is routable via Jupiter aggregator.',
      })
    }

    if ((concentration.pairCount || 0) >= 2) {
      score += 4
      findings.push({
        code: 'MULTI_POOL_LIQUIDITY',
        severity: 'INFO',
        title: 'Multiple liquidity pools',
        detail: `${concentration.pairCount} pools indexed — broader exit paths.`,
      })
    }
  }

  const trustScore = clamp(Math.round(score), 0, 100)
  const trustBand = opts.isSolana ? solanaTrustBandFromScore(trustScore) : trustBandFromScore(trustScore)
  const verdictActionFrameLabel = opts.isSolana
    ? solanaVerdictActionFrame(trustBand, concentration, isCanonical)
    : verdictActionFrame(trustBand, concentration, isCanonical)

  let interpretationSummary = core.interpretationSummary
  if (!isCanonical && concentration.whaleRisk === 'ELEVATED') {
    interpretationSummary = `${interpretationSummary} Holder and liquidity concentration elevate speculative risk — verify exit liquidity before sizing exposure.`
  } else if (!isCanonical && concentration.whaleRisk === 'CRITICAL') {
    interpretationSummary = `High concentration and liquidity risk detected. ${interpretationSummary}`
  }

  return {
    ...core,
    trustScore,
    trustBand,
    findings: findings.slice(0, 18),
    interpretationSummary,
    tokenConcentration: concentration,
    verdictActionFrame: verdictActionFrameLabel,
    addressType: core.addressType === 'CONTRACT' ? 'TOKEN' : core.addressType,
  }
}
