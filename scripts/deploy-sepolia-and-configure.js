#!/usr/bin/env node

/**
 * @title SureStack Protocol — Sepolia Deployment & Backend Configuration
 * @notice Deploys contracts to Sepolia and configures backend/.env
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEPLOYMENT_INFO_PATH = path.join(__dirname, '..', 'deployment-info.json');
const BACKEND_ENV_PATH = path.join(__dirname, '..', 'backend', '.env');
const ENV_TEMPLATE_PATH = path.join(__dirname, '..', 'env.template');
const BACKEND_ENV_EXAMPLE_PATH = path.join(__dirname, '..', 'backend', 'ENV_EXAMPLE.txt');

/**
 * Check if deployment-info.json exists and contains Sepolia addresses
 */
function checkSepoliaDeployment() {
  try {
    if (!fs.existsSync(DEPLOYMENT_INFO_PATH)) {
      console.log('❌ deployment-info.json not found');
      return null;
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(DEPLOYMENT_INFO_PATH, 'utf-8'));
    
    if (deploymentInfo.network === 'sepolia') {
      console.log('✅ Found Sepolia deployment in deployment-info.json');
      return deploymentInfo.deployment;
    } else {
      console.log(`⚠️  Found deployment for network: ${deploymentInfo.network} (not Sepolia)`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error reading deployment-info.json:', error.message);
    return null;
  }
}

/**
 * Check if .env file exists with required credentials
 */
function checkEnvCredentials() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const hasInfura = envContent.includes('INFURA_API_URL') && 
                   !envContent.includes('INFURA_API_URL=<') &&
                   !envContent.includes('INFURA_API_URL=');
  const hasPrivateKey = envContent.includes('PRIVATE_KEY') && 
                       !envContent.includes('PRIVATE_KEY=<') &&
                       !envContent.includes('PRIVATE_KEY=');

  if (hasInfura && hasPrivateKey) {
    console.log('✅ .env file found with credentials');
    return true;
  } else {
    console.log('⚠️  .env file exists but missing required credentials');
    console.log('   Required: INFURA_API_URL, PRIVATE_KEY');
    return false;
  }
}

/**
 * Deploy contracts to Sepolia
 */
function deployToSepolia() {
  console.log('\n🚀 Deploying contracts to Sepolia...');
  console.log('='.repeat(60));
  
  try {
    execSync('npx hardhat run scripts/deploy.js --network sepolia', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        HARDHAT_NETWORK: 'sepolia'
      }
    });
    
    console.log('\n✅ Deployment completed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    return false;
  }
}

/**
 * Extract contract addresses from deployment-info.json
 */
function extractAddresses() {
  try {
    const deploymentInfo = JSON.parse(fs.readFileSync(DEPLOYMENT_INFO_PATH, 'utf-8'));
    
    if (deploymentInfo.network !== 'sepolia') {
      throw new Error('Deployment is not for Sepolia network');
    }

    return {
      SURESTACK_TOKEN: deploymentInfo.deployment.riskToken,
      CONSENSUS_STAKING: deploymentInfo.deployment.staking,
      REWARD_POOL: deploymentInfo.deployment.rewardPool,
      DAO_GOVERNANCE: deploymentInfo.deployment.dao,
      TIMELOCK: deploymentInfo.deployment.timelock,
      ORACLE_INTEGRATION: deploymentInfo.deployment.oracleIntegration,
      CHAINLINK_ORACLE: deploymentInfo.deployment.chainlinkOracleAddress,
      DEPLOYER: deploymentInfo.deployment.deployer,
      TIMESTAMP: deploymentInfo.deployment.timestamp
    };
  } catch (error) {
    console.error('❌ Error extracting addresses:', error.message);
    return null;
  }
}

/**
 * Create or update backend/.env file
 */
function createBackendEnv(addresses) {
  console.log('\n📝 Creating backend/.env file...');
  
  // Read backend ENV_EXAMPLE.txt for template
  let envContent = '';
  
  if (fs.existsSync(BACKEND_ENV_EXAMPLE_PATH)) {
    envContent = fs.readFileSync(BACKEND_ENV_EXAMPLE_PATH, 'utf-8');
  } else {
    // Create from scratch if example doesn't exist
    envContent = `PORT=5000
NODE_ENV=development
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
`;
  }

  // Update or add contract addresses
  const envLines = envContent.split('\n');
  const updatedLines = [];
  const addedVars = new Set();

  // Process existing lines and update contract addresses
  for (const line of envLines) {
    if (line.startsWith('RISK_TOKEN_CONTRACT=') || line.startsWith('SURESTACK_TOKEN_ADDRESS=')) {
      updatedLines.push(`SURESTACK_TOKEN_ADDRESS=${addresses.SURESTACK_TOKEN}`);
      updatedLines.push(`RISK_TOKEN_CONTRACT=${addresses.SURESTACK_TOKEN}  # Legacy support`);
      addedVars.add('SURESTACK_TOKEN');
    } else if (line.startsWith('CONSENSUS_CONTRACT=') || line.startsWith('CONSENSUS_STAKING_ADDRESS=')) {
      updatedLines.push(`CONSENSUS_STAKING_ADDRESS=${addresses.CONSENSUS_STAKING}`);
      updatedLines.push(`CONSENSUS_CONTRACT=${addresses.CONSENSUS_STAKING}  # Legacy support`);
      addedVars.add('CONSENSUS_STAKING');
    } else if (line.startsWith('REWARD_POOL_CONTRACT=') || line.startsWith('REWARD_POOL_ADDRESS=')) {
      updatedLines.push(`REWARD_POOL_ADDRESS=${addresses.REWARD_POOL}`);
      updatedLines.push(`REWARD_POOL_CONTRACT=${addresses.REWARD_POOL}  # Legacy support`);
      addedVars.add('REWARD_POOL');
    } else if (line.startsWith('DAO_CONTRACT=') || line.startsWith('DAO_GOVERNANCE_ADDRESS=')) {
      updatedLines.push(`DAO_GOVERNANCE_ADDRESS=${addresses.DAO_GOVERNANCE}`);
      updatedLines.push(`DAO_CONTRACT=${addresses.DAO_GOVERNANCE}  # Legacy support`);
      addedVars.add('DAO_GOVERNANCE');
    } else if (line.startsWith('TIMELOCK_ADDRESS=')) {
      updatedLines.push(`TIMELOCK_ADDRESS=${addresses.TIMELOCK}`);
      addedVars.add('TIMELOCK');
    } else if (line.startsWith('ORACLE_CONTRACT_ADDRESS=') || line.startsWith('ORACLE_INTEGRATION_CONTRACT=')) {
      updatedLines.push(`ORACLE_INTEGRATION_CONTRACT=${addresses.ORACLE_INTEGRATION}`);
      updatedLines.push(`ORACLE_CONTRACT_ADDRESS=${addresses.ORACLE_INTEGRATION}  # Legacy support`);
      addedVars.add('ORACLE_INTEGRATION');
    } else if (line.startsWith('CHAINLINK_ORACLE_ADDRESS=')) {
      updatedLines.push(`CHAINLINK_ORACLE_ADDRESS=${addresses.CHAINLINK_ORACLE}`);
      addedVars.add('CHAINLINK_ORACLE');
    } else if (line.startsWith('RPC_URL=')) {
      // Keep RPC_URL but don't replace if it has a placeholder
      if (line.includes('YOUR_INFURA_PROJECT_ID')) {
        updatedLines.push(line + '  # ⚠️  Update with your Infura Project ID');
      } else {
        updatedLines.push(line);
      }
    } else {
      updatedLines.push(line);
    }
  }

  // Add missing contract addresses
  if (!addedVars.has('SURESTACK_TOKEN')) {
    updatedLines.push(`\n# SureStack Token (SST)`);
    updatedLines.push(`SURESTACK_TOKEN_ADDRESS=${addresses.SURESTACK_TOKEN}`);
    updatedLines.push(`RISK_TOKEN_CONTRACT=${addresses.SURESTACK_TOKEN}  # Legacy support`);
  }
  if (!addedVars.has('CONSENSUS_STAKING')) {
    updatedLines.push(`\n# Consensus & Staking`);
    updatedLines.push(`CONSENSUS_STAKING_ADDRESS=${addresses.CONSENSUS_STAKING}`);
    updatedLines.push(`CONSENSUS_CONTRACT=${addresses.CONSENSUS_STAKING}  # Legacy support`);
  }
  if (!addedVars.has('REWARD_POOL')) {
    updatedLines.push(`\n# Reward Pool & Slasher`);
    updatedLines.push(`REWARD_POOL_ADDRESS=${addresses.REWARD_POOL}`);
    updatedLines.push(`REWARD_POOL_CONTRACT=${addresses.REWARD_POOL}  # Legacy support`);
  }
  if (!addedVars.has('DAO_GOVERNANCE')) {
    updatedLines.push(`\n# DAO Governance`);
    updatedLines.push(`DAO_GOVERNANCE_ADDRESS=${addresses.DAO_GOVERNANCE}`);
    updatedLines.push(`DAO_CONTRACT=${addresses.DAO_GOVERNANCE}  # Legacy support`);
  }
  if (!addedVars.has('TIMELOCK')) {
    updatedLines.push(`TIMELOCK_ADDRESS=${addresses.TIMELOCK}`);
  }
  if (!addedVars.has('ORACLE_INTEGRATION')) {
    updatedLines.push(`\n# Oracle Integration`);
    updatedLines.push(`ORACLE_INTEGRATION_CONTRACT=${addresses.ORACLE_INTEGRATION}`);
    updatedLines.push(`ORACLE_CONTRACT_ADDRESS=${addresses.ORACLE_INTEGRATION}  # Legacy support`);
  }
  if (!addedVars.has('CHAINLINK_ORACLE')) {
    updatedLines.push(`CHAINLINK_ORACLE_ADDRESS=${addresses.CHAINLINK_ORACLE}`);
  }

  // Add deployment metadata
  updatedLines.push(`\n# Deployment Info`);
  updatedLines.push(`# Deployed by: ${addresses.DEPLOYER}`);
  updatedLines.push(`# Deployment time: ${addresses.TIMESTAMP}`);
  updatedLines.push(`# Network: Sepolia`);

  // Ensure backend directory exists
  const backendDir = path.dirname(BACKEND_ENV_PATH);
  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(BACKEND_ENV_PATH, updatedLines.join('\n'));
  console.log(`✅ Created ${BACKEND_ENV_PATH}`);
}

/**
 * Main workflow
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🧠 SURESTACK PROTOCOL — BACKEND ↔ SEPOLIA INTEGRATION');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Check for existing Sepolia deployment
  console.log('1️⃣  Checking for Sepolia deployment...');
  let addresses = checkSepoliaDeployment();
  
  if (!addresses) {
    console.log('\n2️⃣  No Sepolia deployment found. Checking deployment prerequisites...');
    
    // Check for .env credentials
    const hasCredentials = checkEnvCredentials();
    
    if (!hasCredentials) {
      console.log('\n❌ Cannot deploy: Missing required credentials');
      console.log('\n📋 Required setup:');
      console.log('   1. Create .env file in project root');
      console.log('   2. Add INFURA_API_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID');
      console.log('   3. Add PRIVATE_KEY=your_deployer_wallet_private_key');
      console.log('\n   You can use env.template as a starting point.');
      console.log('\n   After setting up .env, run this script again.');
      process.exit(1);
    }
    
    console.log('\n3️⃣  Deploying contracts to Sepolia...');
    const deployed = deployToSepolia();
    
    if (!deployed) {
      console.error('\n❌ Deployment failed. Please check your credentials and try again.');
      process.exit(1);
    }
    
    // Extract addresses after deployment
    addresses = extractAddresses();
    if (!addresses) {
      console.error('\n❌ Failed to extract addresses from deployment');
      process.exit(1);
    }
  } else {
    console.log('\n✅ Using existing Sepolia deployment');
  }

  // Step 4: Extract and display addresses
  console.log('\n4️⃣  Contract Addresses:');
  console.log('='.repeat(60));
  console.log(`   SureStackToken (SST):     ${addresses.SURESTACK_TOKEN}`);
  console.log(`   ConsensusAndStaking:      ${addresses.CONSENSUS_STAKING}`);
  console.log(`   RewardPoolAndSlasher:     ${addresses.REWARD_POOL}`);
  console.log(`   DAOGovernance:            ${addresses.DAO_GOVERNANCE}`);
  console.log(`   TimelockController:      ${addresses.TIMELOCK}`);
  console.log(`   OracleIntegration:        ${addresses.ORACLE_INTEGRATION}`);
  console.log(`   Chainlink Oracle:         ${addresses.CHAINLINK_ORACLE}`);
  console.log(`   Deployer:                 ${addresses.DEPLOYER}`);
  console.log('='.repeat(60));

  // Step 5: Create backend/.env
  console.log('\n5️⃣  Configuring backend/.env...');
  createBackendEnv(addresses);

  console.log('\n' + '='.repeat(60));
  console.log('✅ WORKFLOW COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n📋 Next Steps:');
  console.log('   1. Update backend/.env with your RPC_URL (if needed)');
  console.log('   2. Start backend server: cd backend && npm start');
  console.log('   3. Verify contracts are accessible from backend');
  console.log('\n');
}

main().catch((error) => {
  console.error('\n❌ Workflow failed:', error);
  process.exit(1);
});

