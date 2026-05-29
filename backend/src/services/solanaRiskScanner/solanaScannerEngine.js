import { applyConfidenceCalibration } from '../scannerConfidence/scannerConfidenceEngine.js'
import { analyzeSolanaTokenConcentration } from '../tokenConcentration/solanaTokenConcentration.js'
import { mergeTokenConcentrationIntoCore } from '../tokenConcentration/tokenConcentrationScoring.js'
import { resolveSolanaArchetype } from './solanaArchetypes.js'
import { hasSolanaMarketIntel, logSolanaProvider } from './solanaProviderLog.js'
import {
  fetchRecentSignatureCount,
  fetchTokenLargestAccounts,
  tryFetchSolanaAccountParsed,
} from './solanaRpc.js'
import { scoreSolanaProgram, scoreSolanaTokenMint, scoreSolanaWallet } from './solanaScoring.js'
import {
  BPF_LOADER,
  BPF_UPGRADEABLE_LOADER,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from './solanaTypes.js'

/**
 * @param {string} address
 * @param {object} concentration
 * @param {{ rpcUnavailable?: boolean }} opts
 */
function buildMarketOnlyMintReport(address, concentration, opts = {}) {
  const archetype = resolveSolanaArchetype(address)
  let core = {
    chain: 'solana',
    addressType: 'SPL_TOKEN_MINT',
    address,
    trustScore: 48,
    trustBand: 'MODERATE',
    isScorable: true,
    partialMarketScan: true,
    rpcUnavailable: Boolean(opts.rpcUnavailable),
    mintAuthority: null,
    freezeAuthority: null,
    supply: null,
    decimals: null,
    metadataPresent: Boolean(archetype),
    holderConcentration: 'NOT_AVAILABLE',
    archetypeId: archetype?.id,
    archetypeLabel: archetype?.label,
    findings: [
      {
        code: 'RPC_UNAVAILABLE',
        severity: 'INFO',
        title: 'On-chain RPC unavailable',
        detail:
          'Mint authority, freeze authority, and supply could not be loaded from RPC. Market intelligence uses DexScreener and Jupiter.',
      },
    ],
    interpretationSummary:
      'LIMITED MARKET INTELLIGENCE. No full on-chain mint data available from current RPC sources. Market signals from DexScreener and Jupiter where available.',
  }

  core = mergeTokenConcentrationIntoCore(core, concentration, {
    isSolana: true,
    isCanonical: Boolean(archetype?.kind === 'canonical_mint'),
  })

  if (!core.verdictActionFrame) {
    core.verdictActionFrame = 'LIMITED MARKET INTELLIGENCE'
  }

  return core
}

/**
 * @param {string} address
 */
async function tryMarketOnlyMintScan(address) {
  try {
    const concentration = await analyzeSolanaTokenConcentration(address, [])
    if (!hasSolanaMarketIntel(concentration) && !concentration?.available) {
      logSolanaProvider({
        mint: address,
        provider: 'market_fallback',
        status: 'empty',
        response_shape: 'no_market_intel',
      })
      return null
    }
    logSolanaProvider({
      mint: address,
      provider: 'market_fallback',
      status: 'ok',
      response_shape: 'partial_mint_from_market_apis',
    })
    return buildMarketOnlyMintReport(address, concentration, { rpcUnavailable: true })
  } catch (e) {
    logSolanaProvider({
      mint: address,
      provider: 'market_fallback',
      status: 'error',
      error_code: 'market_fallback_failed',
      error_message: e?.message,
    })
    return null
  }
}

/**
 * @param {string} address
 */
export async function analyzeSolanaRisk(address) {
  const rpcResult = await tryFetchSolanaAccountParsed(address)

  logSolanaProvider({
    mint: address,
    provider: 'Solana RPC',
    status: rpcResult.ok ? (rpcResult.data ? 'ok' : 'empty') : 'error',
    error_code: rpcResult.ok ? null : rpcResult.error_code,
    error_message: rpcResult.ok ? null : rpcResult.error_message,
    response_shape: rpcResult.ok
      ? rpcResult.data
        ? `account{owner:${rpcResult.data.owner?.slice(0, 8)}…}`
        : 'null_account'
      : 'rpc_unavailable',
  })

  const account = rpcResult.ok ? rpcResult.data : null
  const rpcUnavailable = !rpcResult.ok

  if (!account) {
    const marketCore = await tryMarketOnlyMintScan(address)
    if (marketCore) {
      return wrapSuccess(marketCore)
    }

    if (!rpcUnavailable) {
      return {
        success: false,
        error: 'address_not_found',
        message: 'Address not found on Solana — verify the address and network.',
      }
    }

    return {
      success: false,
      error: 'all_providers_failed',
      message:
        'Limited market intelligence — no data returned from DexScreener, Jupiter, or Solana RPC for this mint.',
    }
  }

  const archetype = resolveSolanaArchetype(address)
  const owner = account.owner
  const parsed = account.data?.parsed
  const parsedType = parsed?.type
  const info = parsed?.info || {}

  const signatureCount = await fetchRecentSignatureCount(address, 30)

  if (
    (owner === TOKEN_PROGRAM_ID || owner === TOKEN_2022_PROGRAM_ID) &&
    parsedType === 'mint'
  ) {
    const largestAccounts = await fetchTokenLargestAccounts(address)
    let core = scoreSolanaTokenMint({
      address,
      mint: {
        mintAuthority: info.mintAuthority ?? null,
        freezeAuthority: info.freezeAuthority ?? null,
        supply: info.supply ?? null,
        decimals: info.decimals ?? null,
        tokenProgram: owner,
      },
      largestAccounts,
      archetype: archetype?.kind === 'canonical_mint' ? archetype : null,
      metadataPresent: Boolean(archetype) || Boolean(info.name || info.symbol),
      signatureCount,
    })

    try {
      const concentration = await analyzeSolanaTokenConcentration(address, largestAccounts)
      core = mergeTokenConcentrationIntoCore(core, concentration, {
        isSolana: true,
        isCanonical: Boolean(archetype?.kind === 'canonical_mint'),
      })
    } catch (e) {
      console.warn('[solanaScanner] token concentration skipped', e?.message || e)
      if (rpcUnavailable) {
        core.partialMarketScan = true
        core.verdictActionFrame = core.verdictActionFrame || 'LIMITED MARKET INTELLIGENCE'
      }
    }

    if (rpcUnavailable) {
      core.rpcUnavailable = true
      core.findings = [
        ...(core.findings || []),
        {
          code: 'RPC_DEGRADED',
          severity: 'INFO',
          title: 'RPC degraded during scan',
          detail: 'Holder estimates from RPC may be unavailable; market APIs used where possible.',
        },
      ]
    }

    return wrapSuccess(core)
  }

  if (account.executable) {
    const upgradeable =
      owner === BPF_UPGRADEABLE_LOADER || owner === BPF_LOADER
    const core = scoreSolanaProgram({
      address,
      account: {
        executable: account.executable,
        owner,
        lamports: account.lamports,
      },
      archetype: archetype?.kind === 'canonical_program' ? archetype : null,
      signatureCount,
      upgradeable,
    })
    return wrapSuccess(core)
  }

  if (
    (owner === TOKEN_PROGRAM_ID || owner === TOKEN_2022_PROGRAM_ID) &&
    parsedType === 'account'
  ) {
    return {
      success: true,
      product: 'surestack_solana_risk_scanner',
      chain: 'solana',
      addressType: 'TOKEN_ACCOUNT',
      address,
      trustScore: null,
      trustBand: null,
      isScorable: false,
      interpretationSummary:
        'This address is an SPL token account (holder wallet), not the token mint. Paste the mint address to assess token-level risk.',
      findings: [
        {
          code: 'TOKEN_ACCOUNT_NOT_MINT',
          severity: 'INFO',
          title: 'SPL token account detected',
          detail: `Linked mint: ${info.mint || 'unknown'}`,
        },
      ],
      scanTarget: 'token_account',
      linkedMint: info.mint || null,
    }
  }

  const core = scoreSolanaWallet({
    address,
    account: {
      executable: account.executable,
      lamports: account.lamports,
      owner,
    },
    signatureCount,
  })

  return wrapSuccess(core)
}

function wrapSuccess(core) {
  const calibrated =
    core?.trustScore != null ? applyConfidenceCalibration({ ...core, chain: 'solana' }, 'solana') : core
  return {
    success: true,
    product: 'surestack_solana_risk_scanner',
    analyzedAt: new Date().toISOString(),
    ...calibrated,
  }
}
