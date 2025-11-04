import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { getContract, getProvider } from './blockchain.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load ABI from JSON file
 */
function loadABI(contractName) {
  try {
    // 1️⃣ First, try backend/contracts/abi directory
    const backendAbiPath = join(__dirname, '..', 'contracts', 'abi', `${contractName}.json`);
    try {
      const backendAbiData = JSON.parse(readFileSync(backendAbiPath, 'utf-8'));
      if (Array.isArray(backendAbiData)) return backendAbiData;
      if (backendAbiData.abi) return backendAbiData.abi;
      return backendAbiData;
    } catch (e) {
      // Continue to other paths
    }

    // 2️⃣ Try root-level ABI
    const rootAbiPath = join(__dirname, '../../..', `${contractName.toLowerCase()}_abi.json`);
    try {
      const abiData = JSON.parse(readFileSync(rootAbiPath, 'utf-8'));
      if (Array.isArray(abiData)) return abiData;
      if (abiData.abi) return abiData.abi;
      return abiData;
    } catch (e) {
      // 3️⃣ Fallback: artifacts/contracts
      try {
        const artifactPath = join(
          __dirname,
          '../../..',
          'artifacts/contracts',
          `${contractName}.sol`,
          `${contractName}.json`
        );
        const artifactData = JSON.parse(readFileSync(artifactPath, 'utf-8'));
        return artifactData.abi || [];
      } catch (e2) {
        // 4️⃣ Fallback mapping
        const fileNameMap = {
          RISKToken: 'SureStackToken',
          OracleReader: 'OracleIntegration',
        };
        const altFile = fileNameMap[contractName];
        if (altFile) {
          const altPath = join(
            __dirname,
            '../../..',
            'artifacts/contracts',
            `${altFile}.sol`,
            `${contractName}.json`
          );
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
 * Load deployment info
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
export const ORACLE_READER_ABI = loadABI('OracleReader');

/**
 * Contract addresses
 */
const deploymentInfo = loadDeploymentInfo();

export const CONTRACT_ADDRESSES = {
  SURESTACK_TOKEN:
    process.env.SURESTACK_TOKEN_ADDRESS ||
    process.env.RISK_TOKEN_CONTRACT ||
    deploymentInfo?.riskToken,
  CONSENSUS_STAKING:
    process.env.CONSENSUS_STAKING_ADDRESS ||
    process.env.CONSENSUS_CONTRACT ||
    deploymentInfo?.staking,
  REWARD_POOL:
    process.env.REWARD_POOL_ADDRESS ||
    process.env.REWARD_POOL_CONTRACT ||
    deploymentInfo?.rewardPool,
  DAO_GOVERNANCE:
    process.env.DAO_GOVERNANCE_ADDRESS ||
    process.env.DAO_CONTRACT ||
    deploymentInfo?.dao,
  TIMELOCK: process.env.TIMELOCK_ADDRESS || deploymentInfo?.timelock,
  ORACLE_READER:
    process.env.ORACLE_CONTRACT_ADDRESS ||
    process.env.ORACLE_INTEGRATION_CONTRACT ||
    deploymentInfo?.oracleIntegration,
  CHAINLINK_ORACLE:
    process.env.CHAINLINK_ORACLE_ADDRESS ||
    deploymentInfo?.chainlinkOracleAddress ||
    '0x694AA1769357215DE4FAC081bf1f309aDC325306', // Sepolia ETH/USD
};

/**
 * Contract getters
 */
export function getSureStackTokenContract() {
  if (!CONTRACT_ADDRESSES.SURESTACK_TOKEN)
    throw new Error('SureStackToken address not configured.');
  return getContract(CONTRACT_ADDRESSES.SURESTACK_TOKEN, SURESTACK_TOKEN_ABI);
}

// ✅ Legacy alias for backward compatibility
export const getRiskTokenContract = getSureStackTokenContract;

export function getConsensusStakingContract() {
  if (!CONTRACT_ADDRESSES.CONSENSUS_STAKING)
    throw new Error('ConsensusAndStaking address not configured.');
  return getContract(CONTRACT_ADDRESSES.CONSENSUS_STAKING, CONSENSUS_ABI);
}

export function getRewardPoolContract() {
  if (!CONTRACT_ADDRESSES.REWARD_POOL)
    throw new Error('RewardPoolAndSlasher address not configured.');
  return getContract(CONTRACT_ADDRESSES.REWARD_POOL, REWARD_POOL_ABI);
}

export function getDAOGovernanceContract() {
  if (!CONTRACT_ADDRESSES.DAO_GOVERNANCE)
    throw new Error('DAOGovernance address not configured.');
  return getContract(CONTRACT_ADDRESSES.DAO_GOVERNANCE, DAO_GOVERNANCE_ABI);
}

export function getOracleReaderContract() {
  if (!CONTRACT_ADDRESSES.ORACLE_READER)
    throw new Error('OracleReader address not configured.');
  return getContract(CONTRACT_ADDRESSES.ORACLE_READER, ORACLE_READER_ABI);
}

/**
 * Export contracts
 */
export const contracts = {
  get SureStackToken() {
    try {
      return getSureStackTokenContract();
    } catch (error) {
      console.warn('⚠️ SureStackToken not available:', error.message);
      return null;
    }
  },
  get OracleReader() {
    try {
      return getOracleReaderContract();
    } catch (error) {
      console.warn('⚠️ OracleReader not available:', error.message);
      return null;
    }
  },
  get ConsensusStaking() {
    try {
      return getConsensusStakingContract();
    } catch (error) {
      console.warn('⚠️ ConsensusStaking not available:', error.message);
      return null;
    }
  },
  get RewardPool() {
    try {
      return getRewardPoolContract();
    } catch (error) {
      console.warn('⚠️ RewardPool not available:', error.message);
      return null;
    }
  },
  get DAOGovernance() {
    try {
      return getDAOGovernanceContract();
    } catch (error) {
      console.warn('⚠️ DAOGovernance not available:', error.message);
      return null;
    }
  },
};

/**
 * Provider access + validation
 */
export const provider = getProvider();

export function validateContractAddresses() {
  const missing = Object.entries(CONTRACT_ADDRESSES)
    .filter(([_, address]) => !address)
    .map(([name]) => name);

  if (missing.length > 0) {
    console.warn('⚠️ Missing contract addresses:', missing.join(', '));
    return false;
  }
  return true;
}