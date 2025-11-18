const fs = require('fs');
const path = require('path');

// Parse command line arguments
function getArg(name, def) {
  const i = process.argv.findIndex((a) => a === `--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

/**
 * Dynamic Emission Model: APY = (Protocol Fees × Accuracy Factor) / Total Staked Tokens
 * 
 * @param {number} protocolFees - Total protocol fees collected (in SST tokens)
 * @param {number} accuracyFactor - Average validator accuracy (0-1, e.g., 0.92 = 92%)
 * @param {number} totalStaked - Total SST tokens staked by validators
 * @returns {Object} APY calculations (monthly and annual)
 */
function calculateAPY(protocolFees, accuracyFactor, totalStaked) {
  if (totalStaked === 0) {
    return {
      apyMonthly: 0,
      apyAnnual: 0,
      error: 'Cannot calculate APY with zero staked tokens'
    };
  }

  // Calculate base APY: (Protocol Fees × Accuracy Factor) / Total Staked
  const baseAPY = (protocolFees * accuracyFactor) / totalStaked;

  // Monthly APY (assuming fees are collected monthly)
  const apyMonthly = baseAPY;

  // Annual APY (monthly × 12)
  const apyAnnual = apyMonthly * 12;

  return {
    apyMonthly,
    apyAnnual,
    baseAPY,
    effectiveYield: baseAPY * accuracyFactor, // Effective yield considering accuracy
  };
}

async function main() {
  console.log('🪙 Dynamic APY Simulation — SureStack Tokenomics POC');
  console.log('───────────────────────────────────────────────────────\n');

  // Get parameters from command line or use defaults
  const protocolFees = parseFloat(getArg('fees', '25000')); // Default: 25,000 SST
  const accuracyFactor = parseFloat(getArg('accuracy', '0.92')); // Default: 92%
  const totalStaked = parseFloat(getArg('staked', '61000')); // Default: 61,000 SST

  console.log('📊 Simulation Parameters:');
  console.log(`   Protocol Fees: ${protocolFees.toLocaleString()} SST`);
  console.log(`   Accuracy Factor: ${(accuracyFactor * 100).toFixed(2)}%`);
  console.log(`   Total Staked: ${totalStaked.toLocaleString()} SST\n`);

  // Validate inputs
  if (protocolFees < 0) {
    throw new Error('Protocol fees must be non-negative');
  }
  if (accuracyFactor < 0 || accuracyFactor > 1) {
    throw new Error('Accuracy factor must be between 0 and 1');
  }
  if (totalStaked < 0) {
    throw new Error('Total staked must be non-negative');
  }

  // Calculate APY
  const results = calculateAPY(protocolFees, accuracyFactor, totalStaked);

  if (results.error) {
    throw new Error(results.error);
  }

  console.log('🧮 APY Calculation Results:');
  console.log(`   Base APY: ${(results.baseAPY * 100).toFixed(4)}%`);
  console.log(`   Monthly APY: ${(results.apyMonthly * 100).toFixed(4)}%`);
  console.log(`   Annual APY: ${(results.apyAnnual * 100).toFixed(4)}%`);
  console.log(`   Effective Yield: ${(results.effectiveYield * 100).toFixed(4)}%\n`);

  // Prepare output data
  const output = {
    protocolFees,
    accuracyFactor,
    totalStaked,
    apyMonthly: results.apyMonthly,
    apyAnnual: results.apyAnnual,
    baseAPY: results.baseAPY,
    effectiveYield: results.effectiveYield,
    formula: 'APY = (ProtocolFees × AccuracyFactor) / TotalStaked',
    timestamp: new Date().toISOString(),
    metadata: {
      protocolFeesUnit: 'SST',
      accuracyFactorUnit: 'decimal (0-1)',
      totalStakedUnit: 'SST',
      apyUnit: 'decimal (multiply by 100 for percentage)',
    },
  };

  // Ensure reports directory exists
  const reportsDir = path.resolve(__dirname, '../reports/simulations');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Write to JSON file
  const outputPath = path.resolve(reportsDir, 'revenue-latest.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  // Also copy to public directory for frontend access
  const publicDir = path.resolve(__dirname, '../public/reports/simulations');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicPath = path.resolve(publicDir, 'revenue-latest.json');
  fs.writeFileSync(publicPath, JSON.stringify(output, null, 2));

  console.log('✅ Simulation Complete');
  console.log(`   📄 Results saved to: ${outputPath}`);
  console.log(`   📄 Copied to: ${publicPath}\n`);

  // Display formatted summary
  console.log('📋 Summary:');
  console.log(`   Protocol Fees: ${protocolFees.toLocaleString()} SST`);
  console.log(`   Accuracy Factor: ${(accuracyFactor * 100).toFixed(2)}%`);
  console.log(`   Total Staked: ${totalStaked.toLocaleString()} SST`);
  console.log(`   Monthly APY: ${(results.apyMonthly * 100).toFixed(2)}%`);
  console.log(`   Annual APY: ${(results.apyAnnual * 100).toFixed(2)}%\n`);

  // Additional insights
  const monthlyRewards = protocolFees * accuracyFactor;
  const annualRewards = monthlyRewards * 12;
  const rewardPerToken = totalStaked > 0 ? annualRewards / totalStaked : 0;

  console.log('💡 Additional Insights:');
  console.log(`   Monthly Rewards Distributed: ${monthlyRewards.toLocaleString(undefined, { maximumFractionDigits: 2 })} SST`);
  console.log(`   Annual Rewards Distributed: ${annualRewards.toLocaleString(undefined, { maximumFractionDigits: 2 })} SST`);
  console.log(`   Reward per Staked Token: ${rewardPerToken.toFixed(6)} SST\n`);
}

main().catch((e) => {
  console.error('❌ Simulation failed:', e.message);
  process.exit(1);
});

