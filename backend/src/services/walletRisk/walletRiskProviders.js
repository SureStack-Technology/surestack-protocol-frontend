import { Interface } from 'ethers'
import { getLowerVolatilityTokens, MAINNET_CHAIN_ID, WETH_MAINNET } from './walletRiskTypes.js'
import { fetchApprovalSignalsFromLogs, walletChainSupportsApprovalLogScan } from './walletApprovalSignals.js'
import { resolveAlchemyRpcUrl } from './alchemyChainResolver.js'
import {
  DEX_SPENDERS,
  isDexSpender,
  isNftMarketplace,
  isProtocolSpender,
  isStableToken,
  normalizedBalanceHuman,
  stableTokenSymbol,
} from '../walletExposure/exposureCatalog.js'

const ERC20_ALLOWANCE_IFACE = new Interface([
  'function allowance(address owner, address spender) view returns (uint256)',
])

const APPROVAL_PROBES = [
  {
    token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    spender: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
  },
  {
    token: WETH_MAINNET,
    spender: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
  },
]

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`alchemy_http_${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'alchemy_rpc_error')
  return json.result
}

/**
 * @param {string | null | undefined} hex
 */
function parseBalanceWei(hex) {
  if (!hex || hex === '0x') return 0n
  try {
    return BigInt(hex)
  } catch {
    return 0n
  }
}

/**
 * @param {object} transfer
 */
function transferContractAddress(transfer) {
  return String(
    transfer?.rawContract?.address || transfer?.contractAddress || '',
  ).toLowerCase()
}

/**
 * @param {string} address
 * @param {number} chainId — resolved exposure chain (Prime-aligned mainnet default)
 * @param {string} apiKey
 */
export async function fetchWalletSignals(address, chainId, apiKey) {
  const resolved = resolveAlchemyRpcUrl(chainId, apiKey)
  const url = resolved?.url
  if (!url) throw new Error('unsupported_chain')

  const addr = address.toLowerCase()
  const lowVol = getLowerVolatilityTokens(chainId)
  const transferCategories = ['external', 'erc20', 'internal', 'erc721', 'erc1155']

  const [nativeHex, tokenBalancesResult, transfersOut, transfersIn, nftPayload] = await Promise.all([
    rpc(url, 'eth_getBalance', [addr, 'latest']),
    rpc(url, 'alchemy_getTokenBalances', [addr, 'erc20']).catch(() => ({ tokenBalances: [] })),
    rpc(url, 'alchemy_getAssetTransfers', [
      {
        fromBlock: '0x0',
        toBlock: 'latest',
        fromAddress: addr,
        category: transferCategories,
        maxCount: '0x64',
        order: 'desc',
      },
    ]).catch(() => ({ transfers: [] })),
    rpc(url, 'alchemy_getAssetTransfers', [
      {
        fromBlock: '0x0',
        toBlock: 'latest',
        toAddress: addr,
        category: transferCategories,
        maxCount: '0x64',
        order: 'desc',
      },
    ]).catch(() => ({ transfers: [] })),
    rpc(url, 'alchemy_getNftsForOwner', [addr, { pageSize: 100, omitMetadata: true }]).catch(() => null),
  ])

  const tokenBalances = tokenBalancesResult?.tokenBalances || []
  const outs = transfersOut?.transfers || []
  const ins = transfersIn?.transfers || []
  const all = [...outs, ...ins]
  const transferCount = all.length

  let nftTransferCount = 0
  let erc1155TransferCount = 0
  let dexTransferCount = 0
  let stableTransferCount = 0
  let nftMarketplaceInteractions = 0
  const protocolCounterparties = new Set()
  const counterparties = new Set()

  for (const t of all) {
    const cat = String(t?.category || '').toLowerCase()
    if (cat === 'erc721') nftTransferCount += 1
    if (cat === 'erc1155') erc1155TransferCount += 1

    const from = String(t?.fromAddress || '').toLowerCase()
    const to = String(t?.toAddress || '').toLowerCase()
    const other = from === addr ? to : from
    const contract = transferContractAddress(t)

    if (cat === 'erc20' && isStableToken(contract)) stableTransferCount += 1
    if (cat === 'erc20' && DEX_SPENDERS.has(to)) dexTransferCount += 1
    if (cat === 'erc20' && DEX_SPENDERS.has(from)) dexTransferCount += 1

    if (other && other !== addr) {
      counterparties.add(other)
      if (DEX_SPENDERS.has(other) || isDexSpender(other)) dexTransferCount += 1
      if (isProtocolSpender(other)) protocolCounterparties.add(other)
      if (isNftMarketplace(other)) nftMarketplaceInteractions += 1
    }
  }

  const ownedNfts = nftPayload?.ownedNfts ?? nftPayload?.nfts ?? []
  const nftList = Array.isArray(ownedNfts) ? ownedNfts : []
  const nftHoldingsCount = Number(nftPayload?.totalCount) || nftList.length
  const nftCollectionCount = new Set(
    nftList
      .map((n) => String(n?.contract?.address || n?.contractAddress || '').toLowerCase())
      .filter(Boolean),
  ).size
  const hasNftScan = nftPayload != null && !nftPayload?.error

  const parsed = []
  const stableSymbolsHeld = []
  let stablecoinPresenceCount = 0
  let nativeWei = 0n
  try {
    nativeWei = BigInt(nativeHex)
  } catch {
    nativeWei = 0n
  }

  let total = nativeWei > 0n ? nativeWei : 0n
  for (const row of tokenBalances) {
    const c = String(row?.contractAddress || '').toLowerCase()
    if (!c) continue

    if (row.error) {
      if (isStableToken(c)) {
        stablecoinPresenceCount += 1
        const sym = stableTokenSymbol(c)
        if (sym && !stableSymbolsHeld.includes(sym)) stableSymbolsHeld.push(sym)
      }
      continue
    }

    const v = parseBalanceWei(row?.tokenBalance)
    if (v > 0n) {
      parsed.push({ contract: c, value: v })
      total += v
      if (isStableToken(c)) {
        stablecoinPresenceCount += 1
        const sym = stableTokenSymbol(c)
        if (sym && !stableSymbolsHeld.includes(sym)) stableSymbolsHeld.push(sym)
      }
    } else if (isStableToken(c)) {
      stablecoinPresenceCount += 1
      const sym = stableTokenSymbol(c)
      if (sym && !stableSymbolsHeld.includes(sym)) stableSymbolsHeld.push(sym)
    }
  }

  if (nativeWei > 0n) parsed.push({ contract: 'native', value: nativeWei })

  let topTokenSharePct = 0
  if (total > 0n) {
    let max = 0n
    for (const p of parsed) {
      if (p.value > max) max = p.value
    }
    topTokenSharePct = Number((max * 10000n) / total) / 100
  }

  let volatileNorm = 0
  let totalNorm = 0
  let stableNorm = 0
  for (const p of parsed) {
    const c = p.contract === 'native' ? 'native' : p.contract
    const human = normalizedBalanceHuman(c, p.value)
    if (human <= 0) continue
    totalNorm += human
    if (isStableToken(c)) stableNorm += human
    const isLow = c === 'native' || lowVol.has(c)
    if (!isLow) volatileNorm += human
  }

  let volatileSharePct = 0
  let stableSharePct = 0
  let stableShareComputed = false
  if (totalNorm > 0) {
    volatileSharePct = (volatileNorm / totalNorm) * 100
    stableSharePct = (stableNorm / totalNorm) * 100
    stableShareComputed = true
  } else if (stablecoinPresenceCount > 0 || stableTransferCount > 0) {
    stableSharePct = Math.min(100, stablecoinPresenceCount * 25 + stableTransferCount * 10)
    volatileSharePct = Math.max(0, 100 - stableSharePct)
  }

  let probeApprovalPenalty = 0
  let probeDexApproval = 0
  if (chainId === MAINNET_CHAIN_ID) {
    for (const probe of APPROVAL_PROBES) {
      const data = ERC20_ALLOWANCE_IFACE.encodeFunctionData('allowance', [addr, probe.spender])
      try {
        const raw = await rpc(url, 'eth_call', [{ to: probe.token, data }, 'latest'])
        const bn = parseBalanceWei(raw === '0x' ? '0' : raw)
        const maxU = (1n << 256n) - 1n
        if (bn > maxU / 2n || bn > 10n ** 24n) {
          probeApprovalPenalty += 12
          probeDexApproval += 1
        } else if (bn > 10n ** 15n) {
          probeApprovalPenalty += 5
          probeDexApproval += 1
        }
      } catch {
        /* per-probe */
      }
    }
  }
  probeApprovalPenalty = Math.min(22, probeApprovalPenalty)

  let approvalLogPenalty = 0
  let unlimitedApprovalUnknownCount = 0
  let staleFiniteUnknownApprovalCount = 0
  let approvalInventoryRows = []
  if (walletChainSupportsApprovalLogScan(chainId)) {
    try {
      const inv = await fetchApprovalSignalsFromLogs(addr, chainId, apiKey.trim())
      approvalLogPenalty = Number(inv.approvalLogPenalty) || 0
      unlimitedApprovalUnknownCount = Number(inv.unlimitedUnknownCount) || 0
      staleFiniteUnknownApprovalCount = Number(inv.staleUnknownFiniteCount) || 0
      approvalInventoryRows = inv.rows || []
    } catch {
      approvalLogPenalty = 0
    }
  }

  const approvalPenalty = Math.min(40, probeApprovalPenalty + approvalLogPenalty)

  const spenderCounts = new Map()
  for (const row of approvalInventoryRows) {
    const s = String(row.spender || '').toLowerCase()
    if (!s) continue
    spenderCounts.set(s, (spenderCounts.get(s) || 0) + 1)
  }
  let topSpenderApprovalSharePct = 0
  if (approvalInventoryRows.length > 0) {
    const max = Math.max(...spenderCounts.values())
    topSpenderApprovalSharePct = (max / approvalInventoryRows.length) * 100
  }

  const dexInteractionCount = dexTransferCount
  const insufficientHistory = transferCount < 4 && parsed.length < 2 && approvalInventoryRows.length === 0

  return {
    exposureChainId: chainId,
    topTokenSharePct,
    volatileSharePct,
    stableSharePct,
    stableShareComputed,
    stableSymbolsHeld,
    stablecoinBalanceCount: stableSymbolsHeld.length || stablecoinPresenceCount,
    stablecoinPresenceCount,
    stableTransferCount,
    transferCount,
    uniqueCounterparties: counterparties.size,
    approvalPenalty,
    probeApprovalPenalty,
    probeDexApproval,
    approvalLogPenalty,
    unlimitedApprovalUnknownCount,
    staleFiniteUnknownApprovalCount,
    interactionBreadthRatio:
      transferCount > 0 ? counterparties.size / Math.max(1, transferCount) : 0,
    insufficientHistory,
    nftTransferCount,
    erc1155TransferCount,
    dexTransferCount,
    dexInteractionCount,
    nftMarketplaceInteractions,
    nftHoldingsCount,
    nftCollectionCount,
    protocolCounterparties: [...protocolCounterparties],
    topSpenderApprovalSharePct,
    approvalInventoryRows,
    hasBalances: parsed.length > 0 || nativeWei > 0n || stablecoinPresenceCount > 0,
    hasTransfers: transferCount > 0,
    hasApprovals: approvalInventoryRows.length > 0,
    hasNftScan,
    hasNftHoldings: nftHoldingsCount > 0,
    providerLive: true,
  }
}
