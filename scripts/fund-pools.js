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

function getArg(name, def) {
  // Try environment variable first (for Hardhat compatibility)
  const envKey = `FUND_${name.toUpperCase()}`;
  if (process.env[envKey]) return process.env[envKey];
  
  // Fallback to command line arguments
  const i = process.argv.findIndex((a) => a === `--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

async function main() {
  console.log('💸 Funding Pools — SureStack Tokenomics POC');
  console.log('────────────────────────────────────────────');
  const env = loadEnv();

  const RPC_URL = env.INFURA_API_URL || env.RPC_URL;
  const PRIVATE_KEY = env.PRIVATE_KEY;
  const SST = env.SURESTACK_TOKEN_ADDRESS || env.RISK_TOKEN_CONTRACT;
  const REWARD_POOL = env.REWARD_POOL_ADDRESS || env.REWARD_POOL_CONTRACT;
  const DAO = env.DAO_GOVERNANCE_ADDRESS || env.DAO_CONTRACT; // treasury-controlled

  if (!RPC_URL || !PRIVATE_KEY || !SST || !REWARD_POOL || !DAO) {
    throw new Error('Missing required env: RPC_URL/INFURA_API_URL, PRIVATE_KEY, SURESTACK_TOKEN_ADDRESS, REWARD_POOL_ADDRESS, DAO_GOVERNANCE_ADDRESS');
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const chainId = (await provider.getNetwork()).chainId;
  const bal = await provider.getBalance(wallet.address);
  console.log(`🔗 Network: ${chainId} | Wallet: ${wallet.address} | ETH: ${ethers.formatEther(bal)}`);

  // Funding pot in SST (default 100,000 SST) and decimals
  // Can be set via FUND_TOTAL env var or --total flag
  // Note: Hardhat doesn't pass custom args, so use FUND_TOTAL env var
  const fundingPot = process.env.FUND_TOTAL || env.FUND_TOTAL || getArg('total', '100000');
  const decimals = parseInt(getArg('decimals', env.FUND_DECIMALS || '18'), 10);
  const unit = BigInt(10) ** BigInt(decimals);
  const toWei = (n) => (BigInt(Math.floor(Number(n) * 1e6)) * unit) / BigInt(1e6);

  // Tokenomics (subset for POC)
  // Treasury (DAO): 10%
  // Ecosystem (Reward Pool): 25%
  // Staking Pool bootstrap: 10%  (we transfer to RewardPool for visibility)
  // (Liquidity 10% left for future)
  const total = toWei(fundingPot);
  const pct = (x) => (total * BigInt(x)) / BigInt(100);
  const amounts = {
    treasury: pct(10),      // DAO-controlled treasury
    rewardPool: pct(25),    // Ecosystem incentives
    staking: pct(10),       // Seed staking pool (for demo, send to RewardPool)
  };

  console.log('🧮 Funding Split (from pot):');
  console.log(`  - Treasury (10%):     ${ethers.formatUnits(amounts.treasury, decimals)} SST -> ${DAO}`);
  console.log(`  - Reward Pool (25%):  ${ethers.formatUnits(amounts.rewardPool, decimals)} SST -> ${REWARD_POOL}`);
  console.log(`  - Staking (10%):      ${ethers.formatUnits(amounts.staking, decimals)} SST -> ${REWARD_POOL} (demo)`);

  // Minimal ERC20 ABI
  const erc20Abi = [
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 value) returns (bool)'
  ];
  const sst = new ethers.Contract(SST, erc20Abi, wallet);

  const before = {
    dao: await sst.balanceOf(DAO),
    reward: await sst.balanceOf(REWARD_POOL),
  };

  const txs = [];
  const send = async (to, amt, label) => {
    if (amt <= 0n) return;
    console.log(`🚚 Transfer ${label}: ${ethers.formatUnits(amt, decimals)} SST → ${to}`);
    const tx = await sst.transfer(to, amt);
    const r = await tx.wait();
    console.log(`   ✅ Tx: ${r?.hash}`);
    txs.push(r?.hash);
  };

  await send(DAO, amounts.treasury, 'Treasury (DAO)');
  await send(REWARD_POOL, amounts.rewardPool, 'Reward Pool (Ecosystem)');
  await send(REWARD_POOL, amounts.staking, 'Staking Seed (to RewardPool demo)');

  const after = {
    dao: await sst.balanceOf(DAO),
    reward: await sst.balanceOf(REWARD_POOL),
  };

  console.log('────────────────────────────────────────────');
  console.log('✅ Funding Complete');
  console.log(`   DAO (before → after):     ${ethers.formatUnits(before.dao, decimals)} → ${ethers.formatUnits(after.dao, decimals)} SST`);
  console.log(`   Reward (before → after):  ${ethers.formatUnits(before.reward, decimals)} → ${ethers.formatUnits(after.reward, decimals)} SST`);
  console.log('   Tx Hashes:', txs);
}

main().catch((e) => {
  console.error('❌ Funding failed:', e.message);
  process.exit(1);
});

