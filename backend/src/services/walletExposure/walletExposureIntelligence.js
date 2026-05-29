import {
  dexSpenderLabel,
  isDexSpender,
  isNftMarketplace,
  isProtocolSpender,
  isStableToken,
  stableTokenSymbol,
} from './exposureCatalog.js'
import { buildExposureMetrics } from './walletExposureMetrics.js'

/**
 * @param {number} points
 * @param {number} [cap]
 */
function intensityToLevel(points, cap = 100) {
  if (!Number.isFinite(points) || points <= 0) return 0
  return Math.min(7, Math.max(0, Math.round((points / cap) * 7)))
}

/**
 * @param {string[]} symbols
 * @param {number} sharePct
 */
export function formatStablecoinBalanceReason(symbols, sharePct, { shareComputed = true } = {}) {
  const list = symbols.filter(Boolean)
  if (!list.length) return null
  const label = list.join(', ')
  const share = Number(sharePct)
  if (shareComputed && Number.isFinite(share) && share > 0) {
    return `Stable balances detected: ${label} (${share.toFixed(0)}% of sampled wallet value)`
  }
  if (!shareComputed || !Number.isFinite(share) || share <= 0) {
    return `Stable balances detected: ${label}. Value share unavailable.`
  }
  return `Stable balances detected: ${label} (${share.toFixed(0)}% of sampled wallet value)`
}

/**
 * @param {number} points
 * @param {boolean} activity
 * @param {number} [cap]
 */
function bandLevel(points, activity, cap = 100) {
  const level = intensityToLevel(points, cap)
  if (level === 0 && activity) return 1
  return level
}

/**
 * @param {object} signals
 * @param {object[]} [approvalRows]
 */
export function computeWalletExposureIntelligence(signals, approvalRows = []) {
  if (!signals?.providerLive) {
    return {
      provenance: 'PROVIDER_PENDING',
      subtitle: 'Exposure bands pending — wallet providers unavailable.',
      sources: [],
      bands: [],
    }
  }

  const m = buildExposureMetrics(signals, approvalRows)
  const rows = approvalRows.length ? approvalRows : signals?.approvalInventoryRows || []

  const dexApprovals = rows.filter((r) => isDexSpender(r.spender, r.spenderCategory))
  const stableApprovals = rows.filter((r) => isStableToken(r.token))
  const unknownApprovals = rows.filter((r) => r.spenderCategory === 'UNKNOWN_SPENDER')
  const protocolApprovals = rows.filter((r) => isProtocolSpender(r.spender))
  const unlimitedUnknown = rows.filter(
    (r) => r.unlimited && r.spenderCategory === 'UNKNOWN_SPENDER',
  ).length

  const reasons = { dex: [], stable: [], nft: [], unknown: [], protocol: [] }

  let dexPoints = 0
  const dexActivity =
    m.dexApprovalCount > 0 || m.dexInteractionCount > 0 || m.probeDexApproval > 0
  if (m.dexApprovalCount > 0) {
    dexPoints += m.dexApprovalCount * 16
    reasons.dex.push(`${m.dexApprovalCount} active DEX/router approval${m.dexApprovalCount === 1 ? '' : 's'}`)
  }
  if (m.dexInteractionCount > 0) {
    dexPoints += Math.min(40, m.dexInteractionCount * 10)
    reasons.dex.push(
      `${m.dexInteractionCount} DEX-related interaction${m.dexInteractionCount === 1 ? '' : 's'} in sampled history`,
    )
  }
  if (m.probeDexApproval > 0) {
    dexPoints += 14
    reasons.dex.push('Swap router allowance detected on canonical probe tokens')
  }
  const dexLabels = [...new Set(dexApprovals.map((r) => dexSpenderLabel(r.spender)).filter(Boolean))]
  if (dexLabels.length) reasons.dex.push(`Routers: ${dexLabels.slice(0, 4).join(', ')}`)

  let stablePoints = 0
  const stableActivity =
    m.stablecoinBalanceCount > 0 ||
    m.stableSharePct > 0 ||
    m.stableApprovalCount > 0 ||
    m.stableTransferCount > 0
  if (m.stableSharePct > 0) {
    stablePoints += m.stableSharePct * 0.9
  }
  if (m.stablecoinBalanceCount > 0 || m.stableSymbolsHeld.length > 0) {
    stablePoints += Math.max(m.stablecoinBalanceCount, m.stableSymbolsHeld.length) * 12
    const balanceReason = formatStablecoinBalanceReason(m.stableSymbolsHeld, m.stableSharePct, {
      shareComputed: Boolean(m.stableShareComputed),
    })
    if (balanceReason) reasons.stable.push(balanceReason)
    else {
      reasons.stable.push(
        `${m.stablecoinBalanceCount} stablecoin token${m.stablecoinBalanceCount === 1 ? '' : 's'} present`,
      )
    }
  } else if (m.stableTransferCount > 0) {
    stablePoints += Math.min(35, m.stableTransferCount * 12)
    reasons.stable.push(`${m.stableTransferCount} stablecoin transfer${m.stableTransferCount === 1 ? '' : 's'} in sampled window`)
  }
  if (m.stableApprovalCount > 0) {
    stablePoints += m.stableApprovalCount * 11
    const syms = [...new Set(stableApprovals.map((r) => stableTokenSymbol(r.token)).filter(Boolean))]
    reasons.stable.push(
      `${m.stableApprovalCount} stablecoin approval${m.stableApprovalCount === 1 ? '' : 's'}${syms.length ? ` (${syms.join(', ')})` : ''}`,
    )
  }

  let nftPoints = 0
  const nftActivity =
    m.nftHoldingsCount > 0 ||
    m.nftTransferCount > 0 ||
    m.erc1155TransferCount > 0 ||
    m.nftMarketplaceInteractions > 0 ||
    m.nftApprovalCount > 0
  if (m.nftHoldingsCount > 0) {
    nftPoints += Math.min(50, m.nftHoldingsCount * 9)
    reasons.nft.push(
      `${m.nftHoldingsCount} NFT${m.nftHoldingsCount === 1 ? '' : 's'} held${m.nftCollectionCount > 0 ? ` across ${m.nftCollectionCount} collection${m.nftCollectionCount === 1 ? '' : 's'}` : ''}`,
    )
  }
  if (m.nftTransferCount > 0) {
    nftPoints += Math.min(32, m.nftTransferCount * 11)
    reasons.nft.push(`${m.nftTransferCount} ERC-721 transfer${m.nftTransferCount === 1 ? '' : 's'} in sampled window`)
  }
  if (m.erc1155TransferCount > 0) {
    nftPoints += Math.min(28, m.erc1155TransferCount * 13)
    reasons.nft.push(`${m.erc1155TransferCount} ERC-1155 transfer${m.erc1155TransferCount === 1 ? '' : 's'} in sampled window`)
  }
  if (m.nftMarketplaceInteractions > 0) {
    nftPoints += m.nftMarketplaceInteractions * 15
    reasons.nft.push(`${m.nftMarketplaceInteractions} NFT marketplace interaction${m.nftMarketplaceInteractions === 1 ? '' : 's'}`)
  }
  if (m.nftApprovalCount > 0) {
    nftPoints += m.nftApprovalCount * 12
    reasons.nft.push(`${m.nftApprovalCount} NFT marketplace approval${m.nftApprovalCount === 1 ? '' : 's'}`)
  }
  if (!nftActivity && m.hasNftScan) {
    reasons.nft.push('No NFT holdings or marketplace activity in sampled providers')
  }

  let unknownPoints = 0
  const unknownActivity = m.unknownSpenderCount > 0 || m.unlimitedUnknownCount > 0
  if (m.unknownSpenderCount > 0) {
    unknownPoints += m.unknownSpenderCount * 14
    reasons.unknown.push(`${m.unknownSpenderCount} approval${m.unknownSpenderCount === 1 ? '' : 's'} to unknown spenders`)
  }
  if (m.unlimitedUnknownCount > 0) {
    unknownPoints += m.unlimitedUnknownCount * 24
    reasons.unknown.push(
      `${m.unlimitedUnknownCount} unlimited approval${m.unlimitedUnknownCount === 1 ? '' : 's'} to unknown contracts`,
    )
  }
  if (m.staleFiniteUnknownApprovalCount > 0) {
    unknownPoints += m.staleFiniteUnknownApprovalCount * 11
    reasons.unknown.push(
      `${m.staleFiniteUnknownApprovalCount} large finite allowance${m.staleFiniteUnknownApprovalCount === 1 ? '' : 's'} to unknown spenders`,
    )
  }

  let protocolPoints = 0
  const uniqueSpenders = new Set(rows.map((r) => String(r.spender || '').toLowerCase()).filter(Boolean))
  const uniqueProtocols = new Set([
    ...protocolApprovals.map((r) => String(r.spender || '').toLowerCase()),
    ...(m.protocolCounterparties || []).map((a) => String(a).toLowerCase()),
  ])
  const protocolActivity =
    uniqueProtocols.size > 0 || uniqueSpenders.size > 0 || m.uniqueCounterparties > 8
  if (uniqueProtocols.size > 0) {
    protocolPoints += uniqueProtocols.size * 13
    reasons.protocol.push(`${uniqueProtocols.size} distinct protocol spender${uniqueProtocols.size === 1 ? '' : 's'}`)
  }
  if (uniqueSpenders.size > 0) {
    protocolPoints += Math.min(30, uniqueSpenders.size * 5)
    reasons.protocol.push(`${uniqueSpenders.size} unique spender${uniqueSpenders.size === 1 ? '' : 's'} with active approvals`)
  }
  if (m.topSpenderApprovalSharePct >= 55) {
    protocolPoints += 20
    reasons.protocol.push(
      `High dependency: ~${m.topSpenderApprovalSharePct.toFixed(0)}% of approvals on one spender`,
    )
  }
  if (m.uniqueCounterparties > 8) {
    protocolPoints += Math.min(28, (m.uniqueCounterparties - 8) * 1.8)
    reasons.protocol.push(`${m.uniqueCounterparties} unique counterparties in transfer sample`)
  }

  const bands = [
    {
      id: 'dex',
      label: 'DEX exposure',
      level: bandLevel(dexPoints, dexActivity),
      max: 7,
      reasons: reasons.dex.length ? reasons.dex : ['No DEX router approvals or swap history in sampled data'],
    },
    {
      id: 'stable',
      label: 'Stablecoins',
      level: bandLevel(stablePoints, stableActivity),
      max: 7,
      reasons: reasons.stable.length
        ? reasons.stable
        : ['No stablecoin balances, transfers, or approvals detected.'],
    },
    {
      id: 'nft',
      label: 'NFT exposure',
      level: bandLevel(nftPoints, nftActivity),
      max: 7,
      reasons: reasons.nft.length ? reasons.nft : ['No NFT holdings or marketplace signals in sampled data'],
    },
    {
      id: 'unknown',
      label: 'Unknown contracts',
      level: bandLevel(unknownPoints, unknownActivity),
      max: 7,
      reasons: reasons.unknown.length ? reasons.unknown : ['No unknown-spender approvals in inventory window'],
    },
    {
      id: 'protocol',
      label: 'Protocol dependency',
      level: bandLevel(protocolPoints, protocolActivity),
      max: 7,
      reasons: reasons.protocol.length ? reasons.protocol : ['Limited protocol approval diversity in sampled data'],
    },
  ]

  const sources = []
  if (m.hasBalances) sources.push('balances')
  if (m.hasTransfers) sources.push('transfer history')
  if (m.hasApprovals) sources.push('approvals')
  if (m.hasNftScan) sources.push('NFT holdings')

  let provenance = 'PROVIDER_PENDING'
  if (m.hasBalances && m.hasTransfers && m.hasApprovals) provenance = 'LIVE'
  else if (m.hasBalances || m.hasTransfers || m.hasApprovals) provenance = 'PARTIAL_DATA'

  const subtitle =
    provenance === 'LIVE'
      ? 'Exposure bands derived from approvals, balances, transfer history, and protocol interactions.'
      : provenance === 'PARTIAL_DATA'
        ? 'Partial wallet exposure — some provider dimensions are unavailable in this refresh.'
        : 'Exposure bands pending — wallet providers unavailable.'

  return {
    provenance,
    subtitle,
    sources,
    bands,
    metrics: m,
  }
}
