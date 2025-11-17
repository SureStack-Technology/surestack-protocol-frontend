/**
 * post-deploy-setup.js
 * 
 * Hardhat script for automated post-deployment configuration of SureStack Protocol
 * 
 * This script automatically configures all contracts after deployment:
 * 1. Sets Chainlink ETH/USD feed in OracleReaderV2
 * 2. Links PolicyManager to RewardPoolAndSlasher
 * 3. Verifies ConsensusAndStakingV2 registration in RewardPool
 * 4. Verifies live contract functionality
 * 
 * Usage: npx hardhat run scripts/post-deploy-setup.js --network sepolia
 * Or: npm run post:deploy
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Load environment variables from backend/.env (fallback to root .env)
// Merges both files: backend/.env first, then root .env (root overrides)
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

// Load ABI from compiled artifacts
function loadABI(contractName) {
  const artifactPath = path.join(
    __dirname,
    '..',
    'artifacts',
    'contracts',
    `${contractName}.sol`,
    `${contractName}.json`
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`ABI not found: ${artifactPath}`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  return artifact.abi;
}

async function main() {
  console.log('🚀 SureStack Post-Deployment Setup Script\n');
  console.log('═'.repeat(60));
  console.log('');

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
  const consensusAddress = env.CONSENSUS_STAKING_ADDRESS || env.CONSENSUS_AND_STAKING_ADDRESS;
  const policyManagerAddress = env.POLICY_MANAGER_ADDRESS;
  const daoAddress = env.DAO_GOVERNANCE_ADDRESS;
  const chainlinkAddress = env.CHAINLINK_ORACLE_ADDRESS || '0x694AA1769357215DE4FAC081bf1f309aDC325306'; // Sepolia ETH/USD default

  // Validate required variables
  const missing = [];
  if (!privateKey) missing.push('PRIVATE_KEY');
  if (!rpcUrl) missing.push('INFURA_API_URL or RPC_URL');
  if (!oracleAddress) missing.push('ORACLE_CONTRACT_ADDRESS');
  if (!rewardPoolAddress) missing.push('REWARD_POOL_ADDRESS');
  if (!consensusAddress) missing.push('CONSENSUS_STAKING_ADDRESS');
  // POLICY_MANAGER_ADDRESS is optional (may not be deployed yet)

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  if (!policyManagerAddress) {
    console.log('⚠️  POLICY_MANAGER_ADDRESS not found - skipping PolicyManager linking step\n');
  }

  console.log('📋 Configuration:');
  console.log(`   OracleReaderV2: ${oracleAddress}`);
  console.log(`   RewardPoolAndSlasher: ${rewardPoolAddress}`);
  console.log(`   ConsensusAndStakingV2: ${consensusAddress}`);
  console.log(`   PolicyManager: ${policyManagerAddress}`);
  console.log(`   Chainlink Oracle: ${chainlinkAddress}`);
  console.log(`   RPC URL: ${rpcUrl.substring(0, 30)}...`);
  console.log('');

  // Connect to network
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const network = await provider.getNetwork();
  
  console.log(`🔗 Connected to ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`   Wallet: ${wallet.address}\n`);

  // Load ABIs
  console.log('📦 Loading contract ABIs...');
  let oracleABI, rewardPoolABI, consensusABI, policyManagerABI;
  try {
    oracleABI = loadABI('OracleReaderV2');
    rewardPoolABI = loadABI('RewardPoolAndSlasher');
    consensusABI = loadABI('ConsensusAndStakingV2');
    policyManagerABI = loadABI('PolicyManager');
    console.log('✅ All ABIs loaded\n');
  } catch (error) {
    console.error('❌ Error loading ABIs:', error.message);
    process.exit(1);
  }

  // Create contract instances
  const oracle = new ethers.Contract(oracleAddress, oracleABI, wallet);
  const rewardPool = new ethers.Contract(rewardPoolAddress, rewardPoolABI, wallet);
  const consensus = new ethers.Contract(consensusAddress, consensusABI, wallet);

  const results = {
    oracleFeed: false,
    policyManagerLinked: false,
    consensusVerified: false,
    verification: {
      price: null,
      rewardBalance: null,
      penaltyBalance: null,
    },
  };

  // ────────────────────────────────────────────────────────────────
  // STEP 1: Set Chainlink feed in OracleReaderV2
  // ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('STEP 1: Setting Chainlink feed in OracleReaderV2');
  console.log('═'.repeat(60));
  
  try {
    const feed = await oracle.feeds(0); // FeedType.ETH_USD = 0
    const currentAggregator = feed.aggregatorAddress;
    const isActive = feed.isActive;

    console.log(`   Current Aggregator: ${currentAggregator}`);
    console.log(`   Is Active: ${isActive}`);

    const needsSetup = 
      !currentAggregator || 
      currentAggregator === ethers.ZeroAddress || 
      currentAggregator.toLowerCase() !== chainlinkAddress.toLowerCase();

    if (needsSetup) {
      console.log(`   ⚠️  Feed needs configuration`);
      
      // Check permissions
      const owner = await oracle.owner();
      const governanceAddress = await oracle.governanceAddress();
      const isOwner = owner.toLowerCase() === wallet.address.toLowerCase();
      const isGovernance = governanceAddress && governanceAddress.toLowerCase() === wallet.address.toLowerCase();

      if (!isOwner && !isGovernance) {
        console.error(`   ❌ Permission denied: You must be owner or governance address`);
        console.error(`      Owner: ${owner}`);
        console.error(`      Governance: ${governanceAddress || 'Not set'}`);
        console.error(`      Your address: ${wallet.address}`);
      } else {
        console.log(`   🔄 Setting oracle feed...`);
        const tx = await oracle.setOracle(0, chainlinkAddress); // FeedType.ETH_USD = 0
        console.log(`   Transaction hash: ${tx.hash}`);
        console.log(`   Waiting for confirmation...`);
        
        const receipt = await tx.wait();
        console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        results.oracleFeed = true;
        console.log(`   ✅ OracleReaderV2 feed set successfully\n`);
      }
    } else {
      console.log(`   ✅ Oracle feed already configured correctly\n`);
      results.oracleFeed = true;
    }
  } catch (error) {
    console.error(`   ❌ Error setting oracle feed: ${error.message}`);
    if (error.reason) {
      console.error(`      Reason: ${error.reason}`);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 2: Link PolicyManager to RewardPoolAndSlasher
  // ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('STEP 2: Linking PolicyManager to RewardPoolAndSlasher');
  console.log('═'.repeat(60));

  if (!policyManagerAddress) {
    console.log('   ⚠️  POLICY_MANAGER_ADDRESS not configured - skipping this step\n');
    results.policyManagerLinked = false;
  } else {
    try {
    const currentPolicyManager = await rewardPool.policyManagerAddress();
    console.log(`   Current PolicyManager: ${currentPolicyManager || 'Not set'}`);

    if (!currentPolicyManager || currentPolicyManager === ethers.ZeroAddress) {
      console.log(`   ⚠️  PolicyManager not linked`);
      
      // Check if caller is consensus contract
      const consensusContract = await rewardPool.consensusContractAddress();
      const isConsensusContract = consensusContract.toLowerCase() === consensusAddress.toLowerCase();
      
      // Check if wallet is the sequencer (who can call from consensus contract)
      let isSequencer = false;
      try {
        const sequencerAddress = await consensus.sequencerAddress();
        isSequencer = sequencerAddress.toLowerCase() === wallet.address.toLowerCase();
      } catch (error) {
        // If we can't check sequencer, continue
      }

      if (!isConsensusContract) {
        console.error(`   ❌ Consensus contract mismatch`);
        console.error(`      Registered: ${consensusContract}`);
        console.error(`      Expected: ${consensusAddress}`);
        console.error(`   💡 Note: Consensus address is immutable and set at deployment`);
      } else if (!isSequencer) {
        console.error(`   ❌ Permission denied: Only sequencer can call setPolicyManager`);
        console.error(`      Consensus Contract: ${consensusContract}`);
        console.error(`      Your address: ${wallet.address}`);
        console.error(`   💡 Tip: Use the sequencer address or call via ConsensusAndStakingV2 contract`);
      } else {
        // Try to call setPolicyManager through consensus contract if it has a function for it
        // Otherwise, we need to call it directly (which will fail if not sequencer)
        console.log(`   🔄 Setting PolicyManager via consensus contract...`);
        try {
          // Check if consensus contract has a function to set policy manager
          // If not, we'll try direct call (may fail)
          const tx = await rewardPool.setPolicyManager(policyManagerAddress);
          console.log(`   Transaction hash: ${tx.hash}`);
          console.log(`   Waiting for confirmation...`);
          
          const receipt = await tx.wait();
          console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
          console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
          results.policyManagerLinked = true;
          console.log(`   ✅ PolicyManager linked to RewardPoolAndSlasher\n`);
        } catch (txError) {
          console.error(`   ❌ Transaction failed: ${txError.message}`);
          if (txError.reason) {
            console.error(`      Reason: ${txError.reason}`);
          }
          console.error(`   💡 You may need to call setPolicyManager from the ConsensusAndStakingV2 contract`);
        }
      }
    } else if (currentPolicyManager.toLowerCase() === policyManagerAddress.toLowerCase()) {
      console.log(`   ✅ PolicyManager already linked correctly\n`);
      results.policyManagerLinked = true;
    } else {
      console.log(`   ⚠️  PolicyManager already set to different address: ${currentPolicyManager}`);
      console.log(`      Expected: ${policyManagerAddress}`);
      console.log(`   💡 Note: PolicyManager can only be set once. Redeploy if needed.\n`);
    }
    } catch (error) {
      console.error(`   ❌ Error linking PolicyManager: ${error.message}`);
      if (error.reason) {
        console.error(`      Reason: ${error.reason}`);
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 3: Verify ConsensusAndStakingV2 registration in RewardPool
  // ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('STEP 3: Verifying ConsensusAndStakingV2 in RewardPool');
  console.log('═'.repeat(60));

  try {
    const registeredConsensus = await rewardPool.consensusContractAddress();
    console.log(`   Registered Consensus: ${registeredConsensus}`);

    if (registeredConsensus.toLowerCase() === consensusAddress.toLowerCase()) {
      console.log(`   ✅ ConsensusAndStakingV2 registered correctly\n`);
      results.consensusVerified = true;
    } else {
      console.log(`   ⚠️  Consensus contract mismatch`);
      console.log(`      Registered: ${registeredConsensus}`);
      console.log(`      Expected: ${consensusAddress}`);
      console.log(`   💡 Note: Consensus address is immutable and set at deployment`);
      console.log(`      If this doesn't match, redeploy RewardPool with correct address\n`);
    }
  } catch (error) {
    console.error(`   ❌ Error verifying consensus: ${error.message}`);
    if (error.reason) {
      console.error(`      Reason: ${error.reason}`);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 4: Verify live contract functionality
  // ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('STEP 4: Verifying live contract functionality');
  console.log('═'.repeat(60));

  // 4.1: Verify Oracle price
  try {
    console.log(`   📊 Fetching latest price from OracleReaderV2...`);
    const [price, decimals, roundId, updatedAt] = await oracle.getLatestPrice();
    const priceUSD = Number(price) / (10 ** Number(decimals));
    const timestamp = new Date(Number(updatedAt) * 1000).toISOString();
    
    console.log(`   ✅ Current ETH/USD price: $${priceUSD.toFixed(2)}`);
    console.log(`      Decimals: ${decimals}`);
    console.log(`      Round ID: ${roundId.toString()}`);
    console.log(`      Timestamp: ${timestamp}`);
    
    results.verification.price = priceUSD;
  } catch (error) {
    console.error(`   ❌ Error fetching price: ${error.message}`);
    if (error.reason) {
      console.error(`      Reason: ${error.reason}`);
    }
  }

  // 4.2: Verify RewardPool balance
  try {
    console.log(`   💰 Fetching RewardPool balance...`);
    const rewardBalance = await rewardPool.rewardPoolBalance();
    const rewardBalanceFormatted = ethers.formatEther(rewardBalance);
    
    console.log(`   ✅ RewardPool balance: ${rewardBalanceFormatted} SST`);
    results.verification.rewardBalance = rewardBalanceFormatted;
  } catch (error) {
    console.error(`   ❌ Error fetching reward balance: ${error.message}`);
    if (error.reason) {
      console.error(`      Reason: ${error.reason}`);
    }
  }

  // 4.3: Verify PenaltyPool balance
  try {
    console.log(`   💰 Fetching PenaltyPool balance...`);
    const penaltyBalance = await rewardPool.penaltyPoolBalance();
    const penaltyBalanceFormatted = ethers.formatEther(penaltyBalance);
    
    console.log(`   ✅ PenaltyPool balance: ${penaltyBalanceFormatted} SST`);
    results.verification.penaltyBalance = penaltyBalanceFormatted;
  } catch (error) {
    console.error(`   ❌ Error fetching penalty balance: ${error.message}`);
    if (error.reason) {
      console.error(`      Reason: ${error.reason}`);
    }
  }

  console.log('');

  // ────────────────────────────────────────────────────────────────
  // STEP 5: Output final summary
  // ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('SureStack Post-Deploy Setup Summary');
  console.log('═'.repeat(60));
  console.log('');

  const statusIcon = (status) => status ? '✅' : '❌';
  
  console.log(`   ${statusIcon(results.oracleFeed)} OracleReaderV2 feed`);
  console.log(`   ${statusIcon(results.policyManagerLinked)} PolicyManager linked`);
  console.log(`   ${statusIcon(results.consensusVerified)} Consensus registered`);
  console.log('');

  if (results.verification.price !== null) {
    console.log(`   💰 RewardPool balance: ${results.verification.rewardBalance || 'N/A'} SST`);
    console.log(`   💰 PenaltyPool balance: ${results.verification.penaltyBalance || 'N/A'} SST`);
    console.log(`   📊 ETH/USD Price: $${results.verification.price?.toFixed(2) || 'N/A'}`);
    console.log('');
  }

  const timestamp = new Date().toISOString();
  console.log(`   📅 Timestamp: ${timestamp}`);
  console.log(`   🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log('');

  // Overall status
  const allSuccess = results.oracleFeed && results.policyManagerLinked && results.consensusVerified;
  if (allSuccess) {
    console.log('✅ Post-deployment setup completed successfully!');
  } else {
    console.log('⚠️  Post-deployment setup completed with warnings.');
    console.log('   Please review the errors above and fix any issues.');
  }

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

