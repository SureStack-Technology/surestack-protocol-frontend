const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const stakingAddress = process.env.CONSENSUS_STAKING_ADDRESS;
  if (!stakingAddress) {
    throw new Error("CONSENSUS_STAKING_ADDRESS missing from environment.");
  }

  const privateKey = process.env.PRIVATE_KEY_2;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY_2 missing from environment.");
  }

  const staking = await ethers.getContractAt(
    "contracts/ConsensusAndStakingV2.sol:ConsensusAndStakingV2",
    stakingAddress
  );

  const wallet2 = new ethers.Wallet(privateKey, ethers.provider);

  const tx = await staking.connect(wallet2).stake(ethers.parseUnits("50000", 18));
  await tx.wait();

  console.log("Wallet2 staked 50,000 SST", tx.hash);

  const activeCount = await staking.getActiveValidatorCount();
  console.log("Active validator count now:", activeCount.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
