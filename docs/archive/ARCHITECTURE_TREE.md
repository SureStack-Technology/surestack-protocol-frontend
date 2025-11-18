# ⚠️ Archived file — may contain outdated contract addresses or architecture.

# SureStack Protocol - Complete Architecture Tree

## 📁 Complete Directory Structure

```
SureStack/
├── shared/                          # ✅ SHARED HOOKS (Phase 1)
│   ├── hooks/
│   │   ├── index.js                 # Centralized exports
│   │   ├── useProposals.js          # Proposal creation, queue, execute
│   │   ├── useVoting.js             # Voting functionality
│   │   ├── useGovernance.js         # Governance parameters
│   │   └── useStaking.js            # Business analytics (Phase 2)
│   └── utils/
│       └── formatters.js             # Shared formatting utilities
│
├── src/
│   ├── components/
│   │   ├── Layout.jsx               # User frontend layout (blue gradient)
│   │   ├── BusinessLayout.jsx       # ✅ Business frontend layout (purple gradient)
│   │   ├── GovernancePanel.jsx      # User governance (uses shared hooks)
│   │   ├── Dashboard.jsx            # User dashboard
│   │   ├── PolicyPanel.jsx          # User policy panel
│   │   ├── ClaimPanel.jsx           # User claim panel
│   │   ├── ValidatorConsole.jsx     # User validator console
│   │   ├── StressTestPanel.jsx      # User stress test
│   │   ├── AuditTrail.jsx           # User audit trail
│   │   │
│   │   ├── business/                 # ✅ BUSINESS ANALYTICS (Phase 2)
│   │   │   ├── BusinessDashboard.jsx
│   │   │   ├── BusinessGovernancePanel.jsx
│   │   │   ├── RiskPoolManager.jsx      # ✅ Pool monitoring
│   │   │   ├── UnderwritingPanel.jsx    # ✅ Underwriting metrics
│   │   │   └── GovernanceAudit.jsx      # ✅ Governance audit
│   │   │
│   │   └── governance/               # Shared governance components
│   │       ├── ProposalForm.jsx     # Uses shared hooks
│   │       ├── ProposalList.jsx     # Uses shared hooks
│   │       ├── VotingInterface.jsx  # Uses shared hooks
│   │       └── GovernanceHistory.jsx
│   │
│   ├── contexts/
│   │   ├── Web3Context.jsx           # Web3 provider
│   │   └── SimulationContext.jsx    # ✅ Simulation mode (Phase 2.5)
│   │
│   ├── utils/
│   │   ├── formatters.js
│   │   └── dataSimulator.js         # ✅ Frontend simulator (Phase 2.5)
│   │
│   ├── hooks/                        # Legacy hooks (still used)
│   │   ├── useContracts.js
│   │   ├── useStaking.js             # Individual validator staking
│   │   ├── usePolicies.js
│   │   ├── useClaims.js
│   │   ├── useAuditTrail.js
│   │   ├── useValidatorLeaderboard.js
│   │   └── useRevenueData.js
│   │
│   ├── pages/
│   │   └── ValidatorsPage.jsx
│   │
│   ├── config/
│   │   └── contracts.js
│   │
│   └── App.jsx                       # ✅ Dual routing (User + Business)
│
├── data/
│   └── mock-data.json                # ✅ Mock data seed (Phase 2.5)
│
├── scripts/
│   └── simulateEvents.js             # ✅ Hardhat simulation (Phase 2.5)
│
└── package.json                      # ✅ simulate:events script added
```

## ✅ Verification Checklist

### Phase 1 - Shared Hooks & Dual Frontend
- [x] `shared/hooks/useProposals.js` - Proposal management
- [x] `shared/hooks/useVoting.js` - Voting functionality
- [x] `shared/hooks/useGovernance.js` - Governance parameters
- [x] `shared/hooks/index.js` - Centralized exports
- [x] `shared/utils/formatters.js` - Shared utilities
- [x] `src/components/BusinessLayout.jsx` - Business layout
- [x] `src/components/business/BusinessDashboard.jsx` - Business dashboard
- [x] `src/components/business/BusinessGovernancePanel.jsx` - Business governance
- [x] `src/App.jsx` - Dual routing architecture

### Phase 2 - Business Analytics
- [x] `shared/hooks/useStaking.js` - Business analytics hook
- [x] `src/components/business/RiskPoolManager.jsx` - Pool monitoring
- [x] `src/components/business/UnderwritingPanel.jsx` - Underwriting metrics
- [x] `src/components/business/GovernanceAudit.jsx` - Governance audit

### Phase 2.5 - Data Simulation
- [x] `data/mock-data.json` - Mock data seed
- [x] `scripts/simulateEvents.js` - Hardhat simulation script
- [x] `src/utils/dataSimulator.js` - Frontend simulator
- [x] `src/contexts/SimulationContext.jsx` - Simulation context
- [x] `src/components/BusinessLayout.jsx` - Simulation toggle button

## 🌐 Routing Structure

### User Frontend Routes
- `/` → Dashboard
- `/policies` → PolicyPanel
- `/claims` → ClaimPanel
- `/validators` → ValidatorsPage
- `/stress-test` → StressTestPanel
- `/governance` → GovernancePanel
- `/audit` → AuditTrail

### Business Frontend Routes
- `/business` → BusinessDashboard
- `/business/policies` → PolicyPanel
- `/business/claims` → ClaimPanel
- `/business/validators` → ValidatorsPage
- `/business/stress-test` → StressTestPanel
- `/business/governance` → BusinessGovernancePanel
- `/business/risk-pools` → RiskPoolManager ✅
- `/business/underwriting` → UnderwritingPanel ✅
- `/business/audit` → GovernanceAudit ✅

## 🔗 Integration Points

### Shared Hooks Usage
- **User Frontend**: `GovernancePanel.jsx` uses `shared/hooks`
- **Business Frontend**: All business components use `shared/hooks`
- **Governance Components**: `ProposalForm`, `ProposalList`, `VotingInterface` use `shared/hooks`

### Simulation Integration
- **RiskPoolManager**: Uses `useSimulation()` + `dataSimulator.js`
- **UnderwritingPanel**: Uses `useSimulation()` + `dataSimulator.js`
- **GovernanceAudit**: Uses `useSimulation()` + `dataSimulator.js`
- **BusinessLayout**: Toggle button for simulation mode

### Context Providers
- **Web3Provider**: Wraps entire app (in `App.jsx`)
- **SimulationProvider**: Wraps entire app (in `App.jsx`)

## 📊 File Count Summary

- **Shared Hooks**: 5 files
- **Business Components**: 5 files
- **Simulation Files**: 4 files
- **Contexts**: 2 files
- **Total New Files**: 16 files

## ✅ Architecture Status

All phases have been successfully implemented:
- ✅ Phase 1: Shared Hooks & Dual Frontend
- ✅ Phase 2: Business Analytics Layer
- ✅ Phase 2.5: Data Simulation Seed & Event Emitters









