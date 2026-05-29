import { Interface } from 'ethers'
import { getLowerVolatilityTokens, MAINNET_CHAIN_ID, SEPOLIA_CHAIN_ID, WETH_MAINNET } from './walletRiskTypes.js'
import { fetchApprovalSignalsFromLogs, walletChainSupportsApprovalLogScan } from './walletApprovalSignals.js'

const ERC20_ALLOWANCE_IFACE = new Interface([
  'function allowance(address owner, address spender) view returns (uint256)',
])

/** Mainnet contracts for coarse allowance probe (not exhaustive). */
const APPROVAL_PROBES = [
  {
    token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    spender: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
    label: 'USDC → SwapRouter02',
  },
  {
    token: WETH_MAINNET,
    spender: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
    label: 'WETH → SwapRouter02',
  },
]

function alchemyChainUrl(chainId, apiKey) {
  if (chainId === MAINNET_CHAIN_ID) return `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`
  if (chainId === SEPOLIA_CHAIN_ID) return `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`
  if (chainId === 8453) return `https://base-mainnet.g.alchemy.com/v2/${apiKey}`
  if (chainId === 42161) return `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`
  if (chainId === 137) return `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`
  if (chainId === 10) return `https://opt-mainnet.g.alchemy.com/v2/${apiKey}`
  return null
}

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
 * @param {string} address checksummed or lower
 * @param {number} chainId
 * @param {string} apiKey
 */
export async function fetchWalletSignals(address, chainId, apiKey) {
  const url = alchemyChainUrl(chainId, apiKey)
  if (!url) throw new Error('unsupported_chain')

  const addr = address.toLowerCase()
  const lowVol = getLowerVolatilityTokens(chainId)

  const [nativeHex, tokenBalancesResult, transfersOut, transfersIn] = await Promise.all([
    rpc(url, 'eth_getBalance', [addr, 'latest']),
    rpc(url, 'alchemy_getTokenBalances', [addr, 'erc20']).catch(() => ({ tokenBalances: [] })),
    rpc(url, 'alchemy_getAssetTransfers', [
      {
        fromBlock: '0x0',
        toBlock: 'latest',
        fromAddress: addr,
        category: ['external', 'erc20', 'internal'],
        maxCount: '0x64',
        order: 'desc',
      },
    ]).catch(() => ({ transfers: [] })),
    rpc(url, 'alchemy_getAssetTransfers', [
      {
        fromBlock: '0x0',
        toBlock: 'latest',
        toAddress: addr,
        category: ['external', 'erc20', 'internal'],
        maxCount: '0x64',
        order: 'desc',
      },
    ]).catch(() => ({ transfers: [] })),
  ])

  const tokenBalances = tokenBalancesResult?.tokenBalances || []
  const outs = transfersOut?.transfers || []
  const ins = transfersIn?.transfers || []
  const all = [...outs, ...ins]
  const transferCount = all.length
  const counterparties = new Set()
  for (const t of all) {
    const other =
      String(t?.fromAddress || '').toLowerCase() === addr
        ? String(t?.toAddress || '').toLowerCase()
        : String(t?.fromAddress || '').toLowerCase()
    if (other && other !== addr) counterparties.add(other)
  }

  /** @type {Array<{ contract: string, value: bigint }>} */
  const parsed = []
  let nativeWei = 0n
  try {
    nativeWei = BigInt(nativeHex)
  } catch {
    nativeWei = 0n
  }
  let total = nativeWei > 0n ? nativeWei : 0n
  for (const row of tokenBalances) {
    const c = String(row?.contractAddress || '').toLowerCase()
    let v = 0n
    try {
      v = BigInt(row?.tokenBalance || '0')
    } catch {
      v = 0n
    }
    if (c && v > 0n) {
      parsed.push({ contract: c, value: v })
      total += v
    }
  }
  if (nativeWei > 0n) {
    parsed.push({ contract: 'native', value: nativeWei })
  }

  let topTokenSharePct = 0
  if (total > 0n) {
    let max = 0n
    for (const p of parsed) {
      if (p.value > max) max = p.value
    }
    topTokenSharePct = Number((max * 10000n) / total) / 100
  }

  let volatileWeight = 0n
  let volDenom = 0n
  for (const p of parsed) {
    const c = p.contract === 'native' ? 'native' : p.contract
    const isLow = c === 'native' || lowVol.has(c)
    volDenom += p.value
    if (!isLow) volatileWeight += p.value
  }
  let volatileSharePct = 0
  if (volDenom > 0n) {
    volatileSharePct = Number((volatileWeight * 10000n) / volDenom) / 100
  }

  let probeApprovalPenalty = 0
  if (chainId === MAINNET_CHAIN_ID) {
    for (const probe of APPROVAL_PROBES) {
      const data = ERC20_ALLOWANCE_IFACE.encodeFunctionData('allowance', [addr, probe.spender])
      try {
        const raw = await rpc(url, 'eth_call', [{ to: probe.token, data }, 'latest'])
        const bn = BigInt(raw === '0x' ? '0' : raw)
        const maxU = (1n << 256n) - 1n
        if (bn > maxU / 2n || bn > 10n ** 24n) {
          probeApprovalPenalty += 12
        } else if (bn > 10n ** 15n) {
          probeApprovalPenalty += 5
        }
      } catch {
        // ignore per-probe failures
      }
    }
  }
  probeApprovalPenalty = Math.min(22, probeApprovalPenalty)

  let approvalLogPenalty = 0
  let unlimitedApprovalUnknownCount = 0
  let staleFiniteUnknownApprovalCount = 0
  if (walletChainSupportsApprovalLogScan(chainId)) {
    try {
      const inv = await fetchApprovalSignalsFromLogs(addr, chainId, apiKey.trim())
      approvalLogPenalty = Number(inv.approvalLogPenalty) || 0
      unlimitedApprovalUnknownCount = Number(inv.unlimitedUnknownCount) || 0
      staleFiniteUnknownApprovalCount = Number(inv.staleUnknownFiniteCount) || 0
    } catch {
      approvalLogPenalty = 0
    }
  }

  const approvalPenalty = Math.min(40, probeApprovalPenalty + approvalLogPenalty)

  const insufficientHistory = transferCount < 4 && parsed.length < 2

  const counterpartiesCount = counterparties.size

  return {
    topTokenSharePct,
    volatileSharePct,
    transferCount,
    uniqueCounterparties: counterpartiesCount,
    approvalPenalty,
    probeApprovalPenalty,
    approvalLogPenalty,
    unlimitedApprovalUnknownCount,
    staleFiniteUnknownApprovalCount,
    interactionBreadthRatio:
      transferCount > 0 ? counterpartiesCount / Math.max(1, transferCount) : 0,
    insufficientHistory,
  }
}
