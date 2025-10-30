import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Blockchain Configuration
 * Initializes provider and contract instances
 */

let provider;
let signer;

/**
 * Initialize Ethereum provider
 */
export function initProvider() {
  try {
    // Default to localhost if no RPC URL is specified
    const rpcUrl = process.env.RPC_URL || process.env.INFURA_API_URL || 'http://localhost:8545';
    
    // Create provider from RPC URL
    provider = new ethers.JsonRpcProvider(rpcUrl);
    
    console.log('✅ Blockchain provider initialized:', rpcUrl);
    
    // If private key is provided, create signer
    if (process.env.PRIVATE_KEY) {
      signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      console.log('✅ Signer initialized from private key');
    }
    
    return provider;
  } catch (error) {
    console.error('❌ Failed to initialize blockchain provider:', error.message);
    throw error;
  }
}

/**
 * Get blockchain provider
 */
export function getProvider() {
  if (!provider) {
    initProvider();
  }
  return provider;
}

/**
 * Get signer (if private key is configured)
 */
export function getSigner() {
  if (!signer && process.env.PRIVATE_KEY) {
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, getProvider());
  }
  return signer || provider;
}

/**
 * Get contract instance
 */
export function getContract(address, abi) {
  try {
    const contractProvider = process.env.PRIVATE_KEY ? getSigner() : getProvider();
    return new ethers.Contract(address, abi, contractProvider);
  } catch (error) {
    console.error('Failed to create contract instance:', error);
    throw error;
  }
}

/**
 * Check if address is valid
 */
export function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Format Ethereum addresses for display
 */
export function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

