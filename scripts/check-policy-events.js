// Script to check for PolicyCreated events on Sepolia
// Run: npx hardhat run scripts/check-policy-events.js --network sepolia

const { ethers } = require("hardhat");

async function main() {
  const abi = [
    "event PolicyCreated(address indexed owner,uint256 indexed policyId,uint256 coverageLimit,uint8 coveragePercent,uint256 premiumUSD,uint256 premiumPaidInSST)"
  ];

  const policyManagerAddress = "0xc958Eb5C6076F666452c0B8233134648b048A7ca"; // PolicyManager address
  
  console.log("Checking for PolicyCreated events...");
  console.log("PolicyManager address:", policyManagerAddress);
  
  const policy = new ethers.Contract(
    policyManagerAddress,
    abi,
    ethers.provider
  );

  // Get current block number
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  
  // Query last 5000 blocks for PolicyCreated events
  const fromBlock = Math.max(0, currentBlock - 5000);
  console.log("Querying from block:", fromBlock, "to", currentBlock);
  
  try {
    const events = await policy.queryFilter("PolicyCreated", fromBlock);
    console.log("\n✅ Found", events.length, "PolicyCreated events");
    
    if (events.length > 0) {
      console.log("\nEvent details:");
      events.forEach((e, i) => {
        console.log(`\nEvent ${i + 1}:`);
        console.log("  Block Number:", e.blockNumber);
        console.log("  Transaction Hash:", e.transactionHash);
        console.log("  Owner:", e.args.owner);
        console.log("  PolicyId:", e.args.policyId.toString());
        console.log("  CoverageLimit:", e.args.coverageLimit.toString(), "(1e8 precision)");
        console.log("  CoveragePercent:", e.args.coveragePercent.toString(), "%");
        console.log("  PremiumUSD:", e.args.premiumUSD.toString(), "(1e8 precision)");
        console.log("  PremiumPaidInSST:", e.args.premiumPaidInSST.toString(), "(1e18 precision)");
      });
    } else {
      console.log("\n⚠️  No PolicyCreated events found in the last 5000 blocks.");
      console.log("   This could mean:");
      console.log("   1. No policies have been created yet");
      console.log("   2. The event name or parameters differ");
      console.log("   3. The contract address is incorrect");
    }
  } catch (error) {
    console.error("\n❌ Error querying events:", error.message);
    if (error.message.includes("no matching event")) {
      console.log("\n⚠️  Event name or types mismatch.");
      console.log("   Please check your PolicyManager.sol event declaration.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

