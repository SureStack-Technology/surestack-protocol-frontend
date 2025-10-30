# SureStack Protocol — Backend API

Backend API for SureStack Protocol — aggregates off-chain analytics, validator stats, and oracle data for the dApp.

## 🧩 Overview

The SureStack Protocol backend serves as the middleware layer between the frontend dApp and on-chain smart contracts. It provides RESTful APIs for accessing validator data, coverage pools, governance proposals, and real-time Chainlink oracle price feeds.

## ⚙️ Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.18+
- **Blockchain**: Ethers.js v6
- **Environment**: ESM (ES Modules)
- **Validation**: dotenv for configuration

## 🧠 Architecture

```
┌─────────────────┐
│  Frontend dApp  │
│  (Next.js 14)   │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│  Backend API    │
│  (Express.js)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────────────┐
│ Smart   │ │  Chainlink        │
│ Contracts│ │  Oracle Feeds    │
│ (Sepolia)│ │  (ETH/USD)       │
└─────────┘ └──────────────────┘
```

### Core Components

- **Blockchain Provider** (`src/config/blockchain.js`): Ethers.js provider initialization
- **Contract Loader** (`src/config/contracts.js`): ABI loading and contract instance creation
- **Services** (`src/services/`): Business logic for validators, coverage, governance, oracle
- **Routes** (`src/routes/`): Express.js API endpoint handlers
- **Server** (`src/server.js`): Main Express application setup

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm
- Infura or Alchemy API key (for Sepolia testnet)
- Deployed SureStack Protocol contracts (or use localhost for development)

### Installation

```bash
cd backend
npm install
```

### Configuration

Create a `.env` file from the template:

```bash
cp ../env.template .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Blockchain Configuration (Sepolia Testnet)
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
# OR
INFURA_API_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Optional: For write operations
PRIVATE_KEY=your_private_key_here

# Contract Addresses (from deployment-info.json or after deployment)
SURESTACK_TOKEN_ADDRESS=0x...
CONSENSUS_STAKING_ADDRESS=0x...
REWARD_POOL_ADDRESS=0x...
DAO_GOVERNANCE_ADDRESS=0x...
ORACLE_CONTRACT_ADDRESS=0x...

# Chainlink Oracle Address (Sepolia ETH/USD)
CHAINLINK_ORACLE_ADDRESS=0x694AA1769357215DE4FAC081bf1f309aDC325306

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Start Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

Server will start on `http://localhost:5001` (or PORT from .env).

## 🧪 API Endpoints Summary

### Health & Status

- `GET /health` - Server health check
- `GET /api/status` - API status and version
- `GET /` - API information and available endpoints

### Validators API

- `GET /api/validators` - List all validators with stats
- `GET /api/validators/stats` - Validator statistics summary
- `GET /api/validators/:address` - Specific validator details

**Example Response:**
```json
{
  "success": true,
  "data": {
    "validators": [
      {
        "address": "0x...",
        "stakedAmount": "1000000000000000000000",
        "accuracyScore": 95,
        "totalRewards": "50000000000000000000",
        "isActive": true
      }
    ],
    "currentRoundId": "123",
    "totalActive": 10
  }
}
```

### Coverage API

- `GET /api/coverage` - List all coverage pools
- `GET /api/coverage/stats` - Coverage statistics
- `GET /api/coverage/:poolId` - Specific pool details

### Governance API

- `GET /api/governance` - List all governance proposals
- `GET /api/governance/stats` - Governance statistics
- `GET /api/governance/:proposalId` - Specific proposal details

### Oracle API

- `GET /api/oracle` - Full oracle data (price, roundId, updatedAt, decimals)
- `GET /api/oracle/price` - Simplified price response with refresh timestamp

**Example Response:**
```json
{
  "success": true,
  "data": {
    "price": 2847.52,
    "roundId": "18446744073709551617",
    "updatedAt": "2025-10-31T00:00:00.000Z",
    "decimals": 8,
    "refreshAt": "2025-10-31T00:00:30.000Z"
  }
}
```

## 🔗 Smart Contract Integration

The backend connects to SureStack Protocol smart contracts:

1. **SureStackToken (SST)** - ERC20Votes token for governance and staking
2. **ConsensusAndStaking** - Validator registration and consensus mechanism
3. **RewardPoolAndSlasher** - Reward distribution and penalty management
4. **DAOGovernance** - On-chain governance and proposal system
5. **OracleIntegration** - Chainlink oracle price feed integration

### Contract Loading

Contract ABIs are automatically loaded from:
- `artifacts/contracts/` (Hardhat compilation artifacts)
- `deployment-info.json` (contract addresses)

### Direct Contract Access

```javascript
import { contracts, provider } from './config/contracts.js';

// Access contracts directly
const token = contracts.SureStackToken;
const totalSupply = await token.totalSupply();

const oracle = contracts.OracleIntegration;
const price = await oracle.getLatestPriceUSD();
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | `5000` |
| `NODE_ENV` | Environment mode | No | `development` |
| `RPC_URL` | Ethereum RPC endpoint | Yes | - |
| `INFURA_API_URL` | Infura RPC (alternative) | No | - |
| `PRIVATE_KEY` | Wallet private key (for writes) | No | - |
| `SURESTACK_TOKEN_ADDRESS` | Token contract address | Yes | - |
| `CONSENSUS_STAKING_ADDRESS` | Consensus contract address | Yes | - |
| `REWARD_POOL_ADDRESS` | Reward pool contract address | Yes | - |
| `DAO_GOVERNANCE_ADDRESS` | DAO contract address | Yes | - |
| `ORACLE_CONTRACT_ADDRESS` | Oracle integration contract | Yes | - |
| `CHAINLINK_ORACLE_ADDRESS` | Chainlink price feed address | Yes | `0x694AA1769357215DE4FAC081bf1f309aDC325306` |
| `ALLOWED_ORIGINS` | CORS allowed origins | No | `http://localhost:3000` |

### Contract Address Priority

1. Environment variables (`.env`)
2. `deployment-info.json` (auto-generated after deployment)
3. Default values (for Chainlink oracle only)

## 🧪 Testing

Test the API endpoints using curl:

```bash
# Health check
curl http://localhost:5001/health

# API status
curl http://localhost:5001/api/status

# Get validators
curl http://localhost:5001/api/validators

# Get coverage pools
curl http://localhost:5001/api/coverage

# Get governance proposals
curl http://localhost:5001/api/governance

# Get oracle price
curl http://localhost:5001/api/oracle/price
```

## 🚢 Deployment

### Local Development

```bash
npm run dev
```

### Production

```bash
NODE_ENV=production npm start
```

### Docker (Optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5001
CMD ["npm", "start"]
```

## 📝 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── blockchain.js       # Ethers.js provider setup
│   │   └── contracts.js        # Contract ABIs and instances
│   ├── services/
│   │   ├── validatorService.js # Validator data fetching
│   │   ├── coverageService.js  # Coverage pool data
│   │   ├── governanceService.js # DAO governance data
│   │   └── oracleService.js    # Chainlink oracle integration
│   ├── routes/
│   │   ├── validators.js       # Validator API routes
│   │   ├── coverage.js         # Coverage API routes
│   │   ├── governance.js      # Governance API routes
│   │   └── oracle.js           # Oracle API routes
│   └── server.js               # Express app setup
├── scripts/
│   └── start.js                # Server start script
├── package.json
├── README.md
└── SETUP.md
```

## 🔗 Related Repositories

- **Frontend**: [surestack-protocol-frontend](https://github.com/SureStack-Technology/surestack-protocol-frontend)
- **Smart Contracts**: [surestack-protocol-contracts](https://github.com/SureStack-Technology/surestack-protocol-contracts)

## 📄 License

© 2025 SureStack Technology — Zug, Switzerland.
