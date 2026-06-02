export const EXECUTIVE_INTEL_DISCLAIMER =
  'Executive Intelligence is generated from publicly observable blockchain, market, and behavioral data. It is educational in nature and does not constitute financial advice, investment recommendations, trading guidance, insurance, custody, or brokerage services.'

/** @typedef {'STABLECOIN ASSET'|'BLUE CHIP ASSET'|'DEFI ASSET'|'GOVERNANCE ASSET'|'INFRASTRUCTURE ASSET'|'NARRATIVE DRIVEN ASSET'|'MEME SPECULATIVE ASSET'|'CONCENTRATED EXPOSURE ASSET'|'HIGH RISK EXPERIMENTAL ASSET'} ExecutiveClassification */

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
 * Prefer explicit narrative category; infer meme tokens when category is missing.
 * @param {object} [ctx]
 */
export function resolveEffectiveNarrativeCategory(ctx = {}) {
  const category = ctx.narrativeCategory
  if (category && category !== 'unknown') return category
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
  const { executiveRiskScore, narrativeElevated, composite, scannerReport, walletExposureProfile, liquidityIntel } =
    ctx
  const sub = composite?.subscores || {}
  const top10 = top10Pct(scannerReport)
  const walletExp = num(sub.walletExposureRisk) ?? num(walletExposureProfile?.exposureScore)
  const liqConc = liquidityIntel?.concentrationLabel ?? scannerReport?.liquidityIntelligence?.concentrationLabel
  const thinLiquidity =
    liquidityIntel?.liquidityDepthLabel === 'Thin' || liquidityIntel?.liquidityDepthLabel === 'Limited'

  if (top10 != null && top10 >= 50) return 'Concentrated Holder Distribution'
  if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') return 'Liquidity Concentration'
  if (narrativeElevated || num(sub.narrativeRisk) >= 70) return 'Narrative Volatility'
  if (thinLiquidity) return 'Thin Liquidity Profile'
  if (walletExp != null && walletExp >= 55) return 'Elevated Wallet Exposure'
  if (executiveRiskScore >= 76) return 'Elevated Composite Risk'
  return null
}

/**
 * @param {object} ctx
 * @returns {ExecutiveClassification}
 */
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
  } = ctx
  const narrativeCategory = resolveEffectiveNarrativeCategory({
    narrativeCategory: ctx.narrativeCategory,
    symbol,
    tokenName,
    query,
    scannerReport,
  })

  const sub = composite?.subscores || {}
  const narrativeRisk = num(sub.narrativeRisk) ?? 45
  const contractRisk = num(sub.contractRisk) ?? 45
  const walletExp = num(sub.walletExposureRisk)
  const top10 = top10Pct(scannerReport)

  if (modeId === 'wallet') {
    if (walletExp != null && walletExp >= 55) return 'CONCENTRATED EXPOSURE ASSET'
    return executiveRiskScore >= 51 ? 'HIGH RISK EXPERIMENTAL ASSET' : 'BLUE CHIP ASSET'
  }

  if (narrativeCategory === 'stablecoin') {
    return executiveRiskScore <= 35 ? 'STABLECOIN ASSET' : 'CONCENTRATED EXPOSURE ASSET'
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

  if (executiveRiskScore >= 76) {
    return 'HIGH RISK EXPERIMENTAL ASSET'
  }

  if (narrativeCategory === 'defi') {
    if (narrativeElevated || narrativeRisk >= contractRisk + 15) return 'NARRATIVE DRIVEN ASSET'
    return executiveRiskScore <= 35 ? 'DEFI ASSET' : 'CONCENTRATED EXPOSURE ASSET'
  }

  if (narrativeCategory === 'oracle' || narrativeCategory === 'l2') {
    return executiveRiskScore <= 40 ? 'INFRASTRUCTURE ASSET' : 'NARRATIVE DRIVEN ASSET'
  }

  if (/gov|dao|vote/i.test(String(scannerReport?.archetypeLabel || ''))) {
    return 'GOVERNANCE ASSET'
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

  return 'DEFI ASSET'
}

function buildKeyFindings(ctx) {
  const findings = []
  const { scannerReport, walletExposureProfile, liquidityIntel, composite, narrativeElevated, behaviorInputs } =
    ctx
  const codes = findingCodes(scannerReport)
  const tc = scannerReport?.tokenConcentration || {}

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

  if (codes.has('VERIFIED_SOURCE') || scannerReport?.verifiedSource) {
    findings.push('Verified contract or mint source indexed')
  }

  const depth = liquidityIntel?.liquidityDepthLabel
  if (depth === 'Strong' || depth === 'Exceptional' || depth === 'Healthy') {
    findings.push(`Strong indexed liquidity (${depth.toLowerCase()} depth)`)
  } else if (depth === 'Thin' || depth === 'Limited') {
    findings.push('Indexed liquidity appears limited')
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

  if (narrativeElevated) {
    findings.push('Narrative momentum exceeds technical signals in composite weighting')
  }

  const memeDriver = walletExposureProfile?.exposureDrivers?.find((d) => /meme/i.test(d.label || ''))
  if (memeDriver) {
    findings.push('Wallet exposure shows elevated meme-asset concentration')
  } else if (num(walletExposureProfile?.exposureScore) >= 55) {
    findings.push('Linked wallet exposure score elevated in sampled data')
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
  if (walletExposureProfile?.exposureScore != null) {
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
  if (score >= 85) interpretation = 'Scanner-backed with multiple providers'
  else if (score >= 68) interpretation = 'Partial provider coverage'
  else if (score >= 50) interpretation = 'Indexed evidence with coverage gaps'

  return { score, interpretation, notes }
}

function buildRecommendedInvestigations(ctx) {
  const recs = []
  const sub = ctx.composite?.subscores || {}
  const ranked = [
    { key: 'holder', weight: top10Pct(ctx.scannerReport) ?? 0, label: 'Review Holder Concentration' },
    {
      key: 'wallet',
      weight: num(sub.walletExposureRisk) ?? num(ctx.walletExposureProfile?.exposureScore) ?? 0,
      label: 'Review Wallet Exposure',
    },
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

  if (narrativeElevated) {
    parts.push(
      'Risk characteristics appear influenced by narrative velocity and social momentum rather than demonstrated utility alone.',
    )
  }

  const top10 = top10Pct(scannerReport)
  if (top10 != null && top10 >= 50) {
    parts.push('Concentration among top holders remains a primary sensitivity factor in the indexed supply sample.')
  }

  if (walletExposureProfile?.exposureDrivers?.[0]) {
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
  const symbol = ctx.symbol || scannerReport?.requestedSymbol || scannerReport?.symbol
  const tokenName = ctx.tokenName || scannerReport?.archetypeLabel
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
