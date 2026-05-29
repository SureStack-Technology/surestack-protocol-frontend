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

const ETHERSCAN_MIN_INTERVAL_MS = 350
let lastEtherscanCallAt = 0

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function etherscanThrottle() {
  const wait = ETHERSCAN_MIN_INTERVAL_MS - (Date.now() - lastEtherscanCallAt)
  if (wait > 0) await sleep(wait)
  lastEtherscanCallAt = Date.now()
}

async function etherscanV2Get(urlPathParams) {
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (!apiKey) return null
  await etherscanThrottle()
  const url = new URL('https://api.etherscan.io/v2/api')
  for (const [k, v] of Object.entries(urlPathParams)) {
    url.searchParams.set(k, String(v))
  }
  url.searchParams.set('apikey', apiKey)
  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** @param {object} params @param {number} [retries] */
async function etherscanV2GetWithRetry(params, retries = 1) {
  let json = await etherscanV2Get(params)
  for (let i = 0; i < retries; i++) {
    const rateLimited =
      json?.status === '0' &&
      typeof json?.result === 'string' &&
      /rate limit/i.test(json.result)
    if (!rateLimited) break
    await sleep(450)
    json = await etherscanV2Get(params)
  }
  return json
}

/**
 * Etherscan getcontractcreation returns timestamp + blockNumber on the row (v2).
 * @param {object | null | undefined} row
 */
function timestampMsFromCreationRow(row) {
  const ts = Number(row?.timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return null
  return ts < 1e12 ? ts * 1000 : ts
}

/**
 * @param {object | null | undefined} row
 */
function blockNumberFromCreationRow(row) {
  const raw = row?.blockNumber
  if (raw == null || raw === '') return null
  const s = String(raw)
  if (/^0x/i.test(s)) {
    const n = Number.parseInt(s, 16)
    return Number.isFinite(n) ? n : null
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {object | null | undefined} json
 */
function parseContractCreationRow(json) {
  if (!json || json.status !== '1') return null
  const result = json.result
  if (Array.isArray(result) && result.length > 0) return result[0]
  if (result && typeof result === 'object' && !Array.isArray(result)) return result
  return null
}

async function resolveBlockTimestampMs(chainId, blockNumber) {
  const blockHex = `0x${Number(blockNumber).toString(16)}`
  const alchemyKey = process.env.ALCHEMY_API_KEY
  const url = alchemyKey ? alchemyChainUrl(chainId, alchemyKey) : null
  if (url) {
    try {
      const block = await rpc(url, 'eth_getBlockByNumber', [blockHex, false])
      const ts = Number.parseInt(String(block?.timestamp || '0x0'), 16)
      if (ts > 0) return ts * 1000
    } catch {
      /* fall through */
    }
  }

  const blockJson = await etherscanV2Get({
    chainid: String(chainId),
    module: 'proxy',
    action: 'eth_getBlockByNumber',
    tag: blockHex,
    boolean: 'false',
  })
  const blockTs = Number.parseInt(String(blockJson?.result?.timestamp || '0x0'), 16)
  if (blockTs > 0) return blockTs * 1000
  return null
}

async function resolveCreationTimestampMs(chainId, row) {
  const fromRow = timestampMsFromCreationRow(row)
  if (fromRow) return fromRow

  const blockFromRow = blockNumberFromCreationRow(row)
  if (blockFromRow != null) {
    const fromBlock = await resolveBlockTimestampMs(chainId, blockFromRow)
    if (fromBlock) return fromBlock
  }

  if (!row?.txHash) return null

  const txJson = await etherscanV2Get({
    chainid: String(chainId),
    module: 'proxy',
    action: 'eth_getTransactionByHash',
    txhash: row.txHash,
  })
  const tx = txJson?.result
  const blockNumber = tx?.blockNumber
    ? Number.parseInt(String(tx.blockNumber), 16)
    : blockFromRow
  if (blockNumber == null || !Number.isFinite(blockNumber)) return null
  return resolveBlockTimestampMs(chainId, blockNumber)
}

/**
 * Contract creation time from explorer (proxy address when scanned target is a proxy).
 * @param {string} address
 * @param {number} chainId
 */
export async function fetchContractDeploymentMeta(address, chainId) {
  if (!process.env.ETHERSCAN_API_KEY) {
    return { available: false, source: 'unavailable' }
  }

  const addr = String(address || '').toLowerCase()
  const json = await etherscanV2GetWithRetry(
    {
      chainid: String(chainId),
      module: 'contract',
      action: 'getcontractcreation',
      contractaddresses: addr,
    },
    2,
  )

  const row = parseContractCreationRow(json)
  if (!row?.txHash && !row?.timestamp) {
    return {
      available: false,
      source: 'etherscan_v2',
      error: typeof json?.result === 'string' ? json.result : json?.message || 'no_creation_row',
    }
  }

  const contractCreatedAtMs = await resolveCreationTimestampMs(chainId, row)

  const etherscanMeta = await fetchEtherscanContractMeta(address, chainId)
  const implAddr = etherscanMeta?.implementation
    ? String(etherscanMeta.implementation).toLowerCase()
    : null

  let implementationCreatedAtMs = null
  if (implAddr && implAddr !== addr && /^0x[a-f0-9]{40}$/.test(implAddr)) {
    const implJson = await etherscanV2GetWithRetry(
      {
        chainid: String(chainId),
        module: 'contract',
        action: 'getcontractcreation',
        contractaddresses: implAddr,
      },
      1,
    )
    const implRow = parseContractCreationRow(implJson)
    if (implRow) {
      implementationCreatedAtMs = await resolveCreationTimestampMs(chainId, implRow)
    }
  }

  return {
    available: Boolean(contractCreatedAtMs),
    source: 'etherscan_v2',
    contractCreatedAtMs,
    contractCreator: row.contractCreator || null,
    creationTxHash: row.txHash || null,
    isProxy: Boolean(etherscanMeta?.proxy || implAddr),
    implementationAddress: implAddr,
    implementationCreatedAtMs,
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
