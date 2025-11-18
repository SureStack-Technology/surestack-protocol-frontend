require("dotenv").config();

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load ConsensusAndStakingV2 ABI from backend ABI folder
const abiPath = path.join(__dirname, "..", "backend", "contracts", "abi", "ConsensusAndStakingV2.json");
const abi = JSON.parse(fs.readFileSync(abiPath, "utf8")).abi;

async function main() {
  console.log("🔐 Loading wallet...");

  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) throw new Error("❌ Missing PRIVATE_KEY in .env");

  const CONSENSUS_ADDRESS = process.env.CONSENSUS_STAKING_ADDRESS;
  if (!CONSENSUS_ADDRESS) throw new Error("❌ Missing CONSENSUS_STAKING_ADDRESS in .env");

  const provider = new ethers.JsonRpcProvider(process.env.INFURA_API_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🔗 Connected as:", wallet.address);

  const contract = new ethers.Contract(CONSENSUS_ADDRESS, abi, wallet);

  console.log("📝 Registering validator:", wallet.address);
  let tx = await contract.registerValidator(wallet.address);
  console.log("⏳ Waiting for confirmation...");
  await tx.wait();
  console.log("✅ Validator registered!");

  console.log("⚡ Activating validator...");
  tx = await contract.activateValidator();
  await tx.wait();
  console.log("🚀 Validator ACTIVATED successfully!");

  console.log("\n🎉 Setup complete! Your validator is now active.");
  console.log("You may now stake SST tokens.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});


