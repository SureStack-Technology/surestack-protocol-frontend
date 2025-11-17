# SureStack Protocol - React + Vite Frontend

A comprehensive React + Vite frontend for the SureStack Protocol, integrating with all smart contracts on Sepolia testnet.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Contract Addresses

Create a `.env` file in the root directory:

```env
VITE_ORACLE_READER_V2_ADDRESS=0x...
VITE_POLICY_MANAGER_ADDRESS=0x...
VITE_REWARD_POOL_ADDRESS=0x...
VITE_CONSENSUS_STAKING_V2_ADDRESS=0x...
VITE_DAO_GOVERNANCE_ADDRESS=0x...
VITE_SURE_STACK_TOKEN_ADDRESS=0x...
```

Or update `src/config/contracts.js` with your deployed contract addresses.

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 📦 Project Structure

```
src/
├── components/          # React components
│   ├── Dashboard.jsx   # Oracle data + pool balances
│   ├── PolicyPanel.jsx  # Create + list policies
│   ├── ClaimPanel.jsx  # Trigger claims
│   ├── ValidatorConsole.jsx # Round data + events
│   ├── StressTestPanel.jsx  # Simulate price drops
│   ├── GovernancePanel.jsx  # Read-only DAO parameters
│   └── AuditTrail.jsx      # Event feed
├── contexts/           # React contexts
│   └── Web3Context.jsx # MetaMask connection
├── hooks/              # Custom hooks
│   └── useContracts.js # Contract instances
├── config/             # Configuration
│   └── contracts.js    # Contract addresses
├── utils/              # Utilities
│   └── formatters.js   # Formatting functions
├── abis/               # Contract ABIs (copied from artifacts)
├── App.jsx             # Main app with routing
└── main.jsx            # Entry point
```

## 🎯 Features

### Dashboard
- Real-time oracle data (ETH/USD price, volatility)
- Pool balances (Reward Pool, Penalty Pool)
- Price history chart
- Pool balances visualization

### Policy Panel
- Create new policies with coverage limits and percentages
- Real-time premium calculation
- List all user policies
- View policy details and status

### Claim Panel
- Select active policies
- Process claims with loss event values
- View claim history

### Validator Console
- View current round data
- Round history with consensus scores
- Recent settlement events
- Submission statistics

### Stress Test Panel
- Simulate price drops (10-60%)
- Calculate treasury impact
- Visualize actuarial resilience
- Policy statistics

### Governance Panel
- Read-only view of all DAO parameters
- PolicyManager parameters
- ConsensusAndStakingV2 parameters
- OracleReaderV2 parameters

### Audit Trail
- Real-time event feed from all contracts
- Filter by contract type
- View transaction details on Etherscan
- Complete audit log

## 🔧 Configuration

### MetaMask Setup

1. Install MetaMask browser extension
2. Connect to Sepolia testnet
3. Click "Connect Wallet" in the app

### Contract Addresses

Update contract addresses in:
- `.env` file (recommended)
- `src/config/contracts.js` (fallback)

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **React Router** - Routing
- **Ethers.js v6** - Blockchain interaction
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization

## 📡 Network

- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **RPC**: https://sepolia.infura.io/v3/

## 🔐 Security Notes

- Always verify contract addresses before interacting
- Never share your private keys
- Use testnet tokens only
- Review all transactions before confirming

## 📄 License

MIT

