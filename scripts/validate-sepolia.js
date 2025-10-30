/**
 * Sepolia Testnet Contract Validation Script
 * Validates deployed contract addresses and states on Sepolia
 */

const { ethers } = require("hardhat");
const fs = require("fs");

const SEPOLIA_RPC = process.env.INFURA_API_URL || "https://sepolia.infura.io/v3/YOUR_API_KEY";

async function validateContracts() {
  console.log("\n🔍 SureStack Protocol - Sepolia Contract Validation\n");
  console.log("=" .repeat(60));
  
  // Connect to Sepolia
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const network = await provider.getNetwork();
  
  console.log(`\n📍 Network: ${network.name}`);
  console.log(`🔗 Chain ID: ${network.chainId}`);
  console.log(`⛽ Current Block: ${await provider.getBlockNumber()}\n`);
  
  // Load deployment info (will be populated after Sepolia deployment)
  let deploymentInfo;
  try {
    deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf-8"));
    console.log("✅ Loaded deployment information\n");
  } catch (error) {
    console.error("❌ Could not load deployment-info.json");
    console.log("💡 Deploy contracts first or manually set addresses");
    return;
  }
  
  // If Sepolia deployment, use those addresses
  if (deploymentInfo.network === "sepolia") {
    console.log("📋 Sepolia Deployment Detected\n");
  } else {
    console.log("⚠️  Localhost deployment detected - use Sepolia addresses from env.template\n");
  }
  
  const contracts = {
    riskToken: deploymentInfo.deployment.riskToken,
    staking: deploymentInfo.deployment.staking,
    rewardPool: deploymentInfo.deployment.rewardPool,
    dao: deploymentInfo.deployment.dao,
    timelock: deploymentInfo.deployment.timelock,
    oracleIntegration: deploymentInfo.deployment.oracleIntegration,
  };
  
  // Load ABIs
  const consensusABI = JSON.parse(fs.readFileSync("./consensus_abi.json", "utf-8"));
  
  console.log("🔎 Validating Contracts...\n");
  console.log("-".repeat(60));
  
  // 1. Validate SureStackToken
  if (contracts.riskToken) {
    console.log("\n1️⃣  SureStackToken");
    console.log(`   Address: ${contracts.riskToken}`);
    
    try {
      const token = new ethers.Contract(contracts.riskToken, 
        ["function totalSupply() view returns (uint256)"], 
        provider);
      
      const totalSupply = await token.totalSupply();
      console.log(`   ✅ Total Supply: ${ethers.formatEther(totalSupply)} SST`);
      
      const balance = await provider.getBalance(contracts.riskToken);
      console.log(`   💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // 2. Validate ConsensusAndStaking
  if (contracts.staking) {
    console.log("\n2️⃣  ConsensusAndStaking");
    console.log(`   Address: ${contracts.staking}`);
    
    try {
      const consensus = new ethers.Contract(contracts.staking, consensusABI, provider);
      
      const currentRound = await consensus.currentRoundId();
      console.log(`   ✅ Current Round ID: ${currentRound.toString()}`);
      
      const minStake = await consensus.MIN_STAKE_AMOUNT();
      console.log(`   💼 Min Stake Amount: ${ethers.formatEther(minStake)} SST`);
      
      // Count validators from events
      const filter = consensus.filters.Staked();
      const events = await consensus.queryFilter(filter, 0, "latest");
      const validatorCount = new Set(events.map(e => e.args.validator)).size;
      console.log(`   👥 Validator Count: ${validatorCount}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // 3. Validate RewardPoolAndSlasher
  if (contracts.rewardPool) {
    console.log("\n3️⃣  RewardPoolAndSlasher");
    console.log(`   Address: ${contracts.rewardPool}`);
    
    try {
      const rewardPool = new ethers.Contract(contracts.rewardPool,
        ["function rewardPoolBalance() view returns (uint256)",
         "function penaltyPoolBalance() view returns (uint256)"],
        provider);
      
      const rewardBalance = await rewardPool.rewardPoolBalance();
      console.log(`   💸 Reward Pool: ${ethers.formatEther(rewardBalance)} SST`);
      
      const penaltyBalance = await rewardPool.penaltyPoolBalance();
      console.log(`   ⚡ Penalty Pool: ${ethers.formatEther(penaltyBalance)} SST`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // 4. Validate DAOGovernance
  if (contracts.dao) {
    console.log("\n4️⃣  DAOGovernance");
    console.log(`   Address: ${contracts.dao}`);
    
    try {
      const dao = new ethers.Contract(contracts.dao,
        ["function proposalCount() view returns (uint256)",
         "function votingPeriod() view returns (uint256)"],
        provider);
      
      // Note: proposalCount may not exist, this is example
      const votingPeriod = await dao.votingPeriod();
      console.log(`   ⏱️  Voting Period: ${votingPeriod.toString()} seconds`);
      
    } catch (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }
  
  // 5. Validate OracleIntegration
  if (contracts.oracleIntegration) {
    console.log("\n5️⃣  OracleIntegration");
    console.log(`   Address: ${contracts.oracleIntegration}`);
    
    try {
      const oracle = new ethers.Contract(contracts.oracleIntegration,
        ["function getLatestPriceUSD() view returns (uint256)",
         "function priceFeed() view returns (address)"],
        provider);
      
      const priceUSD = await oracle.getLatestPriceUSD();
      const chainlinkFeed = await oracle.priceFeed();
      
      console.log(`   ✅ ETH/USD Price: $${ethers.formatUnits(priceUSD, 0)}`);
      console.log(`   🔗 Chainlink Feed: ${chainlinkFeed}`);
      
    } catch (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  } else {
    console.log("\n5️⃣  OracleIntegration");
    console.log("   ⚠️  OracleIntegration not deployed");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("\n✅ Validation complete!\n");
}

// Run validation
validateContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

