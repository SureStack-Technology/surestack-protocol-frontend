#!/usr/bin/env node

/**
 * analyze-env.js
 * 
 * Analyzes .env files for SureStack Protocol
 * Checks for presence, validity, consistency, and format issues
 */

const fs = require('fs');
const path = require('path');

// Paths
const ROOT_ENV_PATH = path.join(__dirname, '.env');
const BACKEND_ENV_PATH = path.join(__dirname, 'backend', '.env');
const FRONTEND_ENV_PATH = path.join(__dirname, '.env.local');

// Required backend variables (root .env)
const REQUIRED_BACKEND_ROOT = [
  'PRIVATE_KEY',
  'INFURA_API_URL',
  'PORT',
  'SURESTACK_TOKEN_ADDRESS',
  'CONSENSUS_STAKING_ADDRESS',
  'REWARD_POOL_ADDRESS',
  'DAO_GOVERNANCE_ADDRESS',
  'ORACLE_CONTRACT_ADDRESS',
  'CHAINLINK_ORACLE_ADDRESS',
  'POLICY_MANAGER_ADDRESS',
];

// Required backend variables (backend/.env)
const REQUIRED_BACKEND = [
  'PORT',
  'SURESTACK_TOKEN_ADDRESS',
  'CONSENSUS_STAKING_ADDRESS',
  'REWARD_POOL_ADDRESS',
  'DAO_GOVERNANCE_ADDRESS',
  'ORACLE_CONTRACT_ADDRESS',
  'CHAINLINK_ORACLE_ADDRESS',
  'POLICY_MANAGER_ADDRESS',
];

// Required frontend variables (must have VITE_ prefix)
// Note: VITE_ORACLE_READER_ADDRESS and VITE_ORACLE_READER_V2_ADDRESS are both acceptable
const REQUIRED_FRONTEND = [
  'VITE_SEPOLIA_RPC',
  'VITE_SURE_STACK_TOKEN_ADDRESS',
  'VITE_CONSENSUS_STAKING_V2_ADDRESS',
  'VITE_REWARD_POOL_ADDRESS',
  'VITE_DAO_GOVERNANCE_ADDRESS',
  'VITE_ORACLE_READER_V2_ADDRESS', // Primary, but VITE_ORACLE_READER_ADDRESS is also acceptable
  'VITE_POLICY_MANAGER_ADDRESS',
];

// Mapping for consistency checks
const ADDRESS_MAPPING = {
  'SURESTACK_TOKEN_ADDRESS': 'VITE_SURE_STACK_TOKEN_ADDRESS',
  'CONSENSUS_STAKING_ADDRESS': 'VITE_CONSENSUS_STAKING_V2_ADDRESS',
  'REWARD_POOL_ADDRESS': 'VITE_REWARD_POOL_ADDRESS',
  'DAO_GOVERNANCE_ADDRESS': 'VITE_DAO_GOVERNANCE_ADDRESS',
  'ORACLE_CONTRACT_ADDRESS': 'VITE_ORACLE_READER_V2_ADDRESS',
  'POLICY_MANAGER_ADDRESS': 'VITE_POLICY_MANAGER_ADDRESS',
};

/**
 * Parse .env file
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};

  content.split('\n').forEach((line, index) => {
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
      
      // Remove quotes
      value = value.replace(/^["']|["']$/g, '');
      
      env[key] = {
        value,
        hasQuotes: line.includes('"') || line.includes("'"),
        hasTrailingSpace: match[2].endsWith(' ') || match[2].endsWith('\t'),
        isEmpty: !value || value === '',
      };
    }
  });

  return env;
}

/**
 * Check if value is a valid Ethereum address
 */
function isValidAddress(value) {
  if (!value || value === '') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Check if value is a valid URL
 */
function isValidUrl(value) {
  if (!value || value === '') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Main analysis function
 */
function analyzeEnv() {
  console.log('🔍 Analyzing SureStack Protocol Environment Variables\n');
  console.log('='.repeat(80));

  // Parse all env files
  const rootEnv = parseEnvFile(ROOT_ENV_PATH);
  const backendEnv = parseEnvFile(BACKEND_ENV_PATH);
  const frontendEnv = parseEnvFile(FRONTEND_ENV_PATH);

  // Check file existence
  console.log('\n📁 File Status:');
  console.log(`   Root .env: ${rootEnv ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`   Backend .env: ${backendEnv ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`   Frontend .env.local: ${frontendEnv ? '✅ EXISTS' : '❌ MISSING'}`);

  if (!rootEnv && !backendEnv && !frontendEnv) {
    console.log('\n❌ No environment files found!');
    return;
  }

  const issues = [];
  const warnings = [];
  const summary = [];

  // Analyze Root .env (Backend/Hardhat)
  console.log('\n' + '='.repeat(80));
  console.log('📋 ROOT .env (Hardhat/Deployment) Analysis:');
  console.log('='.repeat(80));

  if (rootEnv) {
    REQUIRED_BACKEND_ROOT.forEach((varName) => {
      const varData = rootEnv[varName];
      // Check if present and not empty (empty string counts as missing)
      const present = !!varData && varData.value !== '' && !varData.isEmpty;
      const valid = present && (
        varName.includes('ADDRESS') ? isValidAddress(varData.value) :
        varName.includes('URL') ? isValidUrl(varData.value) :
        varName === 'PORT' ? /^\d+$/.test(varData.value) :
        varName === 'PRIVATE_KEY' ? /^[a-fA-F0-9]{64}$/.test(varData.value) :
        true
      );

      summary.push({
        file: 'Root .env',
        variable: varName,
        present,
        valid,
        value: varData?.value || '(empty)',
      });

      if (!present) {
        issues.push(`Root .env: Missing ${varName}`);
      } else if (!valid && varData.value !== '') {
        warnings.push(`Root .env: Invalid format for ${varName}`);
      }

      // Format issues
      if (varData) {
        if (varData.hasTrailingSpace) {
          warnings.push(`Root .env: ${varName} has trailing spaces`);
        }
      }
    });
  } else {
    REQUIRED_BACKEND_ROOT.forEach((varName) => {
      issues.push(`Root .env: File missing - cannot check ${varName}`);
    });
  }

  // Analyze Backend .env
  console.log('\n' + '='.repeat(80));
  console.log('📋 BACKEND .env (Express API) Analysis:');
  console.log('='.repeat(80));

  if (backendEnv) {
    // Check for RPC_URL or INFURA_API_URL
    const hasRpc = backendEnv['RPC_URL'] || backendEnv['INFURA_API_URL'];
    if (!hasRpc || hasRpc.isEmpty) {
      issues.push('Backend .env: Missing RPC_URL or INFURA_API_URL');
    }

    REQUIRED_BACKEND.forEach((varName) => {
      const varData = backendEnv[varName];
      const present = !!varData && !varData.isEmpty;
      const valid = present && (
        varName.includes('ADDRESS') ? isValidAddress(varData.value) :
        varName.includes('URL') ? isValidUrl(varData.value) :
        varName === 'PORT' ? /^\d+$/.test(varData.value) :
        true
      );

      summary.push({
        file: 'Backend .env',
        variable: varName,
        present,
        valid,
        value: varData?.value || '(empty)',
      });

      if (!present) {
        issues.push(`Backend .env: Missing ${varName}`);
      } else if (!valid && varData.value !== '') {
        warnings.push(`Backend .env: Invalid format for ${varName}`);
      }
    });

    // Check for CORS/ALLOWED_ORIGINS
    if (!backendEnv['ALLOWED_ORIGINS'] || backendEnv['ALLOWED_ORIGINS'].isEmpty) {
      warnings.push('Backend .env: Missing ALLOWED_ORIGINS (CORS may not work)');
    }

    // Check for PRIVATE_KEY in backend (should not be there for security)
    if (backendEnv['PRIVATE_KEY'] && !backendEnv['PRIVATE_KEY'].isEmpty) {
      warnings.push('Backend .env: PRIVATE_KEY found (security risk - should not be in backend .env)');
    }
  } else {
    REQUIRED_BACKEND.forEach((varName) => {
      issues.push(`Backend .env: File missing - cannot check ${varName}`);
    });
  }

  // Analyze Frontend .env.local
  console.log('\n' + '='.repeat(80));
  console.log('📋 FRONTEND .env.local (Vite React) Analysis:');
  console.log('='.repeat(80));

  if (frontendEnv) {
    // Check all variables have VITE_ prefix
    const nonViteVars = Object.keys(frontendEnv).filter(key => !key.startsWith('VITE_'));
    if (nonViteVars.length > 0) {
      warnings.push(`Frontend .env.local: Variables without VITE_ prefix: ${nonViteVars.join(', ')}`);
    }

    REQUIRED_FRONTEND.forEach((varName) => {
      // Special handling for Oracle Reader - check both V1 and V2
      let varData = frontendEnv[varName];
      let actualVarName = varName;
      
      if (varName === 'VITE_ORACLE_READER_V2_ADDRESS') {
        // Check for V2 first, then fallback to V1
        if (!varData || varData.isEmpty) {
          varData = frontendEnv['VITE_ORACLE_READER_ADDRESS'];
          actualVarName = 'VITE_ORACLE_READER_ADDRESS (or VITE_ORACLE_READER_V2_ADDRESS)';
        }
      }
      
      const present = !!varData && !varData.isEmpty;
      const valid = present && (
        varName.includes('ADDRESS') ? isValidAddress(varData.value) :
        varName.includes('RPC') || varName.includes('URL') ? isValidUrl(varData.value) :
        true
      );

      summary.push({
        file: 'Frontend .env.local',
        variable: actualVarName,
        present,
        valid,
        value: varData?.value || '(empty)',
      });

      if (!present) {
        issues.push(`Frontend .env.local: Missing ${varName} (or VITE_ORACLE_READER_ADDRESS)`);
      } else if (!valid && varData.value !== '') {
        warnings.push(`Frontend .env.local: Invalid format for ${actualVarName}`);
      }
    });

    // Check for secrets in frontend
    if (frontendEnv['PRIVATE_KEY'] && !frontendEnv['PRIVATE_KEY'].isEmpty) {
      issues.push('Frontend .env.local: PRIVATE_KEY found (CRITICAL SECURITY RISK - must be removed!)');
    }
  } else {
    REQUIRED_FRONTEND.forEach((varName) => {
      issues.push(`Frontend .env.local: File missing - cannot check ${varName}`);
    });
  }

  // Consistency checks
  console.log('\n' + '='.repeat(80));
  console.log('🔄 CONSISTENCY CHECKS (Backend ↔ Frontend):');
  console.log('='.repeat(80));

  if (backendEnv && frontendEnv) {
    Object.entries(ADDRESS_MAPPING).forEach(([backendKey, frontendKey]) => {
      const backendValue = backendEnv[backendKey]?.value;
      // For oracle, check both V1 and V2 frontend variables
      let frontendValue = frontendEnv[frontendKey]?.value;
      if (!frontendValue && frontendKey === 'VITE_ORACLE_READER_V2_ADDRESS') {
        frontendValue = frontendEnv['VITE_ORACLE_READER_ADDRESS']?.value;
      }

      if (backendValue && frontendValue) {
        const match = backendValue.toLowerCase() === frontendValue.toLowerCase();
        if (!match) {
          issues.push(`Address mismatch: ${backendKey} (${backendValue}) ≠ ${frontendKey} (${frontendValue})`);
        } else {
          console.log(`   ✅ ${backendKey} ↔ ${frontendKey}: Match`);
        }
      } else if (backendValue && !frontendValue) {
        warnings.push(`Backend has ${backendKey} but frontend missing ${frontendKey}`);
      } else if (!backendValue && frontendValue) {
        warnings.push(`Frontend has ${frontendKey} but backend missing ${backendKey}`);
      }
    });

    // Check RPC URLs
    const backendRpc = backendEnv['RPC_URL']?.value || backendEnv['INFURA_API_URL']?.value;
    const frontendRpc = frontendEnv['VITE_SEPOLIA_RPC']?.value;
    if (backendRpc && frontendRpc) {
      if (backendRpc !== frontendRpc) {
        warnings.push(`RPC URL mismatch: Backend (${backendRpc}) ≠ Frontend (${frontendRpc})`);
      } else {
        console.log(`   ✅ RPC URLs: Match`);
      }
    }

    // Check Chainlink Oracle
    const backendChainlink = backendEnv['CHAINLINK_ORACLE_ADDRESS']?.value;
    const frontendChainlink = frontendEnv['VITE_CHAINLINK_ETHUSD']?.value;
    if (backendChainlink && frontendChainlink) {
      if (backendChainlink.toLowerCase() !== frontendChainlink.toLowerCase()) {
        warnings.push(`Chainlink Oracle mismatch: Backend (${backendChainlink}) ≠ Frontend (${frontendChainlink})`);
      } else {
        console.log(`   ✅ Chainlink Oracle: Match`);
      }
    }
  }

  // Print Summary Table
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY TABLE:');
  console.log('='.repeat(80));
  console.log('\n| Variable | File | Present | Valid | Status |');
  console.log('|----------|------|---------|-------|--------|');

  summary.forEach((item) => {
    const status = item.present && item.valid ? '✔️' : item.present ? '⚠️' : '❌';
    const present = item.present ? 'Yes' : 'No';
    const valid = item.valid ? 'Yes' : 'No';
    const valueDisplay = item.value.length > 30 ? item.value.substring(0, 27) + '...' : item.value;
    console.log(`| ${item.variable} | ${item.file} | ${present} | ${valid} | ${status} |`);
  });

  // Print Issues and Warnings
  if (issues.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('❌ ISSUES DETECTED:');
    console.log('='.repeat(80));
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }

  if (warnings.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  WARNINGS:');
    console.log('='.repeat(80));
    warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
  }

  // Final Status
  console.log('\n' + '='.repeat(80));
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ All environment variables for SureStack Protocol are properly configured.');
  } else {
    console.log('❌ Missing or inconsistent variables detected, with suggestions to fix:');
    console.log('\n💡 Suggestions:');
    console.log('   1. Run `npm run sync:env` to sync backend .env to frontend .env.local');
    console.log('   2. Ensure all contract addresses are set in backend/.env');
    console.log('   3. Verify all frontend variables have VITE_ prefix');
    console.log('   4. Remove PRIVATE_KEY from frontend .env.local if present');
    console.log('   5. Ensure RPC URLs match between backend and frontend');
  }
  console.log('='.repeat(80));
}

// Run analysis
try {
  analyzeEnv();
} catch (error) {
  console.error('❌ Error during analysis:', error.message);
  process.exit(1);
}

