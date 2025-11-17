/**
 * fix-oracle-reader.js
 * 
 * Hardhat script to verify and configure OracleReaderV2 contract on Sepolia
 * 
 * Usage: npx hardhat run scripts/fix-oracle-reader.js --network sepolia
 * Or: npm run fix:oracle
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables from backend/.env (fallback to root .env)
// Merges both files: backend/.env first, then root .env (root overrides non-empty values)
function loadBackendEnv() {
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

// Prompt user for confirmation
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  console.log('🔍 OracleReaderV2 Verification and Configuration Script\n');

  // Load environment variables
  let backendEnv;
  try {
    backendEnv = loadBackendEnv();
    console.log('✅ Loaded environment variables from backend/.env\n');
  } catch (error) {
    console.error('❌ Error loading backend .env:', error.message);
    process.exit(1);
  }

  // Get required environment variables
  const rpcUrl = backendEnv.INFURA_API_URL || backendEnv.RPC_URL;
  const privateKey = backendEnv.PRIVATE_KEY;
  const oracleAddress = backendEnv.ORACLE_CONTRACT_ADDRESS || backendEnv.ORACLE_INTEGRATION_CONTRACT;
  const chainlinkAddress = backendEnv.CHAINLINK_ORACLE_ADDRESS || '0x694AA1769357215DE4FAC081bf1f309aDC325306'; // Sepolia ETH/USD default

  // Validate required variables
  if (!rpcUrl) {
    console.error('❌ Error: INFURA_API_URL or RPC_URL not found in backend/.env');
    process.exit(1);
  }

  if (!privateKey) {
    console.error('❌ Error: PRIVATE_KEY not found in backend/.env');
    process.exit(1);
  }

  if (!oracleAddress) {
    console.error('❌ Error: ORACLE_CONTRACT_ADDRESS not found in backend/.env');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   OracleReaderV2 Address: ${oracleAddress}`);
  console.log(`   Chainlink Oracle Address: ${chainlinkAddress}`);
  console.log(`   RPC URL: ${rpcUrl.substring(0, 30)}...`);
  console.log('');

  // Connect to network
  const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
  const wallet = new hre.ethers.Wallet(privateKey, provider);
  console.log(`🔗 Connected to Sepolia as: ${wallet.address}\n`);

  // Load OracleReaderV2 contract
  const OracleReaderV2ABI = require('../artifacts/contracts/OracleReaderV2.sol/OracleReaderV2.json').abi;
  const oracle = new hre.ethers.Contract(oracleAddress, OracleReaderV2ABI, wallet);

  // Check current oracle feed configuration (FeedType.ETH_USD = 0)
  console.log('🔍 Checking current oracle feed configuration...');
  let needsSetup = true;
  let currentAggregator = null;
  
  try {
    const feed = await oracle.feeds(0); // FeedType.ETH_USD = 0
    currentAggregator = feed.aggregatorAddress;
    const isActive = feed.isActive;

    console.log(`   Current Aggregator: ${currentAggregator}`);
    console.log(`   Is Active: ${isActive}\n`);

    // Check if oracle needs to be set
    needsSetup = 
      !currentAggregator || 
      currentAggregator === hre.ethers.ZeroAddress || 
      currentAggregator.toLowerCase() !== chainlinkAddress.toLowerCase();
  } catch (error) {
    // Feed not initialized - this is expected for a new deployment
    console.log(`   ⚠️  Oracle feed not initialized (this is normal for new deployments)`);
    console.log(`   Will proceed to set the feed...\n`);
    needsSetup = true;
  }

  if (needsSetup) {
      console.log('⚠️  Oracle feed is not configured or does not match Chainlink address.');
      console.log(`   Current: ${currentAggregator || 'Not set'}`);
      console.log(`   Expected: ${chainlinkAddress}\n`);

      // Prompt for confirmation
      const proceed = await promptUser('Proceed to set oracle feed? (y/n): ');
      
      if (!proceed) {
        console.log('❌ Operation cancelled by user.');
        process.exit(0);
      }

      // Check if caller has permission (owner or governance)
      // Note: We'll try to get owner/governance, but if it fails, we'll still attempt the transaction
      // The transaction will fail with a clear error if we don't have permission
      console.log('🔍 Checking permissions...');
      try {
        const owner = await oracle.owner();
        let governanceAddress = null;
        try {
          governanceAddress = await oracle.governanceAddress();
        } catch (e) {
          // Governance address might not be set
        }
        const isOwner = owner.toLowerCase() === wallet.address.toLowerCase();
        const isGovernance = governanceAddress && governanceAddress.toLowerCase() === wallet.address.toLowerCase();
        
        console.log(`   Contract Owner: ${owner}`);
        console.log(`   Governance Address: ${governanceAddress || 'Not set'}`);
        console.log(`   Your Address: ${wallet.address}`);
        console.log(`   Is Owner: ${isOwner ? '✅ Yes' : '❌ No'}`);
        console.log(`   Is Governance: ${isGovernance ? '✅ Yes' : '❌ No'}\n`);
        
        if (!isOwner && !isGovernance) {
          console.warn('⚠️  Warning: You may not have permission to set oracle feed.');
          console.warn('   Attempting anyway - transaction will fail if permission denied.\n');
        }
      } catch (error) {
        console.warn('⚠️  Could not verify permissions (this may be normal):', error.message);
        console.warn('   Attempting to set oracle feed anyway - transaction will fail if permission denied.\n');
      }

      console.log('🔄 Setting oracle feed...');
      
      try {
        const tx = await oracle.setOracle(0, chainlinkAddress); // FeedType.ETH_USD = 0
        console.log(`   Transaction hash: ${tx.hash}`);
        console.log('   Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);
        
        console.log(`🧩 Oracle feed successfully set: ${chainlinkAddress}\n`);
      } catch (error) {
        console.error('❌ Error setting oracle feed:', error.message);
        if (error.reason) {
          console.error(`   Reason: ${error.reason}`);
        }
        if (error.message.includes('onlyGovernance') || error.message.includes('Ownable')) {
          console.error('   ⚠️  Permission denied: You must be the owner or governance address.');
        }
        process.exit(1);
      }
  } else {
    console.log('⚠️  Oracle feed already configured correctly.\n');
  }

  // Verify oracle functionality
  console.log('🔍 Verifying oracle functionality...\n');

  try {
    // Get latest price
    console.log('📊 Fetching latest price data...');
    const [price, decimals, roundId, updatedAt] = await oracle.getLatestPrice();
    
    const priceUSD = Number(price) / (10 ** Number(decimals));
    const timestamp = new Date(Number(updatedAt) * 1000).toISOString();
    
    console.log('✅ Current ETH/USD price:');
    console.log(`   Price: $${priceUSD.toFixed(2)}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Round ID: ${roundId.toString()}`);
    console.log(`   Timestamp: ${timestamp} (${updatedAt.toString()})\n`);

    // Check if data is fresh
    console.log('🕐 Checking data freshness...');
    const [isFresh, age] = await oracle.isDataFresh(0); // FeedType.ETH_USD = 0
    
    const ageMinutes = Math.floor(Number(age) / 60);
    const ageHours = Math.floor(ageMinutes / 60);
    
    console.log(`   Is Fresh: ${isFresh ? '✅ Yes' : '❌ No'}`);
    console.log(`   Age: ${ageHours > 0 ? `${ageHours}h ` : ''}${ageMinutes % 60}m (${age.toString()} seconds)\n`);

    // Get volatility factor (may fail if no previous round data)
    console.log('📈 Checking volatility factor...');
    try {
      const volatilityFactor = await oracle.getVolatilityFactor(0); // FeedType.ETH_USD = 0
      const volatilityPercent = Number(volatilityFactor) / 1e6; // Convert from 1e8 scale to percentage
      
      console.log(`   Volatility Factor: ${volatilityPercent.toFixed(4)}%`);
      console.log(`   (Scaled value: ${volatilityFactor.toString()})\n`);
    } catch (error) {
      console.log('   ⚠️  Volatility factor not available (no previous round data yet)');
      console.log(`   Note: Call updateRoundData() to enable volatility calculation\n`);
    }

    // Get feed info
    console.log('📋 Fetching feed information...');
    try {
      const [description, version] = await oracle.getPriceFeedInfo(0); // FeedType.ETH_USD = 0
      console.log(`   Description: ${description}`);
      console.log(`   Version: ${version.toString()}\n`);
    } catch (error) {
      console.log('   ⚠️  Could not fetch feed info\n');
    }

    console.log('✅ OracleReaderV2 verification complete.\n');
    console.log('📊 Summary:');
    console.log(`   ✅ Oracle feed configured: ${chainlinkAddress}`);
    console.log(`   ✅ Price data available: $${priceUSD.toFixed(2)}`);
    console.log(`   ✅ Data freshness: ${isFresh ? 'Fresh' : 'Stale'}`);
    console.log(`   ✅ Contract address: ${oracleAddress}`);

  } catch (error) {
    console.error('❌ Error verifying oracle:', error.message);
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    console.error('\n⚠️  Oracle may not be properly configured or Chainlink feed may be unavailable.');
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });

