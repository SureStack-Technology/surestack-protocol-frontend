import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import consensusAbi from "@/abi/ConsensusAndStakingV2.json";
import { CONSENSUS_V2 } from "@/config/contracts";
import { usePocAnalytics } from "@shared/hooks/usePocAnalytics";

export function useConsensusStaking() {
  const { provider, signer, isConnected } = useWeb3();
  const { data } = usePocAnalytics();

  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addressRef = useRef(CONSENSUS_V2);

  useEffect(() => {
    const rawValidators = data?.validators?.validators ?? [];
    const mapped = rawValidators.map((validator, index) => {
      const stake = Number(validator.stake ?? validator.stakedAmount ?? 0);
      const rawAccuracy = (() => {
        if (typeof validator.accuracy === "number") return validator.accuracy;
        if (validator.consensusScore != null) {
          const score = Number(validator.consensusScore);
          return score > 1 ? score / 100 : score;
        }
        return 0;
      })();
      const normalizedAccuracy = Math.max(0, Math.min(1, rawAccuracy));

      return {
        id: validator.id ?? index + 1,
        address: validator.address ?? "0x0000000000000000000000000000000000000000",
        stake,
        stakedAmount: stake,
        stakeSST: stake,
        totalRewards: Number(validator.rewards ?? 0),
        rewards: Number(validator.rewards ?? 0),
        accuracy: normalizedAccuracy,
        accuracyScore: Number((normalizedAccuracy * 100).toFixed(2)),
        pendingUnstake: 0,
        tier: validator.tier ?? null,
        isActive: validator.status ? validator.status === "active" : true,
        status: validator.status ?? "active",
        uptime: validator.uptime ?? 95,
        performance: validator.performance ?? [],
      };
    });

    const tiered = mapped.map((validator) => ({
      ...validator,
      tier: computeTier(Number(validator.stake ?? validator.stakeSST ?? 0), Number(validator.accuracy ?? 0)),
    }));

    setValidators(tiered);
    setLoading(false);
    setError(null);
  }, [data]);

  const abi = consensusAbi?.abi || consensusAbi || [];
  const readContract = useMemo(() => {
    if (!addressRef.current || !provider || !abi.length) return null;
    try {
      return new ethers.Contract(addressRef.current, abi, provider);
    } catch (err) {
      console.warn("[ConsensusStaking] Failed to create read contract", err);
      return null;
    }
  }, [provider, abi]);

  const writeContract = useMemo(() => {
    if (!addressRef.current || !signer || !abi.length) return null;
    try {
      return new ethers.Contract(addressRef.current, abi, signer);
    } catch (err) {
      console.warn("[ConsensusStaking] Failed to create write contract", err);
      return null;
    }
  }, [signer, abi]);

  const refreshValidators = useCallback(async () => validators, [validators]);

  const stake = useCallback(
    async (amount) => {
      if (!writeContract) {
        return { success: false, error: new Error("contract not loaded") };
      }
      try {
        const parsedAmount = ethers.parseUnits(String(amount || 0), 18);
        const tx = await writeContract.stake(parsedAmount);
        await tx.wait();
        document.dispatchEvent(new CustomEvent("validators:refresh"));
        return { success: true, hash: tx.hash };
      } catch (err) {
        console.error("[ConsensusStaking] stake failed", err);
        return { success: false, error: err };
      }
    },
    [writeContract]
  );

  const requestUnstake = useCallback(
    async (amount) => {
      if (!writeContract) {
        return { success: false, error: new Error("contract not loaded") };
      }
      try {
        const parsedAmount = ethers.parseUnits(String(amount || 0), 18);
        const tx = await writeContract.requestUnstake(parsedAmount);
        await tx.wait();
        document.dispatchEvent(new CustomEvent("validators:refresh"));
        return { success: true, hash: tx.hash };
      } catch (err) {
        console.error("[ConsensusStaking] requestUnstake failed", err);
        return { success: false, error: err };
      }
    },
    [writeContract]
  );

  const withdrawUnstaked = useCallback(async () => {
    if (!writeContract) {
      return { success: false, error: new Error("contract not loaded") };
    }
    try {
      const tx = await writeContract.withdrawUnstakedFunds();
      await tx.wait();
      document.dispatchEvent(new CustomEvent("validators:refresh"));
      return { success: true, hash: tx.hash };
    } catch (err) {
      console.error("[ConsensusStaking] withdraw failed", err);
      return { success: false, error: err };
    }
  }, [writeContract]);

  const activateValidator = useCallback(async () => {
    document.dispatchEvent(new CustomEvent("validators:refresh"));
    return { success: true };
  }, []);

  const getValidatorProfile = useCallback(
    async (address) => validators.find((validator) => validator.address === address) ?? null,
    [validators]
  );

  const isReady = useMemo(() => Boolean(isConnected), [isConnected]);

  function computeTier(stake, accuracy) {
    if (stake >= 25000 && accuracy >= 0.8) return "T1";
    if (stake >= 10000 && accuracy >= 0.65) return "T2";
    return "T3";
  }

  return {
    validators,
    loading,
    error,
    isReady,
    getValidatorProfile,
    refreshValidators,
    stake,
    requestUnstake,
    withdrawUnstaked,
    activateValidator,
    readContract,
    writeContract,
  };
}
