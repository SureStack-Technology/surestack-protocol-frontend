import { useMemo, useEffect, useState, useCallback } from "react";
import { useConsensusStaking } from "@/hooks/useConsensusStaking";
import { fetchActiveValidatorsFromBackend } from "@shared/services/validatorApi";

// TODO: Wire to on-chain validator registry once endpoint is finalized.

export function getValidatorTier(stakeSST) {
  if (stakeSST >= 100_000) return "Tier 3";
  if (stakeSST >= 50_000) return "Tier 2";
  if (stakeSST >= 10_000) return "Tier 1";
  return "Tier 0";
}

export function useValidators() {
  const {
    validators: consensusValidators,
    loading,
    error,
    refreshValidators: refreshConsensus,
  } = useConsensusStaking();

  const [backendActive, setBackendActive] = useState({ active: [], count: 0 });

  const refreshBackend = useCallback(
    async (options = {}) => {
      try {
        const result = await fetchActiveValidatorsFromBackend(options);
        setBackendActive(result);
        return result;
      } catch (err) {
        console.warn("[useValidators] backend active fetch failed:", err);
        const fallback = { active: [], count: 0 };
        setBackendActive(fallback);
        return fallback;
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    refreshBackend({ signal: controller.signal });
    const interval = setInterval(() => {
      refreshBackend();
    }, 30000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [refreshBackend]);

  const backendActiveSet = useMemo(
    () => new Set((backendActive.active || []).map((addr) => String(addr).toLowerCase())),
    [backendActive]
  );

  const sourceValidators = useMemo(() => {
    if (!Array.isArray(consensusValidators)) return [];
    return consensusValidators.map((validator) => {
      const address = validator.address;
      const lower = String(address || "").toLowerCase();
      const backendIsActive = backendActiveSet.has(lower);
      const stakeValue = Number(validator.stakedAmount ?? validator.stakeSST ?? 0);
      const totalRewards = Number(validator.totalRewards ?? 0);
      const accuracyScore = Number(
        validator.accuracyScore ?? validator.accuracy ?? 0
      );
      const pendingUnstake = Number(validator.pendingUnstake ?? 0);

      return {
        ...validator,
        id: address,
        address,
        name:
          address?.slice(0, 6) === "0x0000"
            ? `Validator ${address.slice(-4)}`
            : address,
        stakeSST: stakeValue,
        stakedAmount: stakeValue,
        totalRewards,
        pendingUnstake,
        commission: validator.commission ?? null,
        status: backendIsActive
          ? "active"
          : validator.status
          ? validator.status
          : validator.isActive
          ? "active"
          : "inactive",
        isActive: backendIsActive || Boolean(validator.isActive),
        uptime: validator.uptime ?? 95,
        accuracy: accuracyScore,
        accuracyScore,
        tier: getValidatorTier(stakeValue),
      };
    });
  }, [consensusValidators, backendActiveSet]);

  const validators = useMemo(() => {
    return sourceValidators
      .map((validator, idx) => {
        const stake = Number(validator.stakeSST || 0);
        return {
          ...validator,
          name: validator.name || `Validator ${idx + 1}`,
          status: validator.status || "active",
          uptime: validator.uptime ?? 95,
          tier: getValidatorTier(stake),
        };
      })
      .sort((a, b) => b.stakeSST - a.stakeSST);
  }, [sourceValidators]);

  const totals = useMemo(() => {
    const totalStakeSST = validators.reduce((total, validator) => total + (validator.stakeSST || 0), 0);
    const totalCount = validators.length;
    const computedActive = validators.filter((validator) => validator.status === "active").length;
    const activeCount =
      backendActive.count > 0 ? backendActive.count : computedActive;
    const inactiveCount = Math.max(totalCount - activeCount, 0);

    return {
      activeCount,
      totalCount,
      inactiveCount,
      totalStakeSST,
    };
  }, [validators, backendActive]);

  useEffect(() => {
    console.log(
      "%c🧱 useValidators ready (Option A: stake-based tiers)",
      "color:#00fff0;font-weight:bold;"
    );
  }, []);

  useEffect(() => {
    console.log("[Validators] totals", totals, "validators", validators);
    console.log("%c🔄 useValidators updated (Consensus mode)", "color:#ff00ff");
  }, [totals, validators]);

  const refreshValidators = useCallback(
    async (...args) => {
      let result = [];
      if (typeof refreshConsensus === "function") {
        result = await refreshConsensus(...args);
      }
      await refreshBackend();
      return result;
    },
    [refreshConsensus, refreshBackend]
  );

  return {
    loading,
    error,
    validators,
    totals,
    refreshValidators,
  };
}
