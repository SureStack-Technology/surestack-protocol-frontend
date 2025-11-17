const fs = require('fs')
const path = require('path')
const { ethers } = require('hardhat')

// Load environment variables from backend/.env (fallback to root .env)
function loadEnv() {
  const backendEnvPath = path.join(__dirname, '..', 'backend', '.env')
  const rootEnvPath = path.join(__dirname, '..', '.env')
  
  const env = {}
  
  // Helper function to parse .env file
  const parseEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
      return {}
    }
    
    const parsed = {}
    const content = fs.readFileSync(filePath, 'utf-8')

    content.split('\n').forEach((line) => {
      line = line.trim()
      if (!line || line.startsWith('#')) {
        return
      }

      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        
        // Remove inline comments
        const commentIndex = value.indexOf(' #')
        if (commentIndex !== -1) {
          value = value.substring(0, commentIndex).trim()
        }
        
        // Remove quotes if present
        parsed[key] = value.replace(/^["']|["']$/g, '')
      }
    })
    
    return parsed
  }

  // Load backend/.env first
  if (fs.existsSync(backendEnvPath)) {
    const backendEnv = parseEnvFile(backendEnvPath)
    Object.assign(env, backendEnv)
  }
  
  // Overlay with root .env (root takes precedence, but only for non-empty values)
  if (fs.existsSync(rootEnvPath)) {
    const rootEnv = parseEnvFile(rootEnvPath)
    Object.keys(rootEnv).forEach((key) => {
      if (rootEnv[key] && rootEnv[key].trim() !== '') {
        env[key] = rootEnv[key]
      }
    })
  }
  
  return env
}

async function main() {
  console.log('🚀 Deploying OracleReaderV2 to Sepolia...\n')
  console.log('═'.repeat(60))
  console.log('')

  // Load environment variables
  const env = loadEnv()
  
  const providerUrl = env.INFURA_API_URL || env.RPC_URL || 'https://rpc.sepolia.org'
  const privateKey = env.PRIVATE_KEY
  const governanceAddress = env.DAO_GOVERNANCE_ADDRESS || ethers.ZeroAddress
  const chainlinkFeed = env.CHAINLINK_ORACLE_ADDRESS || '0x694AA1769357215DE4FAC081bf1f309aDC325306' // ETH/USD on Sepolia

  if (!privateKey) {
    throw new Error('❌ Missing PRIVATE_KEY in backend/.env or root .env')
  }

  // Connect to network
  const provider = new ethers.JsonRpcProvider(providerUrl)
  const wallet = new ethers.Wallet(privateKey, provider)
  const network = await provider.getNetwork()
  const balance = await provider.getBalance(wallet.address)
  const balanceFormatted = ethers.formatEther(balance)

  console.log(`🔗 Connected to ${network.name} (Chain ID: ${network.chainId})`)
  console.log(`   Wallet: ${wallet.address}`)
  console.log(`   Balance: ${balanceFormatted} ETH\n`)

  if (balance === 0n) {
    console.error('❌ Wallet has no ETH. Please fund your wallet before deploying.')
    process.exit(1)
  }

  console.log('📋 Configuration:')
  console.log(`   Chainlink ETH/USD Feed: ${chainlinkFeed}`)
  console.log(`   Governance Address: ${governanceAddress || 'Not set (will use deployer as owner)'}`)
  console.log(`   Initial Owner: ${wallet.address}\n`)

  // Deploy OracleReaderV2
  console.log('═'.repeat(60))
  console.log('STEP 1: Deploying OracleReaderV2 contract')
  console.log('═'.repeat(60))
  
  try {
    console.log('   ⏳ Deploying contract (this may take a minute)...')
    const OracleReaderV2 = await ethers.getContractFactory('OracleReaderV2', wallet)
    
    // Constructor arguments:
    // _ethUsdAggregator, _btcUsdAggregator, _volatilityAggregator, _governanceAddress, _initialOwner
    const oracle = await OracleReaderV2.deploy(
      chainlinkFeed,        // _ethUsdAggregator (required)
      ethers.ZeroAddress,   // _btcUsdAggregator (optional, set to zero)
      ethers.ZeroAddress,   // _volatilityAggregator (optional, set to zero)
      governanceAddress || wallet.address, // _governanceAddress (use deployer if not set)
      wallet.address        // _initialOwner
    )
    
    console.log(`   📝 Transaction hash: ${oracle.deploymentTransaction().hash}`)
    console.log('   ⏳ Waiting for confirmation...')
    await oracle.waitForDeployment()
    
    const oracleAddress = await oracle.getAddress()
    console.log(`   ✅ Contract deployed successfully!`)
    console.log(`   📍 Address: ${oracleAddress}`)
    console.log(`   📦 Block: ${oracle.deploymentTransaction().blockNumber || 'Pending'}`)
    console.log(`   ⛽ Gas used: ${oracle.deploymentTransaction().gasLimit.toString()}\n`)
    
    // The constructor already initializes the ETH/USD feed, so we can verify it
    console.log('═'.repeat(60))
    console.log('STEP 2: Verifying Chainlink feed initialization')
    console.log('═'.repeat(60))
    
    try {
      const feed = await oracle.feeds(0) // FeedType.ETH_USD = 0
      console.log(`   ✅ ETH/USD feed initialized:`)
      console.log(`      Aggregator: ${feed.aggregatorAddress}`)
      console.log(`      Is Active: ${feed.isActive}`)
      console.log(`      Description: ${feed.description}\n`)
      
      if (feed.aggregatorAddress.toLowerCase() !== chainlinkFeed.toLowerCase()) {
        console.warn(`   ⚠️  Feed address mismatch!`)
        console.warn(`      Expected: ${chainlinkFeed}`)
        console.warn(`      Got: ${feed.aggregatorAddress}\n`)
      }
    } catch (error) {
      console.error(`   ❌ Error checking feed: ${error.message}\n`)
    }

    // Verify on-chain data
    console.log('═'.repeat(60))
    console.log('STEP 3: Verifying on-chain data')
    console.log('═'.repeat(60))
    
    try {
      const latest = await oracle.getLatestPrice()
      const priceUSD = Number(latest.price) / (10 ** Number(latest.decimals))
      const updatedAt = new Date(Number(latest.updatedAt) * 1000).toISOString()
      
      console.log(`   ✅ Oracle data verified:`)
      console.log(`      ETH/USD Price: $${priceUSD.toFixed(2)}`)
      console.log(`      Decimals: ${latest.decimals}`)
      console.log(`      Round ID: ${latest.roundId.toString()}`)
      console.log(`      Updated At: ${updatedAt}\n`)
      
      // Try to get volatility (V2 feature)
      try {
        const volatility = await oracle.getVolatilityFactor(0) // FeedType.ETH_USD = 0
        const volatilityPercent = Number(volatility) / 1e8 * 100
        console.log(`      Volatility Factor: ${volatilityPercent.toFixed(4)}%\n`)
      } catch (e) {
        console.log(`      Volatility: Not available yet (requires price history)\n`)
      }
      
      // Check data freshness
      try {
        const [isFresh, age] = await oracle.isDataFresh(0)
        console.log(`      Data Fresh: ${isFresh ? '✅ Yes' : '❌ No'}`)
        if (!isFresh) {
          console.log(`      Age: ${Number(age)} seconds (${(Number(age) / 3600).toFixed(2)} hours)\n`)
        } else {
          console.log(`      Age: ${Number(age)} seconds\n`)
        }
      } catch (e) {
        console.log(`      Data Freshness: Not available\n`)
      }
    } catch (error) {
      console.error(`   ❌ Error verifying oracle data: ${error.message}\n`)
    }

    // Update environment files
    console.log('═'.repeat(60))
    console.log('STEP 4: Updating environment files')
    console.log('═'.repeat(60))
    
    // Update backend/.env
    try {
      const backendEnvPath = path.resolve('./backend/.env')
      if (fs.existsSync(backendEnvPath)) {
        let backendEnv = fs.readFileSync(backendEnvPath, 'utf8')
        
        // Update or add ORACLE_CONTRACT_ADDRESS
        if (backendEnv.includes('ORACLE_CONTRACT_ADDRESS=')) {
          backendEnv = backendEnv.replace(
            /^ORACLE_CONTRACT_ADDRESS=.*$/m,
            `ORACLE_CONTRACT_ADDRESS=${oracleAddress}`
          )
        } else {
          backendEnv += `\nORACLE_CONTRACT_ADDRESS=${oracleAddress}`
        }
        
        fs.writeFileSync(backendEnvPath, backendEnv)
        console.log(`   ✅ Updated backend/.env`)
      } else {
        console.warn(`   ⚠️  backend/.env not found - skipping update`)
      }
    } catch (error) {
      console.error(`   ❌ Error updating backend/.env: ${error.message}`)
    }
    
    // Update frontend .env.local
    try {
      const frontendEnvPath = path.resolve('./.env.local')
      let frontendEnv = ''
      
      if (fs.existsSync(frontendEnvPath)) {
        frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8')
      }
      
      // Update or add VITE_ORACLE_READER_V2_ADDRESS
      if (frontendEnv.includes('VITE_ORACLE_READER_V2_ADDRESS=')) {
        frontendEnv = frontendEnv.replace(
          /^VITE_ORACLE_READER_V2_ADDRESS=.*$/m,
          `VITE_ORACLE_READER_V2_ADDRESS=${oracleAddress}`
        )
      } else {
        if (frontendEnv && !frontendEnv.endsWith('\n')) {
          frontendEnv += '\n'
        }
        frontendEnv += `VITE_ORACLE_READER_V2_ADDRESS=${oracleAddress}\n`
      }
      
      fs.writeFileSync(frontendEnvPath, frontendEnv)
      console.log(`   ✅ Updated .env.local\n`)
    } catch (error) {
      console.error(`   ❌ Error updating .env.local: ${error.message}\n`)
    }

    // Final summary
    console.log('═'.repeat(60))
    console.log('🎉 OracleReaderV2 Deployment Complete!')
    console.log('═'.repeat(60))
    console.log(`📍 Contract Address: ${oracleAddress}`)
    console.log(`🔗 Chainlink Feed: ${chainlinkFeed}`)
    console.log(`👤 Owner: ${wallet.address}`)
    console.log(`🏛️  Governance: ${governanceAddress || wallet.address}`)
    console.log('═'.repeat(60))
    console.log('')
    console.log('📋 Next Steps:')
    console.log('   1. Run: npm run post:deploy (to complete post-deployment setup)')
    console.log('   2. Run: npm run dev (to start frontend)')
    console.log('   3. Verify UI shows volatility, data freshness, and V2 parameters')
    console.log('')
    
  } catch (error) {
    console.error('❌ Error deploying OracleReaderV2:', error.message)
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`)
    }
    if (error.transaction) {
      console.error(`   Transaction: ${error.transaction.hash}`)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

