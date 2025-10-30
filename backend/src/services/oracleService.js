import { ethers } from 'ethers';
import { getProvider } from '../config/blockchain.js';

/**
 * Oracle Service
 * Fetches Chainlink price feed data for ETH/USD
 */

const ORACLE_ABI = [
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
  "function version() view returns (uint256)"
];

/**
 * Chainlink ETH/USD Oracle addresses by network
 */
const ORACLE_ADDRESSES = {
  mainnet: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  sepolia: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  localhost: process.env.CHAINLINK_ORACLE_ADDRESS || '0x694AA1769357215DE4FAC081bf1f309aDC325306'
};

/**
 * Get oracle address for current network
 */
function getOracleAddress() {
  const network = process.env.NETWORK || 'sepolia';
  return ORACLE_ADDRESSES[network] || ORACLE_ADDRESSES.sepolia;
}

/**
 * Get latest ETH/USD price from Chainlink
 */
export async function getOracleData() {
  try {
    const provider = getProvider();
    const oracleAddress = getOracleAddress();
    
    const oracle = new ethers.Contract(oracleAddress, ORACLE_ABI, provider);
    
    // Get latest round data
    const [roundId, answer, startedAt, updatedAt, answeredInRound] = await oracle.latestRoundData();
    
    // Get decimals for proper formatting
    const decimals = await oracle.decimals();
    
    // Get metadata
    const description = await oracle.description();
    const version = await oracle.version();
    
    return {
      success: true,
      data: {
        roundId: roundId.toString(),
        price: Number(answer) / Math.pow(10, Number(decimals)),
        priceRaw: answer.toString(),
        startedAt: new Date(Number(startedAt) * 1000).toISOString(),
        updatedAt: new Date(Number(updatedAt) * 1000).toISOString(),
        updatedAtTimestamp: Number(updatedAt),
        answeredInRound: answeredInRound.toString(),
        decimals: Number(decimals),
        description,
        version: version.toString(),
        oracleAddress,
      }
    };
  } catch (error) {
    console.error('Error fetching oracle data:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Get price with refresh timestamp
 */
export async function getPriceWithRefresh() {
  const result = await getOracleData();
  return {
    ...result,
    fetchedAt: new Date().toISOString()
  };
}


