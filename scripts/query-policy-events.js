// Script to query PolicyCreated events from Sepolia
// Run: npx hardhat run scripts/query-policy-events.js --network sepolia

const { ethers } = require("hardhat");

async function main() {
  const abi = [
    "event PolicyCreated(uint256 indexed id,address indexed user,uint256 coverage,uint256 premium,bool active)"
  ];

  const policyManagerAddress = "0xc958Eb5C6076F666452c0B8233134648b048A7ca";
  
  console.log("Querying PolicyCreated events...");
  console.log("PolicyManager address:", policyManagerAddress);
  
  const policy = new ethers.Contract(policyManagerAddress, abi, ethers.provider);

  // Get current block number
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  
  // Query last 250 blocks
  const fromBlock = Math.max(0, currentBlock - 250);
  console.log("Querying from block:", fromBlock, "to", currentBlock);
  
  try {
    const events = await policy.queryFilter("PolicyCreated", fromBlock, currentBlock);
    console.log("\n✅ Found", events.length, "PolicyCreated events");
    
    if (events.length > 0) {
      console.log("\nEvent details:");
      events.forEach((e, i) => {
        console.log(`\nEvent ${i + 1}:`);
        console.log("  Block:", e.blockNumber);
        console.log("  TX Hash:", e.transactionHash);
        console.log("  Policy ID:", e.args.id.toString());
        console.log("  User:", e.args.user);
        console.log("  Coverage:", e.args.coverage.toString(), "(wei)");
        console.log("  Premium:", e.args.premium.toString(), "(wei)");
        console.log("  Active:", e.args.active);
      });
    } else {
      console.log("\n⚠️  No PolicyCreated events found in the last 250 blocks.");
      console.log("   This means:");
      console.log("   1. No policies have been created yet on this contract");
      console.log("   2. The event signature might not match the deployed contract");
      console.log("   3. Events occurred more than 250 blocks ago");
    }
  } catch (error) {
    console.error("\n❌ Error querying events:", error.message);
    if (error.message.includes("no matching event")) {
      console.log("\n⚠️  Event signature mismatch detected.");
      console.log("   The deployed contract may use a different event signature.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

