import { resolveEffectiveNarrativeCategory } from './executiveIntelligenceEngine.mjs'

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
  if (sr.liquidityIntelligence?.jupiterRouting === true) return true
  return false
}

function dexListingsAvailable(sr) {
  const dexList = sr?.tokenConcentration?.dexListings || sr?.liquidityIntelligence?.dexListings
  if (Array.isArray(dexList) && dexList.length > 0) return true
  const pairCount = num(sr?.tokenConcentration?.pairCount ?? sr?.liquidityIntelligence?.pairCount)
  return pairCount != null && pairCount >= 1
}

const FALLBACK_PHRASES = /\b(pending|scenario|demo|provider activation|scenario only|live feeds are pending)\b/i

function buildSolanaScannerAnalystAssessment({ report, sr, executive, meme, top10, liqConc, depth }) {
  const mintRevoked = authorityRevoked(sr?.mintAuthority)
  const freezeRevoked = authorityRevoked(sr?.freezeAuthority)
  const jupiterActive = jupiterRoutingActive(sr)
  const dexListed = dexListingsAvailable(sr)

  /** @type {string[]} */
  const technicalParts = []
  if (mintRevoked) technicalParts.push('Mint authority revoked')
  if (freezeRevoked) technicalParts.push('Freeze authority revoked')
  technicalParts.push('Scanner-backed Solana mint evidence available')

  const technicalAssessment = `${technicalParts.join('; ')}.`

  /** @type {string[]} */
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

  /** @type {string[]} */
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

  /** @type {string[]} */
  const monitorParts = []
  if (top10 != null && top10 >= 50) monitorParts.push('Monitor holder distribution')
  if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') monitorParts.push('Monitor liquidity concentration')
  if (meme || report.narrativeElevated) monitorParts.push('Monitor narrative momentum')
  monitorParts.push('Review provider coverage when behavior/narrative feeds improve')

  const recommendedMonitoringAction = `${monitorParts.join('; ')}.`

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
  const isSolana = report.isSolanaToken || sr?.chain === 'solana'
  const top10 = top10Pct(sr)
  const liqConc =
    sr?.liquidityIntelligence?.concentrationLabel || report?.liquidityIntelligence?.concentrationLabel
  const depth =
    sr?.liquidityIntelligence?.liquidityDepthLabel || report?.liquidityIntelligence?.liquidityDepthLabel
  const meme =
    resolveEffectiveNarrativeCategory({
      narrativeCategory: report.narrativeCategory,
      symbol: report.displayTarget || report.query,
      tokenName: report.targetClassification?.name || report.tokenResolution?.name,
      query: report.query,
      scannerReport: sr,
    }) === 'meme' || executive?.classification?.includes('MEME')
  const narrativeElevated = report.narrativeElevated

  if (scanned && isSolana) {
    return buildSolanaScannerAnalystAssessment({
      report,
      sr,
      executive,
      meme,
      top10,
      liqConc,
      depth,
    })
  }

  const mintRevoked = authorityRevoked(sr?.mintAuthority)
  const freezeRevoked = authorityRevoked(sr?.freezeAuthority)

  /** @type {string[]} */
  const technicalParts = []
  if (scanned && mintRevoked && freezeRevoked) {
    technicalParts.push('Technical controls appear strong with revoked mint and freeze authorities')
  } else if (scanned && mintRevoked) {
    technicalParts.push('Mint authority is revoked; freeze authority warrants review in indexed data')
  } else if (scanned) {
    technicalParts.push('Indexed on-chain authority controls are observable in the current scan cycle')
  } else if (report.isPreliminary) {
    technicalParts.push('Technical assessment incomplete — scanner validation has not completed')
  } else {
    technicalParts.push('Technical posture reflects provider context without full scanner validation')
  }

  if (scanned && (depth === 'Strong' || depth === 'Healthy' || depth === 'Exceptional')) {
    technicalParts.push('established market infrastructure with adequate indexed liquidity depth')
  } else if (scanned && depth) {
    technicalParts.push(`indexed liquidity depth registers as ${String(depth).toLowerCase()}`)
  }

  let primaryRiskDriver = 'No dominant structural risk flag in current indexed observations.'
  if (top10 != null && top10 >= 50) {
    primaryRiskDriver = `Primary risk remains concentrated holder distribution (~${top10.toFixed(0)}% top-10 control in sampled supply).`
  } else if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') {
    primaryRiskDriver = 'Primary risk remains liquidity concentration across indexed venues.'
  } else if (meme || narrativeElevated) {
    primaryRiskDriver = 'Primary risk remains narrative-driven volatility relative to technical controls.'
  } else if (report.scannerSignals?.honeypotDetected || report.scannerSignals?.maliciousScanner) {
    primaryRiskDriver = 'Primary risk remains malicious or honeypot surface signals in scanner output.'
  } else if (report.overallRisk === 'Critical' || report.overallRisk === 'High') {
    primaryRiskDriver = 'Primary risk remains elevated composite posture across intelligence dimensions.'
  }

  let marketStructureAssessment =
    'Market structure conditions require additional provider coverage before structural conclusions.'
  if (scanned) {
    if (depth === 'Strong' || depth === 'Healthy' || depth === 'Exceptional') {
      marketStructureAssessment =
        'Liquidity conditions appear adequate for retail-sized activity in indexed data, though concentration and routing dependency warrant monitoring.'
    } else if (depth === 'Thin' || depth === 'Limited') {
      marketStructureAssessment =
        'Indexed liquidity appears limited relative to typical institutional depth benchmarks; exit capacity may be constrained.'
    } else {
      marketStructureAssessment =
        'Market structure reflects observable DEX depth and routing coverage in the current intelligence cycle.'
    }
    if (liqConc === 'CRITICAL' || liqConc === 'ELEVATED') {
      marketStructureAssessment +=
        ' Liquidity concentration across venues remains an active structural sensitivity.'
    }
  } else if (isSolana && report.solanaMintResolved) {
    marketStructureAssessment =
      'Mint address resolved — market structure evidence populates after Solana token scan completes.'
  }

  let recommendedMonitoringAction =
    'Recommend continued observation of provider updates and evidence layers before increasing exposure.'
  if (top10 != null && top10 >= 50 && (meme || narrativeElevated)) {
    recommendedMonitoringAction =
      'Recommend continued observation of holder distribution and narrative momentum before increasing exposure.'
  } else if (top10 != null && top10 >= 50) {
    recommendedMonitoringAction =
      'Recommend monitoring holder distribution and venue liquidity before increasing exposure.'
  } else if (meme || narrativeElevated) {
    recommendedMonitoringAction =
      'Recommend monitoring narrative momentum and social velocity against on-chain liquidity depth.'
  } else if (report.overallRisk === 'Critical' || report.overallRisk === 'High') {
    recommendedMonitoringAction =
      'Recommend deferring discretionary exposure until supporting evidence and wallet exposure are reviewed.'
  } else if (scanned) {
    recommendedMonitoringAction =
      'Recommend periodic refresh of scanner-backed evidence as market structure and holder data evolve.'
  }

  const technicalAssessment =
    technicalParts.join('; ').replace(/;\s*established/, ' with established') + '.'

  const result = {
    technicalAssessment,
    primaryRiskDriver,
    marketStructureAssessment,
    recommendedMonitoringAction,
    summary: technicalAssessment,
    keyConcern: primaryRiskDriver,
    nextMove: recommendedMonitoringAction,
  }

  if (scanned) {
    const blob = Object.values(result).join(' ')
    if (FALLBACK_PHRASES.test(blob)) {
      return buildSolanaScannerAnalystAssessment({
        report,
        sr,
        executive,
        meme,
        top10,
        liqConc,
        depth,
      })
    }
  }

  return result
}
