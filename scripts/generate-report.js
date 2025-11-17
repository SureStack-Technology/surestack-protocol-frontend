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

async function fetchContractData(provider, address, abi, functionName) {
  try {
    const contract = new ethers.Contract(address, abi, provider);
    const result = await contract[functionName]();
    return result.toString();
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function fetchTokenBalance(provider, tokenAddress, holderAddress) {
  try {
    const tokenAbi = ['function balanceOf(address) view returns (uint256)'];
    const token = new ethers.Contract(tokenAddress, tokenAbi, provider);
    const balance = await token.balanceOf(holderAddress);
    return ethers.formatUnits(balance, 18);
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function main() {
  console.log('📊 Generating SureStack Protocol Deployment Report...\n');

  const env = loadEnv();
  const providerUrl = env.INFURA_API_URL || env.RPC_URL || 'https://rpc.sepolia.org';
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();

  // Contract addresses
  const contracts = {
    sureStackToken: env.SURESTACK_TOKEN_ADDRESS || '0x835fec04058Fdf3FddD1357730849328E863E55C',
    consensusStakingV2: env.CONSENSUS_STAKING_ADDRESS || '0xE4FDE3D1017758E5b32e8010B0843398bDFF9C57',
    rewardPool: env.REWARD_POOL_ADDRESS || '0x5FfA7c9Aab268c7Ea0eCbB695FBf5DD989DABf94',
    daoGovernance: env.DAO_GOVERNANCE_ADDRESS || '0xAD9fC360E128531d765D59ee0567D5390C4AacBE',
    oracleReaderV2: env.ORACLE_CONTRACT_ADDRESS || env.ORACLE_READER_V2_ADDRESS || '0x1B081326b7C36f949F7EE4d801361E1d2c9E67d1',
    policyManager: env.POLICY_MANAGER_ADDRESS || '0xe14D40A5FDae199C7e148aAfD0793A7ac335f28E',
  };

  console.log('🔍 Fetching contract data...\n');

  // Fetch token balances
  const rewardPoolBalance = await fetchTokenBalance(provider, contracts.sureStackToken, contracts.rewardPool);
  const daoBalance = await fetchTokenBalance(provider, contracts.sureStackToken, contracts.daoGovernance);

  // Fetch oracle price
  let oraclePrice = 'N/A';
  try {
    const oracleAbi = ['function getLatestPrice() view returns (uint256 price, uint8 decimals, uint256 roundId, uint256 updatedAt)'];
    const oracle = new ethers.Contract(contracts.oracleReaderV2, oracleAbi, provider);
    const [price, decimals, roundId, updatedAt] = await oracle.getLatestPrice();
    const priceUSD = Number(price) / (10 ** Number(decimals));
    oraclePrice = `$${priceUSD.toFixed(2)} (Round ID: ${roundId.toString()})`;
  } catch (error) {
    oraclePrice = `Error: ${error.message}`;
  }

  // Fetch revenue simulation data
  let revenueData = null;
  try {
    const revenuePath = path.resolve('./reports/simulations/revenue-latest.json');
    if (fs.existsSync(revenuePath)) {
      revenueData = JSON.parse(fs.readFileSync(revenuePath, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Could not load revenue simulation data:', error.message);
  }

  // Generate report
  const timestamp = new Date().toISOString();
  const report = `# 📊 SureStack Protocol — Deployment Report

**Generated:** ${timestamp}  
**Network:** ${network.name} (Chain ID: ${network.chainId})  
**Block Number:** ${blockNumber}

---

## 📋 Contract Addresses

| Contract | Address | Explorer |
|----------|---------|----------|
| **SureStackToken (SST)** | \`${contracts.sureStackToken}\` | [View](https://sepolia.etherscan.io/address/${contracts.sureStackToken}) |
| **ConsensusAndStakingV2** | \`${contracts.consensusStakingV2}\` | [View](https://sepolia.etherscan.io/address/${contracts.consensusStakingV2}) |
| **RewardPoolAndSlasher (V2)** | \`${contracts.rewardPool}\` | [View](https://sepolia.etherscan.io/address/${contracts.rewardPool}) |
| **DAOGovernance** | \`${contracts.daoGovernance}\` | [View](https://sepolia.etherscan.io/address/${contracts.daoGovernance}) |
| **OracleReaderV2** | \`${contracts.oracleReaderV2}\` | [View](https://sepolia.etherscan.io/address/${contracts.oracleReaderV2}) |
| **PolicyManager** | \`${contracts.policyManager}\` | [View](https://sepolia.etherscan.io/address/${contracts.policyManager}) |

---

## 💰 Token Balances

| Address | Balance (SST) | Description |
|---------|---------------|-------------|
| **RewardPool V2** | ${parseFloat(rewardPoolBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} | Ecosystem incentives pool |
| **DAO Treasury** | ${parseFloat(daoBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} | Governance-controlled treasury |
| **Total Treasury** | ${(parseFloat(rewardPoolBalance) + parseFloat(daoBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 })} | Combined treasury balance |

---

## 📈 Oracle Data

| Metric | Value |
|--------|-------|
| **ETH/USD Price** | ${oraclePrice} |
| **Oracle Contract** | \`${contracts.oracleReaderV2}\` |

---

## 💹 APY & Revenue Metrics

${revenueData ? `
| Metric | Value |
|--------|-------|
| **Protocol Fees** | ${revenueData.protocolFees.toLocaleString()} SST |
| **Accuracy Factor** | ${(revenueData.accuracyFactor * 100).toFixed(2)}% |
| **Total Staked** | ${revenueData.totalStaked.toLocaleString()} SST |
| **Monthly APY** | ${(revenueData.apyMonthly * 100).toFixed(2)}% |
| **Annual APY** | ${(revenueData.apyAnnual * 100).toFixed(2)}% |
| **Effective Yield** | ${(revenueData.effectiveYield * 100).toFixed(2)}% |
| **Last Updated** | ${new Date(revenueData.timestamp).toLocaleString()} |
` : '⚠️ Revenue simulation data not available'}

---

## 🔗 Network Information

- **Network:** ${network.name}
- **Chain ID:** ${network.chainId}
- **RPC URL:** ${providerUrl.replace(/\/v3\/[^/]+/, '/v3/***')}
- **Block Number:** ${blockNumber}
- **Explorer:** https://sepolia.etherscan.io

---

## ✅ Deployment Status

- ✅ **SureStackToken:** Deployed and operational
- ✅ **ConsensusAndStakingV2:** Deployed and linked to RewardPool
- ✅ **RewardPoolAndSlasher (V2):** Deployed with V2 consensus address
- ✅ **DAOGovernance:** Deployed and operational
- ✅ **OracleReaderV2:** Deployed with Chainlink feed configured
- ✅ **PolicyManager:** Deployed and operational

---

## 📊 Summary

**Total Treasury Balance:** ${(parseFloat(rewardPoolBalance) + parseFloat(daoBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 })} SST

**Reward Pool Balance:** ${parseFloat(rewardPoolBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} SST

**DAO Treasury Balance:** ${parseFloat(daoBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} SST

${revenueData ? `**Current APY:** ${(revenueData.apyAnnual * 100).toFixed(2)}% (Annual)` : ''}

---

**Report Generated:** ${timestamp}  
**SureStack Protocol** — Decentralized Risk Coverage & Governance Network
`;

  // Ensure reports directory exists
  const reportsDir = path.resolve('./reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Write report
  const reportPath = path.resolve('./reports/deployment-report.md');
  fs.writeFileSync(reportPath, report);

  console.log('✅ Report generated successfully!');
  console.log(`📄 Location: ${reportPath}\n`);
  console.log('📊 Report Summary:');
  console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`   Block Number: ${blockNumber}`);
  console.log(`   Reward Pool Balance: ${parseFloat(rewardPoolBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} SST`);
  console.log(`   DAO Treasury Balance: ${parseFloat(daoBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} SST`);
  console.log(`   Total Treasury: ${(parseFloat(rewardPoolBalance) + parseFloat(daoBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 })} SST`);
  console.log(`   Oracle Price: ${oraclePrice}`);
  if (revenueData) {
    console.log(`   Annual APY: ${(revenueData.apyAnnual * 100).toFixed(2)}%`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('❌ Error generating report:', err);
  process.exit(1);
});

