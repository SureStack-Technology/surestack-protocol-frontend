import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getContract } from './blockchain.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load ABI from JSON file
 */
function loadABI(contractName) {
  try {
    // Try loading from root directory first (for consensus_abi.json, reward_abi.json)
    const rootAbiPath = join(__dirname, '../../..', `${contractName.toLowerCase()}_abi.json`);
    try {
      const abiData = JSON.parse(readFileSync(rootAbiPath, 'utf-8'));
      if (Array.isArray(abiData)) return abiData;
      if (abiData.abi) return abiData.abi;
      return abiData;
    } catch (e) {
      // If not found, try loading from artifacts
      try {
        const artifactPath = join(__dirname, '../../..', 'artifacts/contracts', `${contractName}.sol`, `${contractName}.json`);
        const artifactData = JSON.parse(readFileSync(artifactPath, 'utf-8'));
        return artifactData.abi || [];
      } catch (e2) {
        // Fallback: support cases where file name != contract name
        const fileNameMap = {
          RISKToken: 'SureStackToken',
        };
        const altFile = fileNameMap[contractName];
        if (altFile) {
          const altPath = join(__dirname, '../../..', 'artifacts/contracts', `${altFile}.sol`, `${contractName}.json`);
          const altData = JSON.parse(readFileSync(altPath, 'utf-8'));
          return altData.abi || [];
        }
        throw e2;
      }
    }
  } catch (error) {
    console.error(`Failed to load ABI for ${contractName}:`, error.message);
    return [];
  }
}

/**
 * Load deployment info to get contract addresses
 */
function loadDeploymentInfo() {
  try {
    const deploymentPath = join(__dirname, '../../..', 'deployment-info.json');
    const deploymentData = JSON.parse(readFileSync(deploymentPath, 'utf-8'));
    return deploymentData.deployment;
  } catch (error) {
    console.warn('Failed to load deployment info:', error.message);
    return null;
  }
}

/**
 * Contract ABIs
 */
export const SURESTACK_TOKEN_ABI = loadABI('SureStackToken');
export const CONSENSUS_ABI = loadABI('ConsensusAndStaking');
export const REWARD_POOL_ABI = loadABI('RewardPoolAndSlasher');
export const DAO_GOVERNANCE_ABI = loadABI('DAOGovernance');
export const ORACLE_INTEGRATION_ABI = loadABI('OracleIntegration') || loadABI('OracleReader');

/**
 * Contract addresses from environment or deployment info
 */
const deploymentInfo = loadDeploymentInfo();

export const CONTRACT_ADDRESSES = {
  SURESTACK_TOKEN: process.env.RISK_TOKEN_CONTRACT || deploymentInfo?.riskToken,
  CONSENSUS_STAKING: process.env.CONSENSUS_CONTRACT || deploymentInfo?.staking,
  REWARD_POOL: process.env.REWARD_POOL_CONTRACT || deploymentInfo?.rewardPool,
  DAO_GOVERNANCE: process.env.DAO_CONTRACT || deploymentInfo?.dao,
  TIMELOCK: process.env.TIMELOCK_ADDRESS || deploymentInfo?.timelock,
  ORACLE_INTEGRATION: process.env.ORACLE_INTEGRATION_CONTRACT || deploymentInfo?.oracleIntegration,
};

/**
 * Get contract instance
 */
export function getSureStackTokenContract() {
  return getContract(CONTRACT_ADDRESSES.SURESTACK_TOKEN, SURESTACK_TOKEN_ABI);
}

// Backward-compatible alias (can be removed later)
export const getRiskTokenContract = getSureStackTokenContract;

export function getConsensusStakingContract() {
  return getContract(CONTRACT_ADDRESSES.CONSENSUS_STAKING, CONSENSUS_ABI);
}

export function getRewardPoolContract() {
  return getContract(CONTRACT_ADDRESSES.REWARD_POOL, REWARD_POOL_ABI);
}

export function getDAOGovernanceContract() {
  return getContract(CONTRACT_ADDRESSES.DAO_GOVERNANCE, DAO_GOVERNANCE_ABI);
}

export function getOracleIntegrationContract() {
  return getContract(CONTRACT_ADDRESSES.ORACLE_INTEGRATION, ORACLE_INTEGRATION_ABI);
}

/**
 * Validate all contract addresses are set
 */
export function validateContractAddresses() {
  const missing = [];
  
  for (const [name, address] of Object.entries(CONTRACT_ADDRESSES)) {
    if (!address) {
      missing.push(name);
    }
  }
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing contract addresses:', missing.join(', '));
    return false;
  }
  
  return true;
}
