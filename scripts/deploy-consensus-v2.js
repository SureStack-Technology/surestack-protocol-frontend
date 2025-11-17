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
  console.log('🚀 Deploying ConsensusAndStakingV2 to Sepolia...\n');

  const env = loadEnv();

  const providerUrl = env.INFURA_API_URL || env.RPC_URL || 'https://rpc.sepolia.org';
  const privateKey = env.PRIVATE_KEY;
  const sstTokenAddress = env.SURESTACK_TOKEN_ADDRESS || env.RISK_TOKEN_CONTRACT;
  const rewardPoolAddress = env.REWARD_POOL_ADDRESS || env.REWARD_POOL_CONTRACT;
  const oracleAddress = env.ORACLE_CONTRACT_ADDRESS || env.ORACLE_READER_V2_ADDRESS || env.ORACLE_INTEGRATION_CONTRACT;
  const daoAddress = env.DAO_GOVERNANCE_ADDRESS || env.DAO_CONTRACT;
  const sequencerAddress = env.SEQUENCER_ADDRESS || env.PRIVATE_KEY ? new ethers.Wallet(env.PRIVATE_KEY).address : null;

  if (!privateKey) {
    throw new Error('❌ Missing PRIVATE_KEY in environment variables');
  }
  if (!sstTokenAddress) {
    throw new Error('❌ Missing SURESTACK_TOKEN_ADDRESS in environment variables');
  }
  if (!rewardPoolAddress) {
    throw new Error('❌ Missing REWARD_POOL_ADDRESS in environment variables');
  }
  if (!oracleAddress) {
    throw new Error('❌ Missing ORACLE_CONTRACT_ADDRESS in environment variables');
  }
  if (!daoAddress) {
    throw new Error('❌ Missing DAO_GOVERNANCE_ADDRESS in environment variables');
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
  console.log(`   RewardPool: ${rewardPoolAddress}`);
  console.log(`   OracleReader: ${oracleAddress}`);
  console.log(`   DAO Governance: ${daoAddress}`);
  console.log(`   Sequencer: ${sequencerAddress || wallet.address}`);
  console.log(`   Initial Owner: ${wallet.address}\n`);

  // Verify contract addresses exist
  console.log('🔍 Verifying contract addresses...');
  const codeChecks = {
    'SureStackToken': sstTokenAddress,
    'RewardPoolAndSlasher': rewardPoolAddress,
    'OracleReader': oracleAddress,
    'DAOGovernance': daoAddress,
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
  console.log('STEP 1: Deploying ConsensusAndStakingV2 contract');
  console.log('════════════════════════════════════════════════════════════');
  console.log('   ⏳ Deploying contract (this may take a minute)...');

  const ConsensusAndStakingV2 = await ethers.getContractFactory('ConsensusAndStakingV2', wallet);
  const consensus = await ConsensusAndStakingV2.deploy(
    sstTokenAddress,        // _sureStackToken
    rewardPoolAddress,      // _rewardPool
    oracleAddress,         // _oracleReader
    daoAddress,            // _governanceAddress
    sequencerAddress || wallet.address, // _sequencerAddress
    wallet.address         // _initialOwner
  );

  console.log(`   📝 Transaction hash: ${consensus.deploymentTransaction().hash}`);
  console.log('   ⏳ Waiting for confirmation...');
  await consensus.waitForDeployment();

  const consensusAddress = await consensus.getAddress();
  console.log(`   ✅ Contract deployed successfully!`);
  console.log(`   📍 Address: ${consensusAddress}`);
  console.log(`   📦 Block: ${consensus.deploymentTransaction().blockNumber || 'Pending'}`);
  console.log(`   ⛽ Gas used: ${consensus.deploymentTransaction().gasLimit.toString()}\n`);

  console.log('════════════════════════════════════════════════════════════');
  console.log('STEP 2: Verifying contract parameters');
  console.log('════════════════════════════════════════════════════════════');
  try {
    const minStake = await consensus.minStakeAmount();
    const slashingThreshold = await consensus.slashingThreshold();
    const rewardPerRound = await consensus.rewardPerRound();
    const roundDuration = await consensus.roundDurationSeconds();
    const coolingPeriod = await consensus.coolingOffPeriod();
    const currentRound = await consensus.currentRoundId();

    console.log(`   ✅ Minimum Stake: ${ethers.formatEther(minStake)} SST`);
    console.log(`   ✅ Slashing Threshold: ${slashingThreshold}`);
    console.log(`   ✅ Reward Per Round: ${ethers.formatEther(rewardPerRound)} SST`);
    console.log(`   ✅ Round Duration: ${roundDuration} seconds`);
    console.log(`   ✅ Cooling Off Period: ${coolingPeriod} seconds`);
    console.log(`   ✅ Current Round ID: ${currentRound.toString()}\n`);
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
      /^CONSENSUS_STAKING_ADDRESS=.*$/m,
      `CONSENSUS_STAKING_ADDRESS=${consensusAddress}`
    );
    if (!backendEnv.includes('CONSENSUS_STAKING_ADDRESS')) {
      backendEnv += `\nCONSENSUS_STAKING_ADDRESS=${consensusAddress}`;
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
      /^CONSENSUS_STAKING_ADDRESS=.*$/m,
      `CONSENSUS_STAKING_ADDRESS=${consensusAddress}`
    );
    if (!rootEnv.includes('CONSENSUS_STAKING_ADDRESS')) {
      rootEnv += `\nCONSENSUS_STAKING_ADDRESS=${consensusAddress}`;
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
    /^VITE_CONSENSUS_STAKING_V2_ADDRESS=.*$/m,
    `VITE_CONSENSUS_STAKING_V2_ADDRESS=${consensusAddress}`
  );
  if (!frontendEnv.includes('VITE_CONSENSUS_STAKING_V2_ADDRESS')) {
    frontendEnv += `\nVITE_CONSENSUS_STAKING_V2_ADDRESS=${consensusAddress}`;
  }
  fs.writeFileSync(frontendEnvPath, frontendEnv);
  console.log('   ✅ Updated .env.local\n');

  console.log('════════════════════════════════════════════════════════════');
  console.log('🎉 ConsensusAndStakingV2 Deployment Complete!');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`📍 Contract Address: ${consensusAddress}`);
  console.log(`🔗 Explorer: https://sepolia.etherscan.io/address/${consensusAddress}`);
  console.log(`👤 Owner: ${wallet.address}`);
  console.log(`🏛️  Governance: ${daoAddress}`);
  console.log(`⚡ Sequencer: ${sequencerAddress || wallet.address}`);
  console.log('════════════════════════════════════════════════════════════\n');

  console.log('📋 Next Steps:');
  console.log('   1. Run: npm run post:deploy (to complete post-deployment setup)');
  console.log('   2. Run: npm run setup:validators (to register validators)');
  console.log('   3. Verify UI shows ConsensusAndStakingV2 parameters\n');
}

main().catch((err) => {
  console.error('❌ Error deploying ConsensusAndStakingV2:', err);
  if (err.reason) {
    console.error(`   Reason: ${err.reason}`);
  }
  process.exit(1);
});

