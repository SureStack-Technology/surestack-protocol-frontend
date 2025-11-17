const hre = require("hardhat");

async function main() {
  const token = process.env.SURESTACK_TOKEN_ADDRESS;
  const rewardPool = process.env.REWARD_POOL_AND_SLASHER;
  const oracle = process.env.ORACLE_READER_V2;
  const governance = process.env.GOVERNANCE_ADDRESS;
  const sequencer = process.env.SEQUENCER_ADDRESS;
  const owner = process.env.INITIAL_OWNER_ADDRESS || process.env.DEPLOYER_ADDRESS;

  if (!token || !rewardPool || !oracle || !governance || !sequencer || !owner) {
    throw new Error(
      "Missing constructor addresses. Ensure SURESTACK_TOKEN_ADDRESS, REWARD_POOL_AND_SLASHER, ORACLE_READER_V2, GOVERNANCE_ADDRESS, SEQUENCER_ADDRESS, INITIAL_OWNER_ADDRESS are set."
    );
  }

  const ConsensusAndStakingV2 = await hre.ethers.getContractFactory("ConsensusAndStakingV2");
  const staking = await ConsensusAndStakingV2.deploy(
    token,
    rewardPool,
    oracle,
    governance,
    sequencer,
    owner,
    { gasLimit: 5_000_000 }
  );

  await staking.waitForDeployment();

  console.log("ConsensusAndStakingV2 deployed to:", staking.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
