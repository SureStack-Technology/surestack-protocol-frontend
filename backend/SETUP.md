# SureStack Protocol Backend - Setup Guide

## 🎯 What Was Created

A complete Express.js backend API for SureStack Protocol with the following structure:

```
backend/
├── src/
│   ├── config/
│   │   ├── blockchain.js       # Ethers.js provider setup
│   │   └── contracts.js        # Contract ABIs and instances
│   ├── services/
│   │   ├── validatorService.js # Fetch validator data from chain
│   │   ├── coverageService.js  # Fetch coverage pool data
│   │   └── governanceService.js # Fetch DAO proposals
│   ├── routes/
│   │   ├── validators.js       # Validator API endpoints
│   │   ├── coverage.js         # Coverage API endpoints
│   │   └── governance.js       # Governance API endpoints
│   └── server.js               # Express app
├── scripts/
│   └── start.js                # Server startup script
├── package.json                # ESM modules with ethers.js
├── .gitignore                  # Backend-specific ignores
└── README.md                   # Complete documentation
```

## 🚀 Quick Setup

### 1. Create .env File

Create `backend/.env` with the following:

```env
PORT=5000
NODE_ENV=development

INFURA_API_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

RISK_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
CONSENSUS_STAKING_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
REWARD_POOL_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
DAO_GOVERNANCE_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
TIMELOCK_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Start Server

```bash
npm start
```

Server will run on `http://localhost:5000`

## 📡 API Endpoints

- `GET /health` - Health check
- `GET /api/validators` - List all validators
- `GET /api/validators/:address` - Validator details
- `GET /api/validators/stats` - Validator statistics
- `GET /api/coverage` - List coverage pools
- `GET /api/coverage/:poolId` - Pool details
- `GET /api/coverage/stats` - Coverage statistics
- `GET /api/governance` - List proposals
- `GET /api/governance/:proposalId` - Proposal details
- `GET /api/governance/stats` - Governance statistics

## 🔗 Smart Contract Integration

Backend uses Ethers.js v6 to connect to deployed contracts:
- Reads contract ABIs from project root JSON files
- Connects via INFURA RPC (Sepolia testnet)
- Fetches real-time on-chain data
- Supports both read and write operations (if PRIVATE_KEY is set)

## 📦 Dependencies Installed

- `express@^4.18.2` - Web server
- `ethers@^6.12.0` - Blockchain interactions
- `dotenv@^16.4.1` - Environment variables
- `cors@^2.8.5` - CORS middleware

## ✅ Ready to Use

The backend is production-ready and can:
- Connect to localhost or Sepolia network
- Fetch live validator data from chain
- Return governance proposals
- Serve coverage pool information
- Integrate with the frontend

## 🔄 Next Steps

1. Update `.env` with your INFURA API key
2. Update contract addresses for your deployment
3. Run `npm start` to launch the server
4. Connect frontend to `http://localhost:5000`

