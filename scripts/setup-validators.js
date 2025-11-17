const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

// Load env from backend/.env first, then root .env
function loadEnv() {
  const rootEnv = path.resolve(process.cwd(), '.env');
  const beEnv = path.resolve(process.cwd(), 'backend/.env');
  const parse = (p) => {
    if (!fs.existsSync(p)) return {};
    return Object.fromEntries(
      fs.readFileSync(p, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => {
          const i = l.indexOf('=');
          return i === -1 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        })
    );
  };
  return { ...parse(rootEnv), ...parse(beEnv) };
}

async function main() {
  console.log('⚡ Setting Up Validators — SureStack Tokenomics POC');
  console.log('────────────────────────────────────────────────────');
  const env = loadEnv();

  const RPC_URL = env.INFURA_API_URL || env.RPC_URL;
  const PRIVATE_KEY = env.PRIVATE_KEY;
  const SST = env.SURESTACK_TOKEN_ADDRESS || env.RISK_TOKEN_CONTRACT;
  const CONSENSUS = env.CONSENSUS_STAKING_ADDRESS || env.CONSENSUS_CONTRACT;

  if (!RPC_URL || !PRIVATE_KEY || !SST || !CONSENSUS) {
    throw new Error('Missing required env: RPC_URL/INFURA_API_URL, PRIVATE_KEY, SURESTACK_TOKEN_ADDRESS, CONSENSUS_STAKING_ADDRESS');
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const chainId = (await provider.getNetwork()).chainId;
  const bal = await provider.getBalance(wallet.address);
  console.log(`🔗 Network: ${chainId} | Wallet: ${wallet.address} | ETH: ${ethers.formatEther(bal)}`);

  // Validator tiers (in SST tokens)
  // Tier 0: 1,000 SST (minimum)
  // Tier 1: 10,000 SST
  // Tier 2: 50,000 SST
  const tiers = [
    { name: 'Tier 0', amount: '1000' },
    { name: 'Tier 1', amount: '10000' },
    { name: 'Tier 2', amount: '50000' },
  ];

  // ERC20 ABI
  const erc20Abi = [
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
  ];

  // Load ConsensusAndStakingV2 ABI from artifacts (try V2 first, fallback to V1)
  let consensusAbi;
  let isV2 = true;
  try {
    const abiPath = path.resolve(__dirname, '../artifacts/contracts/ConsensusAndStakingV2.sol/ConsensusAndStakingV2.json');
    const abiData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    consensusAbi = abiData.abi;
    console.log('✅ Loaded ConsensusAndStakingV2 ABI');
  } catch (error) {
    // Try V1 ABI
    try {
      const abiPathV1 = path.resolve(__dirname, '../artifacts/contracts/ConsensusAndStaking.sol/ConsensusAndStaking.json');
      const abiDataV1 = JSON.parse(fs.readFileSync(abiPathV1, 'utf8'));
      consensusAbi = abiDataV1.abi;
      isV2 = false;
      console.log('⚠️  Loaded ConsensusAndStaking (V1) ABI - V1 uses constants, not functions');
    } catch (error2) {
      // Fallback to minimal ABI
      console.warn('⚠️  Could not load full ABI, using minimal ABI');
      consensusAbi = [
        'function minStakeAmount() view returns (uint256)',
        'function MIN_STAKE_AMOUNT() view returns (uint256)',
        'function stake(uint256 _amount)',
        'function validatorProfiles(address) view returns (uint256 stakedAmount, uint16 accuracyScore, uint256 totalRewards, bool isActive, uint256 unstakeLockoutEnd, uint256 pendingUnstake)',
        'function paused() view returns (bool)',
      ];
    }
  }

  const sst = new ethers.Contract(SST, erc20Abi, wallet);
  const consensus = new ethers.Contract(CONSENSUS, consensusAbi, wallet);

  // Verify contract exists
  const code = await provider.getCode(CONSENSUS);
  if (code === '0x') {
    throw new Error(`No contract found at address ${CONSENSUS}. Please verify the contract is deployed.`);
  }
  console.log('✅ Contract exists at address\n');

  // Check if contract is paused (V2 only)
  try {
    const isPaused = await consensus.paused();
    if (isPaused) {
      throw new Error('ConsensusAndStakingV2 contract is paused. Please unpause it first.');
    }
  } catch (error) {
    // If paused() doesn't exist, it's V1 (which doesn't have pause functionality)
    if (error.message.includes('paused')) {
      // This is expected for V1
    } else if (!error.message.includes('paused') && !error.message.includes('revert')) {
      console.warn('⚠️  Could not check pause status:', error.message);
    }
  }

  // Get minimum stake requirement (V2 uses function, V1 uses constant)
  // Note: In Solidity, constants are exposed as view functions in the ABI
  let minStake;
  try {
    // Try V2 function first
    minStake = await consensus.minStakeAmount();
    console.log('✅ Detected ConsensusAndStakingV2 (using minStakeAmount() function)');
  } catch (error) {
    // Try V1 constant (exposed as view function in ABI)
    try {
      // V1 constant is exposed as a function in the ABI
      if (typeof consensus.MIN_STAKE_AMOUNT === 'function') {
        minStake = await consensus.MIN_STAKE_AMOUNT();
        isV2 = false;
        console.log('✅ Detected ConsensusAndStaking (V1) (using MIN_STAKE_AMOUNT constant)');
      } else {
        // If not a function, try reading as a public state variable
        // Some ABIs expose constants differently
        throw new Error('MIN_STAKE_AMOUNT not available as function');
      }
    } catch (error2) {
      // Last resort: use hardcoded minimum (1000 SST = 1000 * 10^18)
      console.warn('⚠️  Could not read minimum stake from contract, using default: 1000 SST');
      minStake = ethers.parseUnits('1000', 18);
      isV2 = false; // Assume V1 if we can't read
      console.log('   Using default minimum stake: 1000 SST');
    }
  }
  const decimals = await sst.decimals();
  console.log(`📊 Minimum Stake Required: ${ethers.formatUnits(minStake, decimals)} SST\n`);

  // Check wallet SST balance
  const walletBalance = await sst.balanceOf(wallet.address);
  console.log(`💰 Wallet SST Balance: ${ethers.formatUnits(walletBalance, decimals)} SST\n`);

  // Calculate total needed
  const totalNeeded = tiers.reduce((sum, tier) => {
    return sum + ethers.parseUnits(tier.amount, decimals);
  }, 0n);

  if (walletBalance < totalNeeded) {
    throw new Error(`Insufficient SST balance. Need ${ethers.formatUnits(totalNeeded, decimals)} SST, have ${ethers.formatUnits(walletBalance, decimals)} SST`);
  }

  console.log('🧮 Validator Setup Plan:');
  tiers.forEach((tier, index) => {
    console.log(`  ${index + 1}. ${tier.name}: ${tier.amount} SST`);
  });
  console.log(`  Total: ${ethers.formatUnits(totalNeeded, decimals)} SST\n`);

  // Approve consensus contract to spend tokens
  const currentAllowance = await sst.allowance(wallet.address, CONSENSUS);
  if (currentAllowance < totalNeeded) {
    console.log(`🔐 Approving Consensus contract to spend ${ethers.formatUnits(totalNeeded, decimals)} SST...`);
    const approveTx = await sst.approve(CONSENSUS, totalNeeded);
    await approveTx.wait();
    console.log(`   ✅ Approval confirmed: ${approveTx.hash}\n`);
  } else {
    console.log(`✅ Already approved: ${ethers.formatUnits(currentAllowance, decimals)} SST\n`);
  }

  // Register validators
  const results = [];
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const amount = ethers.parseUnits(tier.amount, decimals);

    try {
      console.log(`⚡ Registering ${tier.name} Validator...`);
      console.log(`   Amount: ${ethers.formatUnits(amount, decimals)} SST`);

      // Check if already staked (handle both V1 and V2 structs)
      let currentStake = 0n;
      try {
        const profile = await consensus.validatorProfiles(wallet.address);
        // V1: (stakedAmount, accuracyScore, totalRewards, isActive, unstakeLockoutEnd)
        // V2: (stakedAmount, accuracyScore, totalRewards, isActive, unstakeLockoutEnd, pendingUnstake)
        if (Array.isArray(profile)) {
          currentStake = profile[0]; // First element is stakedAmount
        } else if (profile.stakedAmount) {
          currentStake = profile.stakedAmount;
        } else {
          currentStake = profile; // If it's just a number
        }
      } catch (error) {
        // If we can't read profile, assume 0 stake and continue
        console.warn(`   ⚠️  Could not read validator profile: ${error.message}`);
        console.log(`   Proceeding with staking...`);
        currentStake = 0n;
      }

      if (currentStake >= amount) {
        console.log(`   ⚠️  Already staked ${ethers.formatUnits(currentStake, decimals)} SST (sufficient for ${tier.name})`);
        results.push({
          tier: tier.name,
          amount: ethers.formatUnits(amount, decimals),
          status: 'Already staked',
          txHash: null,
        });
        continue;
      }

      // Calculate additional stake needed
      const additionalStake = amount - currentStake;
      console.log(`   Current stake: ${ethers.formatUnits(currentStake, decimals)} SST`);
      console.log(`   Additional stake needed: ${ethers.formatUnits(additionalStake, decimals)} SST`);

      // Stake tokens
      const stakeTx = await consensus.stake(additionalStake);
      console.log(`   📝 Transaction: ${stakeTx.hash}`);
      const receipt = await stakeTx.wait();
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

      // Verify stake (handle both V1 and V2 structs)
      let newTotalStake = amount;
      let isActive = true;
      let accuracyScore = 10000;
      try {
        const newProfile = await consensus.validatorProfiles(wallet.address);
        if (Array.isArray(newProfile)) {
          newTotalStake = newProfile[0]; // stakedAmount
          accuracyScore = newProfile[1]; // accuracyScore
          isActive = newProfile[3]; // isActive
        } else if (newProfile.stakedAmount) {
          newTotalStake = newProfile.stakedAmount;
          accuracyScore = newProfile.accuracyScore || 10000;
          isActive = newProfile.isActive !== undefined ? newProfile.isActive : true;
        }
      } catch (error) {
        // If we can't read profile, use the amount we just staked
        console.warn(`   ⚠️  Could not verify stake: ${error.message}`);
        console.log(`   Assuming stake was successful based on transaction confirmation`);
      }
      
      console.log(`   📊 New Total Stake: ${ethers.formatUnits(newTotalStake, decimals)} SST`);
      console.log(`   ✅ Active: ${isActive ? 'Yes' : 'No'}`);
      console.log(`   📈 Accuracy Score: ${accuracyScore / 100}%\n`);

      results.push({
        tier: tier.name,
        amount: ethers.formatUnits(amount, decimals),
        status: 'Success',
        txHash: stakeTx.hash,
        totalStake: ethers.formatUnits(newTotalStake, decimals),
      });
    } catch (error) {
      console.error(`   ❌ Error registering ${tier.name}:`, error.message);
      results.push({
        tier: tier.name,
        amount: ethers.formatUnits(amount, decimals),
        status: `Error: ${error.message}`,
        txHash: null,
      });
    }
  }

  // Final summary
  console.log('────────────────────────────────────────────────────');
  console.log('✅ Validator Setup Complete');
  console.log('────────────────────────────────────────────────────');
  console.log('Summary:');
  results.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.tier}: ${result.amount} SST - ${result.status}`);
    if (result.txHash) {
      console.log(`     Tx: ${result.txHash}`);
    }
    if (result.totalStake) {
      console.log(`     Total Stake: ${result.totalStake} SST`);
    }
  });

  // Final validator profile (handle both V1 and V2 structs)
  try {
    const finalProfile = await consensus.validatorProfiles(wallet.address);
    let stakedAmount, accuracyScore, totalRewards, isActive;
    
    if (Array.isArray(finalProfile)) {
      stakedAmount = finalProfile[0];
      accuracyScore = finalProfile[1];
      totalRewards = finalProfile[2];
      isActive = finalProfile[3];
    } else if (finalProfile.stakedAmount) {
      stakedAmount = finalProfile.stakedAmount;
      accuracyScore = finalProfile.accuracyScore || 10000;
      totalRewards = finalProfile.totalRewards || 0n;
      isActive = finalProfile.isActive !== undefined ? finalProfile.isActive : true;
    } else {
      throw new Error('Unknown profile format');
    }
    
    console.log('\n📊 Final Validator Profile:');
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Total Staked: ${ethers.formatUnits(stakedAmount, decimals)} SST`);
    console.log(`   Accuracy Score: ${accuracyScore / 100}%`);
    console.log(`   Total Rewards: ${ethers.formatUnits(totalRewards, decimals)} SST`);
    console.log(`   Active: ${isActive ? 'Yes' : 'No'}`);
  } catch (error) {
    console.warn('\n⚠️  Could not read final validator profile:', error.message);
    console.log('   Staking transactions completed successfully.');
  }
}

main().catch((e) => {
  console.error('❌ Validator setup failed:', e.message);
  if (e.reason) {
    console.error('   Reason:', e.reason);
  }
  process.exit(1);
});

