import { getConsensusStakingContract } from '../config/contracts.js';
import { ethers } from 'ethers';

/**
 * Normalize address consistently
 */
const normalizeAddress = (address) => {
  try {
    return ethers.getAddress(String(address));
  } catch {
    return String(address);
  }
};

/**
 * Load validator list by scanning Staked events
 */
export async function loadValidatorList() {
  try {
    const contract = getConsensusStakingContract();
    const provider = contract.runner?.provider;

    const filter = contract.filters.Staked?.();
    if (!provider || !filter) return [];

    const events = await contract.queryFilter(filter, 0, 'latest');

    const validatorAddresses = [
      ...new Set(events.map((e) => normalizeAddress(e.args.user))),
    ];

    return validatorAddresses;
  } catch (error) {
    console.error("Error loading validator list:", error);
    return [];
  }
}

/**
 * Fetch all validator profiles
 */
export async function getAllValidators() {
  try {
    const contract = getConsensusStakingContract();
    const validatorAddresses = await loadValidatorList();

    const validators = [];

    for (const addr of validatorAddresses) {
      try {
        const profile = await contract.validators(addr);

        const staked = profile.stakedAmount || 0n;
        const rewards = profile.accumulatedRewards || 0n;

        validators.push({
          address: addr,
          stakedAmount: ethers.formatEther(staked),
          accumulatedRewards: ethers.formatEther(rewards),
          cooldownEnd: profile.cooldownEnd?.toString() || "0",
          isActive: staked > 0n,
          status: staked > 0n ? "Active" : "Inactive",
        });
      } catch (err) {
        console.warn(`Error loading profile for ${addr}:`, err.message);
      }
    }

    return {
      success: true,
      data: {
        validators,
        totalActive: validators.filter(v => v.isActive).length,
        stakePool: validators.reduce((sum, v) => sum + Number(v.stakedAmount), 0),
      }
    };
  } catch (error) {
    console.error("Error fetching validators:", error);
    return {
      success: false,
      error: error.message,
      data: { validators: [], totalActive: 0, stakePool: 0 },
    };
  }
}

/**
 * Validator details endpoint
 */
export async function getValidatorDetails(address) {
  try {
    const contract = getConsensusStakingContract();
    const profile = await contract.validators(address);

    return {
      success: true,
      data: {
        address,
        stakedAmount: ethers.formatEther(profile.stakedAmount || 0n),
        accumulatedRewards: ethers.formatEther(profile.accumulatedRewards || 0n),
        cooldownEnd: profile.cooldownEnd?.toString() || "0",
        isActive: (profile.stakedAmount || 0n) > 0n,
      }
    };
  } catch (error) {
    console.error("Error fetching validator details:", error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
}

/**
 * Validator statistics (V2 only exposes minStakeAmount)
 */
export async function getValidatorStats() {
  try {
    const contract = getConsensusStakingContract();
    const minStake = await contract.minStakeAmount();

    return {
      success: true,
      data: {
        minimumStake: ethers.formatEther(minStake),
      }
    };
  } catch (error) {
    console.error("Error fetching validator stats:", error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
}

/**
 * Active validator list
 */
export async function getActiveValidators() {
  try {
    const contract = getConsensusStakingContract();
    const addresses = await loadValidatorList();

    const active = [];

    for (const addr of addresses) {
      const profile = await contract.validators(addr);
      if ((profile.stakedAmount || 0n) > 0n) {
        active.push(addr);
      }
    }

    return { active, count: active.length };
  } catch (error) {
    console.error("Error fetching active validators:", error);
    return { active: [], count: 0 };
  }
}