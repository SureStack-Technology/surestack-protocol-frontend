# SureStack Protocol — Smart Contracts

Solidity / Hardhat implementation of SureStackToken (SST), Coverage Pools, Validator Registry, DAO Governance, and Oracle Integration.

## 🧩 Overview

The SureStack Protocol smart contracts form the decentralized backbone of the risk coverage and governance platform. Built with Solidity 0.8.20, these contracts enable validator consensus, token staking, reward distribution, on-chain governance, and Chainlink oracle price feeds.

## 🧠 Architecture

```
┌─────────────────────────────────────────────────────────┐
│              SureStack Protocol Contracts               │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ SureStackToken│   │   Consensus   │   │   Oracle      │
│     (SST)     │   │  & Staking    │   │ Integration   │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                   │
       │                  ▼                   │
       │         ┌─────────────────┐          │
       │         │  RewardPool     │          │
       │         │  & Slasher      │          │
       │         └─────────────────┘          │
       │                                       │
       └───────────────┬──────────────────────┘
                       ▼
              ┌─────────────────┐
              │ DAO Governance  │
              │ + Timelock      │
              └─────────────────┘
```

### Contract Interactions

1. **SureStackToken (SST)** → Base token used across all contracts
2. **ConsensusAndStaking** → Manages validators, staking, and consensus rounds
3. **RewardPoolAndSlasher** → Distributes rewards and handles penalties
4. **DAOGovernance** → On-chain governance with proposal voting
5. **OracleIntegration** → Chainlink ETH/USD price feed integration

## ⚙️ Tech Stack

- **Solidity**: 0.8.20
- **Hardhat**: Development environment and testing framework
- **OpenZeppelin**: Contracts library (ERC20Votes, Governor, Ownable)
- **Chainlink**: Oracle price feeds (AggregatorV3Interface)
- **Foundry**: Alternative testing framework (optional)
- **Ethers.js**: Contract interaction library

## 📜 Contract Summary

### SureStackToken (SST)

**File**: `contracts/SureStackToken.sol`

- **Type**: ERC20Votes with Ownable
- **Name**: "SureStack Token"
- **Symbol**: "SST"
- **Initial Supply**: 1,000,000,000 SST (1 billion tokens)
- **Features**:
  - Voting capabilities for governance
  - Batch transfer functionality
  - Mint and burn functions (owner-controlled)

### ConsensusAndStaking

**File**: `contracts/ConsensusAndStaking.sol`

- **Purpose**: Validator registration, staking, and consensus mechanism
- **Key Features**:
  - Validator profile management
  - Token staking (minimum 1000 SST)
  - Assessment submission and round settlement
  - 7-day cooling-off period for unstaking
  - Slashing based on score deviation

### RewardPoolAndSlasher

**File**: `contracts/RewardPoolAndSlasher.sol`

- **Purpose**: Reward distribution and penalty management
- **Key Features**:
  - Separate pools for rewards and penalties
  - Consensus contract authorization
  - Penalty fund burning
  - Reward distribution to validators

### DAOGovernance

**File**: `contracts/DAOGovernance.sol`

- **Purpose**: On-chain governance and proposal system
- **Key Features**:
  - Proposal creation and voting
  - Timelock execution
  - Quorum and voting period configuration
  - Integration with SureStackToken for voting power

### OracleIntegration

**File**: `contracts/OracleIntegration.sol`

- **Purpose**: Chainlink oracle price feed integration
- **Key Features**:
  - ETH/USD price feed (Sepolia: `0x694AA1769357215DE4FAC081bf1f309aDC325306`)
  - Latest price retrieval
  - Human-readable USD price formatting
  - Price feed metadata

## 🔗 Chainlink Integration

### ETH/USD Price Feed

**Network**: Sepolia Testnet  
**Address**: `0x694AA1769357215DE4FAC081bf1f309aDC325306`

**OracleReader Contract**:
- `getLatestPrice()` - Returns price, decimals, roundId, updatedAt
- `getLatestPriceUSD()` - Returns human-readable USD price
- `getPriceFeedInfo()` - Returns feed description and version

**Usage Example**:
```solidity
OracleReader oracle = OracleReader(0x...);
uint256 priceUSD = oracle.getLatestPriceUSD();
```

## 🧪 Testing

### Hardhat Tests

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/core/SureStackToken.test.js

# Generate coverage report
npm run coverage

# Gas reporting
npm run gas
```

### Foundry Tests (Optional)

```bash
# Install Foundry (if not installed)
curl -L https://foundry.paradigm.xyz | bash

# Run Foundry tests
forge test
```

### Test Structure

```
test/
└── core/
    ├── SureStackToken.test.js
    ├── ConsensusAndStaking.test.js
    ├── RewardPoolAndSlasher.test.js
    └── DAOGovernance.test.js
```

## 🚀 Deployment

### Localhost Development

```bash
# Start local Hardhat node
npx hardhat node

# Deploy contracts (in separate terminal)
npx hardhat run scripts/deploy.js --network localhost
```

### Sepolia Testnet

```bash
# Configure .env with Sepolia RPC and private key
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your_private_key_here

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Validate deployment
node scripts/validate-sepolia.js
```

### Deployment Order

1. **SureStackToken** - Deploy first (needed by other contracts)
2. **ConsensusAndStaking** - Requires token address
3. **RewardPoolAndSlasher** - Requires token and consensus addresses
4. **DAOGovernance** - Requires token and timelock addresses
5. **OracleIntegration** - Requires Chainlink oracle address

### Post-Deployment

1. Update `deployment-info.json` with deployed addresses
2. Update `.env` with contract addresses
3. Verify contracts on Etherscan
4. Test contract interactions via backend API

## 📝 Project Structure

```
.
├── contracts/
│   ├── SureStackToken.sol
│   ├── ConsensusAndStaking.sol
│   ├── RewardPoolAndSlasher.sol
│   ├── DAOGovernance.sol
│   └── OracleIntegration.sol
├── test/
│   └── core/
│       ├── SureStackToken.test.js
│       ├── ConsensusAndStaking.test.js
│       ├── RewardPoolAndSlasher.test.js
│       └── DAOGovernance.test.js
├── scripts/
│   ├── deploy.js
│   ├── validate-sepolia.js
│   └── contract-examples.js
├── artifacts/          # Compiled contracts
├── cache/              # Hardhat cache
├── hardhat.config.js
├── package.json
└── deployment-info.json
```

## 🔧 Configuration

### Environment Variables

Create `.env` from `env.template`:

```env
# Wallet Configuration
PRIVATE_KEY=your_private_key_here

# RPC Configuration
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
INFURA_API_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Chainlink Oracle (Sepolia ETH/USD)
CHAINLINK_ORACLE_ADDRESS=0x694AA1769357215DE4FAC081bf1f309aDC325306

# Network Configuration
HARDHAT_NETWORK=sepolia
```

### Hardhat Configuration

The `hardhat.config.js` includes:
- Solidity compiler settings (0.8.20)
- Network configurations (localhost, sepolia)
- Gas reporting (if enabled)
- Coverage settings

## 🧩 Contract Headers

All contracts follow the standard header format:

```solidity
// SPDX-License-Identifier: MIT
/// @title SureStack Protocol — Smart Contract Suite
/// @dev Part of SureStack Technology ecosystem
pragma solidity ^0.8.20;

/**
 * @title ContractName
 * @dev Contract description and purpose
 */
```

## 📊 Compilation

```bash
# Compile all contracts
npx hardhat compile

# Verify compilation success
# Output: Compiled X Solidity files successfully
```

**Expected Output**:
- `artifacts/contracts/SureStackToken.sol/SureStackToken.json`
- `artifacts/contracts/ConsensusAndStaking.sol/ConsensusAndStaking.json`
- `artifacts/contracts/RewardPoolAndSlasher.sol/RewardPoolAndSlasher.json`
- `artifacts/contracts/DAOGovernance.sol/DAOGovernance.json`
- `artifacts/contracts/OracleIntegration.sol/OracleReader.json`

## 🔗 Related Repositories

- **Frontend**: [surestack-protocol-frontend](https://github.com/SureStack-Technology/surestack-protocol-frontend)
- **Backend API**: [surestack-protocol-backend](https://github.com/SureStack-Technology/surestack-protocol-backend)

## 📄 License

© 2025 SureStack Technology — Zug, Switzerland.
