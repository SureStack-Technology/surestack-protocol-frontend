# ⚠️ Archived file — may contain outdated contract addresses or architecture.

# SureStack Protocol — Metrics Integration Plan

**Generated:** 2025-01-XX  
**Version:** 1.0.0  
**Status:** Design Phase

---

## 📋 Executive Summary

This document outlines a comprehensive plan to replace simulated dashboard metrics with live contract data in the SureStack Protocol. The plan focuses on integrating real blockchain data for coverage, staking, treasury, risk indices, and APY calculations while maintaining optimal performance through caching and intelligent polling strategies.

**Key Objectives:**
- ✅ Replace all simulated data with live contract calls
- ✅ Implement Chainlink volatility-based risk index calculation
- ✅ Calculate APY from RewardPool reward distribution
- ✅ Fetch total coverage, staked amounts, and DAO treasury
- ✅ Optimize performance with IndexedDB caching and smart polling

**Estimated Implementation Time:** 2-3 weeks  
**Priority:** High (Critical for production readiness)

---

## 🎯 Current State Analysis

### Existing Simulated Metrics

| Metric | Current Source | Status | Location |
|--------|--------------|--------|----------|
| **Total Coverage USD** | Placeholder: `12546975.13` | ⚠️ Simulated | `useLiveDashboardMetrics.js:49` |
| **Total Staked** | Placeholder: `70000.0` | ⚠️ Simulated | `useLiveDashboardMetrics.js:48` |
| **DAO Treasury** | Placeholder: `110000.0` | ⚠️ Simulated | `useLiveDashboardMetrics.js:47` |
| **Risk Index (24h)** | Random: `72.8 + Math.random() * 0.2` | ⚠️ Simulated | `useLiveDashboardMetrics.js:50` |
| **Risk Index (7d)** | Random: `74.1 + Math.random() * 0.4` | ⚠️ Simulated | `useLiveDashboardMetrics.js:51` |
| **Validator Uptime** | Random: `99.90 + Math.random() * 0.1` | ⚠️ Simulated | `useLiveDashboardMetrics.js:52` |
| **APY** | Random: `480 + Math.random() * 15` | ⚠️ Simulated | `useLiveDashboardMetrics.js:53` |

### Contract Function Availability

| Function | Contract | Exists? | Alternative Approach |
|----------|----------|---------|---------------------|
| `totalCoverageUSD()` | PolicyManager | ❌ No | Calculate by iterating policies |
| `totalStaked()` | ConsensusAndStakingV2 | ❌ No | Calculate by iterating validators |
| `balanceOf(daoAddress)` | SureStackToken | ✅ Yes | Direct call |
| `rewardRate()` | RewardPoolAndSlasher | ❌ No | Calculate from reward distribution |
| `validatorUptime()` | ConsensusAndStakingV2 | ❌ No | Calculate from round history |

---

## 🏗️ Architecture Design

### 1. Metrics Service Layer

**New Component:** `shared/services/metricsService.js`

**Purpose:** Centralized service for fetching and caching all dashboard metrics.

**Responsibilities:**
- Fetch metrics from contracts
- Cache results in IndexedDB
- Handle errors gracefully
- Provide fallback data when contracts unavailable

**Structure:**
```
shared/services/
├── metricsService.js          # Main metrics service
├── coverageCalculator.js       # Coverage aggregation logic
├── stakingCalculator.js       # Staking aggregation logic
├── riskIndexCalculator.js     # Risk index calculation
├── apyCalculator.js            # APY calculation
└── validatorUptimeCalculator.js # Uptime calculation
```

### 2. Enhanced Hook Architecture

**Updated Hook:** `shared/hooks/useLiveDashboardMetrics.js`

**Changes:**
- Remove all placeholder data
- Integrate `metricsService.js`
- Add IndexedDB caching layer
- Implement smart polling (30s for fast metrics, 5m for slow metrics)
- Add error handling with graceful degradation

**New Hooks:**
- `shared/hooks/useCoverageMetrics.js` - Coverage-specific metrics
- `shared/hooks/useStakingMetrics.js` - Staking-specific metrics
- `shared/hooks/useRiskMetrics.js` - Risk index calculations
- `shared/hooks/useAPYMetrics.js` - APY calculations

### 3. Caching Strategy

**Storage:** IndexedDB (using existing `shared/utils/idb.js`)

**Cache Keys:**
- `metrics:coverage` - Total coverage USD (TTL: 5 minutes)
- `metrics:staked` - Total staked (TTL: 5 minutes)
- `metrics:treasury` - DAO treasury (TTL: 5 minutes)
- `metrics:risk24h` - 24h risk index (TTL: 1 hour)
- `metrics:risk7d` - 7d risk index (TTL: 1 hour)
- `metrics:apy` - APY calculation (TTL: 1 hour)
- `metrics:uptime` - Validator uptime (TTL: 5 minutes)

**Cache Invalidation:**
- Event-driven: Invalidate on `PolicyCreated`, `Staked`, `Unstaked`, `RewardDistributed`
- Time-based: TTL expiration
- Manual: User-triggered refresh

---

## 📊 Implementation Plan

### Phase 1: Contract Data Fetching (Week 1)

#### 1.1 Total Coverage USD Calculation

**Approach:** Iterate through all policies and sum `coverageLimitUSD`

**Implementation:**
1. **Check if `policyCounter` exists in PolicyManager**
   - If yes: Use `getTotalPolicies()` to get count
   - If no: Query `PolicyCreated` events to estimate count

2. **Fetch Policies:**
   - Option A: Iterate `policyCounter` (1 to N) and call `getPolicy(i)`
   - Option B: Query `PolicyCreated` events and fetch active policies
   - **Recommendation:** Use Option A for accuracy, Option B for performance

3. **Calculate Total:**
   ```javascript
   let totalCoverage = 0
   for (let i = 1; i <= policyCount; i++) {
     const policy = await policyManager.getPolicy(i)
     if (policy.active) {
       totalCoverage += Number(policy.coverageLimitUSD) / 1e8 // Convert from 1e8 to USD
     }
   }
   ```

4. **Optimization:**
   - Cache result in IndexedDB (5 min TTL)
   - Only recalculate on `PolicyCreated` or `ClaimProcessed` events
   - Use batch fetching (fetch 10 policies at a time)

**Files to Create/Modify:**
- `shared/services/coverageCalculator.js` (new)
- `shared/hooks/useCoverageMetrics.js` (new)
- `shared/hooks/useLiveDashboardMetrics.js` (modify)

**Estimated Time:** 2-3 days

#### 1.2 Total Staked Calculation

**Approach:** Iterate through all validators and sum `stakedAmount`

**Implementation:**
1. **Get Validator Count:**
   - Use `validatorCount()` if available
   - If not: Query `ValidatorStaked` events

2. **Fetch Validators:**
   - Option A: Iterate `validatorCount` and call `validators(i)`
   - Option B: Query `ValidatorStaked` events and fetch profiles
   - **Recommendation:** Use Option B (already implemented in `useValidatorSync`)

3. **Calculate Total:**
   ```javascript
   let totalStaked = 0
   for (const validator of validators) {
     totalStaked += Number(ethers.formatUnits(validator.stakedAmount, 18))
   }
   ```

4. **Optimization:**
   - Reuse `useValidatorSync()` hook data
   - Cache result in IndexedDB (5 min TTL)
   - Update on `ValidatorStaked` or `ValidatorUnstaked` events

**Files to Create/Modify:**
- `shared/services/stakingCalculator.js` (new)
- `shared/hooks/useStakingMetrics.js` (new)
- `shared/hooks/useLiveDashboardMetrics.js` (modify)
- `shared/hooks/useValidatorSync.js` (enhance to expose total staked)

**Estimated Time:** 1-2 days

#### 1.3 DAO Treasury Balance

**Approach:** Direct contract call to `SureStackToken.balanceOf(daoAddress)`

**Implementation:**
1. **Get DAO Address:**
   - From `CONTRACT_ADDRESSES.DAO_GOVERNANCE`
   - Or from `VITE_DAO_GOVERNANCE_ADDRESS` env var

2. **Fetch Balance:**
   ```javascript
   const daoAddress = CONTRACT_ADDRESSES.DAO_GOVERNANCE
   const balance = await sureStackToken.balanceOf(daoAddress)
   const treasury = Number(ethers.formatUnits(balance, 18))
   ```

3. **Optimization:**
   - Cache result in IndexedDB (5 min TTL)
   - Update on governance events (proposals, executions)

**Files to Create/Modify:**
- `shared/services/metricsService.js` (add treasury function)
- `shared/hooks/useLiveDashboardMetrics.js` (modify)

**Estimated Time:** 0.5 days

---

### Phase 2: Risk Index Calculation (Week 1-2)

#### 2.1 Chainlink Volatility Analysis

**Approach:** Calculate standard deviation of Chainlink price changes over 24h and 7d periods

**Implementation:**
1. **Fetch Historical Prices:**
   - Use existing `useChainlinkOracle()` hook
   - Query Chainlink rounds for last 24h and 7d
   - Store in IndexedDB for quick access

2. **Calculate Volatility:**
   ```javascript
   // For 24h risk index
   const prices24h = await getChainlinkPrices(24 * 60 * 60) // Last 24 hours
   const returns24h = calculateReturns(prices24h) // Price changes
   const volatility24h = calculateStandardDeviation(returns24h)
   const riskIndex24h = normalizeToRiskScore(volatility24h) // Scale 0-100
   
   // For 7d risk index
   const prices7d = await getChainlinkPrices(7 * 24 * 60 * 60) // Last 7 days
   const returns7d = calculateReturns(prices7d)
   const volatility7d = calculateStandardDeviation(returns7d)
   const riskIndex7d = normalizeToRiskScore(volatility7d)
   ```

3. **Risk Score Normalization:**
   - Map volatility (0-∞) to risk score (0-100)
   - Use historical volatility percentiles
   - Formula: `riskScore = min(100, (volatility / maxVolatility) * 100)`

4. **Optimization:**
   - Cache historical prices in IndexedDB
   - Calculate risk index every hour (not every 30s)
   - Use sliding window for efficient updates

**Files to Create/Modify:**
- `shared/services/riskIndexCalculator.js` (new)
- `shared/hooks/useRiskMetrics.js` (new)
- `shared/hooks/useChainlinkOracle.js` (enhance to support historical queries)
- `shared/hooks/useLiveDashboardMetrics.js` (modify)

**Estimated Time:** 3-4 days

---

### Phase 3: APY Calculation (Week 2)

#### 3.1 Reward Rate Analysis

**Approach:** Calculate APY from RewardPool reward distribution history

**Implementation:**
1. **Fetch Reward Distribution Data:**
   - Query `RewardDistributed` events from RewardPool
   - Calculate total rewards distributed over last 30 days
   - Get total staked amount

2. **Calculate APY:**
   ```javascript
   // Get rewards distributed in last 30 days
   const rewards30d = await getRewardsDistributed(30 * 24 * 60 * 60)
   const totalRewards = rewards30d.reduce((sum, r) => sum + r.amount, 0)
   
   // Get total staked
   const totalStaked = await getTotalStaked()
   
   // Calculate APY
   const dailyRewardRate = totalRewards / totalStaked / 30
   const apy = (dailyRewardRate * 365) * 100 // Convert to percentage
   ```

3. **Alternative Approach (if rewardRate exists):**
   - If RewardPool has `rewardRate()` function, use it directly
   - Calculate: `apy = (rewardRate * 365 * 100) / totalStaked`

4. **Optimization:**
   - Cache APY calculation (1 hour TTL)
   - Update on `RewardDistributed` events
   - Use exponential moving average for smoothing

**Files to Create/Modify:**
- `shared/services/apyCalculator.js` (new)
- `shared/hooks/useAPYMetrics.js` (new)
- `shared/hooks/useLiveDashboardMetrics.js` (modify)

**Estimated Time:** 2-3 days

---

### Phase 4: Validator Uptime Calculation (Week 2)

#### 4.1 Validator Performance Analysis

**Approach:** Calculate uptime from validator participation in consensus rounds

**Implementation:**
1. **Fetch Round History:**
   - Query `RoundSettled` events from ConsensusAndStakingV2
   - Get last 30 rounds (or last 7 days, whichever is more)

2. **Calculate Participation:**
   ```javascript
   // For each validator
   const rounds = await getRecentRounds(30)
   let participated = 0
   let totalRounds = rounds.length
   
   for (const round of rounds) {
     const submission = round.submissions.find(s => s.validatorAddress === validatorAddress)
     if (submission) participated++
   }
   
   const uptime = (participated / totalRounds) * 100
   ```

3. **Network-Wide Uptime:**
   - Calculate average uptime across all validators
   - Weight by staked amount (more staked = more weight)

4. **Optimization:**
   - Cache uptime calculation (5 min TTL)
   - Update on `RoundSettled` events
   - Use sliding window for efficient updates

**Files to Create/Modify:**
- `shared/services/validatorUptimeCalculator.js` (new)
- `shared/hooks/useLiveDashboardMetrics.js` (modify)
- `shared/hooks/useValidatorSync.js` (enhance to include uptime)

**Estimated Time:** 2-3 days

---

### Phase 5: Performance Optimization (Week 2-3)

#### 5.1 IndexedDB Caching Layer

**Implementation:**
1. **Extend Existing `idb.js`:**
   - Add TTL support for cache entries
   - Add cache invalidation functions
   - Add batch read/write operations

2. **Cache Structure:**
   ```javascript
   {
     key: 'metrics:coverage',
     value: { coverageUSD: 12546975.13, timestamp: 1234567890 },
     ttl: 300000, // 5 minutes in milliseconds
     expiresAt: 1234568190
   }
   ```

3. **Cache Invalidation:**
   - Event listeners for contract events
   - Manual refresh button
   - TTL expiration

**Files to Create/Modify:**
- `shared/utils/idb.js` (enhance with TTL support)
- `shared/services/metricsService.js` (add caching layer)

**Estimated Time:** 1-2 days

#### 5.2 Smart Polling Strategy

**Implementation:**
1. **Polling Intervals:**
   - Fast metrics (coverage, staked, treasury): 30 seconds
   - Medium metrics (risk index): 5 minutes
   - Slow metrics (APY, uptime): 15 minutes

2. **Event-Driven Updates:**
   - Listen to contract events
   - Update metrics immediately on relevant events
   - Reduce polling frequency when events are active

3. **Backoff Strategy:**
   - If RPC fails, back off exponentially
   - Use cached data during failures
   - Retry with increasing intervals

**Files to Create/Modify:**
- `shared/hooks/useLiveDashboardMetrics.js` (implement smart polling)
- `shared/services/metricsService.js` (add event listeners)

**Estimated Time:** 2-3 days

---

## 🔧 Technical Implementation Details

### 1. Metrics Service API

**File:** `shared/services/metricsService.js`

**Exported Functions:**
```javascript
// Coverage metrics
export async function getTotalCoverageUSD(policyManager, provider) {
  // Returns: { coverageUSD: number, timestamp: number, cached: boolean }
}

// Staking metrics
export async function getTotalStaked(consensusStaking, provider) {
  // Returns: { totalStaked: number, activeValidators: number, timestamp: number, cached: boolean }
}

// Treasury metrics
export async function getDAOTreasury(sureStackToken, daoAddress, provider) {
  // Returns: { treasury: number, timestamp: number, cached: boolean }
}

// Risk metrics
export async function getRiskIndices(chainlinkOracle, provider) {
  // Returns: { risk24h: number, risk7d: number, timestamp: number, cached: boolean }
}

// APY metrics
export async function getAPY(rewardPool, consensusStaking, provider) {
  // Returns: { apy: number, timestamp: number, cached: boolean }
}

// Validator uptime
export async function getValidatorUptime(consensusStaking, provider) {
  // Returns: { uptime: number, timestamp: number, cached: boolean }
}

// Combined metrics (for dashboard)
export async function getAllMetrics(contracts, provider) {
  // Returns: { coverageUSD, totalStaked, treasury, risk24h, risk7d, apy, uptime, timestamp }
}
```

### 2. Enhanced Hook API

**File:** `shared/hooks/useLiveDashboardMetrics.js`

**Updated Return Value:**
```javascript
{
  // Oracle data (existing)
  oracle: { price, updatedAt, roundId, decimals },
  oracleError: string | null,
  priceHistory: Array<{ time: string, price: number }>,
  
  // Live metrics (new)
  coverageUSD: number,
  totalStaked: number,
  treasury: number,
  risk24h: number,
  risk7d: number,
  uptime: number,
  apy: number,
  
  // Metadata
  loading: boolean,
  error: string | null,
  lastUpdated: number,
  cached: boolean,
  
  // Actions
  refresh: () => Promise<void>,
  clearCache: () => Promise<void>
}
```

### 3. Error Handling Strategy

**Graceful Degradation:**
1. **RPC Failure:**
   - Use cached data if available
   - Show warning indicator
   - Retry with exponential backoff

2. **Contract Call Failure:**
   - Fall back to last known value
   - Show error message
   - Allow manual refresh

3. **Missing Contract Address:**
   - Show placeholder with "Not configured" message
   - Disable refresh button
   - Log warning to console

**Error States:**
```javascript
{
  error: null | {
    type: 'RPC_ERROR' | 'CONTRACT_ERROR' | 'CACHE_ERROR',
    message: string,
    timestamp: number,
    retryable: boolean
  }
}
```

---

## 📈 Performance Considerations

### 1. Contract Call Optimization

**Batch Fetching:**
- Fetch multiple policies/validators in parallel
- Use `Promise.all()` for concurrent calls
- Limit batch size to avoid RPC rate limits

**Caching Strategy:**
- Cache individual policy/validator data
- Cache aggregated results
- Invalidate cache on events

**Estimated Call Counts:**
- **Total Coverage:** ~N policy calls (where N = policy count)
- **Total Staked:** ~M validator calls (where M = validator count)
- **Treasury:** 1 call
- **Risk Index:** ~60 Chainlink round calls (for 24h)
- **APY:** ~30 event queries (for 30 days)
- **Uptime:** ~30 round queries (for 30 rounds)

### 2. IndexedDB Storage Limits

**Storage Requirements:**
- Coverage data: ~1KB per policy
- Staking data: ~1KB per validator
- Risk index: ~10KB (60 price points)
- APY: ~5KB (30 days of rewards)
- **Total:** ~100KB for 100 policies + 50 validators

**Optimization:**
- Compress historical data
- Remove old data (>30 days)
- Use efficient serialization

### 3. Polling Frequency

**Recommended Intervals:**
- **Fast Metrics (30s):** Coverage, Staked, Treasury
- **Medium Metrics (5m):** Risk Index
- **Slow Metrics (15m):** APY, Uptime

**Event-Driven Updates:**
- Update immediately on `PolicyCreated`, `Staked`, `Unstaked`
- Update on `RewardDistributed`, `RoundSettled`
- Reduce polling when events are active

---

## 🧪 Testing Strategy

### 1. Unit Tests

**Files to Test:**
- `shared/services/coverageCalculator.js`
- `shared/services/stakingCalculator.js`
- `shared/services/riskIndexCalculator.js`
- `shared/services/apyCalculator.js`
- `shared/services/validatorUptimeCalculator.js`

**Test Cases:**
- Empty data (no policies, no validators)
- Single item (1 policy, 1 validator)
- Multiple items (100+ policies, 50+ validators)
- Error handling (RPC failure, contract error)
- Cache hit/miss scenarios

### 2. Integration Tests

**Test Scenarios:**
- Full metrics fetch with all contracts
- Partial metrics fetch (some contracts unavailable)
- Cache invalidation on events
- Polling behavior with events
- Error recovery

### 3. Performance Tests

**Metrics:**
- Time to fetch all metrics (target: <5 seconds)
- Cache hit rate (target: >80%)
- RPC call count (target: minimize)
- IndexedDB read/write performance

---

## 📝 Implementation Checklist

### Phase 1: Contract Data Fetching
- [ ] Create `shared/services/coverageCalculator.js`
- [ ] Create `shared/services/stakingCalculator.js`
- [ ] Create `shared/services/metricsService.js`
- [ ] Implement `getTotalCoverageUSD()`
- [ ] Implement `getTotalStaked()`
- [ ] Implement `getDAOTreasury()`
- [ ] Update `useLiveDashboardMetrics.js` to use new services
- [ ] Add IndexedDB caching for coverage, staked, treasury
- [ ] Add error handling and fallback data
- [ ] Write unit tests

### Phase 2: Risk Index Calculation
- [ ] Create `shared/services/riskIndexCalculator.js`
- [ ] Enhance `useChainlinkOracle.js` for historical queries
- [ ] Implement volatility calculation
- [ ] Implement risk score normalization
- [ ] Add IndexedDB caching for risk indices
- [ ] Update `useLiveDashboardMetrics.js`
- [ ] Write unit tests

### Phase 3: APY Calculation
- [ ] Create `shared/services/apyCalculator.js`
- [ ] Implement reward distribution querying
- [ ] Implement APY calculation
- [ ] Add IndexedDB caching for APY
- [ ] Update `useLiveDashboardMetrics.js`
- [ ] Write unit tests

### Phase 4: Validator Uptime
- [ ] Create `shared/services/validatorUptimeCalculator.js`
- [ ] Implement round history querying
- [ ] Implement uptime calculation
- [ ] Add IndexedDB caching for uptime
- [ ] Update `useLiveDashboardMetrics.js`
- [ ] Write unit tests

### Phase 5: Performance Optimization
- [ ] Enhance `shared/utils/idb.js` with TTL support
- [ ] Implement smart polling strategy
- [ ] Add event-driven cache invalidation
- [ ] Implement exponential backoff
- [ ] Add performance monitoring
- [ ] Write integration tests

### Phase 6: UI Updates
- [ ] Update `Dashboard.jsx` to show loading states
- [ ] Update `BusinessDashboard.jsx` to show loading states
- [ ] Add error indicators for failed metrics
- [ ] Add cache status indicators
- [ ] Add manual refresh button
- [ ] Update tooltips with data source info

---

## 🚀 Deployment Plan

### Pre-Deployment
1. **Code Review:**
   - Review all new services and hooks
   - Verify error handling
   - Check performance optimizations

2. **Testing:**
   - Run all unit tests
   - Run integration tests
   - Perform manual testing on Sepolia

3. **Documentation:**
   - Update API documentation
   - Add JSDoc comments
   - Update README with new metrics

### Deployment
1. **Staging:**
   - Deploy to staging environment
   - Monitor metrics fetching
   - Check cache performance
   - Verify error handling

2. **Production:**
   - Deploy to production
   - Monitor RPC call counts
   - Monitor cache hit rates
   - Monitor error rates

### Post-Deployment
1. **Monitoring:**
   - Track metrics fetch times
   - Track cache hit rates
   - Track error rates
   - Track RPC call counts

2. **Optimization:**
   - Adjust polling intervals based on usage
   - Optimize cache TTLs
   - Reduce RPC calls if needed

---

## 📊 Success Metrics

### Performance Targets
- **Metrics Fetch Time:** <5 seconds for all metrics
- **Cache Hit Rate:** >80% for frequently accessed metrics
- **RPC Call Count:** <100 calls per minute
- **Error Rate:** <1% of metric fetches

### Accuracy Targets
- **Coverage USD:** 100% accurate (from contract data)
- **Total Staked:** 100% accurate (from contract data)
- **Treasury:** 100% accurate (from contract data)
- **Risk Index:** ±5% accuracy (based on volatility calculation)
- **APY:** ±10% accuracy (based on reward distribution)
- **Uptime:** ±2% accuracy (based on round participation)

---

## 🔄 Future Enhancements

### Phase 7: Advanced Features (Post-MVP)
1. **Real-Time Updates:**
   - WebSocket integration for instant updates
   - Event streaming for metrics changes

2. **Advanced Analytics:**
   - Historical trends
   - Predictive analytics
   - Risk forecasting

3. **Optimization:**
   - GraphQL API for efficient data fetching
   - Backend aggregation service
   - CDN caching for static metrics

---

## 📚 Appendix

### A. Contract Function Reference

**PolicyManager:**
- `getPolicy(uint256)` - Get policy details
- `getTotalPolicies()` - Get total policy count
- `policyCounter` - Current policy counter

**ConsensusAndStakingV2:**
- `validators(uint256)` - Get validator by index
- `validatorCount()` - Get total validator count (if exists)
- `validatorProfiles(address)` - Get validator profile
- `roundHistory(uint256)` - Get round history

**SureStackToken:**
- `balanceOf(address)` - Get token balance

**RewardPoolAndSlasher:**
- `rewardPoolBalance` - Current reward pool balance
- `penaltyPoolBalance` - Current penalty pool balance

**Chainlink AggregatorV3Interface:**
- `latestRoundData()` - Get latest price
- `getRoundData(uint80)` - Get historical price

### B. Event Reference

**PolicyManager Events:**
- `PolicyCreated` - New policy created
- `ClaimProcessed` - Claim processed

**ConsensusAndStakingV2 Events:**
- `ValidatorStaked` - Validator staked
- `ValidatorUnstaked` - Validator unstaked
- `RewardDistributed` - Reward distributed
- `RoundSettled` - Round settled

**RewardPoolAndSlasher Events:**
- `RewardDistributed` - Reward distributed
- `ClaimDistributed` - Claim distributed

### C. Environment Variables

**Required:**
- `VITE_SEPOLIA_RPC` - RPC endpoint
- `VITE_POLICY_MANAGER_ADDRESS` - PolicyManager address
- `VITE_CONSENSUS_STAKING_V2_ADDRESS` - ConsensusAndStakingV2 address
- `VITE_REWARD_POOL_ADDRESS` - RewardPoolAndSlasher address
- `VITE_DAO_GOVERNANCE_ADDRESS` - DAO Governance address
- `VITE_SURE_STACK_TOKEN_ADDRESS` - SureStackToken address
- `VITE_CHAINLINK_ETHUSD` - Chainlink ETH/USD address

---

**Plan Generated:** 2025-01-XX  
**Version:** 1.0.0  
**Status:** Ready for Implementation


