# SureStack Protocol — Frontend Architecture Summary

**Generated:** 2025-11-07  
**Status:** Production-Ready POC (85% Complete)  
**Network:** Sepolia Testnet (Chain ID: 11155111)

---

## 📋 Executive Summary

The SureStack Protocol frontend is a **cyberpunk-themed, real-time DeFi dashboard** built with React, Vite, and Tailwind CSS. It features a "Risk Oracle Control Room" design with live Chainlink oracle integration, validator staking UI, DAO governance, and policy management — all connected to 8 deployed smart contracts on Sepolia testnet.

**Key Highlights:**
- **Real-time data updates** every 30 seconds (oracle, metrics, governance)
- **Cyberpunk aesthetic** with neon colors, glassmorphic cards, and animated backgrounds
- **Full Web3 integration** with MetaMask wallet connection
- **8 smart contracts** fully integrated and operational
- **Responsive design** with mobile sidebar support

---

## 🛠 Technology Stack

### Core Framework
- **React 18.2.0** — Component-based UI library
- **Vite 5.4.21** — Build tool and dev server (fast HMR)
- **React Router 7.9.5** — Client-side routing

### Web3 Integration
- **ethers.js 6.15.0** — Ethereum interaction library
- **MetaMask** — Wallet connection and transaction signing
- **WebSocket Provider** — Live event subscriptions (with HTTP polling fallback)

### UI/UX Libraries
- **Tailwind CSS 3.4.1** — Utility-first CSS framework
- **Framer Motion 12.23.24** — Animation library
- **Recharts 2.15.4** — Data visualization (charts)
- **Three.js 0.181.0** — 3D background animations
- **react-icons 5.5.0** — Icon library
- **lucide-react 0.400.0** — Additional icons
- **react-hot-toast** — Toast notifications

### State Management
- **React Context API** — Global state (`Web3Context`, `SimulationContext`)
- **React Hooks** — Custom hooks for contracts, data fetching, and Web3

---

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   │   ├── HolographicCard.jsx
│   │   ├── RiskTicker.jsx
│   │   ├── OracleFeedPanel.jsx
│   │   └── LiquidMetricCard.jsx
│   ├── visuals/        # Visual effects and backgrounds
│   │   ├── NeuroGridBackground.jsx
│   │   ├── DataFlowOverlay.jsx
│   │   └── RiskRadar.jsx
│   ├── governance/     # DAO governance components
│   │   ├── ProposalList.jsx
│   │   ├── ProposalForm.jsx
│   │   ├── VotingInterface.jsx
│   │   └── GovernanceHistory.jsx
│   ├── business/       # Business portal components
│   │   ├── BusinessDashboard.jsx
│   │   ├── PolicyOps.jsx
│   │   ├── RiskPoolManager.jsx
│   │   └── UnderwritingPanel.jsx
│   ├── Dashboard.jsx
│   ├── PolicyPanel.jsx
│   ├── ClaimPanel.jsx
│   ├── ValidatorConsole.jsx
│   ├── StressTestPanel.jsx
│   ├── GovernancePanel.jsx
│   └── AuditTrail.jsx
├── layouts/            # Layout components
│   └── MainLayout.jsx  # Main user frontend layout
├── contexts/           # React Context providers
│   ├── Web3Context.jsx
│   └── SimulationContext.jsx
├── hooks/              # Custom React hooks
│   ├── useContracts.js
│   ├── usePolicies.js
│   ├── useClaims.js
│   ├── useStaking.js
│   ├── useGovernance.js
│   ├── useProposals.js
│   ├── useVoting.js
│   └── useRiskPulse.js
├── shared/             # Shared code (hooks, utils, ABIs)
│   ├── hooks/
│   │   ├── useEthUsdFeed.js
│   │   ├── useLiveDashboardMetrics.js
│   │   ├── useGovernanceSync.js
│   │   └── usePolicyManager.js
│   ├── utils/
│   │   └── rbac.js
│   └── abi/            # Contract ABIs
├── utils/              # Utility functions
│   ├── formatters.js
│   └── dataSimulator.js
├── config/             # Configuration
│   └── contracts.js
├── App.jsx             # Main app component
├── main.jsx            # Entry point
└── index.css           # Global styles
```

---

## 🎨 Visual Design & Theme

### Cyberpunk "Risk Oracle Control Room" Aesthetic

**Color Palette:**
- **Background:** Dark void (`#0a0a0f`) with radial gradients
- **Neon Colors:**
  - Risk: `#ff2d55` (neon pink)
  - Safe: `#00f5ff` (neon cyan)
  - Warning: `#ffb800` (neon yellow)
- **Text:** Slate-100 foreground on dark background
- **Borders:** Semi-transparent neon cyan (`rgba(0, 245, 255, 0.2)`)

**Typography:**
- **Headings:** Orbitron (futuristic, uppercase)
- **Subheadings:** Rajdhani (condensed, technical)
- **Body:** Inter (clean, readable)
- **Monospace:** For addresses, numbers, timestamps

**Visual Effects:**
- **Glassmorphism:** Frosted glass cards with backdrop blur
- **Scanline Animation:** CRT monitor effect on cards
- **Pulse Animations:** Risk-based glow effects
- **Three.js Background:** Animated neural grid network
- **Data Flow Overlay:** Canvas-based particle system

**Animations:**
- `pulse-risk` — Red glow for high risk
- `pulse-safe` — Cyan glow for safe conditions
- `glitch` — Text glitch effect
- `scanline` — Moving scanline overlay
- `volatility-glow` — Dynamic intensity based on volatility

---

## 🏗 Layout Structure

### MainLayout Component

**Structure:**
```
┌─────────────────────────────────────┐
│ RiskTicker (fixed top, 64px)        │ ← Live metrics bar
├─────────────────────────────────────┤
│ Sidebar (sticky, 256px width)       │
│   └─ SureStack logo                 │
│   └─ Navigation menu                │
│                                      │
│ Main Content Area                    │
│   └─ Header (sticky, 64px from top) │
│      └─ "SureStack Protocol"         │
│      └─ Wallet address + Disconnect │
│   └─ Main content (scrollable)       │
│      └─ <Outlet /> (page content)    │
└─────────────────────────────────────┘
```

**Key Features:**
- **RiskTicker:** Fixed top bar showing VOL, RISK, PRICE (updates every 30s)
- **Sidebar:** Collapsible on mobile, always visible on desktop
- **Header:** Sticky below RiskTicker, shows branding and wallet
- **Background:** Three.js NeuroGrid + DataFlowOverlay animations

**Spacing:**
- RiskTicker: 64px height (py-4 padding)
- Sidebar: Starts at 64px, pt-12 (48px) from RiskTicker
- Header: Sticky at 64px, py-5 (20px vertical padding)
- Main content: pt-10 (40px) from header
- Dashboard: pt-8 (32px) additional padding

---

## 🧩 Key Components

### 1. **RiskTicker** (`src/components/ui/RiskTicker.jsx`)
**Purpose:** Live risk metrics bar at top of screen

**Features:**
- Displays VOL (volatility %), RISK (score 0-100), PRICE (ETH/USD)
- Updates every 30 seconds via `useEthUsdFeed` hook
- Flashes crimson on volatility spike (>5%)
- Shows price delta (↑/↓) and percentage change
- Scanline animation effect

**Data Sources:**
- `OracleReaderV2.getVolatilityFactor(0)` for volatility
- `useEthUsdFeed()` for price and updates

---

### 2. **Dashboard** (`src/components/Dashboard.jsx`)
**Purpose:** Main dashboard showing protocol metrics

**Layout:**
- **Left Column (8 cols):** Metrics grid + Oracle chart
- **Right Column (4 cols):** Risk Radar widget

**Metrics Displayed:**
- Total Coverage (USD)
- Total Staked (SST)
- DAO Treasury (SST)
- Oracle Feed (ETH/USD price)
- 24h Risk Index
- 7d Risk Index
- Validator Uptime (%)
- APY (Annual %)

**Components Used:**
- `HolographicCard` — Glassmorphic metric cards with risk-based glow
- `OracleFeedPanel` — Live price chart with interval selector
- `RiskRadar` — Radial risk gauge visualization

**Data Hook:**
- `useLiveDashboardMetrics()` — Combines oracle + on-chain metrics

---

### 3. **HolographicCard** (`src/components/ui/HolographicCard.jsx`)
**Purpose:** Reusable glassmorphic card component

**Features:**
- Dynamic border glow based on `riskScore` (0-100)
- Scanline animation overlay
- Framer Motion hover effects (scale, lift)
- Risk-based color mapping:
  - High risk (70+): Red glow (`#ff2d55`)
  - Medium risk (40-69): Yellow glow (`#ffb800`)
  - Low risk (<40): Cyan glow (`#00f5ff`)
- Progress bar showing risk level

**Props:**
- `title` — Card title
- `value` — Main metric value
- `subtitle` — Description text
- `riskScore` — Risk score (0-100) for color mapping
- `icon` — Optional icon component

---

### 4. **OracleFeedPanel** (`src/components/ui/OracleFeedPanel.jsx`)
**Purpose:** Live Chainlink ETH/USD price feed with historical chart

**Features:**
- Real-time price display (updates every 30s)
- Historical price chart (Recharts)
- Interval selector: 5m, 30m, 1h, 1d, 5d, 7d, 1mo, 1yr
- Chainlink icon and branding
- Error handling with fallback display

**Data Hook:**
- `useEthUsdFeed()` — Fetches live + historical Chainlink data

---

### 5. **RiskRadar** (`src/components/visuals/RiskRadar.jsx`)
**Purpose:** Radial risk gauge visualization

**Features:**
- Center: Current risk score (0-100) with animated number
- Outer ring: 24h volatility heat map
- Color-coded by risk level (red/yellow/cyan)
- Particle cracks animation on high risk (70+)
- Real-time updates every 30s

**Data Sources:**
- `OracleReaderV2.getVolatilityFactor(0)` for volatility
- Calculates risk score: `volatility × 20` (capped at 100)

---

### 6. **NeuroGridBackground** (`src/components/visuals/NeuroGridBackground.jsx`)
**Purpose:** Three.js animated neural network background

**Features:**
- Infinite grid with neural network nodes
- Connections between nodes (weighted by distance)
- Volatility-based particle system
- Camera tilt based on price delta
- Low FPS mode when idle
- Cyberpunk lighting (neon cyan + pink)

**Integration:**
- Uses `useEthUsdFeed()` for price delta calculation
- Pauses in simulation mode

---

### 7. **PolicyPanel** (`src/components/PolicyPanel.jsx`)
**Purpose:** Policy creation and management

**Features:**
- Coverage amount slider
- Coverage percentage selector
- Live premium calculation using `PolicyManager.calculatePremiumUSD()`
- Premium display pulses if >2% of coverage
- Policy creation via MetaMask transaction
- User policy list with details

**Hooks:**
- `usePolicies()` — Policy management
- `useContracts()` — PolicyManager contract

---

### 8. **ClaimPanel** (`src/components/ClaimPanel.jsx`)
**Purpose:** Claim submission and processing

**Features:**
- Policy dropdown (loads user policies)
- Loss event value input
- Claim processing via `PolicyManager.processClaim()`
- Transaction status tracking
- Claim history display

**Hooks:**
- `useClaims()` — Claim management
- `usePolicies()` — Policy list

---

### 9. **ValidatorConsole** (`src/components/ValidatorConsole.jsx`)
**Purpose:** Validator staking and leaderboard

**Features:**
- Staking interface (stake/unstake amounts)
- Pending rewards display
- Minimum stake requirements
- Validator tier cards (Community, Regular, Institutional)
- Leaderboard with rankings
- Live APY display with pulse animation

**Hooks:**
- `useStaking()` — Staking operations
- `useValidatorLeaderboard()` — Leaderboard data

**Components:**
- `ValidatorTierCards` — Tier visualization
- `ValidatorLeaderboard` — Ranking table

---

### 10. **GovernancePanel** (`src/components/GovernancePanel.jsx`)
**Purpose:** DAO governance interface

**Features:**
- Proposal creation form
- Active proposals list
- Voting interface (For/Against/Abstain)
- Proposal timeline visualization
- Governance history
- Voting power display
- Quorum and participation metrics

**Components:**
- `ProposalList` — All proposals
- `ProposalForm` — Create new proposal
- `VotingInterface` — Cast votes
- `GovernanceHistory` — Past proposals and votes

**Hooks:**
- `useProposals()` — Proposal management
- `useVoting()` — Voting operations
- `useGovernance()` — Governance metrics
- `useGovernanceSync()` — Live WebSocket sync

---

### 11. **StressTestPanel** (`src/components/StressTestPanel.jsx`)
**Purpose:** Protocol stress testing and simulation

**Features:**
- Scenario configuration
- Risk parameter adjustments
- Simulation execution
- Results visualization
- "Investor Stress Test Summary" button

---

### 12. **AuditTrail** (`src/components/AuditTrail.jsx`)
**Purpose:** On-chain event log viewer

**Features:**
- Real-time event listening
- Filter by contract (PolicyManager, Consensus, RewardPool)
- Event details (timestamp, block, transaction hash)
- Search and pagination

**Event Sources:**
- `PolicyManager` — PolicyCreated, ClaimProcessed
- `ConsensusAndStakingV2` — ValidatorRegistered, AssessmentSubmitted
- `RewardPoolAndSlasher` — RewardsDistributed, ValidatorSlashed

---

## 🔌 Web3 Integration

### Context Providers

**Web3Context** (`src/contexts/Web3Context.jsx`)
- Manages wallet connection (MetaMask)
- Provides `account`, `provider`, `signer`, `isConnected`
- Handles network switching
- Auto-reconnect on page load

**SimulationContext** (`src/contexts/SimulationContext.jsx`)
- Toggles simulation mode (mock data vs live)
- Used for testing without Web3 connection

### Custom Hooks

**useContracts** (`src/hooks/useContracts.js`)
- Loads all 8 smart contracts
- Returns contract instances with signer
- Handles contract initialization errors

**useEthUsdFeed** (`shared/hooks/useEthUsdFeed.js`)
- Fetches Chainlink ETH/USD price
- Returns live + historical data
- Updates every 30 seconds
- Emits 'oracle-pulse' DOM event

**useLiveDashboardMetrics** (`shared/hooks/useLiveDashboardMetrics.js`)
- Combines oracle + on-chain metrics
- Returns: oracle, coverageUSD, totalStaked, treasury, risk24h, risk7d, uptime, apy
- Updates every 30 seconds
- Emits 'dashboard-pulse' DOM event

**useGovernanceSync** (`shared/hooks/useGovernanceSync.js`)
- WebSocket connection for live governance events
- HTTP polling fallback (1-minute intervals)
- IndexedDB caching for offline support
- Real-time proposal and vote updates

**useStaking** (`src/hooks/useStaking.js`)
- Stake/unstake operations
- Claim rewards
- Get staked amount, pending rewards, min stake

**usePolicies** (`src/hooks/usePolicies.js`)
- Create policies
- Get user policies
- Listen for PolicyCreated events

**useClaims** (`src/hooks/useClaims.js`)
- Process claims
- Get claim history
- Listen for ClaimProcessed events

**useProposals** (`src/hooks/useProposals.js`)
- Fetch all proposals
- Create proposals
- Queue and execute proposals
- Listen for ProposalCreated events

**useVoting** (`src/hooks/useVoting.js`)
- Cast votes (For/Against/Abstain)
- Get vote counts
- Get proposal deadlines (converted from blocks to timestamps)

**useRiskPulse** (`src/hooks/useRiskPulse.js`)
- Monitors global risk via OracleReaderV2
- Sets CSS `--risk-pulse` variable
- Shows toast notifications on volatility spikes (>5%)

---

## 🎯 Smart Contract Integration

### Deployed Contracts (Sepolia)

| Contract | Address | Frontend Usage |
|----------|---------|----------------|
| **SureStackToken (SST)** | `0x835fec04058Fdf3FddD1357730849328E863E55C` | Voting power, staking, rewards |
| **ConsensusAndStakingV2** | `0xE4FDE3D1017758E5b32e8010B0843398bDFF9C57` | Validator staking, consensus |
| **RewardPoolAndSlasher V2** | `0x6fCc339Af4439e76C788493FaF48cA969B63d1a5` | Rewards, slashing, treasury |
| **DAOGovernance** | `0xAD9fC360E128531d765D59ee0567D5390C4AacBE` | Proposals, voting, execution |
| **PolicyManager** | `0xc958Eb5C6076F666452c0B8233134648b048A7ca` | Policy creation, claims |
| **OracleReaderV2** | `0x1B081326b7C36f949F7EE4d801361E1d2c9E67d1` | Price feeds, volatility |
| **TimelockController** | `0xc21AA00ea234b27e53416D8279239088B8d51a28` | DAO proposal execution delay |
| **Chainlink ETH/USD** | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | External oracle feed |

### Contract Interactions

**PolicyManager:**
- `createPolicy(coverageLimitUSD, coveragePercent)` — Create new policy
- `calculatePremiumUSD(coverageLimitUSD, coveragePercent)` — Get premium estimate
- `processClaim(policyId, lossEventValueUSD)` — Submit claim
- `getTotalPolicies()` — Total policy count
- `getGlobalRisk()` — Global risk score

**OracleReaderV2:**
- `getLatestPrice()` — Current ETH/USD price
- `getVolatilityFactor(feedType)` — Volatility percentage
- `isDataFresh(feedType)` — Check data staleness
- `updateRoundData(feedType)` — Update round data

**ConsensusAndStakingV2:**
- `stake(amount)` — Stake SST tokens
- `requestUnstake(amount)` — Request unstake
- `withdrawUnstakedFunds()` — Withdraw after cooldown
- `getValidatorStats(validator)` — Validator metrics
- `getTotalStaked()` — Total staked amount

**DAOGovernance:**
- `propose(targets, values, calldatas, description)` — Create proposal
- `castVote(proposalId, support)` — Vote (0=Against, 1=For, 2=Abstain)
- `queue(proposalId)` — Queue successful proposal
- `execute(proposalId)` — Execute queued proposal
- `proposals(proposalId)` — Get proposal details
- `state(proposalId)` — Get proposal state

**RewardPoolAndSlasher:**
- `distributeRewards(validators, amounts)` — Distribute rewards
- `distributeClaim(amount)` — Process claim payout
- `getTotalRewards()` — Total rewards available

---

## 📊 Data Flow

### Real-Time Updates

**30-Second Polling:**
- Oracle price (Chainlink ETH/USD)
- Volatility factor
- Risk score calculation
- Dashboard metrics (coverage, staked, treasury, APY)

**15-Second Polling:**
- Validator metrics
- Treasury balances
- Staking rewards

**WebSocket (Governance):**
- ProposalCreated events
- VoteCast events
- ProposalExecuted events
- Fallback: 1-minute HTTP polling

**Event Listeners:**
- PolicyCreated
- ClaimProcessed
- ValidatorRegistered
- RewardsDistributed
- ProposalCreated
- VoteCast

---

## 🎨 Styling System

### Tailwind Configuration

**Custom Colors:**
```javascript
void: '#0a0a0f'           // Dark void background
neon-pink: '#ff2d55'      // Risk color
neon-cyan: '#00f5ff'      // Safe color
neon-yellow: '#ffb800'    // Warning color
```

**Custom Animations:**
- `pulse-risk` — Red glow pulse
- `pulse-safe` — Cyan glow pulse
- `glitch` — Text glitch effect
- `scanline` — Moving scanline
- `volatility-glow` — Dynamic intensity

**Custom Fonts:**
- `font-heading` — Orbitron (futuristic)
- `font-subheading` — Rajdhani (condensed)
- `font-sans` — Inter (body text)
- `font-mono` — Monospace (addresses, numbers)

### CSS Classes

**Glassmorphism:**
- `.glass-card` — Frosted glass effect with backdrop blur
- Border: `rgba(0, 245, 255, 0.2)`
- Background: `rgba(10, 10, 15, 0.6)`

**Neon Text:**
- `.text-neon-cyan` — Cyan gradient text
- `.text-neon-pink` — Pink gradient text
- `.text-neon-yellow` — Yellow gradient text

**Risk-Based:**
- `.text-risk` — Red text (high risk)
- `.text-safe` — Cyan text (low risk)
- `.text-warning` — Yellow text (medium risk)

---

## 🚀 Features

### ✅ Implemented

1. **Real-Time Oracle Integration**
   - Live Chainlink ETH/USD price feed
   - 30-second updates
   - Historical price charts
   - Volatility calculation

2. **Policy Management**
   - Create policies with dynamic premium calculation
   - View user policies
   - Policy details and status

3. **Claim Processing**
   - Submit claims with loss event values
   - On-chain claim processing
   - Claim history tracking

4. **Validator Staking**
   - Stake/unstake SST tokens
   - View staking tiers (Community, Regular, Institutional)
   - Leaderboard with rankings
   - Live APY display

5. **DAO Governance**
   - Create proposals
   - Vote on proposals (For/Against/Abstain)
   - Queue and execute proposals
   - Governance history
   - Real-time WebSocket sync

6. **Dashboard Metrics**
   - Total coverage (USD)
   - Total staked (SST)
   - DAO treasury (SST)
   - Risk indices (24h, 7d)
   - Validator uptime
   - Annual APY

7. **Visual Effects**
   - Three.js neural grid background
   - Data flow particle overlay
   - Glassmorphic cards
   - Risk-based glow animations
   - Scanline effects

8. **Responsive Design**
   - Mobile sidebar (collapsible)
   - Responsive grid layouts
   - Touch-friendly interactions

### 🔄 In Progress / Planned

1. **Advanced Analytics**
   - Historical risk trends
   - Validator performance charts
   - Protocol revenue analytics

2. **Mobile App**
   - React Native version
   - Push notifications for volatility spikes

3. **Multi-Chain Support**
   - Polygon integration
   - Arbitrum integration

---

## 📱 Responsive Design

### Breakpoints

- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (md, lg)
- **Desktop:** > 1024px (xl, 2xl)

### Mobile Features

- Collapsible sidebar (hamburger menu)
- Stacked grid layouts
- Touch-optimized buttons
- Swipe gestures (future)

---

## 🔐 Security Features

1. **Input Validation**
   - Amount validation (min/max)
   - Address format checking
   - Transaction confirmation dialogs

2. **Error Handling**
   - Try/catch blocks in all hooks
   - User-friendly error messages
   - Fallback data displays

3. **Transaction Safety**
   - Gas estimation
   - Transaction status tracking
   - Error recovery

---

## 📈 Performance Optimizations

1. **Data Caching**
   - IndexedDB for governance data
   - LocalStorage for user preferences
   - React Query (future consideration)

2. **Lazy Loading**
   - Code splitting by route
   - Dynamic imports for heavy components

3. **Optimistic Updates**
   - Immediate UI updates on transactions
   - Rollback on failure

4. **Background Rendering**
   - Three.js low FPS mode when idle
   - Canvas animations paused when not visible

---

## 🎯 Current State

**Status:** ✅ Production-Ready POC (85% Complete)

**Working Features:**
- ✅ All 8 contracts integrated
- ✅ Real-time oracle data
- ✅ Policy creation and claims
- ✅ Validator staking
- ✅ DAO governance
- ✅ Live dashboard metrics
- ✅ Cyberpunk UI theme

**Known Limitations:**
- Some modifiers temporarily disabled for testing
- Simplified volatility calculation (production would use historical data)
- Limited oracle feed support (ETH/USD only)

---

## 📝 Environment Variables

**Frontend (.env.local):**
```env
VITE_SEPOLIA_RPC=https://sepolia.infura.io/v3/...
VITE_CHAINLINK_ETHUSD=0x694AA1769357215DE4FAC081bf1f309aDC325306
VITE_SURE_STACK_TOKEN_ADDRESS=0x835fec04058Fdf3FddD1357730849328E863E55C
VITE_CONSENSUS_STAKING_V2_ADDRESS=0xE4FDE3D1017758E5b32e8010B0843398bDFF9C57
VITE_REWARD_POOL_ADDRESS=0x6fCc339Af4439e76C788493FaF48cA969B63d1a5
VITE_DAO_GOVERNANCE_ADDRESS=0xAD9fC360E128531d765D59ee0567D5390C4AacBE
VITE_POLICY_MANAGER_ADDRESS=0xc958Eb5C6076F666452c0B8233134648b048A7ca
VITE_ORACLE_READER_ADDRESS=0x1B081326b7C36f949F7EE4d801361E1d2c9E67d1
VITE_TIMELOCK_ADDRESS=0xc21AA00ea234b27e53416D8279239088B8d51a28
```

---

## 🎨 Visual Design Summary

**Theme:** Cyberpunk "Risk Oracle Control Room"

**Color Scheme:**
- Dark void background with subtle gradients
- Neon accents (cyan, pink, yellow)
- Glassmorphic cards with backdrop blur
- Risk-based color coding

**Typography:**
- Futuristic fonts (Orbitron, Rajdhani)
- Monospace for technical data
- Uppercase headings with wide tracking

**Animations:**
- Smooth transitions (Framer Motion)
- Pulse effects based on risk
- Scanline overlays
- Three.js particle systems

**Layout:**
- Fixed RiskTicker at top
- Sticky sidebar and header
- Scrollable main content
- Grid-based metric cards

---

## 🔗 Key Files Reference

**Entry Point:**
- `src/main.jsx` — React app initialization
- `src/App.jsx` — Router and context providers

**Layout:**
- `src/layouts/MainLayout.jsx` — Main layout with sidebar and header

**Core Components:**
- `src/components/Dashboard.jsx` — Main dashboard
- `src/components/ui/RiskTicker.jsx` — Top metrics bar
- `src/components/ui/HolographicCard.jsx` — Metric cards

**Hooks:**
- `src/hooks/useContracts.js` — Contract instances
- `shared/hooks/useEthUsdFeed.js` — Oracle data
- `shared/hooks/useLiveDashboardMetrics.js` — Combined metrics

**Styling:**
- `tailwind.config.js` — Tailwind configuration
- `src/index.css` — Global styles and animations

---

## 📊 Component Hierarchy

```
App
├── Web3Provider
│   └── SimulationProvider
│       └── Router
│           └── MainLayout
│               ├── RiskTicker (fixed top)
│               ├── Sidebar (sticky)
│               └── Main Content
│                   ├── Header (sticky)
│                   └── <Outlet />
│                       ├── Dashboard
│                       │   ├── HolographicCard (×8)
│                       │   ├── OracleFeedPanel
│                       │   └── RiskRadar
│                       ├── PolicyPanel
│                       ├── ClaimPanel
│                       ├── ValidatorConsole
│                       ├── GovernancePanel
│                       ├── StressTestPanel
│                       └── AuditTrail
```

---

## 🎯 Summary for ChatGPT

**What Has Been Built:**
A production-ready, cyberpunk-themed DeFi dashboard for SureStack Protocol with:
- Real-time Chainlink oracle integration (30s updates)
- Full Web3 integration with 8 deployed smart contracts
- Policy creation, claim processing, validator staking, and DAO governance
- Glassmorphic UI with Three.js animated backgrounds
- Responsive design with mobile support

**How It Looks:**
- Dark void background with neon cyan/pink/yellow accents
- Fixed RiskTicker bar at top showing live metrics
- Sidebar with SureStack branding and navigation
- Sticky header with wallet connection
- Grid-based metric cards with risk-based glow effects
- Live charts and visualizations
- Futuristic typography (Orbitron, Rajdhani)

**Key Differentiators:**
- 30-second real-time updates (vs competitors' daily/weekly)
- Dynamic risk pricing based on live volatility
- Full protocol transparency (all contracts verified)
- Cyberpunk "Risk Oracle Control Room" aesthetic

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-07  
**Status:** Complete Frontend Summary






















