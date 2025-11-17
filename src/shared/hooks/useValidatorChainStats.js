import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { getResilientProvider } from "../utils/resilientProvider";
import ConsensusAndStakingV2ABI from "../abi/ConsensusAndStaking.json";
import { fetchActiveValidatorsFromBackend } from "../services/validatorApi";

const stakingAbi = Array.isArray(ConsensusAndStakingV2ABI?.abi)
  ? ConsensusAndStakingV2ABI.abi
  : Array.isArray(ConsensusAndStakingV2ABI)
  ? ConsensusAndStakingV2ABI
  : [];

/**
 * 🎯 Single Source of Truth Hook for Validator Chain Stats
 * Provides consistent validator statistics across all components
 */
export function useValidatorChainStats({
  consensusAddress,
  account,
  backfillBlocks = 50000,
  refreshMs = 15000,
} = {}) {
  const [stats, setStats] = useState({
    activeValidators: 0,
    activeAddresses: [],
    backendActiveCount: 0,
    totalStaked: 0, // in SST (float)
    minStakeSST: 0, // in SST (float)
    rewardPerRoundSST: 0, // in SST (float)
    paused: false,
    addresses: [], // unique validator addresses detected
    avgAccuracy: 0, // average accuracy percentage
    activeStake: 0, // active stake amount (in SST)
    coolingStake: 0, // cooling stake amount (in SST)
    history: [], // stake history array
    lastUpdated: 0,
    error: null,
  });
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const provider = useMemo(() => getResilientProvider(), []);

  const contract = useMemo(() => {
    if (!consensusAddress || !stakingAbi.length) return null;
    try {
      return new ethers.Contract(consensusAddress, stakingAbi, provider);
    } catch (e) {
      console.warn("[useValidatorChainStats] Failed to create contract:", e);
      return null;
    }
  }, [consensusAddress, provider]);

  const toSST = (weiBN) => {
    try {
      return Number(ethers.formatUnits(weiBN ?? 0n, 18));
    } catch {
      return 0;
    }
  };

  const computeAverageAccuracy = (profiles = []) => {
    if (!profiles.length) return 0;

    const total = profiles.reduce((sum, p, i) => {
      let acc = 0;
      try {
        if (Array.isArray(p)) {
          // ValidatorProfile struct: [stakedAmount, accuracyScore, totalRewards, isActive, unstakeLockoutEnd, pendingUnstake]
          // accuracyScore is at index 1 (uint16, basis points: 0-10000 = 0-100%)
          acc = Number(p[1] ?? 0);
        } else if (typeof p === "object") {
          // Try object properties (ethers v6 may return named struct)
          acc = Number(
            p.accuracyScore ??
              p.accuracyBps ??
              p.accuracy ??
              p.validatorAccuracy ??
              p._accuracy ??
              0
          );
        }
      } catch (err) {
        console.warn("[useValidatorChainStats] Accuracy parse error", i, err);
      }
      if (Number.isNaN(acc) || acc < 0) acc = 0;
      console.log("[useValidatorChainStats] 🧩 profile", i, "→", p, "→ acc", acc);
      return sum + acc;
    }, 0);

    const avgRaw = total / profiles.length;
    // accuracyScore is stored in basis points (0-10000 = 0-100%)
    // Always divide by 100 to convert from basis points to percentage
    const avgPct = avgRaw / 100;
    
    // Clamp to reasonable range (0-100%)
    const clamped = Math.min(100, Math.max(0, avgPct));
    
    console.log(
      `[useValidatorChainStats] 🧮 computed avgAccuracy = ${clamped.toFixed(
        2
      )}% (raw=${avgRaw.toFixed(2)} bps) from ${profiles.length} profiles`
    );
    return Number(clamped.toFixed(2));
  };

  const refresh = useCallback(async () => {
    if (!contract) {
      setStats((s) => ({ ...s, error: "Contract not available" }));
      return;
    }

    setLoading(true);
    try {
      let backendActive = { active: [], count: 0 };
      try {
        backendActive = await fetchActiveValidatorsFromBackend();
      } catch (err) {
        console.warn("[useValidatorChainStats] backend active fetch failed:", err);
      }
      const backendActiveSet = new Set(backendActive.active);
      const backendActiveObserved = new Set();
      const activeAddressSet = new Set(backendActive.active);
      const latest = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latest - backfillBlocks);

      // --- Read base parameters (with retry logic)
      let minStakeRaw, rewardRaw, pausedFlag, activeCount;
      try {
        [activeCount, minStakeRaw, rewardRaw, pausedFlag] = await Promise.all([
          contract.getActiveValidatorCount?.().catch(() => 0n) ?? Promise.resolve(0n),
          contract.minStakeAmount?.().catch(() => 0n) ?? Promise.resolve(0n),
          contract.rewardPerRound?.().catch(() => 0n) ?? Promise.resolve(0n),
          contract.paused?.().catch(() => false) ?? Promise.resolve(false),
        ]);
      } catch (err) {
        console.warn("[useValidatorChainStats] RPC fetch failed, retrying once:", err);
        await new Promise((r) => setTimeout(r, 1500));
        try {
          [activeCount, minStakeRaw, rewardRaw, pausedFlag] = await Promise.all([
            contract.getActiveValidatorCount?.().catch(() => 0n) ?? Promise.resolve(0n),
            contract.minStakeAmount?.().catch(() => 0n) ?? Promise.resolve(0n),
            contract.rewardPerRound?.().catch(() => 0n) ?? Promise.resolve(0n),
            contract.paused?.().catch(() => false) ?? Promise.resolve(false),
          ]);
        } catch (finalErr) {
          console.error("[useValidatorChainStats] ⚠️ Final fetch failure:", finalErr);
          setStats((s) => ({
            ...s,
            error: "Failed to fetch on-chain stats",
            loading: false,
          }));
          return;
        }
      }

      // --- Collect validator addresses via events (with fallbacks)
      const addresses = new Set(backendActive.active);
      try {
        const registry = await contract.getValidatorList?.();
        if (Array.isArray(registry)) {
          registry.forEach((addr) => {
            if (addr) {
              addresses.add(String(addr).toLowerCase());
            }
          });
        }
      } catch (registryErr) {
        console.warn("[useValidatorChainStats] validator registry unavailable:", registryErr);
      }
      // Preferred: Staked(address indexed validator, uint256 amount)
      try {
        const evs = await contract.queryFilter(
          contract.filters.Staked?.(),
          fromBlock,
          "latest"
        );
        evs.forEach((ev) => {
          const addr = ev?.args?.validator || ev?.args?.[0];
          if (addr) addresses.add(String(addr).toLowerCase());
        });
      } catch (_) {
        // Fallback: ValidatorRegistered(address indexed validator,...)
        try {
          const evs = await contract.queryFilter(
            contract.filters.ValidatorRegistered?.(),
            fromBlock,
            "latest"
          );
          evs.forEach((ev) => {
            const addr = ev?.args?.validator || ev?.args?.[0];
            if (addr) addresses.add(String(addr).toLowerCase());
          });
        } catch (e2) {
          console.warn("[useValidatorChainStats] No event filters matched:", e2);
        }
      }

      // Self-include connected wallet if missing (for immediate UI after stake)
      if (account) {
        const lc = String(account).toLowerCase();
        if (!addresses.has(lc)) addresses.add(lc);
      }

      // --- Fetch profiles in parallel (tolerate failures)
      const addrs = Array.from(addresses);
      let activeCountFromProfiles = 0;
      let stakedTotal = 0;
      let activeStakeTotal = 0;
      let coolingStakeTotal = 0;
      const profiles = [];

      await Promise.all(
        addrs.map(async (addr) => {
          try {
            let normalizedAddress = addr;
            try {
              normalizedAddress = ethers.getAddress(addr);
            } catch (_) {
              // leave as provided to avoid throwing
            }

            const p = await contract.getValidatorProfile(normalizedAddress);
            // Expecting struct: [stakedAmount, accuracyScore, totalRewards, isActive, unstakeLockoutEnd, pendingUnstake]
            const staked = toSST(p?.stakedAmount ?? (Array.isArray(p) ? p[0] : 0n));
            const pendingUnstake = toSST(p?.pendingUnstake ?? (Array.isArray(p) ? p[5] : 0n));
            const isActive = Boolean(p?.isActive ?? (Array.isArray(p) ? p[3] : false));
            const lowerAddr = String(normalizedAddress).toLowerCase();
            const backendReportsActive = backendActiveSet.has(lowerAddr);
            
            if (staked > 0) {
              stakedTotal += staked;
              if (backendReportsActive) {
                backendActiveObserved.add(lowerAddr);
                activeStakeTotal += staked;
              } else if (isActive) {
                activeStakeTotal += staked;
              } else {
                coolingStakeTotal += staked;
              }
            }
            if (pendingUnstake > 0) {
              coolingStakeTotal += pendingUnstake;
            }
            if (isActive) {
              activeCountFromProfiles += 1;
            }
            if (backendReportsActive || isActive) {
              activeAddressSet.add(lowerAddr);
            }
            profiles.push(p); // Store profile for accuracy calculation
          } catch (e) {
            // ignore profile fetch error (address may not be a validator yet)
          }
        })
      );

      // Compute average accuracy from profiles
      const avgAccuracy = computeAverageAccuracy(profiles);

      // Use profile-based count (more reliable), fall back to on-chain count if profiles empty
      // If getActiveValidatorCount returns 0 or is unavailable, use profile count
      const onChainCount = Number(activeCount ?? 0);
      const backendObservedCount = backendActiveObserved.size;
      const finalActiveCount =
        backendActive.count > 0
          ? backendActive.count
          : backendObservedCount > 0
            ? backendObservedCount
            : activeCountFromProfiles > 0
              ? activeCountFromProfiles
              : onChainCount > 0
                ? onChainCount
                : 0;
      const activeAddresses =
        activeAddressSet.size > 0
          ? Array.from(activeAddressSet)
          : backendActive.active;
      
      console.log(
        `[useValidatorChainStats] Active count: on-chain=${onChainCount}, profiles=${activeCountFromProfiles}, final=${finalActiveCount}`
      );

      // Determine tier for current total stake
      const getTier = (stake) => {
        if (stake >= 50000) return "Elite";
        if (stake >= 10000) return "Pro";
        if (stake >= 1000) return "Entry";
        return null;
      };

      // Update history if stake changed (simple approach - could be enhanced with event listening)
      const prevStats = stats;
      const currentTier = getTier(stakedTotal);
      let history = Array.isArray(prevStats.history) ? [...prevStats.history] : [];
      
      // If total stake increased significantly, record it (simple heuristic)
      // Only add if the increase is substantial (avoid duplicates from small fluctuations)
      const stakeIncrease = stakedTotal - (prevStats.totalStaked || 0);
      if (stakeIncrease > 100) {
        const newEntry = {
          amount: stakeIncrease,
          timestamp: Date.now(),
          tier: currentTier || "Entry",
        };
        history.push(newEntry);
        // Keep last 20 entries
        if (history.length > 20) history = history.slice(-20);
      }

      const formatted = {
        activeValidators: finalActiveCount,
        activeAddresses,
        backendActiveCount: backendActive.count,
        totalStaked: Number(stakedTotal.toFixed(2)),
        minStakeSST: Number(toSST(minStakeRaw).toFixed(2)),
        rewardPerRoundSST: Number(toSST(rewardRaw).toFixed(2)),
        paused: !!pausedFlag,
        addresses: addrs,
        activeStake: Number(activeStakeTotal.toFixed(2)),
        coolingStake: Number(coolingStakeTotal.toFixed(2)),
        history: history,
        lastUpdated: Date.now(),
        error: null,
        avgAccuracy,
      };

      setStats(formatted);
      console.log(
        `[useValidatorChainStats] ✅ active(on-chain)=${String(
          activeCount ?? 0
        )} • backend=${backendActive.count} • ui=${finalActiveCount} | total=${stakedTotal.toFixed(
          2
        )} SST | avgAcc=${avgAccuracy}%`
      );
    } catch (e) {
      console.error("[useValidatorChainStats] refresh error:", e);
      setStats((s) => ({ ...s, error: e?.message || String(e) }));
    } finally {
      setLoading(false);
    }
  }, [contract, provider, backfillBlocks, account]);

  // Initial + interval refresh
  useEffect(() => {
    refresh();
    // listen to app-level update events
    const rerun = () => refresh();
    window.addEventListener("surestack:validatorUpdate", rerun);
    if (refreshMs > 0) {
      timerRef.current = setInterval(refresh, refreshMs);
    }
    return () => {
      window.removeEventListener("surestack:validatorUpdate", rerun);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh, refreshMs]);

  return { stats, loading, refresh };
}

