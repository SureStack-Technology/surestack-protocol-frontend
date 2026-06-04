/**
 * P3.3 End-to-End API Validation — live HTTP routes for Prime intelligence pipeline.
 * Usage: npm run validate:p33
 * Requires: backend running on P33_BACKEND_URL (default http://localhost:5001)
 * Dev auth: NODE_ENV=development + DEV_FORCE_MEMBERSHIP_TIER=INTELLIGENCE_PRO in backend/.env
 */
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
dotenv.config({ path: join(ROOT, 'backend', '.env') })
dotenv.config({ path: join(ROOT, '.env'), override: true })
dotenv.config({ path: join(ROOT, '.env.local'), override: true })

const BASE = (process.env.P33_BACKEND_URL || 'http://localhost:5001').replace(/\/$/, '')
const TIMEOUT_MS = 15_000

const ETH_MATRIX = ['LINK', 'UNI', 'AAVE', 'USDC', 'USDT', 'PEPE']
const SOL_MATRIX = ['WIF', 'BONK', 'JUP', 'TAO']
const UNKNOWN_MATRIX = [
  {
    id: 'pump_fun_mint',
    label: 'Random Pump.fun token',
    query: 'VGz5JN59ozf2Mtsv8R4FbCDUWxtEgmAdKEBZL4Epump',
    chain: 'solana',
  },
  {
    id: 'random_evm',
    label: 'Random EVM contract',
    query: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    chain: 'ethereum',
  },
  {
    id: 'unknown_symbol',
    label: 'Unknown symbol',
    query: 'ZZZZNOTATOKEN',
    chain: null,
  },
]

const FABRICATED_CLASSIFICATIONS =
  /^(DEFI ASSET|AI ASSET|MEME SPECULATIVE ASSET|GOVERNANCE ASSET|STABLECOIN ASSET|BLUE CHIP ASSET|ORACLE INFRASTRUCTURE|NARRATIVE DRIVEN ASSET|CONCENTRATED EXPOSURE ASSET|HIGH RISK EXPERIMENTAL ASSET)$/i

const VALID_KNOWN_STATES = new Set([
  'METADATA_RESOLVED',
  'MARKET_INDEXED',
  'SCANNER_VALIDATED',
  'FULLY_VALIDATED',
])

const VALID_UNKNOWN_STATES = new Set(['UNKNOWN_ASSET', 'MINT_DETECTED'])

const { lookupPrimeToken } = await import('../shared/constants/primeTokenRegistry.mjs')
const { ASSET_INTEL_STATES, resolveAssetIntelligenceState, allowsExecutiveRisk } = await import(
  '../src/lib/intelligence/assetIntelligenceState.mjs'
)
const { canBuildPreliminaryExecutiveIntel, buildPreliminaryExecutiveIntel } = await import(
  '../src/lib/executiveIntelligence/preliminaryExecutiveIntel.mjs'
)
const { buildUnverifiedAssetExecutiveIntel } = await import(
  '../src/lib/executiveIntelligence/buildUnverifiedAssetIntel.mjs'
)

/**
 * @param {string} method
 * @param {string} path
 * @param {object} [body]
 */
async function apiRequest(method, path, body = undefined) {
  const url = `${BASE}${path}`
  const t0 = performance.now()
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const ms = Math.round(performance.now() - t0)
    let json = null
    const text = await res.text()
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = { _raw: text?.slice(0, 500) }
    }
    return {
      route: `${method} ${path}`,
      url,
      ok: res.ok,
      status: res.status,
      latencyMs: ms,
      body: json,
      timedOut: false,
      error: null,
    }
  } catch (e) {
    const ms = Math.round(performance.now() - t0)
    const timedOut = e?.name === 'TimeoutError' || /aborted|timeout/i.test(String(e?.message))
    return {
      route: `${method} ${path}`,
      url,
      ok: false,
      status: timedOut ? 408 : 0,
      latencyMs: ms,
      body: null,
      timedOut,
      error: e?.message || String(e),
    }
  }
}

function buildReportFromApi({ query, classification, scannerReport, isSolana }) {
  const reg = lookupPrimeToken(query) || lookupPrimeToken(classification?.symbol)
  return {
    modeId: 'token',
    query,
    displayTarget: query,
    chainId: isSolana ? 'solana' : 'ethereum',
    isSolanaToken: isSolana,
    solanaMintResolved: isSolana,
    solanaMintAddress: isSolana ? query : null,
    tokenResolution: reg
      ? {
          resolved: true,
          source: 'registry',
          symbol: reg.symbol,
          name: reg.name,
          address: reg.address,
          status: 'resolved',
        }
      : classification?.symbol
        ? {
            resolved: true,
            symbol: classification.symbol,
            name: classification.name,
            address: classification.address,
          }
        : { status: 'unresolved', resolved: false },
    targetClassification: classification || null,
    scannerReport,
    scannerSignals: { hasScan: scannerReport?.success === true },
  }
}

function resolveClientExecutive(report, scannerReport) {
  const state = resolveAssetIntelligenceState({ report, scannerReport })
  if (!allowsExecutiveRisk(state)) {
    return { state, executive: buildUnverifiedAssetExecutiveIntel(report, { state }) }
  }
  const apiExec = scannerReport?.executiveIntelligence
  if (
    apiExec?.classification &&
    apiExec.classification !== 'UNKNOWN ASSET' &&
    apiExec.classification !== 'Assessment pending'
  ) {
    return { state, executive: apiExec }
  }
  const prelimReport = { ...report, scannerReport: null, scannerSignals: { hasScan: false } }
  if (canBuildPreliminaryExecutiveIntel(prelimReport)) {
    const executive = buildPreliminaryExecutiveIntel(prelimReport)
    if (state === ASSET_INTEL_STATES.SCANNER_VALIDATED || state === ASSET_INTEL_STATES.FULLY_VALIDATED) {
      executive.confidenceScore = Math.max(Number(executive.confidenceScore) || 0, 82)
      executive.confidenceInterpretation = 'Scanner-backed evidence'
      executive.assessmentStage = 'SCANNER VALIDATED'
    }
    return { state, executive }
  }
  return { state, executive: buildUnverifiedAssetExecutiveIntel(report, { state }) }
}

function hasFabricatedNarrative(_scanBody, executive) {
  if (!executive || executive.unverified) return false
  const conclusion = String(executive?.executiveConclusion || '')
  if (/preliminary profile indicates|category intelligence active|DeFi protocol token/i.test(conclusion)) {
    return true
  }
  const findings = Array.isArray(executive?.keyFindings) ? executive.keyFindings : []
  return findings.some((f) =>
    /registry and category intelligence active|DeFi protocol/i.test(String(f)),
  )
}

function extractApiExecutive(scanBody) {
  return scanBody?.executiveIntelligence || null
}

function hasFabricatedClassification(classification) {
  if (!classification) return false
  if (classification === 'UNKNOWN ASSET') return false
  if (classification === 'Assessment pending') return false
  return FABRICATED_CLASSIFICATIONS.test(classification)
}

function hasExecutiveRiskScore(executive) {
  if (!executive) return false
  const score = executive.executiveRiskScore
  if (score == null || score === '—' || score === '') return false
  const n = Number(score)
  return Number.isFinite(n) && n > 0
}

function scannerStatus(scanBody) {
  if (!scanBody) return 'not_requested'
  if (scanBody.timedOut) return 'timeout'
  if (scanBody.status >= 500) return 'server_error'
  if (scanBody.success === true) return 'success'
  if (scanBody.success === false) return scanBody.error || 'failed'
  if (scanBody.trustScore != null || scanBody.compositeTrustScore != null) return 'success'
  return 'unknown'
}

async function validateHealth() {
  const res = await apiRequest('GET', '/health')
  return {
    ...res,
    pass: res.ok && res.status === 200 && res.body?.status === 'ok',
  }
}

async function classifyAsset(query) {
  return apiRequest('POST', '/api/prime/intelligence/classify', { input: query })
}

async function scanEthereum(address) {
  return apiRequest('POST', '/api/prime/contracts/analyze', { address, chainId: 1 })
}

async function scanSolana(address, symbol = null) {
  return apiRequest('POST', '/api/prime/solana/analyze', { address, symbol })
}

async function validateKnownEthereum(symbol) {
  const reg = lookupPrimeToken(symbol)
  const routes = []
  const classify = await classifyAsset(symbol)
  routes.push(classify)

  const address = reg?.address || classify.body?.classification?.address
  const scan = address ? await scanEthereum(address) : null
  if (scan) routes.push(scan)

  const classification = classify.body?.classification || null
  const scannerReport = scan?.body || null
  const report = buildReportFromApi({ query: symbol, classification, scannerReport, isSolana: false })
  const { state, executive } = resolveClientExecutive(report, scannerReport)
  const apiExec = extractApiExecutive(scannerReport)
  const confidence = Number(executive?.confidenceScore ?? 0)

  const failures = []
  if (!classify.ok || classify.status === 500) failures.push('classify_route_failed')
  if (classify.timedOut) failures.push('classify_timeout')
  if (scan && (!scan.ok || scan.status === 500)) failures.push('scan_route_failed')
  if (scan?.timedOut) failures.push('scan_timeout')
  if (!VALID_KNOWN_STATES.has(state)) failures.push(`unexpected_state_${state}`)
  if (!executive?.classification || executive.classification === 'UNKNOWN ASSET') {
    failures.push('missing_classification')
  }
  if (!hasExecutiveRiskScore(executive)) failures.push('missing_risk_score')
  if (!(confidence > 60)) failures.push(`low_confidence_${confidence}`)

  return {
    asset: symbol,
    chain: 'ethereum',
    kind: 'known',
    routes,
    httpStatus: {
      classify: classify.status,
      scan: scan?.status ?? null,
    },
    latencyMs: {
      classify: classify.latencyMs,
      scan: scan?.latencyMs ?? null,
      total: classify.latencyMs + (scan?.latencyMs ?? 0),
    },
    assetState: state,
    classification: executive?.classification,
    apiClassification: apiExec?.classification ?? null,
    executiveRisk: executive?.executiveRiskScore,
    confidence,
    scannerStatus: scannerStatus(scannerReport),
    errors: [
      classify.error,
      scan?.error,
      classify.body?.error,
      scan?.body?.error,
      classify.body?.message,
      scan?.body?.message,
    ].filter(Boolean),
    failures,
    pass: failures.length === 0,
  }
}

async function validateKnownSolana(symbol) {
  const reg = lookupPrimeToken(symbol)
  const routes = []
  const classify = await classifyAsset(symbol)
  routes.push(classify)

  const address = reg?.address || classify.body?.classification?.address
  const scan = address ? await scanSolana(address, symbol) : null
  if (scan) routes.push(scan)

  const classification = classify.body?.classification || null
  const scannerReport = scan?.body || null
  const report = buildReportFromApi({ query: symbol, classification, scannerReport, isSolana: true })
  const { state, executive } = resolveClientExecutive(report, scannerReport)
  const confidence = Number(executive?.confidenceScore ?? 0)

  const failures = []
  if (!classify.ok || classify.status === 500) failures.push('classify_route_failed')
  if (classify.timedOut) failures.push('classify_timeout')
  if (scan && scan.status === 500) failures.push('scan_route_failed')
  if (scan?.timedOut) failures.push('scan_timeout')
  if (scan && !scan.ok && scan.status !== 503) failures.push(`scan_http_${scan.status}`)
  if (!VALID_KNOWN_STATES.has(state)) failures.push(`unexpected_state_${state}`)
  if (!executive?.classification || executive.classification === 'UNKNOWN ASSET') {
    failures.push('missing_classification')
  }
  if (!hasExecutiveRiskScore(executive)) failures.push('missing_risk_score')
  if (!(confidence > 60)) failures.push(`low_confidence_${confidence}`)

  return {
    asset: symbol,
    chain: 'solana',
    kind: 'known',
    routes,
    httpStatus: { classify: classify.status, scan: scan?.status ?? null },
    latencyMs: {
      classify: classify.latencyMs,
      scan: scan?.latencyMs ?? null,
      total: classify.latencyMs + (scan?.latencyMs ?? 0),
    },
    assetState: state,
    classification: executive?.classification,
    executiveRisk: executive?.executiveRiskScore,
    confidence,
    scannerStatus: scannerStatus(scannerReport),
    errors: [classify.error, scan?.error, classify.body?.error, scan?.body?.error].filter(Boolean),
    failures,
    pass: failures.length === 0,
  }
}

async function validateUnknown(caseDef) {
  const routes = []
  const classify = await classifyAsset(caseDef.query)
  routes.push(classify)

  let scan = null
  if (caseDef.chain === 'solana') {
    scan = await scanSolana(caseDef.query)
    routes.push(scan)
  } else if (caseDef.chain === 'ethereum') {
    scan = await scanEthereum(caseDef.query)
    routes.push(scan)
  }

  const classification = classify.body?.classification || null
  const scannerReport = scan?.body || null
  const isSolana = caseDef.chain === 'solana'
  const report = buildReportFromApi({ query: caseDef.query, classification, scannerReport, isSolana })
  const { state, executive } = resolveClientExecutive(report, scannerReport)
  const apiExec = extractApiExecutive(scannerReport)
  const confidence = Number(executive?.confidenceScore ?? 0)

  const failures = []
  if (classify.status === 500) failures.push('classify_500')
  if (scan?.status === 500) failures.push('scan_500')
  if (classify.timedOut || scan?.timedOut) failures.push('timeout')
  if (!VALID_UNKNOWN_STATES.has(state)) failures.push(`unexpected_state_${state}`)
  if (executive?.classification !== 'UNKNOWN ASSET') failures.push('client_classification_leak')
  if (hasExecutiveRiskScore(executive)) failures.push('client_risk_leak')
  if (confidence > 20) failures.push(`confidence_too_high_${confidence}`)
  if (hasFabricatedNarrative(scannerReport, executive)) failures.push('narrative_leak')

  const apiFabrication = []
  if (apiExec && hasFabricatedClassification(apiExec.classification)) {
    apiFabrication.push('api_raw_classification')
    failures.push('api_raw_classification')
  }
  if (apiExec && hasExecutiveRiskScore(apiExec)) {
    apiFabrication.push('api_raw_risk_score')
    failures.push('api_raw_risk_score')
  }
  if (apiExec && hasFabricatedNarrative(scannerReport, apiExec)) {
    apiFabrication.push('api_raw_narrative')
    failures.push('api_raw_narrative')
  }

  return {
    asset: caseDef.id,
    label: caseDef.label,
    query: caseDef.query,
    chain: caseDef.chain || 'none',
    kind: 'unknown',
    routes,
    httpStatus: { classify: classify.status, scan: scan?.status ?? null },
    latencyMs: {
      classify: classify.latencyMs,
      scan: scan?.latencyMs ?? null,
      total: classify.latencyMs + (scan?.latencyMs ?? 0),
    },
    assetState: state,
    classification: executive?.classification,
    apiClassification: apiExec?.classification ?? null,
    executiveRisk: executive?.executiveRiskScore,
    confidence,
    scannerStatus: scannerStatus(scannerReport),
    apiFabrication,
    unverified: executive?.unverified === true,
    errors: [classify.error, scan?.error, classify.body?.error, scan?.body?.error].filter(Boolean),
    failures,
    pass: failures.length === 0,
  }
}

function computeDecision({ health, known, unknown, warnings }) {
  const hardFails = []
  if (!health.pass) hardFails.push('health')
  for (const r of [...known, ...unknown]) {
    if (!r.pass) hardFails.push(r.asset)
  }
  if (hardFails.length) return { decision: 'NO-GO', hardFails, warnings }
  if (warnings.length) return { decision: 'GO WITH WARNINGS', hardFails: [], warnings }
  return { decision: 'GO', hardFails: [], warnings }
}

console.log(`[P3.3] API validation → ${BASE}`)
const startedAt = new Date().toISOString()

const health = await validateHealth()
if (!health.pass) {
  console.error('[P3.3] Backend health check failed — is the server running with DEV_FORCE_MEMBERSHIP_TIER?')
}

const ethResults = []
for (const sym of ETH_MATRIX) {
  console.log(`[P3.3] ETH ${sym}`)
  ethResults.push(await validateKnownEthereum(sym))
}

const solResults = []
for (const sym of SOL_MATRIX) {
  console.log(`[P3.3] SOL ${sym}`)
  solResults.push(await validateKnownSolana(sym))
}

const unknownResults = []
for (const c of UNKNOWN_MATRIX) {
  console.log(`[P3.3] Unknown ${c.id}`)
  unknownResults.push(await validateUnknown(c))
}

const allKnown = [...ethResults, ...solResults]
const allAssets = [...allKnown, ...unknownResults]
const latencies = allAssets.flatMap((a) => [a.latencyMs.classify, a.latencyMs.scan].filter((n) => n != null))
const avgLatencyMs =
  latencies.length > 0 ? Math.round(latencies.reduce((s, n) => s + n, 0) / latencies.length) : 0

const routeSet = new Set()
for (const a of allAssets) {
  for (const r of a.routes || []) routeSet.add(r.route)
}
routeSet.add('GET /health')

const warnings = []
for (const a of allKnown) {
  if (a.latencyMs.scan != null && a.latencyMs.scan > 10_000) {
    warnings.push(`${a.asset} scan latency ${a.latencyMs.scan}ms (>10s)`)
  }
}
for (const u of unknownResults) {
  if (u.apiFabrication?.length) {
    warnings.push(`${u.asset}: API returned pre-gate intel (${u.apiFabrication.join(', ')}) — client gating holds`)
  }
}

const failedAssets = allAssets.filter((a) => !a.pass)
const failedRoutes = allAssets.flatMap((a) =>
  (a.routes || [])
    .filter((r) => r.status === 500 || r.timedOut)
    .map((r) => ({ asset: a.asset, route: r.route, status: r.status, error: r.error })),
)

const { decision, hardFails } = computeDecision({
  health,
  known: allKnown,
  unknown: unknownResults,
  warnings,
})

const report = {
  sprint: 'P3.3 End-to-End API Validation',
  backendUrl: BASE,
  startedAt,
  completedAt: new Date().toISOString(),
  health: {
    route: 'GET /health',
    status: health.status,
    latencyMs: health.latencyMs,
    pass: health.pass,
  },
  summary: {
    decision,
    knownPass: `${allKnown.filter((a) => a.pass).length}/${allKnown.length}`,
    unknownPass: `${unknownResults.filter((a) => a.pass).length}/${unknownResults.length}`,
    routeCoverage: [...routeSet],
    averageLatencyMs: avgLatencyMs,
    hardFails,
    warningCount: warnings.length,
  },
  ethereum: ethResults,
  solana: solResults,
  unknown: unknownResults,
  failedAssets: failedAssets.map((a) => ({
    asset: a.asset,
    kind: a.kind,
    failures: a.failures,
    errors: a.errors,
  })),
  failedRoutes,
  warnings,
  recommendations: [],
}

if (decision === 'GO') {
  report.recommendations.push('All E2E API routes passed — proceed to public beta with manual UI screenshot sign-off.')
} else if (decision === 'GO WITH WARNINGS') {
  report.recommendations.push('API integrity holds; address warnings before broad public launch.')
  report.recommendations.push(...warnings.map((w) => `Warning: ${w}`))
} else {
  report.recommendations.push('Fix failed routes/assets before beta launch.')
  for (const f of failedAssets) {
    report.recommendations.push(`${f.asset}: ${f.failures.join(', ')}`)
  }
}

const outPath = join(ROOT, 'scripts', 'p33-api-validation-report.json')
writeFileSync(outPath, JSON.stringify(report, null, 2))

console.log('\n=== P3.3 API VALIDATION ===')
console.log('Health:', health.pass ? 'OK' : 'FAIL', `(${health.latencyMs}ms)`)
console.log('Known:', report.summary.knownPass)
console.log('Unknown:', report.summary.unknownPass)
console.log('Avg latency:', avgLatencyMs, 'ms')
console.log('Decision:', decision)
if (warnings.length) console.log('Warnings:', warnings.length)
if (failedAssets.length) console.log('Failed:', failedAssets.map((a) => a.asset).join(', '))
console.log('Report:', outPath)

process.exit(decision === 'NO-GO' ? 1 : 0)
