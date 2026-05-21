/**
 * Simulated LunarCrush social intelligence — investor/demo showcase only.
 * Not live market data. Used when provider status is fallback or unavailable.
 */

export const LUNARCRUSH_SCENARIO_SHOWCASE_DISCLOSURE =
  'Scenario Showcase uses simulated social intelligence data to demonstrate how SureStack will interpret premium LunarCrush signals once full provider access is enabled. Wallet risk, contract intelligence, and oracle feeds remain separate from this simulation.'

export const LUNARCRUSH_SCENARIO_IDS = [
  'meme_frenzy_acceleration',
  'exploit_panic_cascade',
  'smart_money_divergence',
  'narrative_reversal_recovery',
]

/** @typedef {typeof LUNARCRUSH_SCENARIOS[number]} LunarCrushShowcaseScenario */

export const LUNARCRUSH_SCENARIOS = [
  {
    id: 'meme_frenzy_acceleration',
    title: 'Meme Frenzy Acceleration',
    label: 'Meme Frenzy Acceleration',
    severity: 'HIGH',
    marketMood: 'bullish',
    sentimentScore: 78,
    socialVelocity: 142,
    socialVolume: 2840000,
    anomalyConfidence: 86,
    influencerAmplification: 'Elevated',
    retailActivity: 'Surging',
    whaleSignal: 'Neutral — distribution not confirmed',
    narrativeStrength: 81,
    riskInterpretation:
      'Retail-led narrative velocity is outpacing on-chain confirmation. Meme clusters show coordinated posting windows and shallow liquidity support.',
    trendingNarratives: [
      { topic: 'meme_rotation', title: 'Meme rotation cycle', rank: 2, interactions24h: 4200000 },
      { topic: 'sol_ecosystem', title: 'SOL ecosystem hype', rank: 5, interactions24h: 2100000 },
      { topic: 'airdrop_farming', title: 'Airdrop farming chatter', rank: 11, interactions24h: 980000 },
    ],
    trendingAssets: [
      { symbol: 'WIF', name: 'dogwifhat', sentiment: 82, interactions24h: 890000, percentChange24h: 18.4 },
      { symbol: 'PEPE', name: 'Pepe', sentiment: 76, interactions24h: 1200000, percentChange24h: 12.1 },
      { symbol: 'BONK', name: 'Bonk', sentiment: 74, interactions24h: 640000, percentChange24h: 9.8 },
    ],
    anomalySignals: [
      { type: 'velocity_spike', label: 'Social velocity +142% vs 7d baseline', severity: 'HIGH' },
      { type: 'retail_cluster', label: 'Retail mention cluster — 4h synchronized burst', severity: 'WATCH' },
      { type: 'liquidity_gap', label: 'Narrative strength exceeds DEX depth on 3 assets', severity: 'WATCH' },
    ],
    intelligenceBrief:
      'Social layers are pricing a reflexive meme cycle before fundamentals catch up. Influencer amplification is broad but shallow — engagement is high on short-form channels while institutional discourse remains muted. Treat new exposure as narrative risk: approvals and bridge flows into thin pools should be reviewed before size increases.',
    recommendedActions: [
      'Tighten approval review on wallets with fresh meme-token inflows',
      'Flag contracts with <72h liquidity history in Universal Risk Scanner',
      'Pause discretionary size-up until social velocity mean-reverts',
    ],
  },
  {
    id: 'exploit_panic_cascade',
    title: 'Exploit Panic Cascade',
    label: 'Exploit Panic Cascade',
    severity: 'CRITICAL',
    marketMood: 'bearish',
    sentimentScore: 34,
    socialVelocity: 198,
    socialVolume: 4100000,
    anomalyConfidence: 92,
    influencerAmplification: 'High — fear narratives dominant',
    retailActivity: 'Panic posting',
    whaleSignal: 'Defensive — stablecoin rotation signals',
    narrativeStrength: 88,
    riskInterpretation:
      'Exploit headlines are driving correlated sell commentary across majors and DeFi. Social fear is front-running price discovery on several bridge-adjacent names.',
    trendingNarratives: [
      { topic: 'bridge_exploit', title: 'Bridge exploit headlines', rank: 1, interactions24h: 5200000 },
      { topic: 'defi_withdrawals', title: 'DeFi withdrawal anxiety', rank: 3, interactions24h: 2800000 },
      { topic: 'cex_outflows', title: 'CEX outflow speculation', rank: 8, interactions24h: 1100000 },
    ],
    trendingAssets: [
      { symbol: 'ETH', name: 'Ethereum', sentiment: 41, interactions24h: 3200000, percentChange24h: -5.2 },
      { symbol: 'USDC', name: 'USD Coin', sentiment: 58, interactions24h: 890000, percentChange24h: 0.1 },
      { symbol: 'ARB', name: 'Arbitrum', sentiment: 29, interactions24h: 720000, percentChange24h: -8.7 },
    ],
    anomalySignals: [
      { type: 'fear_cascade', label: 'Cross-topic fear correlation 0.87 (24h)', severity: 'HIGH' },
      { type: 'bridge_mentions', label: 'Bridge-risk mentions +310% hour-over-hour', severity: 'HIGH' },
      { type: 'whale_stablecoin', label: 'Whale discourse skew → stablecoin safety', severity: 'WATCH' },
    ],
    intelligenceBrief:
      'A classic panic cascade pattern: exploit news is compressing sentiment across unrelated assets. Retail activity is reactive; whale signal language favors capital preservation. This is a high-conviction moment to verify wallet exposure to affected protocols and pause new approvals until official post-mortems land.',
    recommendedActions: [
      'Run Prime approval inventory sweep on verified wallets',
      'Revoke or reduce limits on bridge-adjacent spenders',
      'Cross-check contract intel on any protocol named in exploit threads',
    ],
  },
  {
    id: 'smart_money_divergence',
    title: 'Smart Money Divergence',
    label: 'Smart Money Divergence',
    severity: 'MEDIUM',
    marketMood: 'neutral',
    sentimentScore: 52,
    socialVelocity: 67,
    socialVolume: 1650000,
    anomalyConfidence: 79,
    influencerAmplification: 'Moderate — quality accounts diverging',
    retailActivity: 'Muted',
    whaleSignal: 'Accumulation language on L1 majors',
    narrativeStrength: 64,
    riskInterpretation:
      'Retail sentiment is flat while curated accounts discuss accumulation. Divergence often precedes volatility expansion — direction unresolved.',
    trendingNarratives: [
      { topic: 'btc_accumulation', title: 'BTC accumulation thesis', rank: 4, interactions24h: 1900000 },
      { topic: 'etf_flows', title: 'ETF flow interpretation', rank: 7, interactions24h: 1400000 },
      { topic: 'layer2_tvl', title: 'L2 TVL rotation debate', rank: 14, interactions24h: 620000 },
    ],
    trendingAssets: [
      { symbol: 'BTC', name: 'Bitcoin', sentiment: 61, interactions24h: 4100000, percentChange24h: 1.8 },
      { symbol: 'ETH', name: 'Ethereum', sentiment: 55, interactions24h: 2800000, percentChange24h: 0.4 },
      { symbol: 'SOL', name: 'Solana', sentiment: 58, interactions24h: 1500000, percentChange24h: 3.2 },
    ],
    anomalySignals: [
      { type: 'sentiment_divergence', label: 'Retail vs curated sentiment gap +18 pts', severity: 'WATCH' },
      { type: 'whale_language', label: 'Whale-keyword posts up 44% (48h)', severity: 'INFO' },
      { type: 'low_retail', label: 'Retail velocity below 30d median', severity: 'INFO' },
    ],
    intelligenceBrief:
      'Smart-money discourse is warming on majors while retail channels stay quiet — a divergence that often resolves with a directional impulse. No single narrative dominates; accumulation framing is strongest on BTC/ETH. Maintain discipline: verify that wallet positioning matches your risk policy before chasing social lead indicators.',
    recommendedActions: [
      'Compare wallet holdings vs discussed accumulation themes',
      'Monitor scenario lab for drawdown stress on current book',
      'Defer reactive trades until retail velocity confirms direction',
    ],
  },
  {
    id: 'narrative_reversal_recovery',
    title: 'Narrative Reversal Recovery',
    label: 'Narrative Reversal Recovery',
    severity: 'MEDIUM',
    marketMood: 'bullish',
    sentimentScore: 66,
    socialVelocity: 89,
    socialVolume: 2230000,
    anomalyConfidence: 74,
    influencerAmplification: 'Rising — recovery narratives',
    retailActivity: 'Re-engaging',
    whaleSignal: 'Risk-on tone returning',
    narrativeStrength: 72,
    riskInterpretation:
      'Sentiment is recovering from a prior fear window. Recovery narratives are broadening but still fragile — watch for false reversals on low-volume bounces.',
    trendingNarratives: [
      { topic: 'market_recovery', title: 'Market recovery narrative', rank: 6, interactions24h: 1750000 },
      { topic: 'rate_cut_hope', title: 'Macro relief speculation', rank: 9, interactions24h: 980000 },
      { topic: 'defi_rebound', title: 'DeFi rebound chatter', rank: 12, interactions24h: 740000 },
    ],
    trendingAssets: [
      { symbol: 'ETH', name: 'Ethereum', sentiment: 68, interactions24h: 2600000, percentChange24h: 4.1 },
      { symbol: 'LINK', name: 'Chainlink', sentiment: 71, interactions24h: 520000, percentChange24h: 6.3 },
      { symbol: 'AVAX', name: 'Avalanche', sentiment: 64, interactions24h: 380000, percentChange24h: 5.0 },
    ],
    anomalySignals: [
      { type: 'sentiment_reversal', label: 'Sentiment reversal +22 pts from 72h low', severity: 'WATCH' },
      { type: 'volume_return', label: 'Social volume reclaiming 20d VWAP', severity: 'INFO' },
      { type: 'false_bounce', label: 'False-bounce risk on 2 mid-cap names', severity: 'WATCH' },
    ],
    intelligenceBrief:
      'Narrative tone is shifting from defense to selective risk-on. Recovery language is spreading across majors and infrastructure tokens, but anomaly models still flag bounce fragility on mid-caps. Use this window to re-baseline wallet health scores and confirm that prior panic-driven approvals were addressed.',
    recommendedActions: [
      'Refresh AI Wallet Risk Analyst brief after sentiment shift',
      'Validate remaining unlimited approvals from panic window',
      'Document baseline scores for next 7d timeline comparison',
    ],
  },
]

export const DEFAULT_SHOWCASE_SCENARIO_ID = LUNARCRUSH_SCENARIO_IDS[0]

/**
 * @param {string} id
 * @returns {typeof LUNARCRUSH_SCENARIOS[number] | undefined}
 */
export function getLunarCrushScenarioById(id) {
  return LUNARCRUSH_SCENARIOS.find((s) => s.id === id)
}

export function isLiveLunarCrushStatus(status) {
  return status === 'live'
}
