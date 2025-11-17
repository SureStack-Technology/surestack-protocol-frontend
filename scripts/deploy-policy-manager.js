/**
 * deploy-policy-manager.js
 * 
 * Hardhat script to deploy PolicyManager contract to Sepolia
 * 
 * This script:
 * 1. Deploys PolicyManager contract
 * 2. Links it to OracleReaderV2, RewardPoolAndSlasher, and DAO Governance
 * 3. Verifies connections work
 * 4. Updates environment variables automatically
 * 
 * Usage: npx hardhat run scripts/deploy-policy-manager.js --network sepolia
 * Or: npm run deploy:policy-manager
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Load environment variables from backend/.env (fallback to root .env)
// Merges both files: backend/.env first, then root .env (root overrides non-empty values)
function loadEnv() {
  const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
  const rootEnvPath = path.join(__dirname, '..', '.env');
  
  const env = {};
  
  // Helper function to parse .env file
  const parseEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    
    const parsed = {};
    const content = fs.readFileSync(filePath, 'utf-8');

    content.split('\n').forEach((line) => {
      line = line.trim();
      if (!line || line.startsWith('#')) {
        return;
      }

      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove inline comments
        const commentIndex = value.indexOf(' #');
        if (commentIndex !== -1) {
          value = value.substring(0, commentIndex).trim();
        }
        
        // Remove quotes if present
        parsed[key] = value.replace(/^["']|["']$/g, '');
      }
    });
    
    return parsed;
  };

  // Load backend/.env first
  if (fs.existsSync(backendEnvPath)) {
    const backendEnv = parseEnvFile(backendEnvPath);
    Object.assign(env, backendEnv);
  }
  
  // Overlay with root .env (root takes precedence, but only for non-empty values)
  if (fs.existsSync(rootEnvPath)) {
    const rootEnv = parseEnvFile(rootEnvPath);
    // Only override if root value is not empty
    Object.keys(rootEnv).forEach((key) => {
      if (rootEnv[key] && rootEnv[key].trim() !== '') {
        env[key] = rootEnv[key];
      }
    });
  }
  
  if (Object.keys(env).length === 0) {
    throw new Error(`No .env file found. Checked: ${backendEnvPath} and ${rootEnvPath}`);
  }

  return env;
}

// Update environment file with new address
function updateEnvFile(filePath, key, value) {
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }

  // Check if key already exists
  const keyRegex = new RegExp(`^${key}=.*$`, 'm');
  if (keyRegex.test(content)) {
    // Update existing key
    content = content.replace(keyRegex, `${key}=${value}`);
  } else {
    // Append new key
    if (content && !content.endsWith('\n')) {
      content += '\n';
    }
    content += `${key}=${value}\n`;
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

async function main() {
  console.log('🚀 PolicyManager Deployment Script\n');
  console.log('═'.repeat(60));
  console.log('');

  // ────────────────────────────────────────────────────────────────
  // STEP 1: Prepare
  // ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('STEP 1: Preparing deployment');
  console.log('═'.repeat(60));

  // Load environment variables
  let env;
  try {
    env = loadEnv();
    console.log('✅ Loaded environment variables\n');
  } catch (error) {
    console.error('❌ Error loading environment variables:', error.message);
    process.exit(1);
  }

  // Get required environment variables
  const privateKey = env.PRIVATE_KEY;
  const rpcUrl = env.INFURA_API_URL || env.RPC_URL;
  const oracleAddress = env.ORACLE_CONTRACT_ADDRESS || env.ORACLE_INTEGRATION_CONTRACT;
  const rewardPoolAddress = env.REWARD_POOL_ADDRESS || env.REWARD_POOL_AND_SLASHER_ADDRESS;
  const daoAddress = env.DAO_GOVERNANCE_ADDRESS || env.DAO_CONTRACT;
  const sstTokenAddress = env.SURESTACK_TOKEN_ADDRESS || env.RISK_TOKEN_CONTRACT;
  const consensusAddress = env.CONSENSUS_STAKING_ADDRESS || env.CONSENSUS_AND_STAKING_ADDRESS;

  // Validate required variables
  const missing = [];
  if (!privateKey) missing.push('PRIVATE_KEY');
  if (!rpcUrl) missing.push('INFURA_API_URL or RPC_URL');
  if (!oracleAddress) missing.push('ORACLE_CONTRACT_ADDRESS');
  if (!rewardPoolAddress) missing.push('REWARD_POOL_ADDRESS');
  if (!daoAddress) missing.push('DAO_GOVERNANCE_ADDRESS');
  if (!sstTokenAddress) missing.push('SURESTACK_TOKEN_ADDRESS');

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  // Connect to network
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const network = await provider.getNetwork();
  const balance = await provider.getBalance(wallet.address);
  const balanceFormatted = ethers.formatEther(balance);

  console.log(`🔗 Connected to ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`   Wallet: ${wallet.address}`);
  console.log(`   Balance: ${balanceFormatted} ETH\n`);

  if (balance === 0n) {
    console.error('❌ Wallet has no ETH. Please fund your wallet before deploying.');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   OracleReaderV2: ${oracleAddress}`);
  console.log(`   RewardPoolAndSlasher: ${rewardPoolAddress}`);
  console.log(`   SureStackToken: ${sstTokenAddress}`);
  console.log(`   DAO Governance: ${daoAddress}`);
  console.log(`   Initial Owner: ${wallet.address}\n`);

  // ────────────────────────────────────────────────────────────────
  // STEP 2: Deploy PolicyManager
  // ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('STEP 2: Deploying PolicyManager contract');
  console.log('═'.repeat(60));

  let policyManagerAddress;
  try {
    // Load compiled artifact
    const artifactPath = path.join(
      __dirname,
      '..',
      'artifacts',
      'contracts',
      'PolicyManager.sol',
      'PolicyManager.json'
    );

    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
    const PolicyManagerFactory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      wallet
    );

    console.log('   📦 Loading PolicyManager contract...');
    console.log('   🔄 Deploying with constructor arguments:');
    console.log(`      OracleReader: ${oracleAddress}`);
    console.log(`      RewardPool: ${rewardPoolAddress}`);
    console.log(`      SureStackToken: ${sstTokenAddress}`);
    console.log(`      DAO Governance: ${daoAddress}`);
    console.log(`      Initial Owner: ${wallet.address}\n`);

    // Deploy contract
    console.log('   ⏳ Deploying contract (this may take a minute)...');
    const policyManager = await PolicyManagerFactory.deploy(
      oracleAddress,
      rewardPoolAddress,
      sstTokenAddress,
      daoAddress,
      wallet.address,
      {
        gasLimit: 6_000_000,
      }
    );

    console.log(`   📝 Transaction hash: ${policyManager.deploymentTransaction().hash}`);
    console.log('   ⏳ Waiting for confirmation...');

    await policyManager.waitForDeployment();
    policyManagerAddress = await policyManager.getAddress();

    const receipt = await provider.getTransactionReceipt(
      policyManager.deploymentTransaction().hash
    );

    console.log(`   ✅ Contract deployed successfully!`);
    console.log(`   📍 Address: ${policyManagerAddress}`);
    console.log(`   📦 Block: ${receipt.blockNumber}`);
    console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}\n`);
  } catch (error) {
    console.error('❌ Error deploying PolicyManager:', error.message);
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    process.exit(1);
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 3: Post-deployment linking
  // ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('STEP 3: Post-deployment linking');
  console.log('═'.repeat(60));

  // Load ABIs
  const RewardPoolABI = require('../artifacts/contracts/RewardPoolAndSlasher.sol/RewardPoolAndSlasher.json').abi;
  const OracleABI = require('../artifacts/contracts/OracleReaderV2.sol/OracleReaderV2.json').abi;
  const PolicyManagerABI = require('../artifacts/contracts/PolicyManager.sol/PolicyManager.json').abi;

  const rewardPool = new ethers.Contract(rewardPoolAddress, RewardPoolABI, wallet);
  const oracle = new ethers.Contract(oracleAddress, OracleABI, wallet);
  const policyManager = new ethers.Contract(policyManagerAddress, PolicyManagerABI, wallet);

  // 3.1: Link PolicyManager to RewardPool
  try {
    console.log('   🔗 Linking PolicyManager to RewardPoolAndSlasher...');
    const currentPolicyManager = await rewardPool.policyManagerAddress();

    if (currentPolicyManager && currentPolicyManager !== ethers.ZeroAddress) {
      console.log(`   ⚠️  PolicyManager already set in RewardPool: ${currentPolicyManager}`);
      if (currentPolicyManager.toLowerCase() !== policyManagerAddress.toLowerCase()) {
        console.log(`   ⚠️  Address mismatch - expected: ${policyManagerAddress}`);
      } else {
        console.log(`   ✅ PolicyManager already linked correctly\n`);
      }
    } else {
      // Check if caller is consensus contract
      const consensusContract = await rewardPool.consensusContractAddress();
      const isConsensusContract = consensusContract.toLowerCase() === (consensusAddress || '').toLowerCase();

      if (!isConsensusContract) {
        console.log(`   ⚠️  Cannot set PolicyManager directly - requires consensus contract`);
        console.log(`      Consensus Contract: ${consensusContract}`);
        console.log(`      Expected: ${consensusAddress || 'Not configured'}`);
        console.log(`   💡 Tip: Call rewardPool.setPolicyManager() from ConsensusAndStakingV2 contract\n`);
      } else {
        try {
          const tx = await rewardPool.setPolicyManager(policyManagerAddress);
          console.log(`   📝 Transaction hash: ${tx.hash}`);
          console.log('   ⏳ Waiting for confirmation...');

          const receipt = await tx.wait();
          console.log(`   ✅ PolicyManager linked to RewardPoolAndSlasher`);
          console.log(`   📦 Block: ${receipt.blockNumber}`);
          console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}\n`);
        } catch (txError) {
          console.log(`   ⚠️  Could not set PolicyManager: ${txError.message}`);
          console.log(`   💡 You may need to call setPolicyManager from ConsensusAndStakingV2 contract\n`);
        }
      }
    }
  } catch (error) {
    console.error(`   ❌ Error linking PolicyManager: ${error.message}\n`);
  }

  // 3.2: Test oracle connection
  try {
    console.log('   🔍 Testing oracle connection...');
    const [price, decimals, roundId, updatedAt] = await oracle.getLatestPrice();
    const priceUSD = Number(price) / (10 ** Number(decimals));
    console.log(`   ✅ Oracle connection verified`);
    console.log(`      Current ETH/USD price: $${priceUSD.toFixed(2)}`);
    console.log(`      Round ID: ${roundId.toString()}\n`);
  } catch (error) {
    console.error(`   ❌ Error testing oracle: ${error.message}\n`);
  }

  // 3.3: Test reward pool connection
  try {
    console.log('   🔍 Testing reward pool connection...');
    const rewardBalance = await rewardPool.rewardPoolBalance();
    const rewardBalanceFormatted = ethers.formatEther(rewardBalance);
    console.log(`   ✅ RewardPool connection verified`);
    console.log(`      Current balance: ${rewardBalanceFormatted} SST\n`);
  } catch (error) {
    console.error(`   ❌ Error testing reward pool: ${error.message}\n`);
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 4: Update environment files
  // ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('STEP 4: Updating environment files');
  console.log('═'.repeat(60));

  try {
    // Update backend/.env
    const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
    updateEnvFile(backendEnvPath, 'POLICY_MANAGER_ADDRESS', policyManagerAddress);
    console.log(`   ✅ Updated backend/.env`);

    // Update root .env
    const rootEnvPath = path.join(__dirname, '..', '.env');
    updateEnvFile(rootEnvPath, 'POLICY_MANAGER_ADDRESS', policyManagerAddress);
    console.log(`   ✅ Updated .env`);

    // Update .env.local (frontend)
    const frontendEnvPath = path.join(__dirname, '..', '.env.local');
    updateEnvFile(frontendEnvPath, 'VITE_POLICY_MANAGER_ADDRESS', policyManagerAddress);
    console.log(`   ✅ Updated .env.local`);

    console.log(`   ✅ Environment files updated successfully\n`);
  } catch (error) {
    console.error(`   ❌ Error updating environment files: ${error.message}\n`);
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 5: Verify functionality
  // ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('STEP 5: Verifying PolicyManager functionality');
  console.log('═'.repeat(60));

  try {
    // Test getLatestRiskData (if available)
    try {
      const riskData = await policyManager.latestRiskData();
      console.log(`   ✅ Latest risk data retrieved:`);
      console.log(`      Latest Price: ${riskData.latestPrice.toString()}`);
      console.log(`      Latest Timestamp: ${riskData.latestTimestamp.toString()}`);
      console.log(`      Latest Round ID: ${riskData.latestRoundId.toString()}\n`);
    } catch (error) {
      console.log(`   ⚠️  Could not retrieve risk data: ${error.message}\n`);
    }

    // Test getTotalPolicies
    try {
      const totalPolicies = await policyManager.policyCounter();
      console.log(`   ✅ Total policies: ${totalPolicies.toString()}`);
      console.log(`   ✅ PolicyManager verified on-chain\n`);
    } catch (error) {
      console.error(`   ❌ Error verifying policies: ${error.message}\n`);
    }

    // Test calculatePremiumUSD (if available)
    try {
      const testCoverageLimit = ethers.parseUnits('10000', 8); // 10,000 USD with 8 decimals
      const testCoveragePercent = 50; // 50%
      const premiumUSD = await policyManager.calculatePremiumUSD(
        testCoverageLimit,
        testCoveragePercent
      );
      const premiumFormatted = Number(premiumUSD) / 1e8;
      console.log(`   ✅ Premium calculation test:`);
      console.log(`      Coverage: $10,000 @ 50%`);
      console.log(`      Premium: $${premiumFormatted.toFixed(2)} USD\n`);
    } catch (error) {
      console.log(`   ⚠️  Could not test premium calculation: ${error.message}\n`);
    }
  } catch (error) {
    console.error(`   ❌ Error verifying functionality: ${error.message}\n`);
  }

  // ────────────────────────────────────────────────────────────────
  // Final Summary
  // ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('✅ PolicyManager Deployment Complete!');
  console.log('═'.repeat(60));
  console.log('');
  console.log('📋 Summary:');
  console.log(`   Contract Address: ${policyManagerAddress}`);
  console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`   Owner: ${wallet.address}`);
  console.log('');
  console.log('🔗 Linked Contracts:');
  console.log(`   ✅ OracleReaderV2: ${oracleAddress}`);
  console.log(`   ✅ RewardPoolAndSlasher: ${rewardPoolAddress}`);
  console.log(`   ✅ SureStackToken: ${sstTokenAddress}`);
  console.log(`   ✅ DAO Governance: ${daoAddress}`);
  console.log('');
  console.log('📝 Next Steps:');
  console.log('   1. Run: npm run post:deploy (to complete post-deployment setup)');
  console.log('   2. Verify PolicyManager is linked in RewardPool');
  console.log('   3. Test creating a policy via frontend or direct contract call');
  console.log('');
  console.log('═'.repeat(60));
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });

