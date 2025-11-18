#!/usr/bin/env node
/**
 * SureStack Protocol - Environment Variable Validator
 * Checks that all required VITE_* environment variables are set
 */

const { readFileSync } = require('fs')
const { join } = require('path')

const rootDir = join(__dirname, '..')

// Required environment variables
const required = [
  'VITE_SEPOLIA_RPC',
  'VITE_ORACLE_READER_V2_ADDRESS',
  'VITE_POLICY_MANAGER_ADDRESS',
  'VITE_REWARD_POOL_ADDRESS',
  'VITE_CONSENSUS_STAKING_V2_ADDRESS',
  'VITE_DAO_GOVERNANCE_ADDRESS',
  'VITE_SURE_STACK_TOKEN_ADDRESS',
  'VITE_ETH_USD_FEED',
];

// Load .env.local if it exists
let envVars = {}
try {
  const envFile = readFileSync(join(rootDir, '.env.local'), 'utf8')
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim()
      }
    }
  })
} catch (err) {
  // .env.local doesn't exist, that's okay - we'll check process.env
}

// Merge with process.env (process.env takes precedence)
envVars = { ...envVars, ...process.env }

// Check for missing variables
const missing = required.filter(k => {
  const value = envVars[k]
  return !value || value === '0x0000000000000000000000000000000000000000' || value.includes('YOUR_')
})

if (missing.length > 0) {
  console.error('❌ Missing or invalid environment variables:')
  missing.forEach(key => {
    console.error(`   • ${key}`)
  })
  console.error('\n💡 Create a .env.local file based on .env.example')
  console.error('   All variables must be prefixed with VITE_')
  console.error('   Example: VITE_SEPOLIA_RPC=https://rpc.sepolia.org\n')
  process.exit(1)
}

console.log('✅ Environment validated — all required variables are set')
console.log(`   Found ${required.length} required variables\n`)
console.log("%c🔗 ENV: Chainlink feed address loaded", "color:#00eaff");

// Show non-sensitive values for verification
console.log('📋 Configuration Summary:')
required.forEach(key => {
  const value = envVars[key]
  if (key.includes('RPC') || key.includes('ADDRESS')) {
    // Show first/last chars for addresses
    const display = value.length > 20 
      ? `${value.substring(0, 10)}...${value.substring(value.length - 8)}`
      : value
    console.log(`   ${key}: ${display}`)
  } else {
    console.log(`   ${key}: ${value ? '✅ Set' : '❌ Missing'}`)
  }
})
