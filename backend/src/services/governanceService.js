import { getDAOGovernanceContract, getRiskTokenContract } from '../config/contracts.js';
import { ethers } from 'ethers';

/**
 * Governance Service
 * Fetches DAO governance proposals and voting data
 */

/**
 * Get all active proposals from events
 */
export async function getAllProposals() {
  try {
    const contract = getDAOGovernanceContract();
    const provider = contract.provider || new ethers.JsonRpcProvider(process.env.INFURA_API_URL || process.env.RPC_URL);
    
    // Get voting period and delay
    const votingPeriod = await contract.votingPeriod();
    const votingDelay = await contract.votingDelay();
    
    // Query ProposalCreated events
    const filter = contract.filters.ProposalCreated();
    const events = await contract.queryFilter(filter, 0, 'latest');
    
    const proposals = [];
    
    // Fetch proposal details for each event
    for (const event of events) {
      try {
        const parsed = contract.interface.parseLog(event);
        const proposalId = parsed.args.proposalId.toString();
        
        // Get proposal state and details
        const [state, snapshot, deadline, proposalVotes] = await Promise.all([
          contract.state(proposalId),
          contract.proposalSnapshot(proposalId),
          contract.proposalDeadline(proposalId),
          contract.proposalVotes(proposalId),
        ])
        
        // Get block timestamp
        const block = await provider.getBlock(event.blockNumber);
        
        proposals.push({
          id: proposalId,
          proposer: parsed.args.proposer,
          targets: parsed.args.targets,
          values: parsed.args.values.map(v => v.toString()),
          calldatas: parsed.args.calldatas,
          description: parsed.args.description,
          state: Number(state), // 0=Pending, 1=Active, 2=Canceled, 3=Defeated, 4=Succeeded, 5=Queued, 6=Expired, 7=Executed
          snapshot: Number(snapshot),
          deadline: Number(deadline),
          votes: {
            againstVotes: ethers.formatEther(proposalVotes.againstVotes),
            forVotes: ethers.formatEther(proposalVotes.forVotes),
            abstainVotes: ethers.formatEther(proposalVotes.abstainVotes),
          },
          timestamp: block.timestamp,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      } catch (err) {
        console.error(`Error fetching proposal ${event.args?.proposalId}:`, err);
      }
    }
    
    // Sort by ID (newest first)
    proposals.sort((a, b) => Number(b.id) - Number(a.id));
    
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
    const provider = contract.provider || new ethers.JsonRpcProvider(process.env.INFURA_API_URL || process.env.RPC_URL);
    
    // Get proposal state
    const state = await contract.state(proposalId);
    
    // Get proposal details
    const [snapshot, deadline, proposalVotes] = await Promise.all([
      contract.proposalSnapshot(proposalId),
      contract.proposalDeadline(proposalId),
      contract.proposalVotes(proposalId),
    ]);
    
    // Query ProposalCreated event for this proposal
    const filter = contract.filters.ProposalCreated(null, proposalId);
    const events = await contract.queryFilter(filter, 0, 'latest');
    
    let proposalData = null;
    if (events.length > 0) {
      const parsed = contract.interface.parseLog(events[0]);
      const block = await provider.getBlock(events[0].blockNumber);
      
      proposalData = {
        id: proposalId,
        proposer: parsed.args.proposer,
        targets: parsed.args.targets,
        values: parsed.args.values.map(v => v.toString()),
        calldatas: parsed.args.calldatas,
        description: parsed.args.description,
        descriptionHash: parsed.args.descriptionHash,
        state: Number(state),
        snapshot: Number(snapshot),
        deadline: Number(deadline),
        votes: {
          againstVotes: ethers.formatEther(proposalVotes.againstVotes),
          forVotes: ethers.formatEther(proposalVotes.forVotes),
          abstainVotes: ethers.formatEther(proposalVotes.abstainVotes),
        },
        timestamp: block.timestamp,
        txHash: events[0].transactionHash,
        blockNumber: events[0].blockNumber,
      };
    }
    
    return {
      success: true,
      data: proposalData,
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
    const provider = contract.provider || new ethers.JsonRpcProvider(process.env.INFURA_API_URL || process.env.RPC_URL);
    
    const votingPeriod = await contract.votingPeriod();
    const votingDelay = await contract.votingDelay();
    const proposalThreshold = await contract.proposalThreshold();
    const currentBlock = await provider.getBlockNumber();
    const quorum = await contract.quorum(currentBlock);
    
    const totalSupply = await tokenContract.totalSupply();
    
    return {
      success: true,
      data: {
        votingPeriod: votingPeriod.toString(),
        votingDelay: votingDelay.toString(),
        proposalThreshold: ethers.formatEther(proposalThreshold),
        quorum: ethers.formatEther(quorum),
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

/**
 * Create a new proposal
 * NOTE: This is a stub - actual proposal creation should be done on the frontend with MetaMask
 */
export async function createProposal(targets, values, calldatas, description, signature) {
  // This endpoint is for reference only - actual proposal creation should be done on the frontend
  return {
    success: false,
    error: 'Proposal creation must be done on the frontend with MetaMask. Use the useProposals hook.',
    data: null,
  };
}

/**
 * Cast a vote on a proposal
 * NOTE: This is a stub - actual voting should be done on the frontend with MetaMask
 */
export async function castVote(proposalId, support, reason, signature) {
  // This endpoint is for reference only - actual voting should be done on the frontend
  return {
    success: false,
    error: 'Voting must be done on the frontend with MetaMask. Use the useVoting hook.',
    data: null,
  };
}

/**
 * Queue a proposal for timelock execution
 * NOTE: This is a stub - actual queueing should be done on the frontend with MetaMask
 */
export async function queueProposal(proposalId, signature) {
  // This endpoint is for reference only - actual queueing should be done on the frontend
  return {
    success: false,
    error: 'Proposal queueing must be done on the frontend with MetaMask. Use the useProposals hook.',
    data: null,
  };
}

/**
 * Execute a queued proposal after timelock
 * NOTE: This is a stub - actual execution should be done on the frontend with MetaMask
 */
export async function executeProposal(proposalId, signature) {
  // This endpoint is for reference only - actual execution should be done on the frontend
  return {
    success: false,
    error: 'Proposal execution must be done on the frontend with MetaMask. Use the useProposals hook.',
    data: null,
  };
}

