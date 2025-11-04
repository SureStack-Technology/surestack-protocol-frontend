#!/usr/bin/env node

/**
 * @title SureStack Protocol — Sepolia Deployment & Validation
 * @notice Validates environment, deploys contracts, and generates deployment report
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

const DEPLOYMENT_INFO_PATH = path.join(__dirname, '..', 'deployment-info.json');
const BACKEND_ENV_PATH = path.join(__dirname, '..', 'backend', '.env');
const DEPLOYMENT_REPORT_PATH = path.join(__dirname, '..', 'docs', 'SURESTACK_SEPOLIA_DEPLOYMENT_REPORT.md');
const CHAINLINK_ORACLE_ADDRESS = '0x694AA1769357215DE4FAC081bf1f309aDC325306';

/**
 * Step 1: Validate Environment
 */
async function validateEnvironment() {
  console.log('='.repeat(60));
  console.log('1️⃣  VALIDATING ENVIRONMENT');
  console.log('='.repeat(60));
  console.log('');

  const errors = [];
  const warnings = [];

  // Check PRIVATE_KEY
  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY.trim() === '') {
    errors.push('❌ PRIVATE_KEY is missing or empty');
  } else if (process.env.PRIVATE_KEY.length < 64) {
    errors.push('❌ PRIVATE_KEY appears to be invalid (too short)');
  } else {
    console.log('✅ PRIVATE_KEY found');
  }

  // Check INFURA_API_URL
  if (!process.env.INFURA_API_URL || process.env.INFURA_API_URL.trim() === '') {
    errors.push('❌ INFURA_API_URL is missing or empty');
  } else if (process.env.INFURA_API_URL.includes('<YOUR_INFURA_PROJECT_ID>') || 
             process.env.INFURA_API_URL.includes('YOUR_PROJECT_ID')) {
    errors.push('❌ INFURA_API_URL contains placeholder. Please update with your Infura Project ID');
  } else {
    console.log('✅ INFURA_API_URL found');
    console.log(`   ${process.env.INFURA_API_URL.substring(0, 40)}...`);
  }

  // Test RPC Connection
  console.log('\n🔍 Testing Infura RPC connection...');
  try {
    const provider = new ethers.JsonRpcProvider(process.env.INFURA_API_URL);
    const network = await provider.getNetwork();
    console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    if (network.chainId !== 11155111n) {
      warnings.push(`⚠️  Expected Sepolia (Chain ID: 11155111), got Chain ID: ${network.chainId}`);
    } else {
      console.log('✅ Network confirmed as Sepolia');
    }

    // Get block number to confirm connectivity
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Current block: ${blockNumber}`);

    // Test Chainlink Oracle reachability
    console.log('\n🔍 Testing Chainlink Oracle reachability...');
    try {
      const oracleABI = [
        'function decimals() external view returns (uint8)',
        'function description() external view returns (string memory)',
        'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)'
      ];
      const oracleContract = new ethers.Contract(CHAINLINK_ORACLE_ADDRESS, oracleABI, provider);
      const decimals = await oracleContract.decimals();
      const description = await oracleContract.description();
      console.log(`✅ Chainlink Oracle reachable`);
      console.log(`   Address: ${CHAINLINK_ORACLE_ADDRESS}`);
      console.log(`   Description: ${description}`);
      console.log(`   Decimals: ${decimals}`);
    } catch (error) {
      warnings.push(`⚠️  Could not reach Chainlink Oracle: ${error.message}`);
    }

    // Check deployer balance
    if (process.env.PRIVATE_KEY) {
      try {
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const balance = await provider.getBalance(wallet.address);
        const balanceEth = ethers.formatEther(balance);
        console.log(`\n💰 Deployer wallet: ${wallet.address}`);
        console.log(`   Balance: ${balanceEth} ETH`);
        
        if (parseFloat(balanceEth) < 0.01) {
          warnings.push(`⚠️  Low balance: ${balanceEth} ETH. You may need more ETH for deployment gas fees.`);
        } else {
          console.log(`✅ Sufficient balance for deployment`);
        }
      } catch (error) {
        warnings.push(`⚠️  Could not check deployer balance: ${error.message}`);
      }
    }

  } catch (error) {
    errors.push(`❌ RPC connection failed: ${error.message}`);
  }

  // Check ETHERSCAN_API_KEY (optional)
  if (process.env.ETHERSCAN_API_KEY && process.env.ETHERSCAN_API_KEY.trim() !== '') {
    console.log('✅ ETHERSCAN_API_KEY found (verification enabled)');
  } else {
    warnings.push('⚠️  ETHERSCAN_API_KEY not set (contracts will not be verified)');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (errors.length > 0) {
    console.log('❌ VALIDATION FAILED');
    console.log('='.repeat(60));
    errors.forEach(err => console.log(err));
    if (warnings.length > 0) {
      console.log('\nWarnings:');
      warnings.forEach(warn => console.log(warn));
    }
    return false;
  } else {
    console.log('✅ VALIDATION PASSED');
    console.log('='.repeat(60));
    if (warnings.length > 0) {
      console.log('\nWarnings:');
      warnings.forEach(warn => console.log(warn));
    }
    return true;
  }
}

/**
 * Step 2: Deploy Contracts
 */
async function deployContracts() {
  console.log('\n' + '='.repeat(60));
  console.log('2️⃣  DEPLOYING CONTRACTS TO SEPOLIA');
  console.log('='.repeat(60));
  console.log('');

  try {
    const { execSync } = require('child_process');
    
    console.log('🚀 Starting deployment...');
    console.log('   This may take several minutes...\n');
    
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
 * Step 3: Extract Addresses and Update Backend
 */
async function extractAndPropagateAddresses() {
  console.log('\n' + '='.repeat(60));
  console.log('3️⃣  EXTRACTING ADDRESSES & UPDATING BACKEND');
  console.log('='.repeat(60));
  console.log('');

  try {
    if (!fs.existsSync(DEPLOYMENT_INFO_PATH)) {
      throw new Error('deployment-info.json not found after deployment');
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(DEPLOYMENT_INFO_PATH, 'utf-8'));

    if (deploymentInfo.network !== 'sepolia') {
      throw new Error(`Expected Sepolia deployment, got: ${deploymentInfo.network}`);
    }

    const addresses = deploymentInfo.deployment;

    console.log('📋 Contract Addresses:');
    console.log('='.repeat(60));
    console.log(`   SureStackToken (SST):     ${addresses.riskToken}`);
    console.log(`   ConsensusAndStaking:      ${addresses.staking}`);
    console.log(`   RewardPoolAndSlasher:     ${addresses.rewardPool}`);
    console.log(`   DAOGovernance:            ${addresses.dao}`);
    console.log(`   TimelockController:       ${addresses.timelock}`);
    console.log(`   OracleIntegration:        ${addresses.oracleIntegration}`);
    console.log(`   Chainlink Oracle:         ${addresses.chainlinkOracleAddress}`);
    console.log(`   Deployer:                 ${addresses.deployer}`);
    console.log('='.repeat(60));

    // Update backend/.env
    console.log('\n📝 Updating backend/.env...');
    await updateBackendEnv(addresses);

    console.log('✅ Backend configuration updated');
    return addresses;
  } catch (error) {
    console.error('❌ Error extracting addresses:', error.message);
    return null;
  }
}

/**
 * Update backend/.env file
 */
async function updateBackendEnv(addresses) {
  const backendDir = path.dirname(BACKEND_ENV_PATH);
  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true });
  }

  let envContent = '';
  
  // Read existing backend/.env if it exists, otherwise use template
  if (fs.existsSync(BACKEND_ENV_PATH)) {
    envContent = fs.readFileSync(BACKEND_ENV_PATH, 'utf-8');
  } else {
    const examplePath = path.join(backendDir, 'ENV_EXAMPLE.txt');
    if (fs.existsSync(examplePath)) {
      envContent = fs.readFileSync(examplePath, 'utf-8');
    }
  }

  // Build new .env content
  const envLines = [];
  envLines.push('PORT=5000');
  envLines.push('NODE_ENV=development');
  envLines.push(`RPC_URL=${process.env.INFURA_API_URL}`);
  envLines.push('');
  envLines.push('# SureStack Protocol Contract Addresses (Sepolia)');
  envLines.push(`SURESTACK_TOKEN_ADDRESS=${addresses.riskToken}`);
  envLines.push(`RISK_TOKEN_CONTRACT=${addresses.riskToken}  # Legacy support`);
  envLines.push(`CONSENSUS_STAKING_ADDRESS=${addresses.staking}`);
  envLines.push(`CONSENSUS_CONTRACT=${addresses.staking}  # Legacy support`);
  envLines.push(`REWARD_POOL_ADDRESS=${addresses.rewardPool}`);
  envLines.push(`REWARD_POOL_CONTRACT=${addresses.rewardPool}  # Legacy support`);
  envLines.push(`DAO_GOVERNANCE_ADDRESS=${addresses.dao}`);
  envLines.push(`DAO_CONTRACT=${addresses.dao}  # Legacy support`);
  envLines.push(`TIMELOCK_ADDRESS=${addresses.timelock}`);
  envLines.push(`ORACLE_INTEGRATION_CONTRACT=${addresses.oracleIntegration}`);
  envLines.push(`ORACLE_CONTRACT_ADDRESS=${addresses.oracleIntegration}  # Legacy support`);
  envLines.push(`CHAINLINK_ORACLE_ADDRESS=${addresses.chainlinkOracleAddress}`);
  envLines.push('');
  envLines.push('ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001');
  envLines.push('');
  envLines.push('# Deployment Info');
  envLines.push(`# Deployed by: ${addresses.deployer}`);
  envLines.push(`# Deployment time: ${addresses.timestamp}`);
  envLines.push(`# Network: Sepolia`);

  fs.writeFileSync(BACKEND_ENV_PATH, envLines.join('\n'));
  console.log(`   ✅ Updated ${BACKEND_ENV_PATH}`);
}

/**
 * Step 4: Verify Contracts on Etherscan
 */
async function verifyContracts(addresses) {
  console.log('\n' + '='.repeat(60));
  console.log('4️⃣  VERIFYING CONTRACTS ON ETHERSCAN');
  console.log('='.repeat(60));
  console.log('');

  if (!process.env.ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY.trim() === '') {
    console.log('⚠️  ETHERSCAN_API_KEY not set. Skipping verification.');
    console.log('   Contracts can be verified manually at: https://sepolia.etherscan.io');
    return {};
  }

  const verificationResults = {};
  const contracts = [
    { name: 'SureStackToken', address: addresses.riskToken, contract: 'RISKToken.sol:RISKToken' },
    { name: 'ConsensusAndStaking', address: addresses.staking, contract: 'ConsensusAndStaking.sol:ConsensusAndStaking' },
    { name: 'RewardPoolAndSlasher', address: addresses.rewardPool, contract: 'RewardPoolAndSlasher.sol:RewardPoolAndSlasher' },
    { name: 'DAOGovernance', address: addresses.dao, contract: 'DAOGovernance.sol:DAOGovernance' },
    { name: 'OracleIntegration', address: addresses.oracleIntegration, contract: 'OracleIntegration.sol:OracleReader' }
  ];

  for (const contract of contracts) {
    try {
      console.log(`🔍 Verifying ${contract.name}...`);
      const { execSync } = require('child_process');
      
      execSync(`npx hardhat verify --network sepolia ${contract.address}`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          HARDHAT_NETWORK: 'sepolia'
        }
      });

      verificationResults[contract.name] = {
        address: contract.address,
        verified: true,
        etherscanUrl: `https://sepolia.etherscan.io/address/${contract.address}`
      };
      console.log(`✅ ${contract.name} verified\n`);
    } catch (error) {
      verificationResults[contract.name] = {
        address: contract.address,
        verified: false,
        error: error.message,
        etherscanUrl: `https://sepolia.etherscan.io/address/${contract.address}`
      };
      console.log(`⚠️  ${contract.name} verification failed: ${error.message}\n`);
    }
  }

  return verificationResults;
}

/**
 * Step 5: Generate Deployment Report
 */
async function generateDeploymentReport(addresses, verificationResults) {
  console.log('\n' + '='.repeat(60));
  console.log('5️⃣  GENERATING DEPLOYMENT REPORT');
  console.log('='.repeat(60));
  console.log('');

  const docsDir = path.dirname(DEPLOYMENT_REPORT_PATH);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const report = `# SureStack Protocol — Sepolia Deployment Report

**Generated:** ${timestamp}  
**Network:** Sepolia (Chain ID: 11155111)  
**Deployer:** ${addresses.deployer}

---

## 📋 Deployment Summary

All SureStack Protocol contracts have been successfully deployed to the Sepolia testnet.

### Contract Addresses

| Contract | Address | Status |
|----------|---------|--------|
| **SureStackToken (SST)** | [\`${addresses.riskToken}\`](https://sepolia.etherscan.io/address/${addresses.riskToken}) | ✅ Deployed |
| **ConsensusAndStaking** | [\`${addresses.staking}\`](https://sepolia.etherscan.io/address/${addresses.staking}) | ✅ Deployed |
| **RewardPoolAndSlasher** | [\`${addresses.rewardPool}\`](https://sepolia.etherscan.io/address/${addresses.rewardPool}) | ✅ Deployed |
| **DAOGovernance** | [\`${addresses.dao}\`](https://sepolia.etherscan.io/address/${addresses.dao}) | ✅ Deployed |
| **TimelockController** | [\`${addresses.timelock}\`](https://sepolia.etherscan.io/address/${addresses.timelock}) | ✅ Deployed |
| **OracleIntegration** | [\`${addresses.oracleIntegration}\`](https://sepolia.etherscan.io/address/${addresses.oracleIntegration}) | ✅ Deployed |

### Chainlink Oracle

| Item | Value |
|------|-------|
| **Oracle Address** | [\`${addresses.chainlinkOracleAddress}\`](https://sepolia.etherscan.io/address/${addresses.chainlinkOracleAddress}) |
| **Feed** | ETH/USD Price Feed |
| **Network** | Sepolia Testnet |

---

## ✅ Verification Status

${Object.entries(verificationResults).map(([name, result]) => {
  const status = result.verified ? '✅ Verified' : '⚠️  Not Verified';
  return `### ${name}\n\n- **Address:** [\`${result.address}\`](${result.etherscanUrl})\n- **Status:** ${status}\n${result.error ? `- **Error:** ${result.error}\n` : ''}`;
}).join('\n')}

---

## 🔗 Explorer Links

- **Sepolia Explorer:** https://sepolia.etherscan.io
- **Deployer Address:** [\`${addresses.deployer}\`](https://sepolia.etherscan.io/address/${addresses.deployer})

---

## 📝 Configuration Files

### deployment-info.json

All deployment information has been saved to \`deployment-info.json\`:

\`\`\`json
{
  "network": "sepolia",
  "deployment": {
    "riskToken": "${addresses.riskToken}",
    "staking": "${addresses.staking}",
    "rewardPool": "${addresses.rewardPool}",
    "timelock": "${addresses.timelock}",
    "dao": "${addresses.dao}",
    "oracleIntegration": "${addresses.oracleIntegration}",
    "chainlinkOracleAddress": "${addresses.chainlinkOracleAddress}",
    "deployer": "${addresses.deployer}",
    "timestamp": "${addresses.timestamp}"
  }
}
\`\`\`

### backend/.env

Backend environment variables have been configured in \`backend/.env\`:

\`\`\`env
RPC_URL=${process.env.INFURA_API_URL}
SURESTACK_TOKEN_ADDRESS=${addresses.riskToken}
CONSENSUS_STAKING_ADDRESS=${addresses.staking}
REWARD_POOL_ADDRESS=${addresses.rewardPool}
DAO_GOVERNANCE_ADDRESS=${addresses.dao}
TIMELOCK_ADDRESS=${addresses.timelock}
ORACLE_INTEGRATION_CONTRACT=${addresses.oracleIntegration}
CHAINLINK_ORACLE_ADDRESS=${addresses.chainlinkOracleAddress}
\`\`\`

---

## 🧪 Testing

### Test Oracle Integration

After starting the backend server, test the Oracle API:

\`\`\`bash
curl http://localhost:5000/api/oracle
\`\`\`

Expected response:
\`\`\`json
{
  "price": 2500.00,
  "priceFormatted": "2500.00",
  "decimals": 8,
  "updatedAt": "2025-01-XX...",
  "oracleAddress": "${addresses.oracleIntegration}",
  "chainlinkFeed": "${addresses.chainlinkOracleAddress}"
}
\`\`\`

---

## 📊 Deployment Statistics

- **Total Contracts Deployed:** 6
- **Network:** Sepolia Testnet
- **Deployment Time:** ${addresses.timestamp}
- **Deployer:** ${addresses.deployer}

---

## 🔄 Next Steps

1. ✅ Contracts deployed to Sepolia
2. ✅ Backend configuration updated
3. ⏭️  Start backend server: \`cd backend && npm start\`
4. ⏭️  Test Oracle API endpoint
5. ⏭️  Test frontend integration with live contracts
6. ⏭️  Begin testing validator registration and staking

---

**Report Generated:** ${timestamp}  
**SureStack Protocol** — Decentralized Risk Coverage & Governance Network
`;

  fs.writeFileSync(DEPLOYMENT_REPORT_PATH, report);
  console.log(`✅ Deployment report created: ${DEPLOYMENT_REPORT_PATH}`);
}

/**
 * Main Workflow
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SURESTACK PROTOCOL — SEPOLIA DEPLOYMENT WORKFLOW');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Validate Environment
  const isValid = await validateEnvironment();
  if (!isValid) {
    console.error('\n❌ Environment validation failed. Please fix the errors above.');
    process.exit(1);
  }

  // Step 2: Deploy Contracts
  const deployed = await deployContracts();
  if (!deployed) {
    console.error('\n❌ Deployment failed. Please check the errors above.');
    process.exit(1);
  }

  // Step 3: Extract and Propagate Addresses
  const addresses = await extractAndPropagateAddresses();
  if (!addresses) {
    console.error('\n❌ Failed to extract addresses.');
    process.exit(1);
  }

  // Step 4: Verify Contracts
  const verificationResults = await verifyContracts(addresses);

  // Step 5: Generate Report
  await generateDeploymentReport(addresses, verificationResults);

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ DEPLOYMENT WORKFLOW COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n📋 Summary:');
  console.log('   ✅ Environment validated');
  console.log('   ✅ Contracts deployed to Sepolia');
  console.log('   ✅ Backend configuration updated');
  console.log('   ✅ Deployment report generated');
  console.log('\n🧪 Next Steps:');
  console.log('   1. Start backend: cd backend && npm start');
  console.log('   2. Test Oracle: curl http://localhost:5000/api/oracle');
  console.log('   3. Verify contracts on Etherscan (if needed)');
  console.log('\n');
}

main().catch((error) => {
  console.error('\n❌ Workflow failed:', error);
  process.exit(1);
});

