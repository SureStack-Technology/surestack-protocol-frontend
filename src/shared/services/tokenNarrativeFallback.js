/**
 * Category-aware narrative fallback when LunarCrush live feed is unavailable.
 * Meme scenario showcase is only used for meme-category tokens.
 */

import {
  DEFAULT_SHOWCASE_SCENARIO_ID,
  getLunarCrushScenarioById,
} from '@/data/lunarCrushScenarioShowcase.js'

const MEME_SYMBOLS = new Set(['PEPE', 'SHIB', 'BONK', 'WIF', 'DOGE'])
const ORACLE_SYMBOLS = new Set(['LINK'])
const DEFI_BLUE_CHIP_SYMBOLS = new Set(['UNI', 'AAVE', 'CRV', 'MKR', 'COMP', 'SUSHI', 'SNX'])
const STABLECOIN_SYMBOLS = new Set(['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD'])
const L2_ECOSYSTEM_SYMBOLS = new Set(['ARB', 'OP', 'MATIC', 'POL', 'IMX', 'STRK'])

/** @typedef {'meme'|'oracle'|'defi'|'stablecoin'|'l2'|'unknown'} TokenNarrativeCategory */

/**
 * @param {string} symbol
 * @returns {TokenNarrativeCategory}
 */
export function getTokenNarrativeCategory(symbol) {
  const sym = String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  if (!sym) return 'unknown'
  if (MEME_SYMBOLS.has(sym)) return 'meme'
  if (ORACLE_SYMBOLS.has(sym)) return 'oracle'
  if (STABLECOIN_SYMBOLS.has(sym)) return 'stablecoin'
  if (DEFI_BLUE_CHIP_SYMBOLS.has(sym)) return 'defi'
  if (L2_ECOSYSTEM_SYMBOLS.has(sym)) return 'l2'
  return 'unknown'
}

const CATEGORY_COPY = {
  oracle: {
    scenarioTitle: 'Infrastructure / Oracle Network Narrative',
    summary:
      'Oracle and data-feed networks are monitored for integration adoption, staking flows, and cross-chain bridge commentary. Social velocity for infrastructure tokens typically tracks protocol upgrades rather than retail meme cycles.',
    riskInterpretation:
      'Infrastructure narrative shifts often correlate with oracle network upgrades, staking parameter changes, and cross-chain integration announcements — not retail meme velocity.',
    trendingNarratives: [
      { topic: 'oracle_adoption', title: 'Oracle network adoption & integrations', rank: 1 },
      { topic: 'staking_flows', title: 'Staking and operator economics', rank: 2 },
      { topic: 'data_feeds', title: 'Data feed reliability discourse', rank: 3 },
    ],
    recommendedActions: [
      'Cross-check governance and upgrade announcements with contract trust scans',
      'Monitor bridge and L2 integration chatter for oracle dependency risk',
      'Enable live LunarCrush for real-time social velocity on this asset',
    ],
  },
  stablecoin: {
    scenarioTitle: 'Stablecoin Stability Monitoring',
    summary:
      'Stablecoin narrative layers focus on peg resilience, reserve transparency discourse, and redemption-flow chatter. Treat social spikes as operational risk signals — verify issuer attestations and on-chain supply before sizing exposure.',
    riskInterpretation:
      'Stablecoin social spikes typically reflect peg stress, reserve attestation cycles, or redemption queue commentary — verify on-chain supply and issuer disclosures.',
    trendingNarratives: [
      { topic: 'peg_resilience', title: 'Peg resilience & depeg monitoring', rank: 1 },
      { topic: 'reserves', title: 'Reserve transparency & attestation', rank: 2 },
      { topic: 'redemptions', title: 'Redemption flow commentary', rank: 3 },
    ],
    recommendedActions: [
      'Verify reserve attestations and circulating supply before sizing',
      'Review contract trust on issuer and bridge-wrapped variants',
      'Enable live LunarCrush for issuer and macro sentiment overlays',
    ],
  },
  defi: {
    scenarioTitle: 'DeFi Governance and Protocol Activity',
    summary:
      'DeFi blue-chip narrative intelligence tracks governance proposals, fee switch discourse, and TVL migration commentary. Elevated social volume often precedes vote windows or emissions changes — cross-check with contract trust before new approvals.',
    riskInterpretation:
      'DeFi narrative elevation often precedes governance votes, emissions changes, or TVL migration — align social signals with on-chain governance calendars.',
    trendingNarratives: [
      { topic: 'governance', title: 'Governance proposals & vote windows', rank: 1 },
      { topic: 'tvl_migration', title: 'TVL migration & liquidity routing', rank: 2 },
      { topic: 'fee_switch', title: 'Fee switch and treasury discourse', rank: 3 },
    ],
    recommendedActions: [
      'Review active governance proposals before new protocol approvals',
      'Scan core protocol contracts after governance or upgrade announcements',
      'Enable live LunarCrush for governance-linked social velocity',
    ],
  },
  l2: {
    scenarioTitle: 'L2 / Ecosystem Activity Narrative',
    summary:
      'Layer-2 and ecosystem tokens are tracked for bridge inflow narratives, sequencer health discussion, and incentive program chatter. Distinguish infrastructure upgrades from speculative rotation before discretionary exposure.',
    riskInterpretation:
      'L2 narrative clusters often track bridge flows, sequencer health, and incentive programs — distinguish infrastructure upgrades from speculative rotation.',
    trendingNarratives: [
      { topic: 'bridge_flows', title: 'Bridge inflow & ecosystem migration', rank: 1 },
      { topic: 'sequencer', title: 'Sequencer health & uptime discourse', rank: 2 },
      { topic: 'incentives', title: 'Incentive program & points chatter', rank: 3 },
    ],
    recommendedActions: [
      'Validate bridge and canonical contract addresses before approvals',
      'Monitor incentive program announcements for approval surface changes',
      'Enable live LunarCrush for ecosystem-wide social velocity',
    ],
  },
  unknown: {
    scenarioTitle: 'Narrative provider pending',
    summary: 'Narrative intelligence unavailable until live provider data is enabled.',
    riskInterpretation:
      'No category narrative template applies — enable LunarCrush live feed or paste a known token symbol for category fallback.',
    trendingNarratives: [],
    recommendedActions: [
      'Enable LunarCrush live provider for real narrative intelligence',
      'Use Contract Analyzer when a contract address is in scope',
    ],
  },
}

/**
 * @param {string} targetSymbol
 * @param {string} [displayLabel]
 * @returns {{ scenarioTitle: string, narrativeText: string, category: TokenNarrativeCategory }}
 */
export function buildCategoryNarrativeFallback(targetSymbol, displayLabel) {
  const sym = String(targetSymbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  const display = displayLabel || sym
  const category = getTokenNarrativeCategory(sym)

  if (category === 'meme') {
    const scenario = getLunarCrushScenarioById(DEFAULT_SHOWCASE_SCENARIO_ID)
    const asset = scenario?.trendingAssets?.find((a) => a.symbol === sym)
    const base = scenario?.intelligenceBrief || scenario?.riskInterpretation || ''
    if (asset && base) {
      return {
        category,
        scenarioTitle: scenario?.title || 'Meme Frenzy Acceleration',
        narrativeText: `${display} — scenario "${scenario?.title}": ${base.split('.')[0].trim()}.`,
      }
    }
    return {
      category,
      scenarioTitle: scenario?.title || 'Meme Frenzy Acceleration',
      narrativeText:
        scenario?.intelligenceBrief?.split('.')[0].trim() + '.' ||
        'Scenario meme narrative active — live LunarCrush feed upgrade available.',
    }
  }

  const copy = CATEGORY_COPY[category] || CATEGORY_COPY.unknown
  return {
    category,
    scenarioTitle: copy.scenarioTitle,
    narrativeText: `${display} — ${copy.summary}`,
  }
}

/**
 * Structured payload for expanded Narrative Evidence (SocialIntelligencePanel).
 * @param {string} [targetSymbol]
 */
export function buildCategoryNarrativePanelData(targetSymbol) {
  const sym = String(targetSymbol || '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
  const category = getTokenNarrativeCategory(sym)

  if (category === 'meme') {
    const scenario = getLunarCrushScenarioById(DEFAULT_SHOWCASE_SCENARIO_ID)
    const assetMatch = scenario?.trendingAssets?.filter((a) => a.symbol === sym) || []
    return {
      viewMode: 'meme_showcase',
      category,
      symbol: sym,
      scenario: {
        ...scenario,
        trendingAssets: assetMatch.length ? assetMatch : scenario?.trendingAssets || [],
      },
    }
  }

  const copy = CATEGORY_COPY[category] || CATEGORY_COPY.unknown
  const display = sym || 'Token'
  return {
    viewMode: 'category_fallback',
    category,
    symbol: sym,
    title: copy.scenarioTitle,
    severity: category === 'unknown' ? 'LOW' : 'MEDIUM',
    marketMood: 'neutral',
    sentimentScore: null,
    intelligenceBrief: `${display} — ${copy.summary}`,
    riskInterpretation: copy.riskInterpretation,
    trendingNarratives: copy.trendingNarratives || [],
    trendingAssets: [],
    recommendedActions: copy.recommendedActions || [],
  }
}
