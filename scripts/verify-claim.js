/**
 * verify-claim.js
 * 
 * Quick verification script to check RewardPool balance after claim processing
 * 
 * Usage: npx hardhat run scripts/verify-claim.js --network sepolia
 */

const hre = require('hardhat');
const { ethers } = require('ethers');

async function main() {
  console.log('🔍 Verifying Claim Processing Status\n');
  console.log('═'.repeat(60));

  // Contract addresses
  const SST_TOKEN_ADDRESS = '0x835fec04058Fdf3FddD1357730849328E863E55C';
  const REWARD_POOL_ADDRESS = '0x292DcDe02Eb84b821962Bf918DdC438DAE497AA1';
  const POLICY_MANAGER_ADDRESS = '0x3264e1CAc737C7587669377B090B2dE0e83B2E6E';

  // Get provider
  const provider = new ethers.JsonRpcProvider(
    process.env.INFURA_API_URL || process.env.RPC_URL || 'https://rpc.sepolia.org'
  );

  // Load contracts
  const sstAbi = ['function balanceOf(address) view returns (uint256)'];
  const sst = new ethers.Contract(SST_TOKEN_ADDRESS, sstAbi, provider);

  const policyManagerAbi = [
    'function policyCounter() view returns (uint256)',
    'function policies(uint256) view returns (address owner, uint256 coverageLimitUSD, uint8 coveragePercent, uint256 premiumUSD, uint256 startTime, bool active, uint256 premiumPaidInSST)',
    'event ClaimProcessed(uint256 indexed policyId, uint256 payoutAmount, uint80 oracleRoundId, uint256 lossEventValueUSD)'
  ];
  const policyManager = new ethers.Contract(POLICY_MANAGER_ADDRESS, policyManagerAbi, provider);

  // Check RewardPool balance
  console.log('📊 RewardPool Balance:');
  const rewardPoolBalance = await sst.balanceOf(REWARD_POOL_ADDRESS);
  const balanceFormatted = ethers.formatUnits(rewardPoolBalance, 18);
  console.log(`   ${balanceFormatted} SST`);
  console.log(`   Address: ${REWARD_POOL_ADDRESS}\n`);

  // Check total policies
  console.log('📋 Policy Status:');
  const totalPolicies = await policyManager.policyCounter();
  console.log(`   Total Policies: ${totalPolicies.toString()}\n`);

  // Query recent ClaimProcessed events
  console.log('🔍 Recent ClaimProcessed Events:');
  const filter = policyManager.filters.ClaimProcessed();
  const events = await policyManager.queryFilter(filter, -1000); // Last 1000 blocks
  
  if (events.length === 0) {
    console.log('   No claims processed yet.\n');
  } else {
    console.log(`   Found ${events.length} claim(s):\n`);
    events.slice(-5).forEach((event, idx) => {
      const parsed = policyManager.interface.parseLog(event);
      console.log(`   Claim #${idx + 1}:`);
      console.log(`     Policy ID: ${parsed.args.policyId.toString()}`);
      console.log(`     Payout: ${ethers.formatUnits(parsed.args.payoutAmount, 18)} SST`);
      console.log(`     Loss Value: ${ethers.formatUnits(parsed.args.lossEventValueUSD, 8)} USD`);
      console.log(`     Oracle Round ID: ${parsed.args.oracleRoundId.toString()}`);
      console.log(`     Tx Hash: ${event.transactionHash}`);
      console.log(`     Block: ${event.blockNumber}\n`);
    });
  }

  // Check Policy #1 status if it exists
  if (totalPolicies >= 1n) {
    console.log('📄 Policy #1 Details:');
    try {
      const policy = await policyManager.policies(1);
      console.log(`   Owner: ${policy.owner}`);
      console.log(`   Coverage Limit: ${ethers.formatUnits(policy.coverageLimitUSD, 8)} USD`);
      console.log(`   Coverage %: ${policy.coveragePercent}%`);
      console.log(`   Premium Paid: ${ethers.formatUnits(policy.premiumPaidInSST, 18)} SST`);
      console.log(`   Active: ${policy.active ? '✅ Yes' : '❌ No'}`);
      console.log(`   Start Time: ${new Date(Number(policy.startTime) * 1000).toLocaleString()}\n`);
    } catch (err) {
      console.log(`   Error fetching policy: ${err.message}\n`);
    }
  }

  console.log('═'.repeat(60));
  console.log('✅ Verification Complete\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

















