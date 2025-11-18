# ⚠️ Archived file — may contain outdated contract addresses or architecture.

# 🏗️ SureStack Protocol - Architecture Analysis Report

**Date**: 2025-11-08  
**Analyst**: Senior Full-Stack Blockchain Architect  
**Status**: ✅ **ARCHITECTURE IS CONSISTENT**

---

## 📁 Project Structure Overview

```
SureStack/
├── 📦 Smart Contracts (Hardhat)
│   ├── contracts/              # ✅ Single source of truth
│   │   ├── SureStackToken.sol
│   │   ├── ConsensusAndStakingV2.sol
│   │   ├── RewardPoolAndSlasher.sol
│   │   ├── DAOGovernance.sol
│   │   ├── PolicyManager.sol
│   │   └── OracleReaderV2.sol
│   └── scripts/                 # Deployment scripts
│
├── 🔧 Backend (Express.js)
│   └── backend/                 # ✅ Single backend
│       ├── src/
│       │   ├── server.js        # Main Express server
│       │   ├── config/          # Blockchain & contract config
│       │   ├── routes/          # API routes (unified)
│       │   │   ├── oracle.js
│       │   │   ├── governance.js
│       │   │   ├── validators.js
│       │   │   └── coverage.js
│       │   └── services/        # Business logic
│       └── contracts/abi/       # Backend ABIs
│
├── 🎨 Frontend (Vite + React)
│   └── src/                     # ✅ Single unified frontend
│       ├── App.jsx              # Main router (dual routes)
│       ├── components/
│       │   ├── Dashboard.jsx           # User dashboard
│       │   ├── business/               # Business components
│       │   │   ├── BusinessDashboard.jsx
│       │   │   ├── PolicyOps.jsx
│       │   │   ├── RiskPoolManager.jsx
│       │   │   └── UnderwritingPanel.jsx
│       │   └── governance/             # Shared governance
│       ├── layouts/
│       │   └── MainLayout.jsx          # User layout
│       ├── components/
│       │   └── BusinessLayout.jsx      # Business layout
│       ├── contexts/
│       │   ├── Web3Context.jsx        # ✅ Single Web3 provider
│       │   └── SimulationContext.jsx
│       ├── hooks/
│       │   └── useContracts.js        # ✅ Shared contract hook
│       ├── config/
│       │   └── contracts.js            # ✅ Single contract config
│       └── abis/                       # ✅ Single ABI source
│
├── 🔗 Shared Resources
│   └── shared/                 # ✅ Shared hooks & utilities
│       ├── hooks/               # Shared business logic
│       └── utils/               # Shared formatters
│
└── ⚠️ Legacy/Unused
    └── app_legacy/              # ⚠️ Next.js legacy (unused)
```

---

## ✅ Architecture Status Table

| Layer | Status | Location | Notes |
|-------|--------|----------|-------|
| **Smart Contracts** | ✅ Clean | `contracts/` | Single source, no duplicates |
| **Backend API** | ✅ Unified | `backend/src/` | Single Express server, unified routes |
| **User Frontend** | ✅ Integrated | `src/components/` | Routes: `/`, `/policies`, `/claims`, etc. |
| **Business Frontend** | ✅ Integrated | `src/components/business/` | Routes: `/business`, `/business/policies`, etc. |
| **Web3 Provider** | ✅ Single | `src/contexts/Web3Context.jsx` | Shared by both user & business |
| **Contract Hooks** | ✅ Shared | `src/hooks/useContracts.js` | Both dashboards use same hook |
| **ABI Files** | ✅ Single Source | `src/abis/` | No duplicates detected |
| **Environment Config** | ✅ Consistent | `.env.local` | All `VITE_` prefixed |

---

## 🛣️ Frontend Routing Analysis

### ✅ User Frontend Routes (`/`)
- **Layout**: `MainLayout.jsx` (blue gradient theme)
- **Routes**:
  - `/` → `Dashboard.jsx`
  - `/policies` → `PolicyPanel.jsx`
  - `/claims` → `ClaimPanel.jsx`
  - `/validators` → `ValidatorsPage.jsx`
  - `/stress-test` → `StressTestPanel.jsx`
  - `/governance` → `GovernancePanel.jsx`
  - `/audit` → `AuditTrail.jsx`

### ✅ Business Frontend Routes (`/business`)
- **Layout**: `BusinessLayout.jsx` (purple gradient theme)
- **Routes**:
  - `/business` → `BusinessDashboard.jsx`
  - `/business/policies` → `PolicyOps.jsx`
  - `/business/risk-pools` → `RiskPoolManager.jsx`
  - `/business/underwriting` → `UnderwritingPanel.jsx`
  - `/business/governance` → `GovernancePanel.jsx` (shared)
  - `/business/audit` → `GovernanceAudit.jsx`

### ✅ Router Configuration
```jsx
// src/App.jsx - Single unified router
<Routes>
  {/* USER FRONTEND */}
  <Route path="/" element={<Layout />}>
    <Route index element={<Dashboard />} />
    {/* ... user routes ... */}
  </Route>

  {/* BUSINESS FRONTEND */}
  <Route path="/business" element={<BusinessLayout />}>
    <Route index element={<BusinessDashboard />} />
    {/* ... business routes ... */}
  </Route>
</Routes>
```

**Status**: ✅ **Properly configured with role-based separation**

---

## 🔗 Contract Connection Analysis

### ✅ Shared Web3 Provider
- **Location**: `src/contexts/Web3Context.jsx`
- **Provider**: Single Ethers.js provider (Infura Sepolia)
- **Usage**: Both user and business dashboards use the same provider
- **Connection**: MetaMask integration with automatic network switching

### ✅ Shared Contract Hook
- **Location**: `src/hooks/useContracts.js`
- **Contracts**: 
  - OracleReader
  - PolicyManager
  - RewardPool
  - ConsensusStakingV2
  - DAOGovernance
  - SureStackToken
- **Usage**: Both dashboards import and use `useContracts()` hook

### ✅ Contract Configuration
- **Location**: `src/config/contracts.js`
- **Environment Variables**: All use `VITE_` prefix
- **Addresses**: Single source of truth from `.env.local`

**Status**: ✅ **No duplicate providers or contract connections**

---

## 🔧 Backend API Analysis

### ✅ Unified Backend Server
- **Location**: `backend/src/server.js`
- **Framework**: Express.js
- **Port**: 5001 (configurable via `PORT` env var)
- **CORS**: Configured for `localhost:3000` and `localhost:3001`

### ✅ API Routes (Unified for Both Frontends)
- `/api/oracle` → Oracle price feed
- `/api/governance` → DAO governance data
- `/api/validators` → Validator information
- `/api/coverage` → Policy coverage data

**Status**: ✅ **Single backend serves both user and business frontends**

---

## 📦 ABI & Contract Files Analysis

### ✅ Frontend ABIs
- **Location**: `src/abis/`
- **Files**: 7 ABIs (no duplicates)
  - `SureStackToken.json`
  - `ConsensusAndStakingV2.json`
  - `RewardPoolAndSlasher.json`
  - `DAOGovernance.json`
  - `PolicyManager.json`
  - `OracleReader.json`
  - `OracleReaderV2.json`

### ✅ Backend ABIs
- **Location**: `backend/contracts/abi/`
- **Files**: 2 ABIs (backend-specific)

### ✅ Shared ABIs
- **Location**: `shared/abi/`
- **Files**: 2 ABIs (Chainlink, Governor)

**Status**: ✅ **No duplicate ABIs detected, proper separation**

---

## 🌐 Environment Variables Analysis

### ✅ Frontend Environment
- **File**: `.env.local`
- **Prefix**: All variables use `VITE_` prefix
- **Variables**:
  - `VITE_SEPOLIA_RPC`
  - `VITE_SURE_STACK_TOKEN_ADDRESS`
  - `VITE_CONSENSUS_STAKING_V2_ADDRESS`
  - `VITE_REWARD_POOL_ADDRESS`
  - `VITE_DAO_GOVERNANCE_ADDRESS`
  - `VITE_ORACLE_READER_ADDRESS`
  - `VITE_POLICY_MANAGER_ADDRESS`

### ✅ Backend Environment
- **File**: `backend/.env`
- **Variables**: Standard env vars (no `VITE_` prefix)
- **RPC**: `RPC_URL` or `INFURA_API_URL`

**Status**: ✅ **Consistent environment variable usage**

---

## ⚠️ Issues & Recommendations

### ⚠️ Minor Issues Detected

1. **Legacy Directory** (`app_legacy/`)
   - **Status**: ⚠️ Unused Next.js app
   - **Impact**: Low (not affecting current architecture)
   - **Recommendation**: Consider removing or documenting as legacy
   - **Action**: Optional cleanup

2. **Duplicate Layout Files**
   - `src/components/Layout.jsx` (legacy)
   - `src/layouts/MainLayout.jsx` (active)
   - **Status**: ⚠️ Minor duplication
   - **Impact**: Low (only one is used)
   - **Recommendation**: Remove unused `Layout.jsx`

3. **Root-Level Components** (`components/`)
   - **Status**: ⚠️ Some components at root level
   - **Impact**: Low (not conflicting with `src/components/`)
   - **Recommendation**: Consider moving to `src/components/` for consistency

### ✅ No Critical Issues

- ✅ No duplicate backend directories
- ✅ No duplicate frontend directories
- ✅ No conflicting Web3 providers
- ✅ No duplicate contract connections
- ✅ No inconsistent environment variables
- ✅ No duplicate ABI files

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SureStack Protocol                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Smart      │      │   Backend    │      │   Frontend   │
│  Contracts   │      │  (Express)   │      │  (Vite+React)│
│              │      │              │      │              │
│  Sepolia     │◄─────┤  Port 5001   │◄─────┤  Port 3000   │
│  Network     │      │              │      │              │
└──────────────┘      └──────────────┘      └──────┬───────┘
                                                    │
                                    ┌───────────────┼───────────────┐
                                    │               │               │
                                    ▼               ▼               ▼
                            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                            │   User       │ │  Business    │ │   Shared     │
                            │  Frontend    │ │  Frontend    │ │   Resources  │
                            │              │ │              │ │              │
                            │  /            │ │  /business   │ │  hooks/      │
                            │  Dashboard    │ │  Dashboard   │ │  contexts/   │
                            │  Policies     │ │  PolicyOps   │ │  config/     │
                            │  Claims       │ │  RiskPools   │ │  abis/       │
                            │  Validators   │ │  Underwriting│ │              │
                            │  Governance   │ │  Governance  │ │              │
                            └──────────────┘ └──────────────┘ └──────────────┘
                                    │               │               │
                                    └───────────────┼───────────────┘
                                                    │
                                            ┌───────▼───────┐
                                            │  Web3Context  │
                                            │  (Single)     │
                                            │               │
                                            │  useContracts │
                                            │  (Shared)     │
                                            └───────────────┘
                                                    │
                                            ┌───────▼───────┐
                                            │  MetaMask     │
                                            │  Sepolia RPC  │
                                            └───────────────┘
```

---

## ✅ Final Verdict

### **✅ SureStack architecture is consistent. No duplicates detected. Both user and business frontends correctly integrated.**

### Summary:
1. ✅ **Single Backend**: One Express.js server serving both frontends
2. ✅ **Unified Frontend**: Single Vite + React app with role-based routing
3. ✅ **Shared Resources**: Common Web3 provider, contract hooks, and ABIs
4. ✅ **Proper Separation**: User and business dashboards properly separated by routes
5. ✅ **Consistent Config**: Environment variables properly prefixed and organized
6. ✅ **No Duplicates**: No duplicate directories, providers, or contract connections

### Minor Cleanup Recommendations:
1. Remove or document `app_legacy/` directory
2. Remove unused `src/components/Layout.jsx` (if not referenced)
3. Consider consolidating root-level `components/` into `src/components/`

### Architecture Quality: **Excellent** ✅

The architecture follows best practices:
- Single source of truth for contracts and ABIs
- Unified backend API
- Shared Web3 provider and contract hooks
- Proper role-based frontend separation
- Consistent environment variable usage

---

**Report Generated**: 2025-11-08  
**Status**: ✅ **ARCHITECTURE APPROVED**



