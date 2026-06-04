import { resolveEffectiveNarrativeCategory } from './executiveIntelligenceEngine.mjs'
import { isSolanaScannerReport, isEvmScannerReport } from '../intelligence/chainIntelligence.mjs'
import { resolveStablecoinMatch, STABLECOIN_RISK_THEMES } from '../../shared/constants/stablecoinRegistry.mjs'
import { CATEGORY_NARRATIVE_DISCLOSURE } from '../intelligence/providerCoverageStatus.mjs'
import { ANALYST_PARTIAL_COVERAGE } from '../intelligence/partialCoverageMessaging.mjs'
import {
  isTokenContractResolved,
  TOKEN_RISK_INTEL_PRESCAN_LEAD,
  PROVIDER_COVERAGE_PRELIMINARY_NOTE,
} from '../intelligence/tokenResolutionCopy.mjs'
import { getAssetDisplayName, getReportCanonicalAsset } from '../intelligence/assetDisplayLabel.mjs'

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function top10Pct(scannerReport) {
  const tc = scannerReport?.tokenConcentration || {}
  return num(tc.top10HolderPct) ?? num(tc.top10Share) ?? num(tc.top10SharePct) ?? null
}

function authorityRevoked(value) {
  if (value == null || value === false) return true
  const s = String(value).toLowerCase()
  return s === 'none' || s === 'revoked' || s === 'null' || s === 'disabled' || s === 'no'
}

function hasScan(report, scannerReport) {
  const sr = scannerReport || report?.scannerReport
  return Boolean(
    report?.scannerSignals?.hasScan ||
    sr?.success === true ||
    (sr?.success !== false && sr?.product === 'surestack_solana_risk_scanner') ||
    num(sr?.trustScore) != null ||
    num(sr?.compositeTrustScore) != null,
  )
}

function jupiterRoutingActive(sr) {
  if (!sr) return false
  if (sr.findings?.some?.((f) => /jupiter routing available/i.test(String(f.title || '')))) return true
  if (sr.tokenConcentration?.jupiterClassification === 'ROUTABLE') return true
  if (sr.liquidityIntelligence?.jupiterRoutable === true) return true
  return false
}

function dexListingsAvailable(sr) {
  const dexList = sr?.tokenConcentration?.dexListings || sr?.liquidityIntelligence?.dexListings
  if (Array.isArray(dexList) && dexList.length > 0) return true
  const pairCount = num(sr?.tokenConcentration?.pairCount ?? sr?.liquidityIntelligence?.pairCount)
  return pairCount != null && pairCount >= 1
}

function buildSolanaScannerAnalystAssessment({ report, sr, executive, meme, top10, liqConc, depth }) {
  const mintRevoked = authorityRevoked(sr?.mintAuthority)
  const freezeRevoked = authorityRevoked(sr?.freezeAuthority)
  const jupiterActive = jupiterRoutingActive(sr)
  const dexListed = dexListingsAvailable(sr)

  const technicalParts = []
  if (mintRevoked) technicalParts.push('Mint authority revoked')
  if (freezeRevoked) technicalParts.push('Freeze authority revoked')
  technicalParts.push('Scanner-backed Solana mint evidence available')

  const technicalAssessment = `${technicalParts.join('; ')}.`

  const riskParts = []
  if (top10 != null && top10 >= 50) {
    riskParts.push(`Top 10 holder concentration around ${Math.round(top10)}%`)
  }
  if (meme || report.narrativeElevated || executive?.classification?.includes('MEME')) {
    riskParts.push('Meme/narrative-driven volatility')
  }
  if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') {
    riskParts.push(
      liqConc === 'CRITICAL' ? 'Liquidity concentration critical' : 'Liquidity concentration elevated',
    )
  }
  const primaryRiskDriver =
    riskParts.length > 0
      ? `${riskParts.join('; ')}.`
      : 'No dominant structural risk flag in current indexed observations.'

  const marketParts = []
  if (depth === 'Strong' || depth === 'Healthy' || depth === 'Exceptional') {
    marketParts.push('Strong liquidity depth')
  } else if (depth) {
    marketParts.push(`Indexed liquidity depth: ${String(depth).toLowerCase()}`)
  }
  if (jupiterActive) marketParts.push('Jupiter routing active')
  if (dexListed) marketParts.push('DEX listings available')
  if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') {
    marketParts.push('Liquidity concentration remains an active structural caveat')
  }
  const marketStructureAssessment =
    marketParts.length > 0
      ? `${marketParts.join('; ')}. Behavioral and narrative provider coverage is partial, but scanner-backed market structure evidence is available.`
      : 'Behavioral and narrative provider coverage is partial, but scanner-backed market structure evidence is available.'

  const monitorParts = []
  if (top10 != null && top10 >= 50) monitorParts.push('Monitor holder distribution')
  if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') monitorParts.push('Monitor liquidity concentration')
  if (meme || report.narrativeElevated) monitorParts.push('Monitor narrative momentum')
  monitorParts.push('Review provider coverage when behavior/narrative feeds improve')

  return {
    technicalAssessment,
    primaryRiskDriver,
    marketStructureAssessment,
    recommendedMonitoringAction: `${monitorParts.join('; ')}.`,
    summary: technicalAssessment,
    keyConcern: primaryRiskDriver,
    nextMove: `${monitorParts.join('; ')}.`,
  }
}

function buildEvmScannerAnalystAssessment({ report, sr, executive, stablecoin, top10, liqConc, depth }) {
  const technicalParts = []
  if (sr?.verifiedSource) technicalParts.push('Contract source verified on indexed explorer')
  else if (hasScan(report, sr)) technicalParts.push('Contract source status indexed in scanner pass')

  if (sr?.upgradeableProxy === false) technicalParts.push('Non-upgradeable contract surface')
  else if (sr?.upgradeableProxy === true) technicalParts.push('Upgradeable proxy detected — review admin surface')

  if (sr?.providerCoverage?.goPlus === 'goplus') technicalParts.push('GoPlus security signals indexed')
  technicalParts.push('Scanner-backed Ethereum contract trust evidence available')

  const technicalAssessment = `${technicalParts.join('; ')}.`

  const riskParts = []
  if (stablecoin) {
    riskParts.push(STABLECOIN_RISK_THEMES[2])
    riskParts.push(STABLECOIN_RISK_THEMES[1])
  }
  if (top10 != null && top10 >= 50) {
    riskParts.push(`Top 10 holder concentration around ${Math.round(top10)}%`)
  }
  if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') {
    riskParts.push('Liquidity concentration elevated across indexed DEX venues')
  }
  if (!stablecoin && (report.narrativeElevated || executive?.classification?.includes('NARRATIVE'))) {
    riskParts.push('Narrative-driven volatility relative to technical controls')
  }

  const primaryRiskDriver =
    riskParts.length > 0
      ? `${riskParts.join('; ')}.`
      : 'No dominant structural risk flag in current indexed observations.'

  const marketParts = []
  if (depth === 'Strong' || depth === 'Healthy' || depth === 'Exceptional') {
    marketParts.push('Strong DEX liquidity depth')
  } else if (stablecoin) {
    marketParts.push('Institutional stablecoin liquidity profile — global depth exceeds indexed DEX sample')
  } else if (depth) {
    marketParts.push(`Indexed DEX liquidity: ${String(depth).toLowerCase()}`)
  }
  if (dexListingsAvailable(sr)) marketParts.push('DEX listings available')
  if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') {
    marketParts.push('Liquidity concentration caveat remains active')
  }

  const marketStructureAssessment =
    marketParts.length > 0
      ? `${marketParts.join('; ')}. EVM behavior coverage uses contract trust and DEX intelligence — Birdeye is not used for Ethereum targets.`
      : 'EVM market structure reflects contract trust and DEX coverage in the current intelligence cycle.'

  const monitorParts = []
  if (stablecoin) {
    monitorParts.push('Monitor issuer attestations and redemption flows')
    monitorParts.push('Monitor depeg sensitivity')
  }
  if (top10 != null && top10 >= 50) monitorParts.push('Monitor holder distribution')
  if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') monitorParts.push('Monitor liquidity concentration')
  monitorParts.push('Review GoPlus and explorer updates on admin/proxy changes')

  return {
    technicalAssessment,
    primaryRiskDriver,
    marketStructureAssessment,
    recommendedMonitoringAction: `${monitorParts.join('; ')}.`,
    summary: technicalAssessment,
    keyConcern: primaryRiskDriver,
    nextMove: `${monitorParts.join('; ')}.`,
  }
}

/**
 * Institutional AI analyst assessment — four analytical dimensions.
 * @param {object} params
 */
export function buildInstitutionalAnalystAssessment({
  report = null,
  scannerReport = null,
  executive = null,
} = {}) {
  if (!report) {
    return {
      technicalAssessment: 'Intelligence synthesis available after scan.',
      primaryRiskDriver: 'Provider coverage incomplete.',
      marketStructureAssessment: 'Market structure review pending.',
      recommendedMonitoringAction: 'Run Intelligence Scan to populate analyst assessment.',
    }
  }

  const sr = scannerReport || report?.scannerReport || null
  const scanned = hasScan(report, sr)
  const solana = isSolanaScannerReport(sr, report)
  const evm = isEvmScannerReport(sr, report)
  const top10 = top10Pct(sr)
  const liqConc =
    sr?.liquidityIntelligence?.concentrationLabel || report?.liquidityIntelligence?.concentrationLabel
  const depth =
    sr?.liquidityIntelligence?.liquidityDepthLabel || report?.liquidityIntelligence?.liquidityDepthLabel
  const canonical = getReportCanonicalAsset(report)
  const narrativeCtx = {
    narrativeCategory: report.narrativeCategory,
    symbol:
      canonical?.symbol ||
      report.targetClassification?.symbol ||
      report.tokenResolution?.symbol,
    tokenName:
      canonical?.name ||
      report.targetClassification?.name ||
      report.tokenResolution?.name,
    query: report.query,
    address: canonical?.address || report.tokenResolution?.address,
    scannerReport: sr,
  }
  const stablecoin =
    resolveEffectiveNarrativeCategory(narrativeCtx) === 'stablecoin' ||
    executive?.classification === 'STABLECOIN ASSET'
  const meme =
    resolveEffectiveNarrativeCategory(narrativeCtx) === 'meme' ||
    executive?.classification?.includes('MEME')

  if (scanned && (evm || solana)) {
    const partialNote =
      !report.lunarLive || !report.birdeyeLive || report.partialProviderCoverage
        ? ` ${ANALYST_PARTIAL_COVERAGE}`
        : ''
    const base =
      evm && !solana
        ? buildEvmScannerAnalystAssessment({
            report,
            sr,
            executive,
            stablecoin,
            top10,
            liqConc,
            depth,
          })
        : buildSolanaScannerAnalystAssessment({
            report,
            sr,
            executive,
            meme,
            top10,
            liqConc,
            depth,
          })
    if (!partialNote) return base
    return {
      ...base,
      marketStructureAssessment: `${base.marketStructureAssessment}${partialNote}`,
      summary: base.summary,
    }
  }

  if (scanned) {
    return {
      technicalAssessment:
        'Executive assessment generated from scanner-backed contract evidence.',
      primaryRiskDriver: stablecoin
        ? `${STABLECOIN_RISK_THEMES[0]}; ${STABLECOIN_RISK_THEMES[2]}.`
        : 'No dominant structural risk flag in current indexed observations.',
      marketStructureAssessment: ANALYST_PARTIAL_COVERAGE,
      recommendedMonitoringAction:
        'Review scanner-backed evidence layers and monitor provider coverage updates.',
      summary: 'Executive assessment generated from scanner-backed contract evidence.',
      keyConcern: stablecoin
        ? `${STABLECOIN_RISK_THEMES[0]}; ${STABLECOIN_RISK_THEMES[2]}.`
        : 'Review evidence layers for provider context.',
      nextMove: 'Expand narrative and behavior evidence when additional providers are available.',
    }
  }

  const technicalParts = []
  if (scanned && solana) {
    if (authorityRevoked(sr?.mintAuthority) && authorityRevoked(sr?.freezeAuthority)) {
      technicalParts.push('Technical controls appear strong with revoked mint and freeze authorities')
    }
  } else if (scanned && evm) {
    technicalParts.push('Indexed EVM contract trust signals available in scanner pass')
  } else if (report.isPreliminary) {
    if (report.modeId === 'token' && isTokenContractResolved(report)) {
      const label = getAssetDisplayName(canonical, report.query)
      technicalParts.push(
        `${label} preliminary profile generated from registry and category intelligence`,
      )
    } else {
      technicalParts.push('Technical assessment incomplete — scanner validation has not completed')
    }
  } else {
    technicalParts.push('Technical posture reflects provider context without full scanner validation')
  }

  let primaryRiskDriver = 'No dominant structural risk flag in current indexed observations.'
  if (stablecoin) {
    primaryRiskDriver = `${STABLECOIN_RISK_THEMES[0]}; ${STABLECOIN_RISK_THEMES[2]}.`
  } else if (top10 != null && top10 >= 50) {
    primaryRiskDriver = `Primary risk remains concentrated holder distribution (~${top10.toFixed(0)}% top-10 control).`
  }

  let marketStructureAssessment =
    report.modeId === 'token' && isTokenContractResolved(report) && !scanned
      ? PROVIDER_COVERAGE_PRELIMINARY_NOTE
      : CATEGORY_NARRATIVE_DISCLOSURE
  let recommendedMonitoringAction =
    report.modeId === 'token' && isTokenContractResolved(report) && !scanned
      ? TOKEN_RISK_INTEL_PRESCAN_LEAD
      : 'Recommend continued observation of provider updates and evidence layers before increasing exposure.'

  const technicalAssessment = technicalParts.join('; ') + '.'

  return {
    technicalAssessment,
    primaryRiskDriver,
    marketStructureAssessment,
    recommendedMonitoringAction,
    summary: technicalAssessment,
    keyConcern: primaryRiskDriver,
    nextMove: recommendedMonitoringAction,
  }
}

export { CATEGORY_NARRATIVE_DISCLOSURE }
