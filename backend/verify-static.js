/**
 * Static Backend Verification Script
 * Verifies code structure without requiring live connections
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔍 SureStack Protocol - Backend Static Verification\n');
console.log('='.repeat(60));

// 1. Environment Template Check
console.log('\n1️⃣  ENVIRONMENT TEMPLATE');
console.log('-'.repeat(60));
const envTemplate = join(rootDir, 'env.template');
if (existsSync(envTemplate)) {
  const content = readFileSync(envTemplate, 'utf-8');
  const checks = {
    'PRIVATE_KEY': content.includes('PRIVATE_KEY='),
    'INFURA_API_URL': content.includes('INFURA_API_URL') || content.includes('RPC_URL'),
    'CHAINLINK_ORACLE_ADDRESS': content.includes('CHAINLINK_ORACLE_ADDRESS=0x694AA1769357215DE4FAC081bf1f309aDC325306'),
    'NETWORK': content.includes('HARDHAT_NETWORK') || content.includes('NETWORK'),
  };
  for (const [key, found] of Object.entries(checks)) {
    console.log(found ? `✅ ${key}` : `❌ ${key}: Missing`);
  }
} else {
  console.log('❌ env.template not found');
}

// 2. Code File Verification
console.log('\n2️⃣  CODE FILES VERIFICATION');
console.log('-'.repeat(60));
const files = {
  'blockchain.js': join(__dirname, 'src/config/blockchain.js'),
  'contracts.js': join(__dirname, 'src/config/contracts.js'),
  'oracleService.js': join(__dirname, 'src/services/oracleService.js'),
  'oracle.js': join(__dirname, 'src/routes/oracle.js'),
};

for (const [name, path] of Object.entries(files)) {
  if (existsSync(path)) {
    const content = readFileSync(path, 'utf-8');
    let checks = [];
    
    if (name === 'blockchain.js') {
      checks = [
        content.includes('ethers.JsonRpcProvider'),
        content.includes('getProvider()'),
        content.includes('getSigner()'),
      ];
    } else if (name === 'contracts.js') {
      checks = [
        content.includes('getRiskTokenContract'),
        content.includes('getConsensusStakingContract'),
        content.includes('getOracleIntegrationContract'),
      ];
    } else if (name === 'oracleService.js') {
      checks = [
        content.includes('getOracleData'),
        content.includes('0x694AA1769357215DE4FAC081bf1f309aDC325306'),
        content.includes('latestRoundData'),
      ];
    } else if (name === 'oracle.js') {
      checks = [
        content.includes('/api/oracle'),
        content.includes('getPriceWithRefresh'),
      ];
    }
    
    const allPass = checks.every(c => c);
    console.log(allPass ? `✅ ${name}` : `⚠️  ${name} (${checks.filter(c => c).length}/${checks.length} checks)`);
  } else {
    console.log(`❌ ${name}: Not found`);
  }
}

// 3. Deployment Info
console.log('\n3️⃣  DEPLOYMENT INFO');
console.log('-'.repeat(60));
const deploymentPath = join(rootDir, 'deployment-info.json');
if (existsSync(deploymentPath)) {
  const data = JSON.parse(readFileSync(deploymentPath, 'utf-8'));
  const required = ['riskToken', 'staking', 'rewardPool', 'dao', 'timelock'];
  for (const field of required) {
    const exists = data.deployment && data.deployment[field];
    console.log(exists ? `✅ ${field}` : `⚠️  ${field}: Missing`);
  }
  console.log(data.deployment.oracleIntegration ? `✅ oracleIntegration` : `⚠️  oracleIntegration: Will be added on deploy`);
  console.log(`✅ Network: ${data.network}`);
} else {
  console.log('❌ deployment-info.json not found');
}

// 4. Server Integration
console.log('\n4️⃣  SERVER INTEGRATION');
console.log('-'.repeat(60));
const serverPath = join(__dirname, 'src/server.js');
if (existsSync(serverPath)) {
  const content = readFileSync(serverPath, 'utf-8');
  const hasOracle = content.includes('oracleRouter') && content.includes('/api/oracle');
  console.log(hasOracle ? '✅ Oracle route registered' : '❌ Oracle route missing');
} else {
  console.log('❌ server.js not found');
}

console.log('\n' + '='.repeat(60));
console.log('\n✅ Static verification complete!\n');
console.log('Note: Live connection tests require active RPC endpoint.\n');

