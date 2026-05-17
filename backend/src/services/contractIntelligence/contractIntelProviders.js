import { CONTRACT_INTEL_CHAINS, EIP1967_ADMIN_SLOT, EIP1967_IMPLEMENTATION_SLOT } from './contractIntelTypes.js'

function alchemyChainUrl(chainId, apiKey) {
  const id = Number(chainId)
  if (id === 1) return `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`
  if (id === 8453) return `https://base-mainnet.g.alchemy.com/v2/${apiKey}`
  if (id === 42161) return `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`
  if (id === 10) return `https://opt-mainnet.g.alchemy.com/v2/${apiKey}`
  if (id === 137) return `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`
  return null
}

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`rpc_http_${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'rpc_error')
  return json.result
}

function strip0x(hex) {
  return String(hex || '').replace(/^0x/i, '')
}

function hasSelector(bytecode, selectorHex) {
  const bc = strip0x(bytecode).toLowerCase()
  const sel = strip0x(selectorHex).toLowerCase()
  return bc.includes(sel)
}

/** @param {string} address @param {number} chainId */
export async function fetchOnChainContractSignals(address, chainId) {
  const apiKey = process.env.ALCHEMY_API_KEY
  const url = apiKey ? alchemyChainUrl(chainId, apiKey) : null
  if (!url) {
    return { mode: 'reference', bytecodePresent: null }
  }

  const addr = address.toLowerCase()
  const [codeHex, implSlot, adminSlot, txCountHex] = await Promise.all([
    rpc(url, 'eth_getCode', [addr, 'latest']),
    rpc(url, 'eth_getStorageAt', [addr, EIP1967_IMPLEMENTATION_SLOT, 'latest']).catch(() => '0x'),
    rpc(url, 'eth_getStorageAt', [addr, EIP1967_ADMIN_SLOT, 'latest']).catch(() => '0x'),
    rpc(url, 'eth_getTransactionCount', [addr, 'latest']).catch(() => '0x0'),
  ])

  const bytecode = strip0x(codeHex)
  const isContract = bytecode.length > 2
  const implAddr = strip0x(implSlot)
  const adminAddr = strip0x(adminSlot)
  const hasProxyImpl = implAddr.length >= 40 && !/^0+$/.test(implAddr)
  const hasProxyAdmin = adminAddr.length >= 40 && !/^0+$/.test(adminAddr)

  const selectors = {
    owner: hasSelector(codeHex, '8da5cb5b'),
    pause: hasSelector(codeHex, '8456cb59') || hasSelector(codeHex, '5c975abb'),
    unpause: hasSelector(codeHex, '3f4ba83a'),
    mint: hasSelector(codeHex, '40c10f19') || hasSelector(codeHex, 'a0712d68'),
    blacklist: hasSelector(codeHex, 'f9f92be4') || hasSelector(codeHex, '537df3b6'),
  }

  const erc20Selectors = {
    transfer: hasSelector(codeHex, 'a9059cbb'),
    balanceOf: hasSelector(codeHex, '70a08231'),
    totalSupply: hasSelector(codeHex, '18160ddd'),
  }

  const txCount = Number.parseInt(String(txCountHex || '0x0'), 16) || 0

  return {
    mode: 'live',
    isContract,
    bytecodeLength: bytecode.length,
    upgradeableProxy: hasProxyImpl || hasProxyAdmin,
    proxyImplementation: hasProxyImpl ? `0x${implAddr.slice(-40)}` : null,
    proxyAdmin: hasProxyAdmin ? `0x${adminAddr.slice(-40)}` : null,
    privilegedSelectors: selectors,
    erc20Selectors,
    onChainActivityCount: txCount,
  }
}

/** @param {string} address @param {number} chainId */
export async function fetchGoPlusAddressSecurity(address, chainId) {
  const key = process.env.GOPLUS_APP_KEY || process.env.GOPLUS_API_KEY
  if (!key) return null

  const chain = CONTRACT_INTEL_CHAINS[Number(chainId)]?.key
  if (!chain) return null

  const url = `https://api.gopluslabs.io/api/v1/address_security/${encodeURIComponent(String(chainId))}?contract_addresses=${address}`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: key },
    })
    if (!res.ok) return null
    const json = await res.json()
    const row = json?.result?.[address.toLowerCase()] || json?.result?.[address]
    return row || null
  } catch {
    return null
  }
}

/** @param {string} address @param {number} chainId */
export async function fetchEtherscanContractMeta(address, chainId) {
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (!apiKey) return null

  const url = new URL('https://api.etherscan.io/v2/api')
  url.searchParams.set('chainid', String(chainId))
  url.searchParams.set('module', 'contract')
  url.searchParams.set('action', 'getsourcecode')
  url.searchParams.set('address', address)
  url.searchParams.set('apikey', apiKey)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const json = await res.json()
    const row = Array.isArray(json?.result) ? json.result[0] : null
    if (!row) return null
    return {
      contractName: row.ContractName || null,
      compiler: row.CompilerVersion || null,
      verified: String(row.SourceCode || '').length > 2,
      proxy: String(row.Proxy || '0') === '1',
      implementation: row.Implementation || null,
    }
  } catch {
    return null
  }
}
