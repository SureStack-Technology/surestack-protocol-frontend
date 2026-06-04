
export const LAYER_ACTION_TYPES = {
  NARRATIVE: 'narrative',
  BEHAVIOR: 'behavior',
  CONTRACT: 'contract',
  WALLET: 'wallet',
  LIQUIDITY: 'liquidity',
}

export const MODULE_LABELS = {
  narrative: 'Narrative',
  behavior: 'Behavior',
  contract: 'Contract Trust',
  wallet: 'Wallet Exposure',
  liquidity: 'Liquidity Intelligence',
}

const EXAMPLE_CONTRACT = '0xf280b16ef293d8e534e370794ef26bf312694126'
const EXAMPLE_WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53402D6A1C8c104'

/** Explicit sample — only loaded when user clicks "Sample contract", not on module select. */
export const CONTRACT_SAMPLE_ADDRESS = EXAMPLE_CONTRACT

function pickLeadAsset(assets) {
  if (!Array.isArray(assets) || !assets.length) return null
  return assets.find((a) => a.status === 'live') || assets[0]
}

function isContractAddress(query) {
  const q = String(query || '').trim()
  return /^0x[a-fA-F0-9]{40}$/.test(q)
}

function chainIdToTerminalChain(chainId) {
  const id = Number(chainId)
  if (id === 8453) return 'base'
  if (id === 42161) return 'arbitrum'
  if (id === 137) return 'polygon'
  if (id === 101 || id === 103) return 'solana'
  return 'ethereum'
}

export const NARRATIVE_SAMPLE_ASSETS = ['PEPE', 'WIF', 'BONK']

function narrativePrefill() {
  return {
    query: '',
    skipQueryPrefill: true,
    chain: 'ethereum',
    modeId: 'token',
    moduleId: LAYER_ACTION_TYPES.NARRATIVE,
    previewMessage:
      'Narrative risk investigation prepared. Enter a token or choose a sample asset.',
    moduleLabel: MODULE_LABELS.narrative,
    sampleAssets: NARRATIVE_SAMPLE_ASSETS,
  }
}

function behaviorPrefill(watchlist, assets) {
  const live = watchlist?.status === 'live'
  const lead = pickLeadAsset(assets)

  if (live && lead) {
    const sym = lead.watchlistSymbol || lead.symbol || 'ETH'
    const chain = String(lead.chain || '').toLowerCase() === 'solana' ? 'solana' : 'ethereum'
    return {
      query: sym,
      chain,
      modeId: 'token',
      moduleId: LAYER_ACTION_TYPES.BEHAVIOR,
      previewMessage: `${sym} behavior signal review prepared. Run Intelligence Scan with live behavior context.`,
      moduleLabel: MODULE_LABELS.behavior,
      hint: `Behavior context: ${sym} on ${chain} — run intelligence scan when ready.`,
    }
  }

  return {
    query: 'ETH',
    chain: 'ethereum',
    modeId: 'token',
    behaviorPending: true,
    moduleId: LAYER_ACTION_TYPES.BEHAVIOR,
    previewMessage:
      'Ethereum behavior analytics coming soon. Contract Trust, Liquidity Intelligence, and Security Signals remain available.',
    moduleLabel: MODULE_LABELS.behavior,
    hint: 'Advanced Ethereum behavior analytics coming soon.',
  }
}

function contractPrefill(currentQuery) {
  const q = String(currentQuery || '').trim()
  if (isContractAddress(q)) {
    return {
      query: q,
      chain: 'ethereum',
      modeId: 'contract',
      moduleId: LAYER_ACTION_TYPES.CONTRACT,
      previewMessage:
        'Contract trust scan prepared. Run Intelligence Scan, then Deep Contract Scan for scanner-backed proof.',
      moduleLabel: MODULE_LABELS.contract,
      hint: 'Contract target retained — run intelligence scan to open Contract Analyzer.',
    }
  }
  return {
    query: '',
    skipQueryPrefill: true,
    awaitingInput: true,
    chain: 'ethereum',
    modeId: 'contract',
    moduleId: LAYER_ACTION_TYPES.CONTRACT,
    previewMessage: 'Enter a contract address to begin analysis.',
    moduleLabel: MODULE_LABELS.contract,
    hint: 'Paste a 0x contract address or choose Sample contract below.',
    sampleContract: CONTRACT_SAMPLE_ADDRESS,
  }
}

function walletPrefill(profile) {
  const verified = profile?.wallets?.find((w) => w.verifiedAt)
  if (verified?.address) {
    return {
      query: String(verified.address).toLowerCase(),
      chain: chainIdToTerminalChain(verified.chainId),
      modeId: 'wallet',
      moduleId: LAYER_ACTION_TYPES.WALLET,
      previewMessage: 'Wallet exposure review prepared for connected wallet.',
      moduleLabel: MODULE_LABELS.wallet,
      hint: 'Connected wallet ready — run intelligence scan for wallet exposure verdict.',
    }
  }
  return {
    query: EXAMPLE_WALLET,
    chain: 'ethereum',
    modeId: 'wallet',
    moduleId: LAYER_ACTION_TYPES.WALLET,
    previewMessage: 'Wallet exposure review prepared. Link verified wallet for live drivers.',
    moduleLabel: MODULE_LABELS.wallet,
    hint: 'Example wallet loaded — link your verified wallet for live exposure intelligence.',
  }
}

/**
 * Resolve terminal prefill for a layer launch action.
 * @param {string} layerId
 * @param {{ primeTrends?: object, watchlist?: object, birdeyeAssets?: object[], profile?: object, query?: string }} ctx
 */
export function resolveLayerLaunch(layerId, ctx = {}) {
  switch (layerId) {
    case LAYER_ACTION_TYPES.NARRATIVE:
      return narrativePrefill()
    case LAYER_ACTION_TYPES.BEHAVIOR:
      return behaviorPrefill(ctx.watchlist, ctx.birdeyeAssets)
    case LAYER_ACTION_TYPES.CONTRACT:
      return contractPrefill(ctx.query)
    case LAYER_ACTION_TYPES.WALLET:
      return walletPrefill(ctx.profile)
    case LAYER_ACTION_TYPES.LIQUIDITY:
      return {
        query: String(ctx.query || '').trim() || 'BONK',
        chain: 'solana',
        modeId: 'token',
        moduleId: LAYER_ACTION_TYPES.LIQUIDITY,
        previewMessage:
          'Liquidity intelligence review prepared. Run Intelligence Scan for market depth and impact estimates.',
        moduleLabel: MODULE_LABELS.liquidity,
        hint: 'Liquidity estimates are educational — not execution or investment advice.',
      }
    default:
      return {
        query: '',
        chain: 'ethereum',
        modeId: 'token',
        moduleId: null,
        previewMessage: null,
        moduleLabel: null,
        hint: null,
      }
  }
}

export const LAYER_BUTTON_LABELS = {
  narrative: 'Analyze Narrative Risk',
  behavior: 'Check Behavior Signals',
  contract: 'Run Contract Scan',
  wallet: 'Review Wallet Exposure',
  liquidity: 'Review Liquidity Intelligence',
}
