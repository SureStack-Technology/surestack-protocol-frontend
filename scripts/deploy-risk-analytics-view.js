const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

function loadEnv() {
  const parse = (filePath) => {
    if (!fs.existsSync(filePath)) return {};
    return Object.fromEntries(
      fs
        .readFileSync(filePath, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const idx = line.indexOf('=');
          return idx === -1 ? [line, ''] : [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
        })
    );
  };

  const rootEnv = path.resolve(process.cwd(), '.env');
  const backendEnv = path.resolve(process.cwd(), 'backend/.env');
  return { ...parse(rootEnv), ...parse(backendEnv) };
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('🚀 Deploying RiskAnalyticsView');
  console.log('═══════════════════════════════════════════════\n');

  const env = loadEnv();

  const providerUrl = env.INFURA_API_URL || env.RPC_URL || 'https://rpc.sepolia.org';
  const privateKey = env.PRIVATE_KEY;
  const policyManagerAddress = env.POLICY_MANAGER_ADDRESS || env.POLICY_MANAGER_CONTRACT || env.VITE_POLICY_MANAGER_ADDRESS;
  const stakingAddress =
    env.CONSENSUS_STAKING_ADDRESS ||
    env.CONSENSUS_STAKING_V2_ADDRESS ||
    env.CONSENSUS_CONTRACT ||
    env.VITE_CONSENSUS_STAKING_V2_ADDRESS;
  const rewardPoolAddress = env.REWARD_POOL_ADDRESS || env.REWARD_POOL_CONTRACT || env.VITE_REWARD_POOL_ADDRESS;
  const oracleAddress =
    env.ORACLE_READER_V2_ADDRESS ||
    env.ORACLE_READER_ADDRESS ||
    env.ORACLE_CONTRACT_ADDRESS ||
    env.VITE_ORACLE_READER_V2_ADDRESS;
  const governanceAddress = env.DAO_GOVERNANCE_ADDRESS || env.DAO_CONTRACT || env.VITE_DAO_GOVERNANCE_ADDRESS;
  const sstTokenAddress =
    env.SURESTACK_TOKEN_ADDRESS || env.SURE_STACK_TOKEN_ADDRESS || env.RISK_TOKEN_CONTRACT || env.VITE_SURE_STACK_TOKEN_ADDRESS;

  if (!privateKey) throw new Error('Missing PRIVATE_KEY in environment variables');
  if (!policyManagerAddress) throw new Error('Missing POLICY_MANAGER_ADDRESS');
  if (!stakingAddress) throw new Error('Missing CONSENSUS_STAKING_ADDRESS');
  if (!rewardPoolAddress) throw new Error('Missing REWARD_POOL_ADDRESS');
  if (!oracleAddress) throw new Error('Missing ORACLE_READER_ADDRESS');
  if (!governanceAddress) throw new Error('Missing DAO_GOVERNANCE_ADDRESS');
  if (!sstTokenAddress) throw new Error('Missing SURESTACK_TOKEN_ADDRESS');

  const provider = new ethers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const network = await provider.getNetwork();

  console.log('🔗 Network Information');
  console.log(`   • RPC URL: ${providerUrl}`);
  console.log(`   • Chain ID: ${network.chainId}`);
  console.log(`   • Deployer: ${wallet.address}\n`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Wallet Balance: ${ethers.formatEther(balance)} ETH\n`);

  console.log('📋 Deployment Inputs');
  console.log(`   • PolicyManager:       ${policyManagerAddress}`);
  console.log(`   • Consensus & Staking: ${stakingAddress}`);
  console.log(`   • RewardPool:          ${rewardPoolAddress}`);
  console.log(`   • OracleReaderV2:      ${oracleAddress}`);
  console.log(`   • Governance:          ${governanceAddress}`);
  console.log(`   • SureStackToken:      ${sstTokenAddress}\n`);

  console.log('⏳ Deploying RiskAnalyticsView...');
  const factory = await ethers.getContractFactory('RiskAnalyticsView', wallet);
  const contract = await factory.deploy(
    policyManagerAddress,
    stakingAddress,
    rewardPoolAddress,
    oracleAddress,
    governanceAddress,
    sstTokenAddress
  );

  console.log(`   • tx hash: ${contract.deploymentTransaction().hash}`);
  await contract.waitForDeployment();
  const analyticsAddress = await contract.getAddress();

  console.log('\n✅ Deployment Successful!');
  console.log(`   • Address: ${analyticsAddress}`);
  console.log(`   • Explorer: https://sepolia.etherscan.io/address/${analyticsAddress}\n`);

  console.log('To integrate with the frontend/backend, set:');
  console.log(`   RISK_ANALYTICS_VIEW_ADDRESS=${analyticsAddress}`);
  console.log(`   VITE_RISK_ANALYTICS_VIEW_ADDRESS=${analyticsAddress}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

