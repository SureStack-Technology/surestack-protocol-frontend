/**
 * Known DeFi protocol URL profiles for Prime Protocol Trust Review.
 * Scan targets only include addresses already present in the SureStack codebase.
 */

const UNISWAP_V3_ROUTER = '0xe592427a0aece92de3edee1f18e0157c05861564'
const PERMIT2 = '0x000000000022d473030f116ddee9f6b43ac78ba3'
const UNISWAP_UNIVERSAL_ROUTER = '0x3fc91a3afd70395cd496647d5a6cc9d4b2b7fad'
const ONEINCH_V5_ROUTER = '0x1111111254eeb25477b68fb85ed929f73a960582'

/** @typedef {{ id: string, label: string, address: string }} ProtocolScanTarget */

/**
 * @typedef {object} ProtocolProfile
 * @property {boolean} matched
 * @property {string} name
 * @property {string} verifiedDomain
 * @property {string} inputUrl
 * @property {ProtocolScanTarget[]} scanTargets
 * @property {string} summary
 */

/** @type {Array<{ hosts: string[], profile: Omit<ProtocolProfile, 'matched' | 'inputUrl'> }>} */
const PROTOCOL_CATALOG = [
  {
    hosts: ['app.uniswap.org', 'uniswap.org'],
    profile: {
      name: 'Uniswap',
      verifiedDomain: 'app.uniswap.org',
      scanTargets: [
        { id: 'uniswap_v3_router', label: 'Uniswap V3 SwapRouter', address: UNISWAP_V3_ROUTER },
        { id: 'permit2', label: 'Permit2', address: PERMIT2 },
        { id: 'universal_router', label: 'Uniswap Universal Router', address: UNISWAP_UNIVERSAL_ROUTER },
      ],
      summary:
        'Verified Uniswap application domain. Review canonical router and Permit2 surfaces before signing swaps or approvals.',
    },
  },
  {
    hosts: ['app.aave.com', 'aave.com'],
    profile: {
      name: 'Aave',
      verifiedDomain: 'app.aave.com',
      scanTargets: [],
      summary:
        'Verified Aave application domain. Paste pool or token contract addresses from the official app into Contract Trust for scanner-backed proof.',
    },
  },
  {
    hosts: ['app.1inch.io', '1inch.io'],
    profile: {
      name: '1inch',
      verifiedDomain: 'app.1inch.io',
      scanTargets: [
        { id: '1inch_v5', label: '1inch v5 Aggregation Router', address: ONEINCH_V5_ROUTER },
      ],
      summary:
        'Verified 1inch aggregator domain. Scan known router contracts before approving swap routes.',
    },
  },
  {
    hosts: ['app.sushi.com', 'sushi.com'],
    profile: {
      name: 'Sushi',
      verifiedDomain: 'app.sushi.com',
      scanTargets: [],
      summary:
        'Verified Sushi application domain. Use Contract Trust with contract addresses shown in the official interface.',
    },
  },
  {
    hosts: ['curve.fi', 'www.curve.fi'],
    profile: {
      name: 'Curve',
      verifiedDomain: 'curve.fi',
      scanTargets: [],
      summary:
        'Verified Curve domain. Pool contracts vary — resolve the exact pool address from the official UI before scanning.',
    },
  },
  {
    hosts: ['app.lido.fi', 'lido.fi'],
    profile: {
      name: 'Lido',
      verifiedDomain: 'app.lido.fi',
      scanTargets: [],
      summary:
        'Verified Lido staking domain. Paste stETH or wrapper contracts from the official app for scanner validation.',
    },
  },
]

function normalizeHost(input) {
  const raw = String(input || '').trim()
  if (!raw) return null
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const u = new URL(withProto)
    return u.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    const stripped = raw.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    return stripped || null
  }
}

/**
 * @param {string} urlInput
 * @returns {ProtocolProfile}
 */
export function resolveProtocolUrl(urlInput) {
  const inputUrl = String(urlInput || '').trim()
  const host = normalizeHost(inputUrl)

  if (!host) {
    return {
      matched: false,
      name: 'Unknown protocol',
      verifiedDomain: '',
      inputUrl,
      scanTargets: [],
      summary: 'Could not parse protocol URL — verify the domain manually before interacting.',
    }
  }

  for (const entry of PROTOCOL_CATALOG) {
    const hit = entry.hosts.some((h) => host === h || host.endsWith(`.${h}`))
    if (hit) {
      return {
        matched: true,
        inputUrl,
        ...entry.profile,
      }
    }
  }

  return {
    matched: false,
    name: 'Unlisted protocol',
    verifiedDomain: host,
    inputUrl,
    scanTargets: [],
    summary:
      'Domain not in the curated protocol catalog. Treat as preliminary until official contracts are verified and scanned.',
  }
}
