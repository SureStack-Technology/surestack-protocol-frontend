const { ethers } = require("hardhat");

/**
 * @dev Deploy RISK Protocol contracts in correct order
 * 1. RISKToken
 * 2. ConsensusAndStaking
 * 3. RewardPoolAndSlasher
 * 4. DAOGovernance (with TimelockController)
 */
async function main() {
  console.log("🚀 Starting RISK Protocol deployment...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.provider.getBalance(deployer.address)).toString(), "\n");
  
  // ======================
  // 1. Deploy RISKToken
  // ======================
  console.log("1️⃣  Deploying RISKToken...");
  const RISKToken = await ethers.getContractFactory("RISKToken");
  const riskToken = await RISKToken.deploy(deployer.address);
  await riskToken.waitForDeployment();
  const riskTokenAddress = await riskToken.getAddress();
  console.log("✅ RISKToken deployed to:", riskTokenAddress);
  
  // ======================
  // 2. Deploy ConsensusAndStaking
  // ======================
  console.log("\n2️⃣  Deploying ConsensusAndStaking...");
  const ConsensusAndStaking = await ethers.getContractFactory("ConsensusAndStaking");
  const stakingContract = await ConsensusAndStaking.deploy(riskTokenAddress, deployer.address);
  await stakingContract.waitForDeployment();
  const stakingAddress = await stakingContract.getAddress();
  console.log("✅ ConsensusAndStaking deployed to:", stakingAddress);
  
  // ======================
  // 3. Deploy RewardPoolAndSlasher
  // ======================
  console.log("\n3️⃣  Deploying RewardPoolAndSlasher...");
  const RewardPoolAndSlasher = await ethers.getContractFactory("RewardPoolAndSlasher");
  const rewardPool = await RewardPoolAndSlasher.deploy(
    riskTokenAddress,
    stakingAddress
  );
  await rewardPool.waitForDeployment();
  const rewardPoolAddress = await rewardPool.getAddress();
  console.log("✅ RewardPoolAndSlasher deployed to:", rewardPoolAddress);
  
  // ======================
  // 4. Deploy TimelockController
  // ======================
  console.log("\n4️⃣  Deploying TimelockController...");
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockController.deploy(
    2, // min delay: 2 blocks
    [deployer.address], // proposers
    [deployer.address], // executors
    deployer.address // admin
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("✅ TimelockController deployed to:", timelockAddress);
  
  // ======================
  // 5. Deploy DAOGovernance
  // ======================
  console.log("\n5️⃣  Deploying DAOGovernance...");
  const DAOGovernance = await ethers.getContractFactory("DAOGovernance");
  const daoGovernance = await DAOGovernance.deploy(riskTokenAddress, timelockAddress);
  await daoGovernance.waitForDeployment();
  const daoAddress = await daoGovernance.getAddress();
  console.log("✅ DAOGovernance deployed to:", daoAddress);
  
  // ======================
  // Deployment Summary
  // ======================
  console.log("\n" + "=".repeat(60));
  console.log("🎉 RISK Protocol Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:\n");
  console.log("RISKToken:             ", riskTokenAddress);
  console.log("ConsensusAndStaking:   ", stakingAddress);
  console.log("RewardPoolAndSlasher: ", rewardPoolAddress);
  console.log("TimelockController:    ", timelockAddress);
  console.log("DAOGovernance:        ", daoAddress);
  console.log("\n" + "=".repeat(60));
  
  // Save deployment info for verification
  const deploymentInfo = {
    network: process.env.HARDHAT_NETWORK || "localhost",
    deployment: {
      riskToken: riskTokenAddress,
      staking: stakingAddress,
      rewardPool: rewardPoolAddress,
      timelock: timelockAddress,
      dao: daoAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
    },
  };
  
  const fs = require("fs");
  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

