import { resolveStablecoinMatch, STABLECOIN_RISK_THEMES } from '../../shared/constants/stablecoinRegistry.mjs'
import { isSolanaScannerReport, isEvmScannerReport } from '../intelligence/chainIntelligence.mjs'
import {
  allowsAssetClassification,
  hasRegistryMatch,
  hasVerifiedMetadata,
  isLikelyTokenSymbol,
} from '../intelligence/assetIntelligenceState.mjs'
import { lookupPrimeToken } from '../../../shared/constants/primeTokenRegistry.mjs'
import { canonicalCategoryToExecutiveClassification } from '../intelligence/assetCategoryRegistry.mjs'
import { resolveNativeExecutiveClassification } from '../../../shared/constants/nativeAssetIntelligenceRegistry.mjs'

export const EXECUTIVE_INTEL_DISCLAIMER =
  'Executive Intelligence is generated from publicly observable blockchain, market, and behavioral data. It is educational in nature and does not constitute financial advice, investment recommendations, trading guidance, insurance, custody, or brokerage services.'

/** @typedef {'STABLECOIN ASSET'|'BLUE CHIP ASSET'|'DEFI ASSET'|'GOVERNANCE ASSET'|'ORACLE INFRASTRUCTURE'|'BLOCKCHAIN INFRASTRUCTURE'|'AI ASSET'|'INFRASTRUCTURE ASSET'|'NARRATIVE DRIVEN ASSET'|'MEME SPECULATIVE ASSET'|'CONCENTRATED EXPOSURE ASSET'|'HIGH RISK EXPERIMENTAL ASSET'} ExecutiveClassification */

const GOVERNANCE_SYMBOLS = new Set(['UNI', 'MKR', 'COMP', 'AAVE'])

const MEME_SYMBOLS = new Set([
  'PEPE',
  'SHIB',
  'BONK',
  'WIF',
  'DOGE',
  'FLOKI',
  'BRETT',
  'POPCAT',
  'MEW',
  'BOME',
  'MYRO',
  'WEN',
  'SAMO',
])

const MEME_NAME_PATTERN = /\b(dogwifhat|dogwif|bonk|pepe|shiba|floki|meme|memecoin)\b/i

const ORACLE_SYMBOLS = new Set(['LINK'])
const DEFI_BLUE_CHIP_SYMBOLS = new Set(['UNI', 'AAVE', 'CRV', 'MKR', 'COMP', 'SUSHI', 'SNX'])
const AI_SYMBOLS = new Set(['FET', 'RNDR', 'RENDER', 'TAO', 'WLD', 'OCEAN', 'AGIX', 'ARKM'])
const L2_ECOSYSTEM_SYMBOLS = new Set(['ARB', 'OP', 'MATIC', 'POL', 'IMX', 'STRK'])

function resolveCategoryFromSymbol(symbol, address = null) {
  const sym = String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (!sym && !address) return null
  const stable = resolveStablecoinMatch({ symbol: sym, address })
  if (stable) return 'stablecoin'
  if (MEME_SYMBOLS.has(sym)) return 'meme'
  if (ORACLE_SYMBOLS.has(sym)) return 'oracle'
  if (AI_SYMBOLS.has(sym)) return 'ai'
  if (DEFI_BLUE_CHIP_SYMBOLS.has(sym)) return 'defi'
  if (L2_ECOSYSTEM_SYMBOLS.has(sym)) return 'l2'
  return null
}

/**
 * Resolve meme narrative category from symbol, name, query, or scanner archetype.
 * @param {object} [ctx]
 * @returns {'meme' | null}
 */
export function resolveMemeNarrativeCategory({
  symbol,
  tokenName,
  query,
  scannerReport,
} = {}) {
  const sym = String(symbol || scannerReport?.symbol || scannerReport?.requestedSymbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  const q = String(query || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  const name = String(tokenName || scannerReport?.archetypeLabel || '').trim()
  const archetype = String(scannerReport?.archetypeLabel || scannerReport?.archetype || '').toLowerCase()

  if (MEME_SYMBOLS.has(sym) || MEME_SYMBOLS.has(q)) return 'meme'
  if (MEME_NAME_PATTERN.test(name) || MEME_NAME_PATTERN.test(String(query || ''))) return 'meme'
  if (/meme|speculative|dogwif|bonk|pepe/.test(archetype)) return 'meme'
  return null
}

/**
 * Prefer explicit narrative category; infer stablecoin and meme tokens when category is missing.
 * @param {object} [ctx]
 */
export function resolveEffectiveNarrativeCategory(ctx = {}) {
  const category = ctx.narrativeCategory
  if (category && category !== 'unknown') return category

  const stable = resolveStablecoinMatch({
    symbol: ctx.symbol,
    tokenName: ctx.tokenName,
    query: ctx.query,
    address: ctx.address,
    scannerReport: ctx.scannerReport,
  })
  if (stable) return 'stablecoin'

  const fromSymbol = resolveCategoryFromSymbol(
    ctx.symbol || ctx.query,
    ctx.address || ctx.scannerReport?.address,
  )
  if (fromSymbol) return fromSymbol

  return resolveMemeNarrativeCategory(ctx) || category || null
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {number} score 0–100 executive risk (higher = riskier)
 */
export function executiveRiskBandFromScore(score) {
  const s = num(score)
  if (s == null) return { label: 'Assessment pending', band: 'pending' }
  if (s <= 25) return { label: 'LOW RISK', band: 'low' }
  if (s <= 50) return { label: 'MODERATE RISK', band: 'moderate' }
  if (s <= 75) return { label: 'ELEVATED RISK', band: 'elevated' }
  return { label: 'HIGH RISK', band: 'high' }
}

function authorityRevoked(value) {
  if (value == null || value === false) return true
  const s = String(value).toLowerCase()
  return s === 'none' || s === 'revoked' || s === 'null' || s === 'disabled' || s === 'no'
}

function findingCodes(report) {
  return new Set((report?.findings || []).map((f) => String(f.code || f.title || '').toUpperCase()))
}

function top10Pct(scannerReport) {
  const tc = scannerReport?.tokenConcentration || {}
  return num(tc.top10HolderPct) ?? num(tc.top10Share) ?? num(tc.top10SharePct) ?? null
}

/**
 * Secondary structural driver — explains why risk is elevated without overriding primary asset type.
 * @param {object} ctx
 * @returns {string | null}
 */
export function resolveClassificationSecondaryDriver(ctx) {
  const {
    executiveRiskScore,
    narrativeElevated,
    narrativeCategory,
    composite,
    scannerReport,
    walletExposureProfile,
    liquidityIntel,
    modeId,
  } = ctx
  const sub = composite?.subscores || {}
  const top10 = top10Pct(scannerReport)
  const walletExp = num(sub.walletExposureRisk) ?? num(walletExposureProfile?.exposureScore)
  const liqConc = liquidityIntel?.concentrationLabel ?? scannerReport?.liquidityIntelligence?.concentrationLabel
  const thinLiquidity =
    (liquidityIntel?.liquidityDepthLabel === 'Thin' ||
      liquidityIntel?.liquidityDepthLabel === 'Limited') &&
    liquidityIntel?.dataQuality === 'observed' &&
    !['oracle', 'stablecoin', 'l2', 'defi'].includes(narrativeCategory)

  if (narrativeCategory === 'stablecoin') {
    if (executiveRiskScore >= 45) return 'Depeg / Issuer Sensitivity'
    if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') return 'Liquidity Concentration'
    return 'Reserve Transparency'
  }

  if (top10 != null && top10 >= 50) return 'Concentrated Holder Distribution'
  if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') return 'Liquidity Concentration'
  if (narrativeElevated || num(sub.narrativeRisk) >= 70) return 'Narrative Volatility'
  if (thinLiquidity) return 'Thin Liquidity Profile'
  if (modeId === 'wallet' && walletExp != null && walletExp >= 55) return 'Elevated Wallet Exposure'
  if (executiveRiskScore >= 76) return 'Elevated Composite Risk'
  return null
}

/**
 * @param {object} ctx
 * @returns {ExecutiveClassification}
 */
function metadataVerifiedForClassification(ctx) {
  if (ctx.canonicalAsset?.resolved && ctx.canonicalAsset.source === 'registry') return true
  const report = ctx.report || ctx
  if (hasRegistryMatch(report)) return true
  if (hasVerifiedMetadata(report, ctx.scannerReport)) return true
  const sym = String(ctx.symbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (sym && lookupPrimeToken(sym)) return true
  return Boolean(isLikelyTokenSymbol(ctx.symbol) && ctx.tokenName)
}

export function resolveExecutiveClassification(ctx) {
  const {
    modeId,
    executiveRiskScore,
    narrativeElevated,
    composite,
    scannerReport,
    walletExposureProfile,
    liquidityIntel,
    symbol,
    tokenName,
    query,
    report,
    assetIntelligenceState,
    allowFabricatedClassification = true,
    canonicalAsset = null,
  } = ctx

  const symEarly = String(symbol || canonicalAsset?.symbol || query || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')

  const nativeClassification = resolveNativeExecutiveClassification(symEarly, canonicalAsset)
  if (nativeClassification) return nativeClassification

  const metadataVerified = metadataVerifiedForClassification(ctx)

  if (
    assetIntelligenceState &&
    !allowsAssetClassification(assetIntelligenceState)
  ) {
    return 'UNKNOWN ASSET'
  }

  if (!allowFabricatedClassification && !metadataVerified) {
    return 'UNKNOWN ASSET'
  }

  const registryCanon =
    canonicalAsset?.source === 'registry'
      ? canonicalCategoryToExecutiveClassification(canonicalAsset.category)
      : null
  if (registryCanon && registryCanon !== 'UNKNOWN ASSET' && metadataVerified) {
    return registryCanon
  }

  const narrativeCategory = resolveEffectiveNarrativeCategory({
    narrativeCategory: ctx.narrativeCategory,
    symbol,
    tokenName,
    query,
    scannerReport,
  })

  if (!metadataVerified && (!narrativeCategory || narrativeCategory === 'unknown')) {
    return 'UNKNOWN ASSET'
  }

  const sub = composite?.subscores || {}
  const narrativeRisk = num(sub.narrativeRisk) ?? 45
  const contractRisk = num(sub.contractRisk) ?? 45
  const walletExp = num(sub.walletExposureRisk)
  const top10 = top10Pct(scannerReport)
  const sym = String(symbol || query || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')

  if (modeId === 'wallet') {
    if (walletExp != null && walletExp >= 55) return 'CONCENTRATED EXPOSURE ASSET'
    return executiveRiskScore >= 51 ? 'HIGH RISK EXPERIMENTAL ASSET' : 'BLUE CHIP ASSET'
  }

  if (narrativeCategory === 'stablecoin') {
    return 'STABLECOIN ASSET'
  }

  if (narrativeCategory === 'meme') {
    if (executiveRiskScore >= 76) return 'HIGH RISK EXPERIMENTAL ASSET'
    return 'MEME SPECULATIVE ASSET'
  }

  const deploymentAge = String(scannerReport?.tokenConcentration?.deploymentAge || '')
  const thinLiquidity =
    liquidityIntel?.liquidityDepthLabel === 'Thin' ||
    liquidityIntel?.liquidityDepthLabel === 'Limited' ||
    (num(liquidityIntel?.liquidityUsd) != null && num(liquidityIntel.liquidityUsd) < 100_000)

  if (
    thinLiquidity &&
    (deploymentAge.includes('day') || deploymentAge.includes('week') || /under 30/i.test(deploymentAge))
  ) {
    return 'HIGH RISK EXPERIMENTAL ASSET'
  }

  if (narrativeCategory === 'oracle') {
    return 'ORACLE INFRASTRUCTURE'
  }

  if (narrativeCategory === 'l2') {
    return 'BLOCKCHAIN INFRASTRUCTURE'
  }

  if (narrativeCategory === 'ai') {
    return 'AI ASSET'
  }

  if (GOVERNANCE_SYMBOLS.has(sym) || narrativeCategory === 'governance') {
    return 'GOVERNANCE ASSET'
  }

  if (narrativeCategory === 'defi') {
    if (narrativeElevated || narrativeRisk >= contractRisk + 15) return 'NARRATIVE DRIVEN ASSET'
    return executiveRiskScore <= 35 ? 'DEFI ASSET' : 'CONCENTRATED EXPOSURE ASSET'
  }

  if (executiveRiskScore >= 76) {
    return 'HIGH RISK EXPERIMENTAL ASSET'
  }

  if (narrativeElevated || narrativeRisk >= contractRisk + 15) {
    return 'NARRATIVE DRIVEN ASSET'
  }

  if (top10 != null && top10 >= 65 && executiveRiskScore >= 45) {
    return 'CONCENTRATED EXPOSURE ASSET'
  }

  if (executiveRiskScore <= 25 && top10 != null && top10 < 40) {
    return 'BLUE CHIP ASSET'
  }

  if (executiveRiskScore >= 51) {
    return 'CONCENTRATED EXPOSURE ASSET'
  }

  if (executiveRiskScore <= 25) {
    return 'BLUE CHIP ASSET'
  }

  if (!narrativeCategory || narrativeCategory === 'unknown') {
    if (metadataVerified) {
      return executiveRiskScore >= 51 ? 'CONCENTRATED EXPOSURE ASSET' : 'DEFI ASSET'
    }
    return 'UNKNOWN ASSET'
  }

  return 'DEFI ASSET'
}

function appendSolanaAuthorityFindings(findings, scannerReport) {
  if (authorityRevoked(scannerReport?.mintAuthority)) {
    findings.push('Mint authority revoked or absent')
  } else if (scannerReport?.mintAuthority) {
    findings.push('Mint authority present — review upgrade surface')
  }
  if (authorityRevoked(scannerReport?.freezeAuthority)) {
    findings.push('Freeze authority revoked or absent')
  } else if (scannerReport?.freezeAuthority) {
    findings.push('Freeze authority observable on mint')
  }
}

function appendEvmContractFindings(findings, scannerReport, codes) {
  if (codes.has('VERIFIED_SOURCE') || scannerReport?.verifiedSource) {
    findings.push('Contract source verified on indexed explorer')
  } else if (scannerReport?.verifiedSource === false) {
    findings.push('Contract source not verified — review bytecode trust')
  }

  if (scannerReport?.upgradeableProxy === true) {
    findings.push('Upgradeable proxy detected — review admin and implementation surface')
  } else if (scannerReport?.upgradeableProxy === false) {
    findings.push('Non-upgradeable contract surface in indexed data')
  }

  const ownership = String(scannerReport?.ownershipConcentration || '')
  if (/concentrated|centralized|owner/i.test(ownership)) {
    findings.push('Ownership/admin controls appear concentrated')
  } else if (/dispersed|renounced|none/i.test(ownership)) {
    findings.push('Ownership/admin surface appears limited or dispersed')
  }

  const honeypot = String(scannerReport?.honeypotRisk || '')
  if (/high|critical|yes|true/i.test(honeypot)) {
    findings.push('GoPlus security flags elevated honeypot or malicious surface risk')
  } else if (scannerReport?.providerCoverage?.goPlus === 'goplus' || codes.size > 0) {
    findings.push('GoPlus security signals indexed in scanner pass')
  }

  const deploymentAge = scannerReport?.tokenConcentration?.deploymentAge || scannerReport?.deploymentAge
  if (deploymentAge && !/unknown/i.test(String(deploymentAge))) {
    findings.push(`Contract deployment age: ${deploymentAge}`)
  }
}

function appendStablecoinFindings(findings) {
  for (const theme of STABLECOIN_RISK_THEMES.slice(0, 3)) {
    findings.push(theme)
  }
}

function buildKeyFindings(ctx) {
  const findings = []
  const {
    modeId,
    scannerReport,
    walletExposureProfile,
    liquidityIntel,
    composite,
    narrativeElevated,
    behaviorInputs,
    narrativeCategory,
  } = ctx
  const codes = findingCodes(scannerReport)
  const tc = scannerReport?.tokenConcentration || {}
  const solana = isSolanaScannerReport(scannerReport)
  const evm = isEvmScannerReport(scannerReport)

  if (narrativeCategory === 'stablecoin') {
    appendStablecoinFindings(findings)
  } else if (narrativeCategory === 'oracle') {
    findings.push('Established oracle network with deep protocol adoption')
    findings.push('Long deployment history in indexed registry')
  } else if (narrativeCategory === 'l2') {
    findings.push('Blockchain infrastructure asset with ecosystem adoption profile')
  } else if (narrativeCategory === 'ai') {
    findings.push('AI / compute narrative asset — verify utility against on-chain evidence')
  }

  if (solana) {
    appendSolanaAuthorityFindings(findings, scannerReport)
  } else if (evm) {
    appendEvmContractFindings(findings, scannerReport, codes)
  }

  const depth = liquidityIntel?.liquidityDepthLabel
  if (depth === 'Strong' || depth === 'Exceptional' || depth === 'Healthy') {
    findings.push(`Strong indexed liquidity (${depth.toLowerCase()} depth)`)
  } else if (narrativeCategory !== 'stablecoin' && (depth === 'Thin' || depth === 'Limited')) {
    findings.push('Indexed liquidity appears limited')
  } else if (narrativeCategory === 'stablecoin') {
    findings.push('Institutional stablecoin liquidity profile — global depth exceeds indexed DEX sample')
  }

  if (liquidityIntel?.concentrationLabel === 'ELEVATED' || liquidityIntel?.concentrationLabel === 'CRITICAL') {
    findings.push('Liquidity concentration elevated across indexed venues')
  }

  const top10 = top10Pct(scannerReport)
  if (top10 != null && top10 >= 40) {
    findings.push(`Top 10 holders control ~${top10.toFixed?.(1) ?? top10}% of sampled supply`)
  } else if (tc.holderConcentration && !/unknown|not_available/i.test(String(tc.holderConcentration))) {
    findings.push(`Holder concentration: ${tc.holderConcentration}`)
  }

  if (solana) {
    const jupFinding = scannerReport?.findings?.find?.((f) =>
      /jupiter routing available/i.test(String(f.title || '')),
    )
    if (jupFinding) findings.push('Jupiter routing available in indexed market data')
  }

  if (narrativeElevated && narrativeCategory !== 'stablecoin') {
    findings.push('Narrative momentum exceeds technical signals in composite weighting')
  }

  if (modeId === 'wallet') {
    const memeDriver = walletExposureProfile?.exposureDrivers?.find((d) => /meme/i.test(d.label || ''))
    if (memeDriver) {
      findings.push('Wallet exposure shows elevated meme-asset concentration')
    } else if (num(walletExposureProfile?.exposureScore) >= 55) {
      findings.push('Linked wallet exposure score elevated in sampled data')
    }
  }

  if (behaviorInputs?.holderConcentrationElevated) {
    findings.push('On-chain holder concentration flagged in behavior layer')
  }

  if (scannerReport?.trustScore != null && scannerReport.trustScore >= 70) {
    findings.push(`Technical trust index ${Math.round(scannerReport.trustScore)}/100 in scanner`)
  }

  if (composite?.subscores?.contractRisk >= 65) {
    findings.push('Technical / contract risk subscore elevated')
  }

  if (!findings.length) {
    findings.push('Limited indexed findings — expand evidence layers for provider coverage')
  }

  return findings.slice(0, 8)
}

function buildConfidence(ctx) {
  const {
    providerFlags = {},
    scannerReport,
    liquidityIntel,
    walletExposureProfile,
    composite,
  } = ctx

  let score = 38
  const notes = []

  if (
    providerFlags.hasScan ||
    scannerReport?.trustScore != null ||
    scannerReport?.compositeTrustScore != null ||
    scannerReport?.technicalTrustScore != null
  ) {
    score += 22
    notes.push('scanner')
  }
  if (liquidityIntel?.intelligenceScore != null) {
    score += 12
    notes.push('liquidity')
  }
  if (providerFlags.lunarLive || providerFlags.narrativeFallback) {
    score += 10
    notes.push('narrative')
  }
  if (providerFlags.behaviorCoverage === 'full') {
    score += 14
    notes.push('behavior')
  } else if (providerFlags.behaviorCoverage === 'partial') {
    score += 7
    notes.push('partial behavior')
  }
  if (ctx.modeId === 'wallet' && walletExposureProfile?.exposureScore != null) {
    score += 8
    notes.push('wallet exposure')
  }
  if (composite?.subscores) {
    score += 5
    notes.push('composite synthesis')
  }
  if (scannerReport?.dataConfidence?.label === 'High' || scannerReport?.confidenceLabel === 'High') {
    score += 6
  }

  score = clamp(Math.round(score), 35, 96)

  let interpretation = 'Limited observable evidence'
  if (score >= 90) interpretation = 'Scanner + live provider evidence'
  else if (score >= 80) interpretation = 'Scanner-backed evidence'
  else if (score >= 60) interpretation = 'Category intelligence + registry validation'
  else if (score >= 40) interpretation = 'Category intelligence model active'

  return { score, interpretation, notes }
}

function buildRecommendedInvestigations(ctx) {
  const recs = []
  const sub = ctx.composite?.subscores || {}
  const isWalletMode = ctx.modeId === 'wallet'
  const ranked = [
    { key: 'holder', weight: top10Pct(ctx.scannerReport) ?? 0, label: 'Review Holder Concentration' },
    ...(isWalletMode
      ? [
          {
            key: 'wallet',
            weight: num(sub.walletExposureRisk) ?? num(ctx.walletExposureProfile?.exposureScore) ?? 0,
            label: 'Review Wallet Exposure',
          },
        ]
      : []),
    { key: 'liquidity', weight: num(sub.liquidityRisk) ?? 0, label: 'Review Liquidity Intelligence' },
    { key: 'contract', weight: num(sub.contractRisk) ?? 0, label: 'Review Contract Trust' },
    { key: 'narrative', weight: num(sub.narrativeRisk) ?? 0, label: 'Review Narrative Intelligence' },
    {
      key: 'behavior',
      weight: num(sub.behaviorRisk) ?? 0,
      label: 'Review Smart Money Activity',
    },
  ]
    .sort((a, b) => b.weight - a.weight)
    .filter((r) => r.weight > 0)

  for (const r of ranked) {
    if (!recs.includes(r.label)) recs.push(r.label)
  }

  if (ctx.modeId === 'wallet' && !recs.includes('Review Wallet Exposure')) {
    recs.unshift('Review Wallet Exposure')
  }

  if (!recs.length) {
    recs.push('Review Contract Trust', 'Review Liquidity Intelligence')
  }

  return recs.slice(0, 4)
}

function buildExecutiveConclusion(ctx) {
  const {
    classification,
    executiveRiskBand,
    scannerReport,
    liquidityIntel,
    narrativeElevated,
    walletExposureProfile,
    assetLabel,
    modeId,
    narrativeCategory,
  } = ctx

  const subject = assetLabel ? `Observations for ${assetLabel}` : 'Current observations'
  const parts = []

  parts.push(`${subject} indicate a ${classification.toLowerCase().replace(/_/g, ' ')} profile.`)

  const depth = liquidityIntel?.liquidityDepthLabel
  if (depth === 'Strong' || depth === 'Healthy' || depth === 'Exceptional') {
    parts.push(
      'Indexed liquidity depth appears adequate across observable venues for retail-sized activity in available provider data.',
    )
  } else if (depth === 'Thin' || depth === 'Limited') {
    parts.push('Indexed liquidity appears limited relative to typical institutional depth benchmarks in sampled data.')
  }

  if (narrativeCategory === 'stablecoin') {
    parts.push(
      'Stablecoin profile emphasizes issuer credibility, reserve transparency, redemption mechanics, and depeg sensitivity rather than speculative narrative cycles.',
    )
  } else if (narrativeElevated) {
    parts.push(
      'Risk characteristics appear influenced by narrative velocity and social momentum rather than demonstrated utility alone.',
    )
  }

  const top10 = top10Pct(scannerReport)
  if (top10 != null && top10 >= 50) {
    parts.push('Concentration among top holders remains a primary sensitivity factor in the indexed supply sample.')
  }

  if (modeId === 'wallet' && walletExposureProfile?.exposureDrivers?.[0]) {
    parts.push(
      `Linked wallet exposure suggests ${walletExposureProfile.exposureDrivers[0].label.toLowerCase()} as a contextual driver in parallel assessments.`,
    )
  }

  if (executiveRiskBand.band === 'moderate' || executiveRiskBand.band === 'elevated') {
    parts.push(
      'Composite executive risk reflects mixed technical, behavioral, and liquidity signals that warrant continued monitoring of provider updates.',
    )
  } else if (executiveRiskBand.band === 'high') {
    parts.push(
      'Multiple intelligence dimensions register elevated risk characteristics based on publicly observable data available at scan time.',
    )
  } else {
    parts.push(
      'Observable conditions appear within typical ranges for indexed assets of this category, subject to provider coverage limits.',
    )
  }

  parts.push(
    'These statements describe indexed conditions only and do not predict outcomes, imply returns, or constitute investment guidance.',
  )

  return parts.join(' ')
}

/**
 * Apply Solana meme / concentration floors so strong technical trust does not imply LOW RISK.
 * @param {number} score
 * @param {object} ctx
 */
export function calibrateExecutiveRiskScore(score, ctx = {}) {
  const { scannerReport, composite, narrativeCategory, narrativeElevated, liquidityIntel } = ctx
  let s = num(score) ?? 48
  const sub = composite?.subscores || {}
  const narrativeRisk = num(sub.narrativeRisk) ?? num(scannerReport?.narrativeRiskScore)
  const top10 = top10Pct(scannerReport)
  const liquidityConc =
    liquidityIntel?.concentrationLabel ?? scannerReport?.liquidityIntelligence?.concentrationLabel

  let floor = 0
  if (scannerReport?.scannerVerdict === 'MODERATE WATCH') floor = Math.max(floor, 42)
  if (narrativeRisk != null && narrativeRisk >= 70) floor = Math.max(floor, 42)
  if (top10 != null && top10 >= 70) floor = Math.max(floor, 45)
  if (liquidityConc === 'CRITICAL') floor = Math.max(floor, 45)
  if (narrativeCategory === 'meme' && (narrativeElevated || scannerReport?.scannerVerdict === 'MODERATE WATCH')) {
    floor = Math.max(floor, 42)
  }

  return clamp(Math.max(s, floor), 0, 100)
}

/**
 * @param {object} input
 */
export function computeExecutiveIntelligence(input = {}) {
  const composite = input.composite || null
  const narrativeCategory = resolveEffectiveNarrativeCategory(input)
  const effectiveInput = { ...input, narrativeCategory }
  const rawExecutiveRiskScore =
    num(effectiveInput.executiveRiskScore) ??
    num(composite?.score) ??
    num(scannerFallbackRisk(effectiveInput.scannerReport)) ??
    48

  const executiveRiskScore = calibrateExecutiveRiskScore(rawExecutiveRiskScore, effectiveInput)

  const executiveRiskBand = executiveRiskBandFromScore(executiveRiskScore)

  const classification = resolveExecutiveClassification({
    ...effectiveInput,
    executiveRiskScore,
    composite,
  })

  const classificationSecondaryDriver = resolveClassificationSecondaryDriver({
    ...effectiveInput,
    executiveRiskScore,
    composite,
  })

  const confidence = buildConfidence(effectiveInput)

  const keyFindings = buildKeyFindings({
    ...effectiveInput,
    composite,
    narrativeElevated: effectiveInput.narrativeElevated,
  })

  const recommendedNextInvestigation = buildRecommendedInvestigations({
    ...effectiveInput,
    composite,
  })

  const assetLabel =
    effectiveInput.assetLabel ||
    formatAssetLabel(effectiveInput.symbol, effectiveInput.tokenName, effectiveInput.query)

  const executiveConclusion = buildExecutiveConclusion({
    ...effectiveInput,
    classification,
    executiveRiskBand,
    assetLabel,
  })

  return {
    assetLabel,
    classification,
    classificationSecondaryDriver,
    executiveRiskScore,
    executiveRiskBand: executiveRiskBand.label,
    executiveRiskBandId: executiveRiskBand.band,
    confidenceScore: confidence.score,
    confidenceInterpretation: confidence.interpretation,
    compositeInterpretation: composite?.verdictLabel || null,
    keyFindings,
    executiveConclusion,
    recommendedNextInvestigation,
    disclaimer: EXECUTIVE_INTEL_DISCLAIMER,
    subscores: composite?.subscores || null,
    generatedAt: new Date().toISOString(),
  }
}

function scannerFallbackRisk(report) {
  const trust = report?.compositeTrustScore ?? report?.trustScore ?? report?.technicalTrustScore
  if (trust == null) return null
  return clamp(Math.round(100 - Number(trust)), 0, 100)
}

function formatAssetLabel(symbol, name, query) {
  const sym = symbol ? String(symbol).trim().toUpperCase() : null
  const nm = name ? String(name).trim() : null
  const q = query ? String(query).trim() : null
  if (nm && sym) {
    if (new RegExp(`\\(${sym}\\)`, 'i').test(nm)) return nm
    return `${nm} (${sym})`
  }
  if (nm && q && nm.toLowerCase() === q.toLowerCase()) return nm
  if (nm && sym && nm.toUpperCase() === sym) return sym
  if (nm) return nm
  if (sym) return sym
  if (q && q.length <= 48) return q
  return 'Intelligence target'
}

/**
 * Build executive intel from scanner-only backend context.
 * @param {object} scannerReport
 * @param {object} [ctx]
 */
export function executiveIntelligenceFromScanner(scannerReport, ctx = {}) {
  const reg =
    ctx.report?.tokenResolution?.source === 'registry'
      ? { symbol: ctx.report.tokenResolution.symbol, name: ctx.report.tokenResolution.name }
      : null
  const symbol =
    ctx.symbol || scannerReport?.requestedSymbol || scannerReport?.symbol || reg?.symbol || null
  const tokenName =
    ctx.tokenName ||
    reg?.name ||
    (scannerReport?.archetypeLabel
      ? String(scannerReport.archetypeLabel).replace(/\s*\([^)]*\)\s*$/, '').trim()
      : null)
  const query = ctx.query || scannerReport?.address
  const narrativeCategory =
    ctx.narrativeCategory ||
    resolveEffectiveNarrativeCategory({ symbol, tokenName, query, scannerReport })

  return computeExecutiveIntelligence({
    modeId: 'token',
    scannerReport,
    liquidityIntel: scannerReport?.liquidityIntelligence || null,
    symbol,
    tokenName,
    query,
    narrativeCategory,
    composite: ctx.composite || null,
    report: ctx.report || null,
    providerFlags: {
      hasScan:
        scannerReport?.trustScore != null ||
        scannerReport?.compositeTrustScore != null ||
        scannerReport?.technicalTrustScore != null,
      narrativeFallback: true,
      behaviorCoverage: 'pending',
    },
  })
}
