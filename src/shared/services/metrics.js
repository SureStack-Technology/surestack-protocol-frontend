import { ethers } from 'ethers'
import { ADDR } from '../constants/addresses'
import { getResilientProvider } from '../utils/resilientProvider'
import PolicyManagerABI from '../abi/PolicyManager.json'
import ConsensusStakingV2ABI from '../abi/ConsensusAndStaking.json'
import RewardPoolABI from '../abi/RewardPool.json'
import SureStackTokenABI from '../abi/SureStackToken.json'
import aggregatorAbi from '../abi/AggregatorV3Interface.json'
import { getHybridProvider } from '@/shared/rpc/providerManager'

/**
 * Get resilient provider instance with automatic fallback
 */
function getProvider() {
  try {
    return getResilientProvider()
  } catch (err) {
    console.error('[getProvider] Error creating resilient provider:', err)
    return getHybridProvider()
  }
}

/**
 * Fetch total coverage USD from PolicyManager
 * Expects a canonical function; if missing, gracefully returns 0
 * Uses cached fallback to avoid showing $0 if network is flaky
 */
export async function fetchCoverageUSD() {
  const cacheKey = "coverageUSD:last"
  
  async function computeIterative() {
    try {
      const provider = getProvider()
      const policyManagerAddress = ADDR.POLICY_MANAGER
      if (!policyManagerAddress || policyManagerAddress === '0x0000000000000000000000000000000000000000') {
        console.warn('[fetchCoverageUSD] PolicyManager address not configured')
        return 0
      }

      const contract = new ethers.Contract(
        policyManagerAddress,
        PolicyManagerABI.abi || PolicyManagerABI,
        provider
      )

      // Try the modern single-call methods first
      try {
        if (contract.totalCoverageUSD) {
          const v = await contract.totalCoverageUSD()
          const n = Number(ethers.formatUnits(v, 8))
          if (!Number.isNaN(n) && n >= 0) {
            localStorage.setItem(cacheKey, String(n))
            return n
          }
        }
      } catch (e) {
        console.warn('[fetchCoverageUSD] totalCoverageUSD failed:', e.message)
      }

      try {
        if (contract.getCoverageAggregateUSD) {
          const v = await contract.getCoverageAggregateUSD()
          const n = Number(ethers.formatUnits(v, 8))
          if (!Number.isNaN(n) && n >= 0) {
            localStorage.setItem(cacheKey, String(n))
            return n
          }
        }
      } catch (e) {
        console.warn('[fetchCoverageUSD] getCoverageAggregateUSD failed:', e.message)
      }

      // Last resort: iterate policies (only if policyCounter exists)
      if ("policyCounter" in contract || "getTotalPolicies" in contract) {
        try {
          let policyCount = 0
          if ("policyCounter" in contract) {
            policyCount = Number(await contract.policyCounter() ?? 0)
          } else {
            policyCount = Number(await contract.getTotalPolicies() ?? 0)
          }

          if (policyCount === 0) {
            localStorage.setItem(cacheKey, "0")
            return 0
          }

          let totalCoverage = 0
          const batchSize = 10
          for (let i = 1; i <= policyCount; i += batchSize) {
            const promises = []
            for (let j = i; j < Math.min(i + batchSize, policyCount + 1); j++) {
              promises.push(contract.getPolicy(j).catch(() => null))
            }
            const policies = await Promise.all(promises)
            for (const policy of policies) {
              if (policy && policy.active) {
                totalCoverage += Number(ethers.formatUnits(policy.coverageLimitUSD, 8))
              }
            }
          }
          localStorage.setItem(cacheKey, String(totalCoverage))
          return totalCoverage
        } catch (e) {
          console.warn('[fetchCoverageUSD] Policy iteration failed:', e.message)
        }
      }

      console.warn('[fetchCoverageUSD] No coverage methods available, returning 0')
      return 0
    } catch (e) {
      console.warn("[Coverage][Diag] Iterative error:", e)
      return 0
    }
  }

  // Cached fallback to avoid flashing $0 if network is flaky
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      console.info("[Coverage][Diag] Using cached:", cached)
      // Continue to compute fresh in background but return cached immediately
      computeIterative().then(v => {
        if (typeof v === "number") localStorage.setItem(cacheKey, String(v))
      }).catch(() => {})
      return Number(cached)
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // If no cache, compute iteratively
  return await computeIterative()
}

// 🧠 Persist metrics to localStorage
export function cacheMetrics(key, value) {
  try { 
    localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() })); 
  } catch {}
}

export function loadCachedMetric(key, maxAgeMs = 300000) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Date.now() - parsed.ts < maxAgeMs) return parsed.value;
  } catch {}
  return null;
}

/**
 * Fetch total staked from ConsensusAndStakingV2
 * Iterates through all validators and sums staked amounts
 */
export async function fetchTotalStaked() {
  try {
    const provider = getProvider()
    const stakingAddress = ADDR.STAKING
    if (!stakingAddress || stakingAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('[fetchTotalStaked] ConsensusAndStakingV2 address not configured')
      return 0
    }

    const contract = new ethers.Contract(
      stakingAddress,
      ConsensusStakingV2ABI.abi || ConsensusStakingV2ABI,
      provider
    )

    let validatorAddresses = []
    try {
      const list = await contract.getValidatorList?.()
      if (Array.isArray(list)) {
        validatorAddresses = list.map((addr) => String(addr))
      }
    } catch (e) {
      console.warn('[fetchTotalStaked] getValidatorList unavailable:', e.message)
    }

    if (!validatorAddresses.length) {
      console.warn('[fetchTotalStaked] No validators discovered via registry')
      return 0
    }

    const profiles = await Promise.all(
      validatorAddresses.map((address) =>
        contract.getValidatorProfile(address).catch(() => null)
      )
    )

    const totalStaked = profiles.reduce((sum, profile) => {
      if (!profile || !profile.stakedAmount) return sum
      try {
        return sum + Number(ethers.formatUnits(profile.stakedAmount, 18))
      } catch {
        return sum
      }
    }, 0)

    return totalStaked
  } catch (e) {
    console.error('[fetchTotalStaked] Error:', e)
    return 0
  }
}

/**
 * Fetch DAO treasury balance from SureStackToken
 * Uses ERC-20 balanceOf with checksum address
 */
export async function fetchDaoTreasurySST() {
  try {
    const provider = getProvider()
    const tokenAddress = ADDR.SST
    const daoAddress = ADDR.DAO

    if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('[fetchDaoTreasurySST] SureStackToken address not configured')
      return 0
    }

    if (!daoAddress || daoAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('[fetchDaoTreasurySST] DAO address not configured')
      return 0
    }

    const contract = new ethers.Contract(
      tokenAddress,
      SureStackTokenABI.abi || SureStackTokenABI,
      provider
    )

    const balance = await contract.balanceOf(daoAddress)
    return Number(ethers.formatUnits(balance ?? 0n, 18))
  } catch (e) {
    console.warn('[fetchDaoTreasurySST] fallback 0', e)
    return 0
  }
}

/**
 * Fetch APY from RewardPool reward distribution
 * Calculates APY based on reward rate and total staked with Promise.all and hard clamping
 */
export async function fetchRewardRateApy() {
  try {
    const provider = getProvider()
    const rewardPoolAddress = ADDR.REWARD_POOL
    const stakingAddress = ADDR.STAKING

    if (!rewardPoolAddress || rewardPoolAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('[fetchRewardRateApy] RewardPool address not configured')
      return 0
    }

    const rewardPoolContract = new ethers.Contract(
      rewardPoolAddress,
      RewardPoolABI.abi || RewardPoolABI,
      provider
    )

    // Detect reward rate method
    let rewardRateMethod = null
    let rewardPerSec = null
    
    if ("rewardRate" in rewardPoolContract) {
      rewardRateMethod = "rewardRate"
      try {
        rewardPerSec = await rewardPoolContract.rewardRate()
      } catch (e) {
        console.warn('[fetchRewardRateApy] rewardRate() failed:', e.message)
      }
    } else if ("rewardPerSecond" in rewardPoolContract) {
      rewardRateMethod = "rewardPerSecond"
      try {
        rewardPerSec = await rewardPoolContract.rewardPerSecond()
      } catch (e) {
        console.warn('[fetchRewardRateApy] rewardPerSecond() failed:', e.message)
      }
    } else if ("getRewardRate" in rewardPoolContract) {
      rewardRateMethod = "getRewardRate"
      try {
        rewardPerSec = await rewardPoolContract.getRewardRate()
      } catch (e) {
        console.warn('[fetchRewardRateApy] getRewardRate() failed:', e.message)
      }
    }

    if (rewardPerSec && rewardRateMethod) {
      try {
        // Get total staked
        const totalStaked = await fetchTotalStaked()
        if (totalStaked === 0) {
          console.info('[APY] totalStaked is 0, returning 0')
          return 0
        }

        // Get token decimals (default 18)
        let decimals = 18
        try {
          const tokenAddress = ADDR.SST
          if (tokenAddress) {
            const tokenContract = new ethers.Contract(
              tokenAddress,
              SureStackTokenABI.abi || SureStackTokenABI,
              provider
            )
            decimals = Number(await tokenContract.decimals()) || 18
          }
        } catch (e) {
          console.warn('[fetchRewardRateApy] Could not get decimals, using 18:', e.message)
        }

        // Calculate APY: (rewardPerSec * secondsPerYear) / totalStaked * 100
        const secondsPerYear = 31536000
        const rewardPerSecNum = Number(ethers.formatUnits(rewardPerSec ?? 0n, decimals))
        const annualRewards = rewardPerSecNum * secondsPerYear
        const apy = (annualRewards / totalStaked) * 100

        const clamped = Math.max(0, Math.min(9999, Number.isFinite(apy) ? apy : 0))
        console.info(`[APY] Method=${rewardRateMethod}, APY=${clamped.toFixed(2)}%`)
        return clamped
      } catch (e) {
        console.warn(`[fetchRewardRateApy] ${rewardRateMethod} calculation failed:`, e.message)
      }
    }

    // Fallback: Calculate from reward pool balance and total staked
    try {
      const totalStaked = await fetchTotalStaked()
      if (totalStaked === 0) return 0

      const rewardPoolBalance = await rewardPoolContract.rewardPoolBalance?.()
      if (rewardPoolBalance) {
        const balance = Number(ethers.formatUnits(rewardPoolBalance, 18))
        const estimatedDailyRewards = balance * 0.01 // Assume 1% daily distribution
        const annualRewards = estimatedDailyRewards * 365
        const apy = (annualRewards / totalStaked) * 100
        return Math.max(0, Math.min(9999, Number.isFinite(apy) ? apy : 0)) // clamp
      }
    } catch (e) {
      console.warn('[fetchRewardRateApy] fallback calculation failed:', e.message)
    }

    return 0
  } catch (e) {
    console.warn('[fetchRewardRateApy] fallback 0', e)
    return 0
  }
}

/**
 * Fetch latest ETH/USD price from Chainlink
 */
export async function fetchEthUsdLatest() {
  try {
    const provider = getProvider()
    const chainlinkAddress = import.meta.env.VITE_CHAINLINK_ETHUSD || '0x694AA1769357215DE4FAC081bf1f309aDC325306'

    const contract = new ethers.Contract(chainlinkAddress, aggregatorAbi, provider)
    const [roundId, answer, , updatedAt, answeredInRound] = await contract.latestRoundData()
    const decimals = await contract.decimals()

    const price = Number(ethers.formatUnits(answer, decimals))
    return {
      price,
      roundId: Number(roundId),
      updatedAt: Number(updatedAt) * 1000, // Convert to milliseconds
      decimals: Number(decimals),
    }
  } catch (e) {
    console.error('[fetchEthUsdLatest] Error:', e)
    return null
  }
}

/**
 * Calculate volatility from history within a time window
 * @param {Array<{t:number, p:number}>} history - Price history array
 * @param {number} windowMs - Time window in milliseconds (24h = 86400000, 7d = 604800000)
 * @returns {number} Annualized volatility as percentage
 */
function calcVolatility(history, windowMs) {
  if (!history || history.length < 2) return 0

  const now = Date.now()
  const cutoff = now - windowMs
  
  // Filter to window
  const windowed = history.filter(item => item.t >= cutoff)
  
  if (windowed.length < 2) return 0

  // Calculate log returns
  const returns = []
  for (let i = 1; i < windowed.length; i++) {
    const prev = windowed[i - 1].p
    const curr = windowed[i].p
    if (prev > 0 && curr > 0) {
      returns.push(Math.log(curr / prev))
    }
  }

  if (returns.length === 0) return 0

  // Calculate standard deviation
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)

  // Annualize: multiply by sqrt(periods per year)
  const periodsPerYear = (365 * 24 * 60 * 60 * 1000) / windowMs
  const annualizedVol = stdDev * Math.sqrt(periodsPerYear)

  // Convert to percentage
  return annualizedVol * 100
}

/**
 * Calculate risk index from price history
 * @param {Array<{t:number, p:number}>} history - Price history array with {t: timestamp in ms, p: price}
 * @returns {{risk24h: {value: number, warmingUp: boolean, samples: number}, risk7d: {value: number, warmingUp: boolean, samples: number}}}
 */
export function calcRiskIndexFromPrices(history) {
  if (!history || history.length < 60) {
    return {
      risk24h: { value: 0, warmingUp: true, samples: history?.length || 0 },
      risk7d: { value: 0, warmingUp: true, samples: history?.length || 0 }
    }
  }

  const now = Date.now()
  const window24h = 24 * 60 * 60 * 1000
  const window7d = 7 * 24 * 60 * 60 * 1000

  // Filter to windows
  const history24h = history.filter(item => item.t >= now - window24h)
  const history7d = history.filter(item => item.t >= now - window7d)

  // Calculate volatilities
  const vol24h = calcVolatility(history24h, window24h)
  const vol7d = calcVolatility(history7d, window7d)

  // Map to risk score [0..100]
  // Scale: 0% vol = 0, 10% vol = 50, 20% vol = 100
  const mapToRiskScore = (vol) => {
    const score = Math.min(100, Math.max(0, vol * 5)) // 20% vol = 100 score
    return Math.round(score * 10) / 10 // Round to 1 decimal
  }

  return {
    risk24h: {
      value: mapToRiskScore(vol24h),
      warmingUp: history24h.length < 60,
      samples: history24h.length
    },
    risk7d: {
      value: mapToRiskScore(vol7d),
      warmingUp: history7d.length < 60,
      samples: history7d.length
    }
  }
}

