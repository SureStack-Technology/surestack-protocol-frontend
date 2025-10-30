import { getRiskTokenContract } from '../config/contracts.js';
import { ethers } from 'ethers';

/**
 * Coverage Service
 * Fetches coverage pool data (mock implementation for now)
 */

/**
 * Get all coverage pools
 * Note: This is a mock implementation as coverage pools are not yet implemented in contracts
 */
export async function getAllCoveragePools() {
  try {
    // Mock data for now - in production, this would query on-chain data
    const pools = [
      {
        id: 1,
        name: 'DeFi Lending Pool',
        riskLevel: 'Low',
        coverageAmount: '1000000',
        premium: '2.5',
        participants: 45,
        totalStaked: '250000',
      },
      {
        id: 2,
        name: 'NFT Marketplace Pool',
        riskLevel: 'Medium',
        coverageAmount: '500000',
        premium: '4.0',
        participants: 28,
        totalStaked: '120000',
      },
      {
        id: 3,
        name: 'Bridge Pool',
        riskLevel: 'High',
        coverageAmount: '2000000',
        premium: '7.5',
        participants: 62,
        totalStaked: '450000',
      },
    ];
    
    return {
      success: true,
      data: {
        pools,
        totalPools: pools.length,
      },
    };
  } catch (error) {
    console.error('Error fetching coverage pools:', error);
    return {
      success: false,
      error: error.message,
      data: { pools: [], totalPools: 0 },
    };
  }
}

/**
 * Get specific coverage pool details
 */
export async function getCoveragePoolDetails(poolId) {
  try {
    // Mock implementation
    const pools = [
      {
        id: 1,
        name: 'DeFi Lending Pool',
        riskLevel: 'Low',
        coverageAmount: '1000000',
        premium: '2.5',
        participants: 45,
        totalStaked: '250000',
        description: ' Explorers lending protocol risk coverage',
      },
    ];
    
    const pool = pools.find(p => p.id === parseInt(poolId));
    
    if (!pool) {
      return {
        success: false,
        error: 'Pool not found',
        data: null,
      };
    }
    
    return {
      success: true,
      data: pool,
    };
  } catch (error) {
    console.error('Error fetching coverage pool details:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
}

/**
 * Get coverage statistics
 */
export async function getCoverageStats() {
  try {
    const contract = getRiskTokenContract();
    const totalSupply = await contract.totalSupply();
    
    return {
      success: true,
      data: {
        totalSupply: ethers.formatEther(totalSupply),
        totalPools: 3,
        totalCoverage: '3500000',
        totalStaked: '820000',
      },
    };
  } catch (error) {
    console.error('Error fetching coverage stats:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
}

