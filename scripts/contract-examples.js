/**
 * Example scripts for interacting with ConsensusAndStaking contract
 * 
 * These examples demonstrate how to call key contract functions for:
 * - Staking as a validator
 * - Submitting risk assessments
 * - Settling consensus rounds
 * - Unstaking tokens
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';

// Load deployment info
const deploymentInfo = JSON.parse(readFileSync('./deployment-info.json', 'utf-8'));
const CONSENSUS_ADDRESS = deploymentInfo.deployment.staking;
const RISK_TOKEN_ADDRESS = deploymentInfo.deployment.riskToken;

// Load ABIs
const consensusABI = JSON.parse(readFileSync('./consensus_abi.json', 'utf-8'));
const riskTokenABI = JSON.parse(readFileSync('./artifacts/contracts/SureStackToken.sol/SureStackToken.json', 'utf-8')).abi;

// Initialize provider (connect to localhost or Sepolia)
const provider = new ethers.JsonRpcProvider('http://localhost:8545');

/**
 * Example 1: Stake tokens to become a validator
 */
async function stakeTokens(amountInEther) {
  console.log('\n=== Example 1: Staking Tokens ===');
  
  // Load wallet from private key (or use MetaMask)
  const privateKey = process.env.PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Get contract instances
  const riskToken = new ethers.Contract(RISK_TOKEN_ADDRESS, riskTokenABI, wallet);
  const consensus = new ethers.Contract(CONSENSUS_ADDRESS, consensusABI, wallet);
  
  const amount = ethers.parseEther(amountInEther.toString());
  
  // Step 1: Approve token spending
  console.log(`Approving ${amountInEther} RISK tokens...`);
  const approveTx = await riskToken.approve(CONSENSUS_ADDRESS, amount);
  await approveTx.wait();
  console.log('✅ Approval confirmed:', approveTx.hash);
  
  // Step 2: Stake tokens
  console.log(`Staking ${amountInEther} RISK tokens...`);
  const stakeTx = await consensus.stake(amount);
  const receipt = await stakeTx.wait();
  console.log('✅ Stake confirmed:', stakeTx.hash);
  
  // Step 3: Check validator profile
  const profile = await consensus.validatorProfiles(wallet.address);
  console.log('Validator profile:', {
    stakedAmount: ethers.formatEther(profile.stakedAmount),
    accuracyScore: profile.accuracyScore.toString(),
    isActive: profile.isActive,
  });
}

/**
 * Example 2: Submit a risk assessment
 */
async function submitAssessment(riskScore, correlationMatrixHash) {
  console.log('\n=== Example 2: Submitting Assessment ===');
  
  const privateKey = process.env.PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
  const wallet = new ethers.Wallet(privateKey, provider);
  const consensus = new ethers.Contract(CONSENSUS_ADDRESS, consensusABI, wallet);
  
  // Validate risk score (0-100)
  const score = Math.min(100, Math.max(0, riskScore));
  
  // Convert correlation matrix to bytes32 hash
  const hash = correlationMatrixHash || ethers.keccak256(ethers.toUtf8Bytes(Math.random().toString()));
  
  console.log(`Submitting assessment with risk score: ${score}`);
  const tx = await consensus.submitAssessment(score, hash);
  const receipt = await tx.wait();
  
  console.log('✅ Assessment submitted:', tx.hash);
  
  // Listen for AssessmentSubmitted event
  const filter = consensus.filters.AssessmentSubmitted(wallet.address);
  const events = await consensus.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
  console.log('Event:', events[0].args);
}

/**
 * Example 3: Settle a consensus round
 * NOTE: Only the sequencer can call this
 */
async function settleRound() {
  console.log('\n=== Example 3: Settling Round ===');
  
  // Sequencer private key (must have sequencer role)
  const sequencerKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
  const sequencer = new ethers.Wallet(sequencerKey, provider);
  const consensus = new ethers.Contract(CONSENSUS_ADDRESS, consensusABI, sequencer);
  
  try {
    console.log('Settling current consensus round...');
    const tx = await consensus.calculateAndSettleRound();
    const receipt = await tx.wait();
    
    console.log('✅ Round settled:', tx.hash);
    
    // Listen for RoundSettled event
    const filter = consensus.filters.RoundSettled();
    const events = await consensus.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
    
    if (events[0]) {
      console.log('Round settled with:', {
        finalScore: events[0].args.finalScore.toString(),
        totalRewardsPaid: ethers.formatEther(events[0].args.totalRewardsPaid),
      });
    }
  } catch (error) {
    console.error('❌ Error settling round (requires sequencer role):', error.message);
  }
}

/**
 * Example 4: Query validator list and stats
 */
async function getValidatorStats() {
  console.log('\n=== Example 4: Querying Validator Stats ===');
  
  const consensus = new ethers.Contract(CONSENSUS_ADDRESS, consensusABI, provider);
  
  // Get current round
  const currentRoundId = await consensus.currentRoundId();
  const currentRound = await consensus.currentRound();
  
  console.log('Current round ID:', currentRoundId.toString());
  console.log('Current round:', {
    epochTimestamp: new Date(Number(currentRound.epochTimestamp) * 1000).toISOString(),
    submissionWindowEnd: new Date(Number(currentRound.submissionWindowEnd) * 1000).toISOString(),
    correlationMatrixHash: currentRound.correlationMatrixHash,
  });
  
  // Get contract constants
  const minStake = await consensus.MIN_STAKE_AMOUNT();
  const coolingPeriod = await consensus.COOLING_OFF_PERIOD();
  const slashingThreshold = await consensus.SLASHING_THRESHOLD();
  
  console.log('Contract constants:', {
    minStakeAmount: ethers.formatEther(minStake),
    coolingPeriod: Number(coolingPeriod) / 86400 + ' days',
    slashingThreshold: slashingThreshold.toString(),
  });
  
  // Query all Staked events to find validators
  const filter = consensus.filters.Staked();
  const events = await consensus.queryFilter(filter, 0, 'latest');
  const validatorAddresses = [...new Set(events.map(e => e.args.validator))];
  
  console.log(`\nFound ${validatorAddresses.length} validators`);
  
  // Get profiles for each validator
  for (const address of validatorAddresses.slice(0, 5)) { // Show first 5
    const profile = await consensus.validatorProfiles(address);
    console.log(`${address.slice(0, 10)}... - Staked: ${ethers.formatEther(profile.stakedAmount)}, Active: ${profile.isActive}`);
  }
}

/**
 * Example 5: Request unstake
 */
async function requestUnstake(amountInEther) {
  console.log('\n=== Example 5: Requesting Unstake ===');
  
  const privateKey = process.env.PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
  const wallet = new ethers.Wallet(privateKey, provider);
  const consensus = new ethers.Contract(CONSENSUS_ADDRESS, consensusABI, wallet);
  
  const amount = ethers.parseEther(amountInEther.toString());
  
  console.log(`Requesting unstake of ${amountInEther} RISK...`);
  const tx = await consensus.requestUnstake(amount);
  const receipt = await tx.wait();
  
  console.log('✅ Unstake requested:', tx.hash);
  
  // Get unlock time
  const profile = await consensus.validatorProfiles(wallet.address);
  const unlockTime = new Date(Number(profile.unstakeLockoutEnd) * 1000);
  console.log(`Funds will be available after cooling period ends: ${unlockTime.toISOString()}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'stake':
      await stakeTokens(args[1] || '1000');
      break;
    case 'submit':
      await submitAssessment(parseInt(args[1]) || 75, args[2]);
      break;
    case 'settle':
      await settleRound();
      break;
    case 'stats':
      await getValidatorStats();
      break;
    case 'unstake':
      await requestUnstake(args[1] || '500');
      break;
    default:
      console.log('Usage: node contract-examples.js [command] [args]');
      console.log('\nCommands:');
      console.log('  stake [amount]           - Stake tokens to become validator');
      console.log('  submit [score] [hash]    - Submit risk assessment');
      console.log('  settle                   - Settle current round (sequencer only)');
      console.log('  stats                    - Query validator statistics');
      console.log('  unstake [amount]         - Request unstake');
  }
}

main().catch(console.error);

