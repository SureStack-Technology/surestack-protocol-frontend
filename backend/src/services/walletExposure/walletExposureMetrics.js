import {
  isDexSpender,
  isNftMarketplace,
  isProtocolSpender,
  isStableToken,
} from './exposureCatalog.js'

/**
 * Normalize provider signals + approval rows into exposure scoring inputs.
 * @param {object} signals
 * @param {object[]} [approvalRows]
 */
export function buildExposureMetrics(signals, approvalRows = []) {
  const rows = approvalRows.length ? approvalRows : signals?.approvalInventoryRows || []

  const dexApprovals = rows.filter((r) => isDexSpender(r.spender, r.spenderCategory))
  const stableApprovals = rows.filter((r) => isStableToken(r.token))
  const unknownApprovals = rows.filter((r) => r.spenderCategory === 'UNKNOWN_SPENDER')
  const protocolApprovals = rows.filter((r) => isProtocolSpender(r.spender))
  const unlimitedApprovals = rows.filter((r) => r.unlimited)
  const nftApprovals = rows.filter((r) => isNftMarketplace(r.spender))

  const stableSymbols = Array.isArray(signals?.stableSymbolsHeld) ? [...signals.stableSymbolsHeld] : []
  const stablecoinBalanceCount =
    Number(signals?.stablecoinBalanceCount) ||
    Number(signals?.stablecoinPresenceCount) ||
    stableSymbols.length

  return {
    providerLive: Boolean(signals?.providerLive),
    exposureChainId: signals?.exposureChainId ?? null,
    hasBalances: Boolean(signals?.hasBalances),
    hasTransfers: Boolean(signals?.hasTransfers),
    hasApprovals: Boolean(signals?.hasApprovals) || rows.length > 0,
    hasNftScan: Boolean(signals?.hasNftScan),
    hasNftHoldings: Boolean(signals?.hasNftHoldings) || Number(signals?.nftHoldingsCount) > 0,

    volatileSharePct: Number(signals?.volatileSharePct) || 0,
    stableSharePct: Number(signals?.stableSharePct) || 0,
    stableShareComputed: Boolean(signals?.stableShareComputed),
    stableSymbolsHeld: stableSymbols,
    stablecoinBalanceCount,
    stableTransferCount: Number(signals?.stableTransferCount) || 0,

    transferCount: Number(signals?.transferCount) || 0,
    uniqueCounterparties: Number(signals?.uniqueCounterparties) || 0,
    dexTransferCount: Number(signals?.dexTransferCount) || 0,
    dexInteractionCount:
      Number(signals?.dexInteractionCount) ||
      Number(signals?.dexTransferCount) ||
      0,
    nftTransferCount: Number(signals?.nftTransferCount) || 0,
    erc1155TransferCount: Number(signals?.erc1155TransferCount) || 0,
    nftMarketplaceInteractions: Number(signals?.nftMarketplaceInteractions) || 0,
    nftHoldingsCount: Number(signals?.nftHoldingsCount) || 0,
    nftCollectionCount: Number(signals?.nftCollectionCount) || 0,

    approvalCount: rows.length,
    dexApprovalCount: dexApprovals.length,
    stableApprovalCount: stableApprovals.length,
    unknownSpenderCount: unknownApprovals.length,
    unlimitedApprovalCount: unlimitedApprovals.length,
    unlimitedUnknownCount:
      Number(signals?.unlimitedApprovalUnknownCount) ||
      unknownApprovals.filter((r) => r.unlimited).length,
    protocolSpenderCount: protocolApprovals.length,
    protocolCounterparties: Array.isArray(signals?.protocolCounterparties)
      ? signals.protocolCounterparties
      : [],
    nftApprovalCount: nftApprovals.length,

    probeDexApproval: Number(signals?.probeDexApproval) || 0,
    staleFiniteUnknownApprovalCount: Number(signals?.staleFiniteUnknownApprovalCount) || 0,
    topSpenderApprovalSharePct: Number(signals?.topSpenderApprovalSharePct) || 0,
  }
}

/**
 * Compact summary for API debugging (no raw rows).
 * @param {object} metrics
 */
export function exposureInputSummary(metrics) {
  return {
    exposureChainId: metrics.exposureChainId,
    stablecoinBalanceCount: metrics.stablecoinBalanceCount,
    stableSharePct: metrics.stableSharePct,
    volatileSharePct: metrics.volatileSharePct,
    stableSymbolsHeld: metrics.stableSymbolsHeld,
    dexInteractionCount: metrics.dexInteractionCount,
    dexApprovalCount: metrics.dexApprovalCount,
    nftHoldingsCount: metrics.nftHoldingsCount,
    nftCollectionCount: metrics.nftCollectionCount,
    nftTransferCount: metrics.nftTransferCount,
    approvalCount: metrics.approvalCount,
    unknownSpenderCount: metrics.unknownSpenderCount,
    unlimitedApprovalCount: metrics.unlimitedApprovalCount,
    unlimitedUnknownCount: metrics.unlimitedUnknownCount,
    protocolSpenderCount: metrics.protocolSpenderCount,
    uniqueCounterparties: metrics.uniqueCounterparties,
    hasBalances: metrics.hasBalances,
    hasTransfers: metrics.hasTransfers,
    hasApprovals: metrics.hasApprovals,
    hasNftScan: metrics.hasNftScan,
  }
}
