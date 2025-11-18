require("dotenv").config();

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Loading environment...");
  const PRIVATE_KEY =
    process.env.PRIVATE_KEY_OVERRIDE ||
    process.env.PRIVATE_KEY ||
    process.env.PRIVATE_KEY_2 ||
    process.env.PRIVATE_KEY_3;

  if (!PRIVATE_KEY) {
    throw new Error("❌ No private key available. Set PRIVATE_KEY_OVERRIDE to select a wallet.");
  }
  const RPC_URL = process.env.INFURA_API_URL || process.env.RPC_URL;
  const CONSENSUS_ADDR = process.env.CONSENSUS_STAKING_ADDRESS;
  const SST_TOKEN_ADDR = process.env.SURESTACK_TOKEN_ADDRESS;

  console.log(
    "🔑 Private key source:",
    process.env.PRIVATE_KEY_OVERRIDE
      ? "PRIVATE_KEY_OVERRIDE"
      : process.env.PRIVATE_KEY
      ? "PRIVATE_KEY"
      : process.env.PRIVATE_KEY_2
      ? "PRIVATE_KEY_2"
      : "PRIVATE_KEY_3"
  );

  if (!PRIVATE_KEY || !RPC_URL || !CONSENSUS_ADDR || !SST_TOKEN_ADDR) {
    throw new Error("❌ Missing required env vars. Check backend/.env or root .env");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`🧪 Using wallet: ${wallet.address}`);
  console.log("RPC:", RPC_URL);

  const consensusAbi = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../backend/contracts/abi/ConsensusAndStakingV2.json"),
      "utf8"
    )
  ).abi;

  const sstAbi = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../backend/contracts/abi/SureStackToken.json"),
      "utf8"
    )
  ).abi;

  const consensus = new ethers.Contract(CONSENSUS_ADDR, consensusAbi, wallet);
  const sst = new ethers.Contract(SST_TOKEN_ADDR, sstAbi, wallet);

  console.log("🔍 Reading minimum stake amount...");
  const minStake = await consensus.minStakeAmount();
  console.log("➡ Required min stake:", ethers.formatUnits(minStake, 18));

  console.log("🔍 Checking SST balance...");
  const bal = await sst.balanceOf(wallet.address);
  console.log("➡ SST BALANCE:", ethers.formatUnits(bal, 18));

  if (bal < minStake) {
    console.log("❌ Not enough SST. Transfer SST to this wallet first.");
    return;
  }

  console.log("📝 Approving SST...");
  const approveTx = await sst.approve(CONSENSUS_ADDR, minStake);
  await approveTx.wait();
  console.log("✔ SST approved");

  console.log("🚀 Staking to become validator...");
  const stakeTx = await consensus.stake(minStake);
  await stakeTx.wait();

  console.log("🎉 SUCCESS — Validator is now registered + active!");
  console.log(`👉 Address: ${wallet.address}`);
}

main().catch((err) => {
  console.error("❌ ERROR:", err);
  process.exit(1);
});

