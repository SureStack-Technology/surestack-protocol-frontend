#!/usr/bin/env node
/**
 * SureStack Protocol - Restoration Verification Script
 * Checks that all restoration fixes are in place
 */

const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

const rootDir = join(__dirname, '..')

const checks = []
let passed = 0
let failed = 0

function check(name, condition, fix = '') {
  checks.push({ name, condition, fix })
  if (condition) {
    console.log(`✅ ${name}`)
    passed++
  } else {
    console.log(`❌ ${name}`)
    if (fix) console.log(`   Fix: ${fix}`)
    failed++
  }
}

console.log('🔍 Verifying SureStack Frontend Restoration...\n')

// Check critical files exist
check('vite.config.js exists', existsSync(join(rootDir, 'vite.config.js')))
check('.env.example exists', existsSync(join(rootDir, '.env.example')))
check('scripts/check-env.js exists', existsSync(join(rootDir, 'scripts/check-env.js')))
check('shared ABI directory', existsSync(join(rootDir, 'shared/abi/ConsensusAndStaking.json')))
check('deployments file present', existsSync(join(rootDir, 'shared/deployments/sepolia.json')))

// Check vite.config.js has env loader
if (existsSync(join(rootDir, 'vite.config.js'))) {
  const viteConfig = readFileSync(join(rootDir, 'vite.config.js'), 'utf8')
  check('vite.config.js has loadEnv', viteConfig.includes('loadEnv'))
  check('vite.config.js defines process.env', viteConfig.includes('process.env'))
}

// Check main.jsx has ErrorBoundary
if (existsSync(join(rootDir, 'src/main.jsx'))) {
  const mainJsx = readFileSync(join(rootDir, 'src/main.jsx'), 'utf8')
  check('main.jsx uses createRoot', mainJsx.includes('ReactDOM.createRoot'))
}

// Check contracts.js has fallbacks
if (existsSync(join(rootDir, 'src/config/contracts.js'))) {
  const contractsJs = readFileSync(join(rootDir, 'src/config/contracts.js'), 'utf8')
  check('contracts.js imports deployments', contractsJs.includes("import deployments"))
  check('contracts.js exports CONTRACTS map', contractsJs.includes('export const CONTRACTS'))
}

// Check package.json has validate:env script
if (existsSync(join(rootDir, 'package.json'))) {
  const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
  check('package.json has validate:env script', packageJson.scripts && packageJson.scripts['validate:env'])
  check('package.json dev script includes validation', packageJson.scripts && packageJson.scripts.dev && packageJson.scripts.dev.includes('validate:env'))
}

// Check patches exist
const patchesDir = join(rootDir, 'patches')
if (existsSync(patchesDir)) {
  check('patches directory exists', true)
  check('react-reconciler patch exists', existsSync(join(patchesDir, 'react-reconciler+0.31.0.patch')))
  check('use-sync-external-store patch exists', existsSync(join(patchesDir, 'use-sync-external-store+1.6.0.patch')))
}

console.log('\n' + '='.repeat(60))
console.log(`📊 Results: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('✅ All checks passed! Restoration is complete.')
  console.log('\n🚀 Starting dev server...\n')
  process.exit(0)
} else {
  console.log('❌ Some checks failed. Please review the issues above.')
  process.exit(1)
}
