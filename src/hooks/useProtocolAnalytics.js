import { usePocAnalytics } from "@shared/hooks/usePocAnalytics";

export function useProtocolAnalytics() {
  const { data, loading, error } = usePocAnalytics();

  const protocol = data?.protocol ?? {};
  const validators = data?.validators ?? {};
  const governance = data?.governance ?? {};
  const stress = data?.stress ?? {};
  const oracle = data?.oracle ?? {};

  const staking = {
    totalStakedSST: protocol.totalStakedSST ?? validators.totalStaked ?? 0,
    daoTreasurySST: protocol.treasurySST ?? 0,
    validatorCount: validators.total ?? 0,
    totalRewardsDistributed: validators.totalRewards ?? 0,
  };

  const rewards = {
    totalRewardsDistributed: validators.totalRewards ?? 0,
  };

  const volatility = {
    sigma30: stress.vol24h ?? 0,
    sigma7: stress.vol7d ?? 0,
    lastPrice: oracle.ethPrice ?? 0,
  };

  return {
    analytics: data,
    loading,
    error,
    protocol,
    staking,
    rewards,
    volatility,
    governance,
  };
}

export default useProtocolAnalytics;

