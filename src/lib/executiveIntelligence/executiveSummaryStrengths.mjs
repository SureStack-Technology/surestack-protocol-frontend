/**
 * P4.2.2 — Category-specific Executive Summary strengths/risks for registry assets.
 */

import {
  canonicalCategoryToNarrativeCategory,
  resolveRegistryNarrativeCategory,
} from '../intelligence/assetCategoryRegistry.mjs'
import { getReportCanonicalAsset } from '../intelligence/assetDisplayLabel.mjs'
import { hasRegistryMatch } from '../intelligence/assetIntelligenceState.mjs'
import { resolveEffectiveNarrativeCategory } from './executiveIntelligenceEngine.mjs'
import { STABLECOIN_RISK_THEMES } from '../../shared/constants/stablecoinRegistry.mjs'
import {
  lookupNativeAssetIntelligence,
  resolveNativeExecutiveClassification,
} from '../../../shared/constants/nativeAssetIntelligenceRegistry.mjs'
import { resolveNativeAssetInput } from '../../../shared/constants/nativeAssetRegistry.mjs'

/**
 * @param {object | null | undefined} report
 * @param {object | null | undefined} [executive]
 */
export function resolveExecutiveSummaryCategoryContext(report, executive = null) {
  const canonical = getReportCanonicalAsset(report)
  const symbol =
    canonical?.symbol ||
    report?.targetClassification?.symbol ||
    report?.tokenResolution?.symbol ||
    null
  const address =
    canonical?.address ||
    report?.tokenResolution?.address ||
    report?.targetClassification?.address ||
    null
  const tokenName =
    canonical?.name ||
    report?.targetClassification?.name ||
    report?.tokenResolution?.name ||
    null

  let narrativeCategory =
    report?.narrativeCategory ||
    canonical?.narrativeCategory ||
    resolveRegistryNarrativeCategory(symbol, address) ||
    canonicalCategoryToNarrativeCategory(canonical?.category) ||
    null

  if (!narrativeCategory || narrativeCategory === 'unknown') {
    narrativeCategory =
      resolveEffectiveNarrativeCategory({
        narrativeCategory: report?.narrativeCategory,
        symbol,
        tokenName,
        query: report?.query,
        address,
        scannerReport: report?.scannerReport,
      }) || narrativeCategory
  }

  const nativeIntel =
    lookupNativeAssetIntelligence(symbol) ||
    lookupNativeAssetIntelligence(canonical?.symbol) ||
    (report?.query ? lookupNativeAssetIntelligence(resolveNativeAssetInput(report.query)?.symbol) : null)

  const isNativeBacked = Boolean(nativeIntel || canonical?.native)
  const isRegistryBacked =
    isNativeBacked ||
    canonical?.source === 'registry' ||
    Boolean(symbol && hasRegistryMatch(report)) ||
    Boolean(canonical?.resolved && canonical.category && canonical.category !== 'UNKNOWN_ASSET')

  return {
    canonical,
    symbol,
    address,
    narrativeCategory: nativeIntel?.narrativeCategory || narrativeCategory || 'unknown',
    canonicalCategory: canonical?.category || null,
    classification:
      executive?.classification ||
      resolveNativeExecutiveClassification(symbol, canonical) ||
      null,
    isRegistryBacked,
    isNativeBacked,
    nativeIntel,
  }
}

/**
 * @param {string | null | undefined} narrativeCategory
 * @param {{ classification?: string | null }} [options]
 * @returns {string[]}
 */
export function buildCategoryExecutiveStrengths(narrativeCategory, options = {}) {
  const { classification = null, symbol = null, nativeIntel = null } = options
  const native =
    nativeIntel ||
    lookupNativeAssetIntelligence(symbol) ||
    lookupNativeAssetIntelligence(classification)
  if (native?.strengths?.length) {
    return native.strengths.slice(0, 4)
  }

  const cat = String(narrativeCategory || '').toLowerCase()

  switch (cat) {
    case 'oracle':
      return [
        'Established oracle network',
        'Deep market adoption',
        'Long deployment history',
      ]
    case 'stablecoin':
      return [
        'Established stablecoin profile in indexed registry',
        'Issuer-backed asset with reserve transparency expectations',
        'Institutional-grade liquidity rails (issuer / CEX depth)',
      ]
    case 'meme':
      return [
        'Narrative-driven market visibility',
        'Community engagement signals in indexed feeds',
        'Registry-identified meme / speculative profile',
      ]
    case 'governance':
      return [
        'Established governance token profile',
        'Protocol governance and fee surfaces indexed',
        'Deep DeFi ecosystem adoption',
      ]
    case 'defi':
      return [
        'Established DeFi protocol profile',
        'Indexed in institutional token registry',
        'Governance and liquidity surfaces observable',
      ]
    case 'ai':
      return [
        'AI / compute narrative asset in registry',
        'Indexed market and protocol adoption signals',
        'Utility claims should be validated against on-chain evidence',
      ]
    case 'l2':
      return [
        'Blockchain infrastructure asset with ecosystem adoption',
        'Bridge and L2 integration narrative coverage',
        'Indexed in institutional token registry',
      ]
    default:
      if (classification && cat === 'unknown') {
        return [`Classification: ${classification}`, 'Category intelligence model active']
      }
      return []
  }
}

/**
 * @param {string | null | undefined} narrativeCategory
 * @param {{ hasScan?: boolean }} [options]
 * @returns {string[]}
 */
export function buildCategoryExecutiveRisks(narrativeCategory, options = {}) {
  const { hasScan = false } = options
  const cat = String(narrativeCategory || '').toLowerCase()
  const risks = []

  if (!hasScan) {
    risks.push('Scanner validation pending for contract-backed proof')
  }

  if (cat === 'stablecoin') {
    risks.push(STABLECOIN_RISK_THEMES[0])
    if (risks.length < 4) risks.push(STABLECOIN_RISK_THEMES[2])
  } else if (cat === 'meme') {
    risks.push('Narrative-driven volatility exceeds typical blue-chip profiles')
  } else if (cat === 'ai') {
    risks.push('Verify utility and emissions claims against on-chain evidence')
  }

  if (!risks.length) {
    return hasScan
      ? ['No elevated structural flags in current cycle']
      : ['Standard category diligence applies until scan completes']
  }

  return risks.slice(0, 4)
}

/**
 * Merge registry category strengths ahead of scanner-derived lines.
 * @param {string[]} strengths
 * @param {string[]} risks
 * @param {ReturnType<typeof resolveExecutiveSummaryCategoryContext>} ctx
 * @param {{ hasScan?: boolean, maxStrengths?: number, maxRisks?: number }} [options]
 */
export function mergeRegistryExecutiveSummaryLines(
  strengths,
  risks,
  ctx,
  { hasScan = false, maxStrengths = 4, maxRisks = 4 } = {},
) {
  if (!ctx?.isRegistryBacked) {
    return {
      primaryStrengths: strengths.slice(0, maxStrengths),
      primaryRisks: risks.slice(0, maxRisks),
    }
  }

  const categoryStrengths = buildCategoryExecutiveStrengths(ctx.narrativeCategory, {
    classification: ctx.classification,
    symbol: ctx.symbol,
    nativeIntel: ctx.nativeIntel,
  })
  const categoryRisks = buildCategoryExecutiveRisks(ctx.narrativeCategory, { hasScan })

  const mergedStrengths = []
  for (const line of categoryStrengths) {
    if (mergedStrengths.length >= maxStrengths) break
    if (!mergedStrengths.includes(line)) mergedStrengths.push(line)
  }
  for (const line of strengths) {
    if (mergedStrengths.length >= maxStrengths) break
    if (
      line &&
      !mergedStrengths.includes(line) &&
      !/^category intelligence model active$/i.test(line) &&
      !/^scanner-backed evidence indexed$/i.test(line)
    ) {
      mergedStrengths.push(line)
    }
  }
  if (!mergedStrengths.length && categoryStrengths.length) {
    mergedStrengths.push(...categoryStrengths.slice(0, maxStrengths))
  }

  const mergedRisks = []
  for (const line of categoryRisks) {
    if (mergedRisks.length >= maxRisks) break
    if (!mergedRisks.includes(line)) mergedRisks.push(line)
  }
  for (const line of risks) {
    if (mergedRisks.length >= maxRisks) break
    if (!mergedRisks.includes(line)) mergedRisks.push(line)
  }
  if (!mergedRisks.length) {
    mergedRisks.push(...categoryRisks.slice(0, maxRisks))
  }

  return {
    primaryStrengths: mergedStrengths,
    primaryRisks: mergedRisks,
  }
}
