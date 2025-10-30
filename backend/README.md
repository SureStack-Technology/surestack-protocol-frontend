# SureStack Protocol — Backend API

Backend API for SureStack Protocol — aggregates off-chain analytics, validator stats, and oracle data.

## 🌟 Features

- **Blockchain Integration**: Connect to SureStack Protocol smart contracts using Ethers.js v6
- **RESTful API**: Express.js server with JSON responses
- **Smart Contract Interaction**: Real-time on-chain data fetching from deployed contracts
- **CORS Enabled**: Configured for frontend integration
- **ESM Modules**: Modern ES module syntax

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create a `.env` file from the example:

```bash
cp env.template .env
```

Edit `.env` and add your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Blockchain Configuration (Sepolia Testnet)
INFURA_API_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Contract Addresses
RISK_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
CONSENSUS_STAKING_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
REWARD_POOL_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
DAO_GOVERNANCE_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
TIMELOCK_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

Returns server status and uptime.

### Validators API

```bash
# Get all validators
GET /api/validators

# Get validator statistics
GET /api/validators/stats

# Get specific validator details
GET /api/validators/:address
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "validators": [...],
    "currentRoundId": "123",
    "totalActive": 10
  }
}
```

### Coverage API

```bash
# Get all coverage pools
GET /api/coverage

# Get coverage statistics
GET /api/coverage/stats

# Get specific pool details
GET /api/coverage/:poolId
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "pools": [
      {
        "id": 1,
        "name": "DeFi Lending Pool",
        "riskLevel": "Low",
        "coverageAmount": "1000000",
        "premium": "2.5"
      }
    ],
    "totalPools": 3
  }
}
```

### Governance API

```bash
# Get all proposals
GET /api/governance

# Get governance statistics
GET /api/governance/stats

# Get specific proposal details
GET /api/governance/:proposalId
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "proposals": [...],
    "votingPeriod": "45818",
    "votingDelay": "1",
    "quorum": "4%"
  }
}
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── blockchain.js       # Ethers.js provider setup
│   │   └── contracts.js        # Contract ABIs and addresses
│   ├── services/
│   │   ├── validatorService.js # Validator data fetching
│   │   ├── coverageService.js  # Coverage pool data
│   │   └── governanceService.js # DAO governance data
│   ├── routes/
│   │   ├── validators.js       # Validator API routes
│   │   ├── coverage.js         # Coverage API routes
│   │   └── governance.js       # Governance API routes
│   └── server.js               # Express app setup
├── scripts/
│   └── start.js                # Server start script
├── .env.example                # Environment template
├── package.json
└── README.md
```

## 🔗 Smart Contract Integration

The backend connects to SureStack Protocol smart contracts:

1. **SureStackToken (SST)** - ERC20Votes token for governance and staking
2. **ConsensusAndStaking** - Validator registration and consensus
3. **RewardPoolAndSlasher** - Reward distribution and penalties
4. **DAOGovernance** - On-chain governance and proposals

Contract ABIs are automatically loaded from:
- `consensus_abi.json`
- `reward_abi.json`
- Contract artifacts (for SureStackToken and DAOGovernance)

## 🔧 Configuration

### Blockchain Provider

The backend uses Ethers.js v6 to connect to Ethereum networks:

```javascript
// From INFURA_API_URL in .env
const provider = new ethers.JsonRpcProvider(process.env.INFURA_API_URL);
```

### Contract ABIs

ABIs are loaded from JSON files in the project root:
- `../consensus_abi.json`
- `../reward_abi.json`
- Contract artifacts for compiled contracts

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment | No |
| `INFURA_API_URL` | RPC endpoint | Yes |
| `RISK_TOKEN_ADDRESS` | Token contract (SureStackToken/SST) | Yes |
| `CONSENSUS_STAKING_ADDRESS` | Staking contract | Yes |
| `REWARD_POOL_ADDRESS` | Reward contract | Yes |
| `DAO_GOVERNANCE_ADDRESS` | DAO contract | Yes |
| `TIMELOCK_ADDRESS` | Timelock contract | Yes |
| `PRIVATE_KEY` | For write ops | No |
| `ALLOWED_ORIGINS` | CORS origins | No |

## 🧪 Testing

Test the API endpoints using curl:

```bash
# Health check
curl http://localhost:5000/health

# Get validators
curl http://localhost:5000/api/validators

# Get coverage pools
curl http://localhost:5000/api/coverage

# Get governance proposals
curl http://localhost:5000/api/governance
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

### Docker (optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📝 Notes

- Contract addresses are loaded from `.env` file
- ABIs are loaded from project root JSON files
- Services use mock data for coverage pools until on-chain implementation
- Validator list requires event tracking in production
- Proposals require event tracking for full governance support

## 🤝 Integration

This backend integrates with:
- **Frontend**: [surestack-protocol-frontend](https://github.com/SureStack-Technology/surestack-protocol-frontend)
- **Contracts**: [surestack-protocol-contracts](https://github.com/SureStack-Technology/surestack-protocol-contracts)

## 🔗 Links

- **Repository**: [surestack-protocol-backend](https://github.com/SureStack-Technology/surestack-protocol-backend)
- **Frontend**: [surestack-protocol-frontend](https://github.com/SureStack-Technology/surestack-protocol-frontend)
- **Smart Contracts**: [surestack-protocol-contracts](https://github.com/SureStack-Technology/surestack-protocol-contracts)

## 📄 License

© 2025 SureStack Technology — Zug, Switzerland.

