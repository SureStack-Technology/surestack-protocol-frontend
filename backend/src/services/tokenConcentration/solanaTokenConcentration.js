import { isMajorSolanaAsset, resolveSolanaArchetype } from '../solanaRiskScanner/solanaArchetypes.js'
import { safeProviderCall } from '../solanaRiskScanner/solanaProviderLog.js'
import { fetchTokenLargestAccounts } from '../solanaRiskScanner/solanaRpc.js'
import {
  fetchBirdeyeTokenCreation,
  fetchBirdeyeTokenHolders,
  fetchBirdeyeTokenOverview,
  holderMetricsFromBirdeyeHolders,
} from './birdeyeProvider.js'
import { fetchDexScreenerSolanaMarket } from './dexScreenerProvider.js'
import { fetchGoPlusTokenSecurity, parseGoPlusHolders } from './goPlusTokenProvider.js'
import { fetchJupiterRoutingSignal } from './jupiterProvider.js'
import { buildSolanaTokenConcentrationIntel } from './solanaTokenIntelBuilder.js'

/**
 * @param {string} mintAddress
 * @param {Array<{ uiAmount?: number, amount?: string }>} largestAccounts
 */
export function holderMetricsFromLargestAccounts(largestAccounts) {
  const rows = largestAccounts || []
  const amounts = rows.map((r) => Number(r.uiAmount || 0)).filter((n) => n > 0)
  const total = amounts.reduce((s, n) => s + n, 0)
  if (total <= 0) return null

  const top1 = (amounts[0] / total) * 100
  const top10Sample = (amounts.slice(0, 10).reduce((s, n) => s + n, 0) / total) * 100
  // RPC getTokenLargestAccounts returns only the top holder slice — top-10 of that sample is ~100% by definition.
  const incompleteHolderSample = rows.length > 0 && rows.length <= 12
  return {
    top1HolderPct: top1,
    top10HolderPct: incompleteHolderSample ? null : top10Sample,
    top10SamplePct: top10Sample,
    incompleteHolderSample,
    top5HolderPct: (amounts.slice(0, 5).reduce((s, n) => s + n, 0) / total) * 100,
    estimate: true,
  }
}

const JUPITER_FALLBACK = {
  classification: 'NOT_ROUTABLE',
  confidence: 'LOW',
  routable: false,
  source: 'JUPITER',
}

/**
 * @param {string} mintAddress
 */
async function fetchOptionalBirdeye(mintAddress) {
  if (!process.env.BIRDEYE_API_KEY) {
    return { overview: null, holders: null, creation: null }
  }
  const [overviewR, holdersR, creationR] = await Promise.all([
    safeProviderCall(mintAddress, 'Birdeye', () => fetchBirdeyeTokenOverview(mintAddress), (d) =>
      d ? 'overview' : 'null',
    ),
    safeProviderCall(mintAddress, 'Birdeye', () => fetchBirdeyeTokenHolders(mintAddress, 20), (d) =>
      Array.isArray(d) ? `holders[${d.length}]` : 'null',
    ),
    safeProviderCall(mintAddress, 'Birdeye', () => fetchBirdeyeTokenCreation(mintAddress), (d) =>
      d ? 'creation' : 'null',
    ),
  ])
  return {
    overview: overviewR.ok ? overviewR.data : null,
    holders: holdersR.ok ? holdersR.data : null,
    creation: creationR.ok ? creationR.data : null,
  }
}

/**
 * @param {string} mintAddress
 * @param {Array<{ uiAmount?: number }> | null} largestAccounts
 */
export async function analyzeSolanaTokenConcentration(mintAddress, largestAccounts = null) {
  const archetype = resolveSolanaArchetype(mintAddress)
  const isCanonical = Boolean(archetype?.regulatedStablecoin || archetype?.kind === 'canonical_mint')
  const isMajorAsset = isMajorSolanaAsset(archetype)

  const dexR = await safeProviderCall(
    mintAddress,
    'DexScreener',
    () => fetchDexScreenerSolanaMarket(mintAddress),
    (d) => d?.status || 'null',
  )
  const dexMarketPre = dexR.ok ? dexR.data : null
  const birdeyePre = await fetchOptionalBirdeye(mintAddress)
  const tokenDecimals =
    dexMarketPre?.primaryPool?.baseToken?.decimals ??
    birdeyePre.overview?.decimals ??
    null

  const jupiterR = await safeProviderCall(
    mintAddress,
    'Jupiter',
    () => fetchJupiterRoutingSignal(mintAddress, { decimals: tokenDecimals ?? 6 }),
    (d) => d?.classification || 'null',
  )
  const goPlusR = await safeProviderCall(
    mintAddress,
    'GoPlus',
    () => fetchGoPlusTokenSecurity(mintAddress, 'solana'),
    (d) => (d ? 'token_security' : 'null'),
  )

  let rpcLargest = largestAccounts
  if (!rpcLargest) {
    const rpcR = await safeProviderCall(
      mintAddress,
      'Solana RPC',
      () => fetchTokenLargestAccounts(mintAddress),
      (d) => (Array.isArray(d) ? `largest[${d.length}]` : 'null'),
    )
    rpcLargest = rpcR.ok ? rpcR.data : []
  }

  const birdeye = birdeyePre

  const dexMarket = dexR.ok
    ? dexR.data
    : { status: 'error', source: 'DEXSCREENER' }
  const jupiter = jupiterR.ok ? jupiterR.data : { ...JUPITER_FALLBACK }
  const goPlusRow = goPlusR.ok ? goPlusR.data : null

  const goPlusParsed = parseGoPlusHolders(goPlusRow)
  const rpcMetrics = holderMetricsFromLargestAccounts(rpcLargest)

  let holderMetrics = null
  let holderProvenance = null

  if (birdeye.holders?.length) {
    const birdeyeMetrics = holderMetricsFromBirdeyeHolders(
      birdeye.holders,
      birdeye.overview?.totalSupply ?? null,
    )
    if (birdeyeMetrics) {
      holderMetrics = birdeyeMetrics
      holderProvenance = 'BIRDEYE'
    }
  }

  if (goPlusParsed?.top10HolderPct != null) {
    holderMetrics = goPlusParsed
    holderProvenance = 'GOPLUS'
  } else if (!holderMetrics && rpcMetrics) {
    holderMetrics = rpcMetrics
    holderProvenance = 'RPC ESTIMATE'
  }

  const holderCount = birdeye.overview?.holderCount ?? goPlusParsed?.holderCount ?? null

  if (birdeye.overview && dexMarket.status === 'indexed') {
    if (dexMarket.volume24hUsd == null || dexMarket.volume24hUsd === 0) {
      dexMarket.volume24hUsd = birdeye.overview.volume24hUsd ?? dexMarket.volume24hUsd
    }
    if (dexMarket.marketCapUsd == null) {
      dexMarket.marketCapUsd = birdeye.overview.marketCapUsd ?? null
    }
    if (dexMarket.fdvUsd == null) {
      dexMarket.fdvUsd = birdeye.overview.fdvUsd ?? birdeye.overview.marketCapUsd ?? null
    }
    if (dexMarket.totalLiquidityUsd == null || dexMarket.totalLiquidityUsd === 0) {
      dexMarket.totalLiquidityUsd = birdeye.overview.liquidityUsd ?? dexMarket.totalLiquidityUsd
    }
  }

  if (birdeye.creation?.blockUnixTime && !dexMarket.pairCreatedAt) {
    dexMarket.pairCreatedAt = birdeye.creation.blockUnixTime
  }

  if (dexMarket.dexIds?.length) {
    for (const id of dexMarket.dexIds) {
      if (/raydium/i.test(id) && jupiter.venues) {
        jupiter.venues = [...new Set([...jupiter.venues, 'Raydium'])]
      }
    }
  }

  const providerStatus = {
    dexscreener: dexR.ok && dexMarket.status !== 'error',
    jupiter: jupiterR.ok,
    goplus: Boolean(goPlusParsed),
    rpc: holderProvenance === 'RPC ESTIMATE',
    birdeye: Boolean(birdeye.overview || birdeye.holders),
  }

  return buildSolanaTokenConcentrationIntel({
    holderMetrics,
    holderProvenance,
    holderCount,
    dexMarket,
    routing: jupiter,
    goPlusParsed,
    isCanonical,
    isMajorAsset,
    providerStatus,
    birdeyeOverview: birdeye.overview,
  })
}
