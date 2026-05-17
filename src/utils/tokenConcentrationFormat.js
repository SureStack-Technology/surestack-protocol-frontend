/**
 * @param {object} tc
 */
function buildSolanaTokenConcentrationRows(tc) {
  const limited = !tc?.available || tc?.limitedMarketIntelligence

  if (limited && !tc?.liquidityConfirmed && !tc?.holderConcentration?.includes('%')) {
    return [
      { label: 'Holder concentration', value: 'Holder distribution estimate unavailable' },
      { label: 'Largest wallet', value: 'Unavailable' },
      { label: 'Liquidity status', value: 'Limited market intelligence available' },
      { label: 'Liquidity depth', value: 'Unavailable' },
      { label: 'Liquidity confidence', value: 'Unknown' },
      { label: 'Market routing', value: 'Limited market intelligence available' },
      { label: 'Trading activity', value: 'Trading activity not confidently observed' },
      { label: 'Token age', value: 'Unknown' },
      { label: 'Whale risk', value: tc?.whaleRisk || 'Unknown' },
      { label: 'Market cap', value: 'Unavailable' },
      { label: 'FDV', value: 'Unavailable' },
      { label: 'Active DEX', value: 'Unknown' },
      { label: 'Pair count', value: '—' },
    ]
  }

  return [
    { label: 'Holder concentration', value: tc.holderConcentration },
    { label: 'Largest wallet', value: tc.largestWallet },
    { label: 'Liquidity status', value: tc.liquidityStatus },
    { label: 'Liquidity depth', value: tc.liquidityDepth || 'Unavailable' },
    { label: 'Liquidity confidence', value: tc.liquidityConfidence || 'Unknown' },
    { label: 'Market routing', value: tc.marketRouting },
    { label: 'Trading activity', value: tc.tradingActivity || tc.tradingBehavior },
    { label: 'Token age', value: tc.tokenAge || tc.deploymentAge || 'Unknown' },
    { label: 'Whale risk', value: tc.whaleRisk },
    { label: 'Market cap', value: tc.marketCap || 'Unavailable' },
    { label: 'FDV', value: tc.fdv || 'Unavailable' },
    { label: 'Active DEX', value: tc.activeDex || 'Unknown' },
    {
      label: 'Pair count',
      value: tc.pairCount != null ? String(tc.pairCount) : '—',
    },
  ]
}

/**
 * @param {object | null | undefined} report
 */
export function buildTokenConcentrationIntelligenceRows(report) {
  const tc = report?.tokenConcentration
  const isSolana = report?.chain === 'solana' || tc?.platform === 'solana'

  if (isSolana) {
    return buildSolanaTokenConcentrationRows(tc || {})
  }

  if (!tc?.available) {
    return [
      { label: 'Holder concentration', value: 'Holder concentration unavailable' },
      { label: 'Largest wallet', value: 'Unavailable' },
      { label: 'Liquidity status', value: 'Liquidity intelligence unavailable' },
      { label: 'Whale risk', value: 'Unknown' },
      { label: 'Trading behavior', value: 'Insufficient holder / liquidity data' },
      { label: 'Deployment age', value: 'Unknown' },
    ]
  }

  return [
    { label: 'Holder concentration', value: tc.holderConcentration },
    { label: 'Largest wallet', value: tc.largestWallet },
    { label: 'Liquidity status', value: tc.liquidityStatus },
    { label: 'Liquidity concentration', value: tc.liquidityConcentration },
    { label: 'Whale risk', value: tc.whaleRisk },
    { label: 'Trading behavior', value: tc.tradingBehavior },
    { label: 'Deployment age', value: tc.deploymentAge },
    { label: 'Bundled wallets', value: tc.bundledWallets },
  ]
}

/**
 * @param {object | null | undefined} report
 */
export function verdictSubtitleFromReport(report) {
  if (report?.verdictActionFrame) return report.verdictActionFrame
  return null
}
