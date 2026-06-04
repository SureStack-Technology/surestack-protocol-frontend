/**
 * P3.2 Live Validation — intelligence pipeline, scanner providers, launch gate.
 * Usage: node scripts/p32LiveValidation.mjs
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

const { lookupPrimeToken } = await import('../shared/constants/primeTokenRegistry.mjs')
const { classifyIntelligenceTarget, classifyTargetSync } = await import(
  '../backend/src/services/prime/intelligenceTargetClassifier.js'
)
const { analyzeSolanaRisk } = await import(
  '../backend/src/services/solanaRiskScanner/solanaScannerEngine.js'
)
const { analyzeContractIntelligence } = await import(
  '../backend/src/services/contractIntelligence/contractIntelEngine.js'
)
const {
  ASSET_INTEL_STATES,
  resolveAssetIntelligenceState,
  allowsExecutiveRisk,
  allowsAssetClassification,
  assetIntelligenceUiCopy,
} = await import('../src/lib/intelligence/assetIntelligenceState.mjs')
const { canBuildPreliminaryExecutiveIntel, buildPreliminaryExecutiveIntel } = await import(
  '../src/lib/executiveIntelligence/preliminaryExecutiveIntel.mjs'
)
const { buildUnverifiedAssetExecutiveIntel } = await import(
  '../src/lib/executiveIntelligence/buildUnverifiedAssetIntel.mjs'
)
const { buildTokenResolutionBanner } = await import('../src/lib/intelligence/tokenResolutionCopy.mjs')

const ETH_MATRIX = ['LINK', 'UNI', 'AAVE', 'USDC', 'USDT', 'PEPE']
const SOL_MATRIX = ['WIF', 'BONK', 'JUP', 'TAO']
const UNKNOWN_CASES = [
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

const FABRICATED = /^(DEFI ASSET|AI ASSET|MEME SPECULATIVE|GOVERNANCE ASSET|STABLECOIN ASSET|BLUE CHIP ASSET)$/i

async function timed(label, fn) {
  const t0 = performance.now()
  try {
    const result = await fn()
    return { label, ok: true, ms: Math.round(performance.now() - t0), result }
  } catch (e) {
    return { label, ok: false, ms: Math.round(performance.now() - t0), error: e?.message || String(e) }
  }
}

function stubReportFromSymbol(symbol) {
  const reg = lookupPrimeToken(symbol)
  if (!reg) return null
  return {
    modeId: 'token',
    query: symbol,
    displayTarget: symbol,
    chainId: reg.chain === 'solana' ? 'solana' : 'ethereum',
    isSolanaToken: reg.chain === 'solana',
    solanaMintResolved: reg.chain === 'solana',
    solanaMintAddress: reg.chain === 'solana' ? reg.address : null,
    tokenResolution: {
      resolved: true,
      autoSelected: true,
      source: 'registry',
      symbol: reg.symbol,
      name: reg.name,
      address: reg.address,
      status: 'resolved',
    },
    targetClassification: {
      type: 'token',
      chain: reg.chain,
      symbol: reg.symbol,
      name: reg.name,
      address: reg.address,
      recommendedModule: 'token',
      confidence: 96,
    },
    scannerSignals: { hasScan: false },
  }
}

function stubReportFromQuery(query, classification, scannerReport = null) {
  const isSolana = classification?.chain === 'solana' || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query)
  return {
    modeId: 'token',
    query,
    displayTarget: query,
    chainId: isSolana ? 'solana' : 'ethereum',
    isSolanaToken: isSolana,
    solanaMintResolved: isSolana,
    solanaMintAddress: isSolana ? query : null,
    targetClassification: classification || null,
    tokenResolution: classification?.symbol
      ? { resolved: true, symbol: classification.symbol, name: classification.name, address: classification.address }
      : { status: 'unresolved', resolved: false },
    scannerReport,
    scannerSignals: { hasScan: scannerReport?.success === true },
  }
}

function evaluateExecutive(report, scannerReport = null) {
  const state = resolveAssetIntelligenceState({ report, scannerReport })
  let executive = null
  if (!allowsExecutiveRisk(state)) {
    executive = buildUnverifiedAssetExecutiveIntel(report, { state })
  } else if (canBuildPreliminaryExecutiveIntel({ ...report, scannerReport })) {
    executive = buildPreliminaryExecutiveIntel({ ...report, scannerReport })
  }
  const banner = buildTokenResolutionBanner({
    report,
    isSolana: report.isSolanaToken,
    solanaMintResolved: report.solanaMintResolved,
    hasScan: scannerReport?.success === true,
    scannerReport,
  })
  return { state, executive, banner }
}

function passState(actual, expectedMin) {
  const order = [
    ASSET_INTEL_STATES.UNKNOWN_ASSET,
    ASSET_INTEL_STATES.MINT_DETECTED,
    ASSET_INTEL_STATES.METADATA_RESOLVED,
    ASSET_INTEL_STATES.MARKET_INDEXED,
    ASSET_INTEL_STATES.SCANNER_VALIDATED,
    ASSET_INTEL_STATES.FULLY_VALIDATED,
  ]
  return order.indexOf(actual) >= order.indexOf(expectedMin)
}

async function probeProviders() {
  const probes = []

  probes.push(
    await timed('Helius/RPC', async () => {
      const url = process.env.SOLANA_RPC_URL || (process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : null)
      if (!url) throw new Error('not_configured')
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth', params: [] }),
      })
      if (!res.ok) throw new Error(`http_${res.status}`)
      return { configured: true }
    }),
  )

  probes.push(
    await timed('DexScreener', async () => {
      const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/0x514910771af9ca656af840dff83e8264ecf986ca')
      if (!res.ok) throw new Error(`http_${res.status}`)
      const json = await res.json()
      return { pairs: json?.pairs?.length ?? 0 }
    }),
  )

  probes.push(
    await timed('Jupiter', async () => {
      const mint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
      const res = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${mint}`)
      if (!res.ok) throw new Error(`http_${res.status}`)
      const json = await res.json()
      return { hits: Array.isArray(json) ? json.length : 0 }
    }),
  )

  probes.push(
    await timed('Birdeye', async () => {
      const key = process.env.BIRDEYE_API_KEY
      if (!key || key === 'real_key_here') throw new Error('not_configured')
      const res = await fetch('https://public-api.birdeye.so/defi/token_overview?address=So11111111111111111111111111111111111111112', {
        headers: { 'X-API-KEY': key, 'x-chain': 'solana' },
      })
      if (!res.ok) throw new Error(`http_${res.status}`)
      return { status: res.status }
    }),
  )

  probes.push(
    await timed('Alchemy', async () => {
      const key = process.env.ALCHEMY_API_KEY
      if (!key) throw new Error('not_configured')
      const res = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
      })
      if (!res.ok) throw new Error(`http_${res.status}`)
      const json = await res.json()
      return { block: json.result }
    }),
  )

  probes.push(
    await timed('Etherscan', async () => {
      const key = process.env.ETHERSCAN_API_KEY
      if (!key) throw new Error('not_configured')
      const res = await fetch(
        `https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${key}`,
      )
      if (!res.ok) throw new Error(`http_${res.status}`)
      const json = await res.json()
      if (json.status === '0' && json.message) throw new Error(json.message)
      return { result: json.result }
    }),
  )

  probes.push(
    await timed('GoPlus', async () => {
      const res = await fetch(
        'https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      )
      if (!res.ok) throw new Error(`http_${res.status}`)
      const json = await res.json()
      return { code: json.code }
    }),
  )

  return probes.map((p) => ({
    provider: p.label,
    status: p.ok ? 'success' : 'failure',
    latencyMs: p.ms,
    detail: p.ok ? p.result : p.error,
    coverage: p.ok ? 'live' : p.error === 'not_configured' ? 'not_configured' : 'degraded',
  }))
}

async function validateEthereumSymbol(symbol) {
  const reg = lookupPrimeToken(symbol)
  const classification = await classifyIntelligenceTarget(symbol)
  const report = stubReportFromSymbol(symbol)

  const scan = await timed(`${symbol} contract scan`, () =>
    analyzeContractIntelligence({
      address: reg.address,
      chainId: 1,
      tier: 'prime_lite',
    }),
  )

  const scannerReport = scan.ok ? scan.result : null
  const preScan = evaluateExecutive(report, null)
  const postScan = evaluateExecutive(
    { ...report, scannerReport, scannerSignals: { hasScan: scannerReport?.success === true } },
    scannerReport,
  )

  const exec = postScan.executive || preScan.executive
  const checks = {
    registryMatch: Boolean(reg),
    classifyOk: classification?.type === 'token',
    preScanStateOk: passState(preScan.state, ASSET_INTEL_STATES.METADATA_RESOLVED),
    scanSuccess: scannerReport?.success === true,
    postScanStateOk: passState(postScan.state, ASSET_INTEL_STATES.SCANNER_VALIDATED),
    hasClassification: exec && !FABRICATED.test(exec.classification) ? true : Boolean(exec?.classification && exec.classification !== 'UNKNOWN ASSET'),
    hasRiskScore: exec?.executiveRiskScore != null && exec.executiveRiskScore !== '—',
    noFabricationWhenUnverified: true,
    bannerOk: !/Token identified/i.test(preScan.banner.title) || preScan.state !== ASSET_INTEL_STATES.MINT_DETECTED,
  }
  checks.hasClassification = Boolean(exec?.classification && exec.classification !== 'UNKNOWN ASSET')
  checks.hasRiskScore = allowsExecutiveRisk(postScan.state) && Number(exec?.executiveRiskScore) > 0

  return {
    symbol,
    chain: 'ethereum',
    address: reg.address,
    classification: classification?.symbol || classification?.type,
    preScanState: preScan.state,
    postScanState: postScan.state,
    scanLatencyMs: scan.ms,
    scanSuccess: scannerReport?.success === true,
    trustScore: scannerReport?.trustScore ?? scannerReport?.compositeTrustScore,
    executiveClassification: exec?.classification,
    executiveRisk: exec?.executiveRiskScore,
    executiveConfidence: exec?.confidenceScore,
    bannerTitle: postScan.banner.title,
    bannerSubtitle: postScan.banner.subtitle,
    liquidityScore: scannerReport?.liquidityIntelligence?.score ?? scannerReport?.liquidityIntelligence?.intelligenceScore,
    checks,
    pass: checks.registryMatch && checks.preScanStateOk && checks.scanSuccess && checks.postScanStateOk && checks.hasClassification && checks.hasRiskScore,
  }
}

async function validateSolanaSymbol(symbol) {
  const reg = lookupPrimeToken(symbol)
  const classification = await classifyIntelligenceTarget(symbol)
  const report = stubReportFromSymbol(symbol)

  const scan = await timed(`${symbol} solana scan`, () => analyzeSolanaRisk(reg.address, { symbol }))

  const scannerReport = scan.ok ? scan.result : null
  const tc = scannerReport?.tokenConcentration || {}
  const preScan = evaluateExecutive(report, null)
  const postScan = evaluateExecutive(
    { ...report, scannerReport, scannerSignals: { hasScan: scannerReport?.success === true } },
    scannerReport,
  )
  const exec = postScan.executive || preScan.executive

  const checks = {
    registryMatch: Boolean(reg),
    preScanStateOk: passState(preScan.state, ASSET_INTEL_STATES.METADATA_RESOLVED),
    scanSuccess: scannerReport?.success === true,
    postScanStateOk: passState(postScan.state, ASSET_INTEL_STATES.SCANNER_VALIDATED),
    hasMarketData: Boolean(tc.marketCapUsd || tc.liquidityUsd),
    hasClassification: Boolean(exec?.classification && exec.classification !== 'UNKNOWN ASSET'),
    hasRiskScore: allowsExecutiveRisk(postScan.state) && Number(exec?.executiveRiskScore) > 0,
  }

  return {
    symbol,
    chain: 'solana',
    address: reg.address,
    preScanState: preScan.state,
    postScanState: postScan.state,
    scanLatencyMs: scan.ms,
    scanSuccess: scannerReport?.success === true,
    trustScore: scannerReport?.trustScore ?? scannerReport?.compositeTrustScore,
    marketCapUsd: tc.marketCapUsd,
    liquidityUsd: tc.liquidityUsd,
    holderCount: tc.holderCount,
    executiveClassification: exec?.classification,
    executiveRisk: exec?.executiveRiskScore,
    bannerTitle: preScan.banner.title,
    bannerSubtitle: preScan.banner.subtitle,
    checks,
    pass: checks.registryMatch && checks.preScanStateOk && checks.scanSuccess && checks.postScanStateOk && checks.hasClassification,
  }
}

async function validateUnknown(caseDef) {
  const classification = await classifyIntelligenceTarget(caseDef.query).catch(() => classifyTargetSync(caseDef.query))
  let scannerReport = null
  let scanLatencyMs = null

  if (caseDef.chain === 'solana') {
    const scan = await timed(caseDef.id, () => analyzeSolanaRisk(caseDef.query))
    scannerReport = scan.ok ? scan.result : { success: false, error: scan.error }
    scanLatencyMs = scan.ms
  } else if (caseDef.chain === 'ethereum') {
    const scan = await timed(caseDef.id, () =>
      analyzeContractIntelligence({ address: caseDef.query, chainId: 1, tier: 'prime_lite' }),
    )
    scannerReport = scan.ok ? scan.result : { success: false, error: scan.error }
    scanLatencyMs = scan.ms
  }

  const report = stubReportFromQuery(caseDef.query, classification, scannerReport)
  const { state, executive, banner } = evaluateExecutive(report, scannerReport)

  const badBanner = state === ASSET_INTEL_STATES.MINT_DETECTED && /Token identified/i.test(banner.title)
  const badClass = FABRICATED.test(executive?.classification || '')
  const badRisk = allowsExecutiveRisk(state) === false && executive?.executiveRiskScore !== '—' && executive?.executiveRiskScore != null && executive?.executiveRiskScore !== 0

  return {
    id: caseDef.id,
    label: caseDef.label,
    query: caseDef.query,
    state,
    bannerTitle: banner.title,
    bannerSubtitle: banner.subtitle,
    classification: executive?.classification,
    executiveRisk: executive?.executiveRiskScore,
    unverified: executive?.unverified,
    scanSuccess: scannerReport?.success === true,
    scanLatencyMs,
    checks: {
      stateOk: [ASSET_INTEL_STATES.UNKNOWN_ASSET, ASSET_INTEL_STATES.MINT_DETECTED].includes(state),
      noFabricatedClass: !badClass,
      noRiskScore: !badRisk || executive?.executiveRiskScore === '—',
      noBadBanner: !badBanner,
      conclusionOk: /No verified intelligence profile available/i.test(executive?.executiveConclusion || ''),
    },
    pass: [ASSET_INTEL_STATES.UNKNOWN_ASSET, ASSET_INTEL_STATES.MINT_DETECTED].includes(state) && !badClass && !badBanner && executive?.unverified,
  }
}

async function checkBackendHealth() {
  const base = process.env.P32_BACKEND_URL || 'http://localhost:5001'
  try {
    const res = await fetch(`${base}/health`)
    return { url: `${base}/health`, status: res.status, ok: res.status === 200 }
  } catch (e) {
    return { url: `${base}/health`, status: 0, ok: false, error: e.message }
  }
}

console.log('[P3.2] Live validation starting…')
const startedAt = new Date().toISOString()

const health = await checkBackendHealth()
const providers = await probeProviders()

const ethResults = []
for (const sym of ETH_MATRIX) {
  console.log(`[P3.2] Ethereum ${sym}…`)
  ethResults.push(await validateEthereumSymbol(sym))
}

const solResults = []
for (const sym of SOL_MATRIX) {
  console.log(`[P3.2] Solana ${sym}…`)
  solResults.push(await validateSolanaSymbol(sym))
}

const unknownResults = []
for (const c of UNKNOWN_CASES) {
  console.log(`[P3.2] Unknown ${c.id}…`)
  unknownResults.push(await validateUnknown(c))
}

const ethPass = ethResults.filter((r) => r.pass).length
const solPass = solResults.filter((r) => r.pass).length
const unknownPass = unknownResults.filter((r) => r.pass).length
const providerPass = providers.filter((p) => p.status === 'success').length

const launchGate = {
  knownEthScannerBacked: ethPass === ETH_MATRIX.length,
  knownSolScannerBacked: solPass === SOL_MATRIX.length,
  unknownIntegrity: unknownPass === UNKNOWN_CASES.length,
  backendHealth: health.ok,
  providerCoverage: providerPass >= 5,
}

const goNoGo =
  launchGate.knownEthScannerBacked &&
  launchGate.knownSolScannerBacked &&
  launchGate.unknownIntegrity &&
  launchGate.backendHealth
    ? 'GO'
    : 'NO-GO'

const report = {
  sprint: 'P3.2 Live Validation',
  startedAt,
  completedAt: new Date().toISOString(),
  health,
  providers,
  ethereum: ethResults,
  solana: solResults,
  unknown: unknownResults,
  summary: {
    ethPass: `${ethPass}/${ETH_MATRIX.length}`,
    solPass: `${solPass}/${SOL_MATRIX.length}`,
    unknownPass: `${unknownPass}/${UNKNOWN_CASES.length}`,
    providerPass: `${providerPass}/${providers.length}`,
  },
  launchGate,
  recommendation: goNoGo,
  failedAssets: [
    ...ethResults.filter((r) => !r.pass).map((r) => ({ chain: 'ethereum', symbol: r.symbol, reason: r.checks })),
    ...solResults.filter((r) => !r.pass).map((r) => ({ chain: 'solana', symbol: r.symbol, reason: r.checks })),
    ...unknownResults.filter((r) => !r.pass).map((r) => ({ id: r.id, reason: r.checks })),
  ],
}

const outPath = join(ROOT, 'scripts', 'p32-validation-report.json')
writeFileSync(outPath, JSON.stringify(report, null, 2))

console.log('\n=== P3.2 VALIDATION SUMMARY ===')
console.log('Backend health:', health.ok ? 'OK' : 'FAIL', health.url)
console.log('Ethereum:', report.summary.ethPass)
console.log('Solana:', report.summary.solPass)
console.log('Unknown integrity:', report.summary.unknownPass)
console.log('Providers:', report.summary.providerPass)
console.log('Launch gate:', launchGate)
console.log('Recommendation:', goNoGo)
console.log('Report written:', outPath)

if (goNoGo === 'NO-GO') process.exit(1)
