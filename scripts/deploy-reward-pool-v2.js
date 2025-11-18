const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

// Load env from backend/.env first, then root .env
function loadEnv() {
  const rootEnv = path.resolve(process.cwd(), '.env');
  const beEnv = path.resolve(process.cwd(), 'backend/.env');
  const parse = (p) => {
    if (!fs.existsSync(p)) return {};
    return Object.fromEntries(
      fs.readFileSync(p, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => {
          const i = l.indexOf('=');
          return i === -1 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        })
    );
  };
  return { ...parse(rootEnv), ...parse(beEnv) };
}

async function main() {
  console.log('🚀 Deploying RewardPoolAndSlasher (V2) to Sepolia...\n');

  const env = loadEnv();

  const providerUrl = env.INFURA_API_URL || env.RPC_URL || 'https://rpc.sepolia.org';
  const privateKey = env.PRIVATE_KEY;
  const sstTokenAddress = env.SURESTACK_TOKEN_ADDRESS || env.RISK_TOKEN_CONTRACT;
  const consensusAddress = env.CONSENSUS_STAKING_ADDRESS;

  if (!privateKey) {
    throw new Error('❌ Missing PRIVATE_KEY in environment variables');
  }
  if (!sstTokenAddress) {
    throw new Error('❌ Missing SURESTACK_TOKEN_ADDRESS in environment variables');
  }
  if (!consensusAddress) {
    throw new Error('❌ Missing CONSENSUS_STAKING_ADDRESS in environment variables');
  }

  const provider = new ethers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const network = await provider.getNetwork();
  const balance = await provider.getBalance(wallet.address);

  console.log('════════════════════════════════════════════════════════════');
  console.log('🔗 Connected to Sepolia');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`   Wallet: ${wallet.address}`);
  console.log(`   Balance: ${ethers.formatEther(balance)} ETH\n`);

  console.log('📋 Configuration:');
  console.log(`   SureStackToken: ${sstTokenAddress}`);
  console.log(`   ConsensusAndStakingV2: ${consensusAddress}\n`);

  // Verify contract addresses exist
  console.log('🔍 Verifying contract addresses...');
  const codeChecks = {
    'SureStackToken': sstTokenAddress,
    'ConsensusAndStakingV2': consensusAddress,
  };

  for (const [name, address] of Object.entries(codeChecks)) {
    const code = await provider.getCode(address);
    if (code === '0x') {
      throw new Error(`❌ ${name} contract not found at address ${address}`);
    }
    console.log(`   ✅ ${name}: ${address}`);
  }
  console.log('');

  console.log('════════════════════════════════════════════════════════════');
  console.log('STEP 1: Deploying RewardPoolAndSlasher contract');
  console.log('════════════════════════════════════════════════════════════');
  console.log('   ⏳ Deploying contract (this may take a minute)...');

  const RewardPoolAndSlasher = await ethers.getContractFactory('RewardPoolAndSlasher', wallet);
  const rewardPool = await RewardPoolAndSlasher.deploy(
    sstTokenAddress,    // _riskTokenAddress
    consensusAddress    // _consensusContractAddress (immutable)
  );

  console.log(`   📝 Transaction hash: ${rewardPool.deploymentTransaction().hash}`);
  console.log('   ⏳ Waiting for confirmation...');
  await rewardPool.waitForDeployment();

  const rewardPoolAddress = await rewardPool.getAddress();
  console.log(`   ✅ Contract deployed successfully!`);
  console.log(`   📍 Address: ${rewardPoolAddress}`);
  console.log(`   📦 Block: ${rewardPool.deploymentTransaction().blockNumber || 'Pending'}`);
  console.log(`   ⛽ Gas used: ${rewardPool.deploymentTransaction().gasLimit.toString()}\n`);

  console.log('════════════════════════════════════════════════════════════');
  console.log('STEP 2: Verifying contract parameters');
  console.log('════════════════════════════════════════════════════════════');
  try {
    const riskToken = await rewardPool.riskToken();
    const consensusContract = await rewardPool.consensusContractAddress();
    const rewardBalance = await rewardPool.rewardPoolBalance();
    const penaltyBalance = await rewardPool.penaltyPoolBalance();

    console.log(`   ✅ Risk Token: ${riskToken}`);
    console.log(`   ✅ Consensus Contract: ${consensusContract}`);
    console.log(`   ✅ Reward Pool Balance: ${ethers.formatEther(rewardBalance)} SST`);
    console.log(`   ✅ Penalty Pool Balance: ${ethers.formatEther(penaltyBalance)} SST\n`);
  } catch (error) {
    console.warn(`   ⚠️  Error reading parameters: ${error.message}\n`);
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log('STEP 3: Updating environment files');
  console.log('════════════════════════════════════════════════════════════');

  // Update backend/.env
  const backendEnvPath = path.resolve('./backend/.env');
  if (fs.existsSync(backendEnvPath)) {
    let backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
    backendEnv = backendEnv.replace(
      /^REWARD_POOL_ADDRESS=.*$/m,
      `REWARD_POOL_ADDRESS=${rewardPoolAddress}`
    );
    if (!backendEnv.includes('REWARD_POOL_ADDRESS')) {
      backendEnv += `\nREWARD_POOL_ADDRESS=${rewardPoolAddress}`;
    }
    fs.writeFileSync(backendEnvPath, backendEnv);
    console.log('   ✅ Updated backend/.env');
  } else {
    console.warn('   ⚠️  backend/.env not found, skipping update');
  }

  // Update root .env
  const rootEnvPath = path.resolve('./.env');
  if (fs.existsSync(rootEnvPath)) {
    let rootEnv = fs.readFileSync(rootEnvPath, 'utf8');
    rootEnv = rootEnv.replace(
      /^REWARD_POOL_ADDRESS=.*$/m,
      `REWARD_POOL_ADDRESS=${rewardPoolAddress}`
    );
    if (!rootEnv.includes('REWARD_POOL_ADDRESS')) {
      rootEnv += `\nREWARD_POOL_ADDRESS=${rewardPoolAddress}`;
    }
    fs.writeFileSync(rootEnvPath, rootEnv);
    console.log('   ✅ Updated .env');
  }

  // Update frontend .env.local
  const frontendEnvPath = path.resolve('./.env.local');
  let frontendEnv = '';
  if (fs.existsSync(frontendEnvPath)) {
    frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');
  }
  frontendEnv = frontendEnv.replace(
    /^VITE_REWARD_POOL_ADDRESS=.*$/m,
    `VITE_REWARD_POOL_ADDRESS=${rewardPoolAddress}`
  );
  if (!frontendEnv.includes('VITE_REWARD_POOL_ADDRESS')) {
    frontendEnv += `\nVITE_REWARD_POOL_ADDRESS=${rewardPoolAddress}`;
  }
  fs.writeFileSync(frontendEnvPath, frontendEnv);
  console.log('   ✅ Updated .env.local\n');

  console.log('════════════════════════════════════════════════════════════');
  console.log('🎉 RewardPoolAndSlasher (V2) Deployment Complete!');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`📍 Contract Address: ${rewardPoolAddress}`);
  console.log(`🔗 Explorer: https://sepolia.etherscan.io/address/${rewardPoolAddress}`);
  console.log(`🔗 Linked to ConsensusAndStakingV2: ${consensusAddress}`);
  console.log('════════════════════════════════════════════════════════════\n');

  console.log('📋 Next Steps:');
  console.log('   1. Run: npm run post:deploy (to complete post-deployment setup)');
  console.log('   2. Run: npm run setup:validators (to register validators)');
  console.log('   3. Verify UI shows RewardPool linked to ConsensusAndStakingV2\n');
}

main().catch((err) => {
  console.error('❌ Error deploying RewardPoolAndSlasher:', err);
  if (err.reason) {
    console.error(`   Reason: ${err.reason}`);
  }
  process.exit(1);
});

