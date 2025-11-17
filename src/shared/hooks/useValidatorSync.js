import { useMemo } from "react"
import { guard } from "@/diagnostics/hookGuard"
import { usePocAnalytics } from "@shared/hooks/usePocAnalytics"

const FALLBACK_RESULT = {
  validators: [],
  stats: { totalStaked: 0, active: 0, avgAccuracy: 0 },
  connected: false,
  error: null,
}

export function useValidatorSync() {
  const { data } = usePocAnalytics()
  const validatorsData = data?.validators ?? {}
  const rawValidators = Array.isArray(validatorsData.validators) ? validatorsData.validators : []

  const validators = useMemo(
    () =>
      rawValidators.map((validator, index) => ({
        id: validator.id ?? index + 1,
        address: validator.address ?? "0x0000000000000000000000000000000000000000",
        stakeSST: validator.stake ?? validator.stakedAmount ?? 0,
        stakedAmount: validator.stake ?? validator.stakedAmount ?? 0,
        totalRewards: validator.rewards ?? 0,
        rewards: validator.rewards ?? 0,
        accuracyScore: validator.consensusScore ?? validator.accuracy ?? 0,
        performance: validator.performance ?? [],
        isActive: validator.status ? validator.status === "active" : true,
      })),
    [rawValidators]
  )

  const stats = useMemo(() => {
    if (!validators.length) {
      return {
        totalStaked: 0,
        active: 0,
        avgAccuracy: 0,
      }
    }

    const totalStaked = validators.reduce((sum, v) => sum + Number(v.stakeSST ?? 0), 0)
    const active = validators.filter((v) => v.isActive).length
    const avgAccuracy =
      validators.reduce((sum, v) => sum + Number(v.accuracyScore ?? 0), 0) / validators.length

    return {
      totalStaked,
      active,
      avgAccuracy: Number.isFinite(avgAccuracy) ? Number(avgAccuracy.toFixed(2)) : 0,
    }
  }, [validators])

  const result = {
    validators,
    stats,
    connected: false,
    error: null,
  }

  return guard("useValidatorSync", () => result, FALLBACK_RESULT)
}



