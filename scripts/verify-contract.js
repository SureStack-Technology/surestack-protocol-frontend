const hre = require("hardhat");

async function main() {
  const contractAddress = "0x835fec04058Fdf3FddD1357730849328E863E55C";
  const constructorArgs = ["0x287942c00c85427b7C92DD5cdaee32F33F34f388"];

  console.log("🔍 Verifying SureStackToken contract on Etherscan...");
  console.log(`   Address: ${contractAddress}`);
  console.log(`   Constructor args: ${constructorArgs.join(", ")}\n`);

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
    console.log("\n✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("\n✅ Contract is already verified!");
    } else {
      console.error("\n❌ Verification failed:", error.message);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



