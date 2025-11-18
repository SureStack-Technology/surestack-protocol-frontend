import { useMemo } from 'react'
import { usePocAnalytics } from '@shared/hooks/usePocAnalytics'

const POC_ADDRESS = 'poc://risk-analytics-view'

const toPromise = (value) => Promise.resolve(value)

export function useRiskAnalyticsView() {
  const { data } = usePocAnalytics()
  const analytics = data ?? {}

  const globalSummary = useMemo(
    () => ({
      totalCoverageUSD: analytics.protocol?.totalCoverageUSD ?? 0,
      totalPolicies: analytics.protocol?.activePolicies ?? 0,
      totalPremiumsSST: analytics.protocol?.premiumBufferSST ?? 0,
      daoTreasurySST: analytics.protocol?.treasurySST ?? 0,
    }),
    [analytics]
  )

  const validatorSummary = useMemo(
    () => ({
      totalValidators:
        analytics.validators?.validatorSummary?.totalValidators ?? analytics.validators?.total ?? 0,
      activeValidators:
        analytics.validators?.validatorSummary?.activeValidators ?? analytics.validators?.active ?? 0,
      inactiveValidators:
        analytics.validators?.validatorSummary?.inactiveValidators ?? analytics.validators?.inactive ?? 0,
      totalStakedSST:
        analytics.validators?.validatorSummary?.totalStaked ?? analytics.protocol?.totalStakedSST ?? 0,
      totalRewards:
        analytics.validators?.validatorSummary?.totalRewards ?? analytics.validators?.totalRewards ?? 0,
      topValidators: analytics.validators?.validators ?? [],
    }),
    [analytics]
  )

  const governanceSummary = useMemo(
    () => ({
      proposalCount: analytics.governance?.proposalCount ?? 0,
      latestProposals: analytics.governance?.active ?? [],
      threshold: analytics.governance?.threshold ?? 0,
      quorumRequirement: analytics.governance?.quorum ?? 0,
      votingPower: analytics.governance?.votingPower ?? 0,
    }),
    [analytics]
  )

  const volatilityImpact = useMemo(
    () => ({
      sigma30: analytics.stress?.vol7d ?? 0,
      effectiveVolatility: analytics.stress?.vol24h ?? 0,
      latestPrice: analytics.oracle?.ethPrice ?? analytics.stress?.currentPrice ?? 0,
    }),
    [analytics]
  )

  const riskPools = analytics.riskPools?.pools ?? []
  const policies = analytics.claims?.list ?? []

  return {
    address: POC_ADDRESS,
    ready: true,
    getGlobalSummary: () => toPromise(globalSummary),
    getRiskLineSummary: (name) =>
      toPromise(riskPools.find((pool) => pool.name === name) ?? null),
    getRiskLineSummaries: (names = []) =>
      toPromise(
        Array.isArray(names) && names.length
          ? names.map((name) => riskPools.find((pool) => pool.name === name) ?? null)
          : riskPools
      ),
    getPolicies: () => toPromise(policies),
    getPolicyRecord: (policyId) =>
      toPromise(policies.find((policy) => String(policy.id) === String(policyId)) ?? null),
    getValidatorSummary: () => toPromise(validatorSummary),
    getGovernanceSummary: () => toPromise(governanceSummary),
    getVolatilityImpact: () => toPromise(volatilityImpact),
  }
}

