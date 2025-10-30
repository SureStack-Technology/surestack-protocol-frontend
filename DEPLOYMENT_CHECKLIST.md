# SureStack Protocol — by SureStack Technology

Secure. Stack. Protect.

## Pre-Deployment

### 1. Environment Setup
- [ ] Obtain Sepolia ETH from faucet (https://sepoliafaucet.com/)
- [ ] Set up Infura or Alchemy account for RPC endpoint
- [ ] Create `.env` file from `env.template`
- [ ] Add Infura/Alchemy API key to `.env`
- [ ] Verify wallet has sufficient Sepolia ETH (0.1+ ETH recommended)

### 2. Contract Verification
- [ ] Review all contracts for security considerations
- [ ] Run tests: `npx hardhat test`
- [ ] Verify contract sizes are within block gas limits
- [ ] Check all constructor parameters
- [ ] Verify ABIs are exported correctly

### 3. Deployment Order
The contracts must be deployed in this specific order:

1. **SureStackToken.sol**
   - [ ] Deploy with initial mint parameters
   - [ ] Verify contract on Etherscan
   - [ ] Save token address

2. **ConsensusAndStaking.sol**
   - [ ] Deploy with: SureStackToken address, Sequencer address
   - [ ] Grant ROLE_STAKING to ConsensusAndStaking contract
   - [ ] Verify contract on Etherscan
   - [ ] Save staking address

3. **RewardPoolAndSlasher.sol**
   - [ ] Deploy with: SureStackToken address, ConsensusAndStaking address
   - [ ] Verify contract on Etherscan
   - [ ] Save reward pool address

4. **DAOGovernance.sol**
   - [ ] Deploy TimelockController first
   - [ ] Deploy DAOGovernance with token and timelock addresses
   - [ ] Configure voting parameters (period, delay, quorum)
   - [ ] Grant governance roles
   - [ ] Verify contract on Etherscan
   - [ ] Save DAO and Timelock addresses

### 4. Post-Deployment Configuration

#### Contract Interactions
- [ ] Fund RewardPool with initial liquidity
- [ ] Transfer sequencer role to designated address
- [ ] Configure governance timelock gauge
- [ ] Test staking functionality
- [ ] Test assessment submission
- [ ] Test round settlement

#### Backend Configuration
- [ ] Update `backend/.env` with deployed addresses
- [ ] Set RPC_URL to Sepolia endpoint
- [ ] Verify backend connects to contracts
- [ ] Test API endpoints with live data

#### Frontend Configuration
- [ ] Update contract addresses in `.env.local`
- [ ] Update RPC_URL for Sepolia
- [ ] Configure network in wallet connection
- [ ] Test wallet integration
- [ ] Verify data loads from backend

### 5. Security Checks
- [ ] Verify all admin roles are set correctly
- [ ] Test access control modifiers
- [ ] Verify emergency functions (if applicable)
- [ ] Check for any hardcoded test addresses
- [ ] Verify timelock delays are appropriate
- [ ] Test slashing conditions

### 6. Testing on Sepolia

#### Validator Tests
- [ ] Create test validator wallet
- [ ] Transfer SST tokens to validator
- [ ] Approve and stake tokens
- [ ] Submit test assessment
- [ ] Wait for round submission window
- [ ] Settle round as sequencer
- [ ] Verify rewards distribution

#### Governance Tests
- [ ] Create test proposal
- [ ] Cast votes
- [ ] Execute proposal after timelock
- [ ] Verify parameter changes

#### Integration Tests
- [ ] Frontend loads from backend
- [ ] Validator list displays correctly
- [ ] Staking UI works with MetaMask
- [ ] Transaction confirmations work
- [ ] Event listeners update UI

### 7. Documentation
- [ ] Document contract addresses
- [ ] Create verified ABIs
- [ ] Update README with deployment info
- [ ] Document API endpoints
- [ ] Create user guide for interacting with contracts
- [ ] Document known limitations

### 8. Monitoring Setup
- [ ] Set up Etherscan watchlist for contracts
- [ ] Configure event monitoring
- [ ] Set up alerts for unusual activity
- [ ] Document how to query contract state

## Deployment Commands

### Deploy to Sepolia
```bash
# Compile contracts
npx hardhat compile

# Deploy all contracts
npx hardhat run scripts/deploy.js --network sepolia

# Verify contracts on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Update Environment Files
```bash
# Backend .env
RISK_TOKEN_CONTRACT=<SEPOLIA_ADDRESS>  # SureStack Token (SST)
CONSENSUS_CONTRACT=<SEPOLIA_ADDRESS>
REWARD_POOL_CONTRACT=<SEPOLIA_ADDRESS>
DAO_CONTRACT=<SEPOLIA_ADDRESS>
TIMELOCK_ADDRESS=<SEPOLIA_ADDRESS>
RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY

# Frontend .env.local (for Next.js)
NEXT_PUBLIC_RISK_TOKEN=<SEPOLIA_ADDRESS>  # SST
NEXT_PUBLIC_CONSENSUS=<SEPOLIA_ADDRESS>
NEXT_PUBLIC_REWARD_POOL=<SEPOLIA_ADDRESS>
NEXT_PUBLIC_DAO=<SEPOLIA_ADDRESS>
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
```

## Post-Deployment Verification

### Contract State Verification
- [ ] Check SST token total supply
- [ ] Verify min stake amount
- [ ] Check cooling off period
- [ ] Verify slashing threshold
- [ ] Confirm sequencer address

### Backend Health
- [ ] `curl http://localhost:5000/health`
- [ ] Test `/api/validators` endpoint
- [ ] Test `/api/coverage` endpoint
- [ ] Test `/api/governance` endpoint

### Frontend Functionality
- [ ] Home page loads correctly
- [ ] Validator page shows data
- [ ] Coverage pools display
- [ ] Governance proposals list
- [ ] Wallet connection works

## Production Readiness

### Before Mainnet Deployment
- [ ] Complete security audit
- [ ] Get code review from multiple developers
- [ ] Test thoroughly on testnet for 1+ month
- [ ] Prepare monitoring infrastructure
- [ ] Create incident response plan
- [ ] Verify insurance/coverage amounts
- [ ] Get legal review of governance model
- [ ] Prepare disaster recovery procedures

### Launch Checklist
- [ ] Announce deployment on social media
- [ ] Create onboarding documentation
- [ ] Set up support channels
- [ ] Monitor transaction volumes
- [ ] Track validator participation
- [ ] Collect user feedback

## Troubleshooting

### Common Issues

**Contract deployment fails:**
- Check gas limit
- Verify sufficient ETH in deployer wallet
- Check RPC endpoint is working

**Backend can't connect:**
- Verify contract addresses are correct
- Check RPC_URL is valid
- Ensure contracts are deployed to same network

**Frontend shows no data:**
- Check backend is running
- Verify API endpoints return data
- Check browser console for errors
- Verify network configuration

## Emergency Contacts

- **Lead Developer:** [Name] - [Contact]
- **DevOps:** [Name] - [Contact]
- **Security Team:** [Name] - [Contact]
- **Contract Addresses:** [Document all deployed addresses]

## Useful Links

- **Sepolia Etherscan:** https://sepolia.etherscan.io/
- **Sepolia Faucet:** https://sepoliafaucet.com/
- **Hardhat Docs:** https://hardhat.org/docs
- **Ethers.js Docs:** https://docs.ethers.org/
- **Next.js Docs:** https://nextjs.org/docs


