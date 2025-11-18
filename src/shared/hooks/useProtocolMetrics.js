/**
 * useProtocolMetrics (legacy compatibility layer)
 *
 * Historically this hook fetched protocol stats directly and exposed a rich structure consumed
 * across the dashboards. With the introduction of RiskAnalyticsView and the unified
 * useProtocolAnalytics hook, we delegate to that source and adapt the data into the
 * original shape so existing components can migrate progressively without breaking.
 */
import useProtocolAnalytics from "./useProtocolAnalytics";

export function useProtocolMetrics() {
  const { analytics, loading, error } = useProtocolAnalytics();

  const protocol = analytics?.protocol ?? {};
  const validators = analytics?.validators ?? {};
  const governance = analytics?.governance ?? {};
  const stress = analytics?.stress ?? {};
  const oracle = analytics?.oracle ?? {};

  return {
    loading,
    error,
    metrics: {
      protocolTotals: {
        totalCoverageUSD: protocol.totalCoverageUSD ?? 0,
        totalPremiumsSST: protocol.premiumBufferSST ?? 0,
        avgCoveragePct: protocol.avgPremiumPct ?? 0,
      },
      stakingTotals: {
        totalStakedSST: protocol.totalStakedSST ?? validators.totalStaked ?? 0,
        daoTreasurySST: protocol.treasurySST ?? 0,
      },
      policyTotals: {
        totalPolicies: protocol.activePolicies ?? 0,
      },
      oracle,
    },
    simpleMetrics: {
      totalCoverageUSD: protocol.totalCoverageUSD ?? 0,
      daoTreasurySST: protocol.treasurySST ?? 0,
      totalStakedSST: protocol.totalStakedSST ?? validators.totalStaked ?? 0,
      risk24h: stress.vol24h ?? 0,
      risk7d: stress.vol7d ?? 0,
      oracle,
      governance,
    },
  };
}

