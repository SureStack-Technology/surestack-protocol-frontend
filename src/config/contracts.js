import deployments from '@shared/deployments/sepolia.json'

// Network configuration
export const NETWORK_CONFIG = {
  chainIdHex: '0xaa36a7',
  chainIdDec: 11155111,
  chainName: 'Sepolia',
  rpcUrl: import.meta.env.VITE_SEPOLIA_RPC || 'https://rpc.sepolia.org',
  explorer: 'https://sepolia.etherscan.io',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const pickAddress = (envKey, fallback) =>
  (import.meta.env[envKey] && import.meta.env[envKey] !== ZERO_ADDRESS)
    ? import.meta.env[envKey]
    : fallback || ZERO_ADDRESS

export const CONSENSUS_V2 = import.meta.env.VITE_CONSENSUS_V2 || pickAddress('VITE_CONSENSUS_STAKING_V2_ADDRESS', deployments.ConsensusAndStakingV2)
export const SST_TOKEN = import.meta.env.VITE_RISK_TOKEN || pickAddress('VITE_SURE_STACK_TOKEN_ADDRESS', deployments.SureStackToken)
export const RISK_ANALYTICS_VIEW = pickAddress('VITE_RISK_ANALYTICS_VIEW_ADDRESS', deployments.RiskAnalyticsView)

export const CONTRACT_ADDRESSES = {
  ORACLE_READER: pickAddress('VITE_ORACLE_READER_ADDRESS', deployments.OracleReaderV2),
  ORACLE_READER_V2: pickAddress('VITE_ORACLE_READER_V2_ADDRESS', deployments.OracleReaderV2),
  POLICY_MANAGER: pickAddress('VITE_POLICY_MANAGER_ADDRESS', deployments.PolicyManager),
  REWARD_POOL: pickAddress('VITE_REWARD_POOL_ADDRESS', deployments.RewardPool),
  CONSENSUS_STAKING_V2: CONSENSUS_V2,
  DAO_GOVERNANCE: pickAddress('VITE_DAO_GOVERNANCE_ADDRESS', deployments.DAOGovernance),
  SURE_STACK_TOKEN: SST_TOKEN,
  RISK_ANALYTICS_VIEW,
  CHAINLINK_ETH_USD: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
}

export const CONTRACTS = {
  oracleReader: CONTRACT_ADDRESSES.ORACLE_READER,
  oracleReaderV2: CONTRACT_ADDRESSES.ORACLE_READER_V2,
  policyManager: CONTRACT_ADDRESSES.POLICY_MANAGER,
  rewardPool: CONTRACT_ADDRESSES.REWARD_POOL,
  consensusStakingV2: CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2,
  daoGovernance: CONTRACT_ADDRESSES.DAO_GOVERNANCE,
  sureStackToken: CONTRACT_ADDRESSES.SURE_STACK_TOKEN,
  riskAnalyticsView: CONTRACT_ADDRESSES.RISK_ANALYTICS_VIEW,
}

if (!CONSENSUS_V2) console.warn('⚠ Missing VITE_CONSENSUS_V2')
if (!SST_TOKEN) console.warn('⚠ Missing VITE_RISK_TOKEN')
if (!RISK_ANALYTICS_VIEW) console.warn('⚠ Missing VITE_RISK_ANALYTICS_VIEW_ADDRESS')

if (import.meta.env.DEV) {
  console.group('[SureStack] Contract Environment')
  console.log('NETWORK:', NETWORK_CONFIG)
  console.table(CONTRACT_ADDRESSES)
  console.groupEnd()
}

export const getExplorerUrl = (txHash) => `${NETWORK_CONFIG.explorer}/tx/${txHash}`

export default {
  CONTRACT_ADDRESSES,
  CONTRACTS,
  CONSENSUS_V2,
  SST_TOKEN,
  NETWORK_CONFIG,
  getExplorerUrl,
}
