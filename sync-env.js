#!/usr/bin/env node

/**
 * sync-env.js
 * 
 * Syncs deployed contract addresses from backend .env to frontend .env.local
 * 
 * Usage: node sync-env.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const BACKEND_ENV_PATH = path.join(__dirname, 'backend', '.env');
const FRONTEND_ENV_PATH = path.join(__dirname, '.env.local');

// Mapping from backend keys to frontend VITE_ keys
// Each entry can have fallback keys (array) or a single key (string)
const ENV_MAPPING = {
  'VITE_SEPOLIA_RPC': ['INFURA_API_URL', 'RPC_URL'],
  'VITE_SURE_STACK_TOKEN_ADDRESS': ['SURESTACK_TOKEN_ADDRESS', 'RISK_TOKEN_CONTRACT'],
  'VITE_CONSENSUS_STAKING_V2_ADDRESS': ['CONSENSUS_STAKING_ADDRESS', 'CONSENSUS_CONTRACT'],
  'VITE_REWARD_POOL_ADDRESS': ['REWARD_POOL_ADDRESS', 'REWARD_POOL_CONTRACT'],
  'VITE_DAO_GOVERNANCE_ADDRESS': ['DAO_GOVERNANCE_ADDRESS', 'DAO_CONTRACT'],
  'VITE_ORACLE_READER_V2_ADDRESS': ['ORACLE_CONTRACT_ADDRESS', 'ORACLE_INTEGRATION_CONTRACT'],
  'VITE_POLICY_MANAGER_ADDRESS': ['POLICY_MANAGER_ADDRESS'],
};

/**
 * Parse .env file and return key-value pairs
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};

  content.split('\n').forEach((line) => {
    // Skip comments and empty lines
    line = line.trim();
    if (!line || line.startsWith('#')) {
      return;
    }

    // Parse KEY=VALUE (handle inline comments)
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove inline comments (everything after # that's not in quotes)
      const commentIndex = value.indexOf(' #');
      if (commentIndex !== -1) {
        value = value.substring(0, commentIndex).trim();
      }
      
      // Remove quotes if present
      env[key] = value.replace(/^["']|["']$/g, '');
    }
  });

  return env;
}

/**
 * Main sync function
 */
function syncEnv() {
  console.log('🔄 Syncing environment variables from backend to frontend...\n');

  // Check if backend .env exists
  if (!fs.existsSync(BACKEND_ENV_PATH)) {
    console.error('❌ Error: Backend .env file not found at:', BACKEND_ENV_PATH);
    console.error('   Please create ./backend/.env with the required contract addresses.');
    process.exit(1);
  }

  // Parse backend .env
  const backendEnv = parseEnvFile(BACKEND_ENV_PATH);
  if (!backendEnv) {
    console.error('❌ Error: Failed to parse backend .env file.');
    process.exit(1);
  }

  // Build frontend env object
  const frontendEnv = {};
  const missingKeys = [];
  const syncedKeys = [];

  Object.entries(ENV_MAPPING).forEach(([frontendKey, backendKeys]) => {
    // Handle both array (fallback keys) and string (single key)
    const keysToCheck = Array.isArray(backendKeys) ? backendKeys : [backendKeys];
    
    let value = null;
    let foundKey = null;
    
    // Try each backend key until we find a value
    for (const backendKey of keysToCheck) {
      if (backendEnv[backendKey] && backendEnv[backendKey].trim() !== '') {
        value = backendEnv[backendKey];
        foundKey = backendKey;
        break;
      }
    }

    if (value) {
      frontendEnv[frontendKey] = value;
      syncedKeys.push({ backendKey: foundKey, frontendKey, value });
    } else {
      // Report the primary key as missing
      const primaryKey = keysToCheck[0];
      missingKeys.push(primaryKey);
    }
  });

  // Warn about missing keys
  if (missingKeys.length > 0) {
    console.log('⚠️  Missing keys in backend .env:');
    missingKeys.forEach((key) => {
      console.log(`   - ${key}`);
    });
    console.log('');
  }

  // Generate frontend .env.local content
  const envLines = Object.entries(frontendEnv)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Check if frontend .env.local already exists
  const fileExists = fs.existsSync(FRONTEND_ENV_PATH);

  // Write frontend .env.local
  try {
    fs.writeFileSync(FRONTEND_ENV_PATH, envLines + '\n', 'utf-8');
    
    if (!fileExists) {
      console.log('🧩 Created new frontend .env.local file');
    } else {
      console.log('📝 Updated existing frontend .env.local file');
    }
  } catch (error) {
    console.error('❌ Error writing frontend .env.local:', error.message);
    process.exit(1);
  }

  // Print synced keys
  if (syncedKeys.length > 0) {
    console.log('\n✅ Synced environment variables successfully:');
    syncedKeys.forEach(({ backendKey, frontendKey, value }) => {
      // Truncate long values for display
      const displayValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
      console.log(`   ${frontendKey} = ${displayValue}`);
    });
  }

  // Print resulting file
  console.log('\n📄 Frontend .env.local content:');
  console.log('─'.repeat(60));
  console.log(envLines);
  console.log('─'.repeat(60));

  console.log('\n✅ Sync complete!');
}

// Run sync
try {
  syncEnv();
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
}

