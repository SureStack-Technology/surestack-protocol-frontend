import { getDAOGovernanceContract, getRiskTokenContract } from '../config/contracts.js';
import { ethers } from 'ethers';

/**
 * Governance Service
 * Fetches DAO governance proposals and voting data
 */

/**
 * Get all active proposals
 */
export async function getAllProposals() {
  try {
    const contract = getDAOGovernanceContract();
    
    // Get voting period and delay
    const votingPeriod = await contract.votingPeriod();
    const votingDelay = await contract.votingDelay();
    
    // In production, you would emit and track proposal events
    // For now, return mock data
    const proposals = [];
    
    // Get proposal details for known proposal IDs (if any exist)
    // const proposalIds = [1, 2, 3]; // Track from events
    // for (const proposalId of proposalIds) {
    //   const proposal = await contract.proposalSnapshot(proposalId);
    //   ...
    // }
    
    return {
      success: true,
      data: {
        proposals,
        votingPeriod: votingPeriod.toString(),
        votingDelay: votingDelay.toString(),
        quorum: '4%', // From contract configuration
      },
    };
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return {
      success: false,
      error: error.message,
      data: { proposals: [], totalProposals: 0 },
    };
  }
}

/**
 * Get specific proposal details
 */
export async function getProposalDetails(proposalId) {
  try {
    const contract = getDAOGovernanceContract();
    
    // Get proposal state
    const state = await contract.state(proposalId);
    
    // Get proposal details
    const proposal = await contract.proposals(proposalId);
    
    return {
      success: true,
      data: {
        proposalId,
        state: state.toString(),
        // Add other proposal details as needed
      },
    };
  } catch (error) {
    console.error('Error fetching proposal details:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
}

/**
 * Get governance statistics
 */
export async function getGovernanceStats() {
  try {
    const contract = getDAOGovernanceContract();
    const tokenContract = getRiskTokenContract();
    
    const votingPeriod = await contract.votingPeriod();
    const votingDelay = await contract.votingDelay();
    const proposalThreshold = await contract.proposalThreshold();
    const quorum = await contract.quorum(await ethers.provider.getBlockNumber());
    
    const totalSupply = await tokenContract.totalSupply();
    
    return {
      success: true,
      data: {
        votingPeriod: votingPeriod.toString(),
        votingDelay: votingDelay.toString(),
        proposalThreshold: ethers.formatEther(proposalThreshold),
        quorum: quorum.toString(),
        totalSupply: ethers.formatEther(totalSupply),
      },
    };
  } catch (error) {
    console.error('Error fetching governance stats:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
}

