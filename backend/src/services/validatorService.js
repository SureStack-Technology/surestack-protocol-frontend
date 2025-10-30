import { getConsensusStakingContract, getRewardPoolContract } from '../config/contracts.js';
import { ethers } from 'ethers';

/**
 * Validator Service
 * Fetches validator data from ConsensusAndStaking contract
 */

/**
 * Get all validators with their profiles
 * TODO: In production, fetch from Staked events
 */
export async function getAllValidators() {
  try {
    const contract = getConsensusStakingContract();
    
    // Get current round to access validator submissions
    const currentRoundId = await contract.currentRoundId();
    
    // Query events to find all validators who have staked
    const provider = contract.runner.provider;
    const filter = contract.filters.Staked();
    const events = await contract.queryFilter(filter, 0, 'latest');
    
    // Get unique validator addresses
    const validatorAddresses = [...new Set(events.map(e => e.args.validator))];
    
    // Fetch profiles for all validators
    const validators = await Promise.all(
      validatorAddresses.map(async (address) => {
        try {
          const profile = await contract.validatorProfiles(address);
          return {
            address,
            stakedAmount: ethers.formatEther(profile.stakedAmount || 0),
            accuracy: profile.accuracyScore ? (profile.accuracyScore / 100).toFixed(1) + '%' : '0%',
            rewards: ethers.formatEther(profile.totalRewards || 0),
            isActive: profile.isActive || false,
            status: profile.isActive ? 'Active' : 'Inactive',
          };
        } catch (err) {
          console.error(`Error fetching profile for ${address}:`, err.message);
          return null;
        }
      })
    );
    
    // Filter out null results
    const validValidators = validators.filter(v => v !== null);
    
    return {
      success: true,
      data: {
        validators: validValidators,
        currentRoundId: currentRoundId.toString(),
        totalActive: validValidators.filter(v => v.isActive).length,
      },
    };
  } catch (error) {
    console.error('Error fetching validators:', error);
    return {
      success: false,
      error: error.message,
      data: { validators: [], totalActive: 0 },
    };
  }
}

/**
 * Get specific validator details
 */
export async function getValidatorDetails(address) {
  try {
    const contract = getConsensusStakingContract();
    
    const profile = await contract.validatorProfiles(address);
    
    return {
      success: true,
      data: {
        address,
        stakedAmount: ethers.formatEther(profile.stakedAmount || 0),
        accuracyScore: profile.accuracyScore?.toString() || '0',
        totalRewards: ethers.formatEther(profile.totalRewards || 0),
        isActive: profile.isActive || false,
        unstakeLockoutEnd: profile.unstakeLockoutEnd?.toString() || '0',
      },
    };
  } catch (error) {
    console.error('Error fetching validator details:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
}

/**
 * Get validator staking statistics
 */
export async function getValidatorStats() {
  try {
    const contract = getConsensusStakingContract();
    
    // Get contract constants
    const minStake = await contract.MIN_STAKE_AMOUNT();
    const coolingPeriod = await contract.COOLING_OFF_PERIOD();
    const slashingThreshold = await contract.SLASHING_THRESHOLD();
    const currentRound = await contract.currentRoundId();
    
    return {
      success: true,
      data: {
        minimumStake: ethers.formatEther(minStake),
        coolingOffPeriod: coolingPeriod.toString(),
        slashingThreshold: slashingThreshold.toString(),
        currentRoundId: currentRound.toString(),
      },
    };
  } catch (error) {
    console.error('Error fetching validator stats:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
}

