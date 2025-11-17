import { ethers } from "ethers";
import ConsensusAndStakingV2ABI from "@shared/abi/ConsensusAndStaking.json";
import DAOGovernanceABI from "@shared/abi/DAOGovernance.json";
import PolicyManagerABI from "@shared/abi/PolicyManager.json";
import deployments from "@shared/deployments/sepolia.json";
import { getHybridProvider } from "@/shared/rpc/providerManager";

/**
 * 🔄 Prefetch Functions
 * Warm up the cache by fetching data in the background
 */

let prefetchInitialized = false;

/**
 * Prefetch validator stats
 */
export async function prefetchValidatorStats() {
  if (prefetchInitialized) return;
  
  try {
    const consensusAddress = 
      import.meta.env.VITE_CONSENSUS_STAKING_V2_ADDRESS ||
      import.meta.env.VITE_CONSENSUS_ADDRESS ||
      deployments.ConsensusAndStakingV2;
    
    if (!consensusAddress) {
      console.warn("[Prefetch] Validator stats: Missing contract address");
      return;
    }

    const provider = getHybridProvider();
    const consensusAbi = Array.isArray(ConsensusAndStakingV2ABI?.abi)
      ? ConsensusAndStakingV2ABI.abi
      : Array.isArray(ConsensusAndStakingV2ABI)
      ? ConsensusAndStakingV2ABI
      : [];

    const contract = new ethers.Contract(
      consensusAddress,
      consensusAbi,
      provider
    );

    const [count, minStake, reward, paused] = await Promise.all([
      contract.getActiveValidatorCount().catch(() => 0n),
      contract.minStakeAmount().catch(() => 0n),
      contract.rewardPerRound().catch(() => 0n),
      contract.paused().catch(() => false),
    ]);

    const stats = {
      activeValidators: Number(count),
      minStakeSST: Number(ethers.formatEther(minStake)),
      rewardPerRoundSST: Number(ethers.formatEther(reward)),
      paused: !!paused,
    };

    // Store in cache (if useCachedContractRead is used)
    if (typeof window !== "undefined") {
      window.__surestack_cache = window.__surestack_cache || {};
      window.__surestack_cache.validatorStats = {
        data: stats,
        timestamp: Date.now(),
      };
    }

    console.log("[Prefetch] ✅ Validator stats cached:", stats);
  } catch (err) {
    console.warn("[Prefetch] ⚠️ Validator stats failed:", err);
  }
}

/**
 * Prefetch governance data
 */
export async function prefetchGovernanceData() {
  try {
    const governanceAddress = 
      import.meta.env.VITE_DAO_GOVERNANCE_ADDRESS ||
      import.meta.env.VITE_GOVERNANCE_ADDRESS ||
      deployments.DAOGovernance;
    
    if (!governanceAddress) {
      console.warn("[Prefetch] Governance: Missing contract address");
      return;
    }

    const provider = getHybridProvider();
    const contract = new ethers.Contract(
      governanceAddress,
      DAOGovernanceABI?.abi || [],
      provider
    );

    const [proposalThreshold, quorum] = await Promise.all([
      contract.proposalThreshold().catch(() => 0n),
      contract.quorum().catch(() => 0n),
    ]);

    const data = {
      proposalThreshold: Number(ethers.formatEther(proposalThreshold)),
      quorum: Number(ethers.formatEther(quorum)),
    };

    if (typeof window !== "undefined") {
      window.__surestack_cache = window.__surestack_cache || {};
      window.__surestack_cache.governanceData = {
        data,
        timestamp: Date.now(),
      };
    }

    console.log("[Prefetch] ✅ Governance data cached:", data);
  } catch (err) {
    console.warn("[Prefetch] ⚠️ Governance data failed:", err);
  }
}

/**
 * Prefetch policy manager stats
 */
export async function prefetchPolicyStats() {
  try {
    const policyAddress = import.meta.env.VITE_POLICY_MANAGER_ADDRESS || deployments.PolicyManager;
    
    if (!policyAddress) {
      console.warn("[Prefetch] Policy stats: Missing contract address");
      return;
    }

    const provider = getHybridProvider();
    const contract = new ethers.Contract(
      policyAddress,
      PolicyManagerABI?.abi || [],
      provider
    );

    // Try to fetch policy count (if available)
    const policyCount = await contract.policyCounter?.().catch(() => 0n);

    const data = {
      totalPolicies: Number(policyCount || 0n),
    };

    if (typeof window !== "undefined") {
      window.__surestack_cache = window.__surestack_cache || {};
      window.__surestack_cache.policyStats = {
        data,
        timestamp: Date.now(),
      };
    }

    console.log("[Prefetch] ✅ Policy stats cached:", data);
  } catch (err) {
    console.warn("[Prefetch] ⚠️ Policy stats failed:", err);
  }
}

/**
 * Initialize all prefetches
 */
export async function prefetchAll() {
  if (prefetchInitialized) return;
  prefetchInitialized = true;

  console.log("[Prefetch] 🚀 Starting background prefetch...");
  
  // Run all prefetches in parallel
  await Promise.allSettled([
    prefetchValidatorStats(),
    prefetchGovernanceData(),
    prefetchPolicyStats(),
  ]);

  console.log("[Prefetch] ✅ All prefetches completed");
}

