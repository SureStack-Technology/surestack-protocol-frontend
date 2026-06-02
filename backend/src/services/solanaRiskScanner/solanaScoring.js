import { solanaTrustBandFromScore } from './solanaTypes.js'

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * @param {import('./solanaArchetypes.js').SolanaArchetype | null} archetype
 * @param {object} raw
 */
function isRegulatedStablecoin(archetype) {
  return Boolean(archetype?.regulatedStablecoin)
}

function applyArchetypeFloor(raw, archetype) {
  if (!archetype) return raw
  const score = clamp(Math.max(raw.trustScore, archetype.scoreFloor), archetype.scoreFloor, archetype.scoreCeiling)
  return {
    ...raw,
    trustScore: score,
    trustBand: solanaTrustBandFromScore(score),
    archetypeId: archetype.id,
    archetypeLabel: archetype.label,
    regulatedStablecoin: isRegulatedStablecoin(archetype),
    interpretationSummary: archetype.narrativeHint,
  }
}

/**
 * @param {object} ctx
 */
export function scoreSolanaTokenMint(ctx) {
  const {
    address,
    mint,
    largestAccounts,
    archetype,
    metadataPresent,
    signatureCount,
  } = ctx

  const findings = []
  let score = 70

  const mintAuthority = mint.mintAuthority
  const freezeAuthority = mint.freezeAuthority
  const supply = mint.supply
  const decimals = mint.decimals

  const regulated = isRegulatedStablecoin(archetype)

  if (mintAuthority) {
    score -= regulated ? 5 : 14
    findings.push(
      regulated
        ? {
            code: 'MINT_AUTHORITY_ACTIVE',
            severity: 'INFO',
            title: 'Issuer mint control active',
            detail:
              'Supply can be expanded by the issuer; typical for regulated stablecoins, but relevant for custody and concentration review.',
          }
        : {
            code: 'MINT_AUTHORITY_ACTIVE',
            severity: 'WATCH',
            title: 'Mint authority active',
            detail: 'Supply can still be inflated by the mint authority holder.',
          },
    )
  } else {
    score += 6
    findings.push({
      code: 'MINT_AUTHORITY_REVOKED',
      severity: 'INFO',
      title: 'Mint authority revoked',
      detail: 'Fixed supply posture — mint authority is not set.',
    })
  }

  if (freezeAuthority) {
    score -= regulated ? 4 : 10
    findings.push(
      regulated
        ? {
            code: 'FREEZE_AUTHORITY_ACTIVE',
            severity: 'INFO',
            title: 'Issuer freeze control active',
            detail:
              'Accounts may be frozen by issuer controls; expected for regulated stablecoins, but relevant for counterparty and custody risk.',
          }
        : {
            code: 'FREEZE_AUTHORITY_ACTIVE',
            severity: 'WATCH',
            title: 'Freeze authority active',
            detail: 'Accounts holding this token may be frozen by the freeze authority.',
          },
    )
  } else {
    score += 3
  }

  const establishedMint = signatureCount > 100 || Boolean(archetype?.majorAsset)

  const holders = largestAccounts || []
  const totalUi = holders.reduce((sum, h) => sum + Number(h.uiAmount || 0), 0)
  const topUi = holders[0] ? Number(holders[0].uiAmount || 0) : 0
  const topPct = totalUi > 0 ? (topUi / totalUi) * 100 : 0

  let holderConcentration = 'NOT_AVAILABLE'
  if (holders.length > 0) {
    if (topPct >= 55) {
      holderConcentration = 'CONCENTRATED'
      score -= 12
      findings.push({
        code: 'CONCENTRATED_HOLDERS',
        severity: 'WATCH',
        title: 'Concentrated holder set',
        detail: `Largest holder represents ~${Math.round(topPct)}% of sampled supply.`,
      })
    } else if (holders.length >= 8) {
      holderConcentration = 'DISPERSED'
      score += 4
    } else if (!establishedMint) {
      holderConcentration = 'LOW_COUNT'
      score -= 4
      findings.push({
        code: 'LOW_HOLDER_COUNT',
        severity: 'INFO',
        title: 'Limited holder sample',
        detail: 'RPC holder sample is small — market providers may supply fuller distribution.',
      })
    }
  }

  if (!metadataPresent && !establishedMint) {
    score -= 4
    findings.push({
      code: 'METADATA_MISSING',
      severity: 'INFO',
      title: 'Token metadata not resolved',
      detail: 'Name/symbol metadata unavailable from RPC — verify token identity manually.',
    })
  } else if (metadataPresent) {
    score += 2
  }

  if (signatureCount < 5 && !archetype?.majorAsset) {
    score -= 6
    findings.push({
      code: 'NEW_MINT_SIGNAL',
      severity: 'WATCH',
      title: 'Limited on-chain history',
      detail: 'Mint shows little recent activity — may be newly created.',
    })
  } else if (signatureCount > 100) {
    score += 4
  }

  if (archetype) score += 8

  const trustScore = clamp(Math.round(score), 0, 100)
  const trustBand = solanaTrustBandFromScore(trustScore)

  const raw = {
    chain: 'solana',
    addressType: 'SPL_TOKEN_MINT',
    address,
    trustScore,
    trustBand,
    isScorable: true,
    mintAuthority: mintAuthority ? String(mintAuthority) : null,
    freezeAuthority: freezeAuthority ? String(freezeAuthority) : null,
    supply,
    decimals,
    metadataPresent,
    holderConcentration,
    liquiditySignals: archetype ? 'Established market liquidity profile (heuristic)' : 'Liquidity not fully indexed — confirm on DEX',
    tokenProgram: mint.tokenProgram,
    regulatedStablecoin: regulated,
    findings,
    interpretationSummary: buildTokenSummary({ trustBand, mintAuthority, freezeAuthority, archetype, regulated }),
    scanTarget: 'token_mint',
  }

  return applyArchetypeFloor(raw, archetype)
}

/**
 * @param {object} ctx
 */
export function scoreSolanaProgram(ctx) {
  const { address, account, archetype, signatureCount, upgradeable } = ctx
  const findings = []
  let score = 68

  if (!account?.executable) {
    score -= 20
    findings.push({
      code: 'NOT_EXECUTABLE',
      severity: 'HIGH',
      title: 'Not an executable program',
      detail: 'Account is not marked executable — may not be a deployable program.',
    })
  } else {
    score += 4
  }

  if (upgradeable) {
    score -= 8
    findings.push({
      code: 'UPGRADEABLE_PROGRAM',
      severity: 'WATCH',
      title: 'Upgradeable program loader',
      detail: 'Program uses an upgradeable loader — implementation may change via upgrade authority.',
    })
  }

  if (signatureCount < 10) {
    score -= 10
    findings.push({
      code: 'RECENT_DEPLOYMENT',
      severity: 'WATCH',
      title: 'Limited program history',
      detail: 'Few recent transactions — program may be newly deployed or low-activity.',
    })
  } else if (signatureCount > 500) {
    score += 8
  }

  if (archetype) score += 10

  const trustScore = clamp(Math.round(score), 0, 100)
  const trustBand = solanaTrustBandFromScore(trustScore)

  const raw = {
    chain: 'solana',
    addressType: 'PROGRAM',
    address,
    trustScore,
    trustBand,
    isScorable: true,
    executable: Boolean(account?.executable),
    upgradeable,
    programOwner: account?.owner || null,
    programReputation: archetype ? archetype.label : 'Unknown or unclassified program',
    deploymentSignals:
      signatureCount < 10
        ? 'Recently deployed or dormant program surface'
        : signatureCount > 500
          ? 'Extensive on-chain usage'
          : 'Moderate on-chain activity',
    findings,
    interpretationSummary: buildProgramSummary({ trustBand, archetype, upgradeable }),
    scanTarget: 'program',
  }

  return applyArchetypeFloor(raw, archetype)
}

/**
 * @param {object} ctx
 */
export function scoreSolanaWallet(ctx) {
  const { address, account, signatureCount } = ctx

  return {
    chain: 'solana',
    addressType: 'WALLET',
    address,
    trustScore: null,
    trustBand: null,
    isScorable: false,
    executable: Boolean(account?.executable),
    lamports: account?.lamports ?? null,
    findings: [
      {
        code: 'SOLANA_WALLET',
        severity: 'INFO',
        title: 'Solana wallet account',
        detail: 'No SPL mint or executable program at this address — use wallet-level intelligence for exposure review.',
      },
    ],
    interpretationSummary:
      'This is a Solana wallet (system) account, not an SPL token mint or on-chain program. Contract-style trust scoring does not apply — review signing context and counterparties before transacting.',
    scanTarget: 'wallet',
    accountActivity:
      signatureCount > 0 ? 'Active wallet with recent on-chain signatures' : 'Low recent signature activity',
  }
}

function buildTokenSummary({ trustBand, mintAuthority, freezeAuthority, archetype, regulated }) {
  if (archetype?.narrativeHint) return archetype.narrativeHint
  if (regulated && (mintAuthority || freezeAuthority)) {
    return 'Regulated stablecoin mint with issuer mint/freeze controls — standard for institutional stablecoins; review custody and concentration.'
  }
  if (trustBand === 'TRUSTED' && !mintAuthority && !freezeAuthority) {
    return 'SPL token mint with revoked mint and freeze authorities — favorable fixed-supply posture.'
  }
  if (mintAuthority && freezeAuthority) {
    return 'Elevated risk: both mint and freeze authorities are active — supply and transfers can be controlled.'
  }
  if (mintAuthority) {
    return 'Moderate risk: mint authority is active — verify supply caps before holding or approving.'
  }
  return 'Review mint and freeze authorities, holder concentration, and metadata before interacting with this token.'
}

function buildProgramSummary({ trustBand, archetype, upgradeable }) {
  if (archetype?.narrativeHint) return archetype.narrativeHint
  if (trustBand === 'TRUSTED') {
    return upgradeable
      ? 'Known upgradeable Solana program — review upgrade authority before high-value interactions.'
      : 'Recognized Solana program with favorable reputation signals.'
  }
  return 'Unknown or lightly used executable program — manual verification recommended before signing.'
}
