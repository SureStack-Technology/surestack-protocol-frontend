import mockData from '../../data/mock-data.json'

let interval = null
let simulationTime = 0

/**
 * Start data simulation - updates mock data every 3 seconds
 * @param {Function} setData - State setter function
 */
export const startDataSimulation = (setData) => {
  if (interval) {
    console.warn('⚠️ [DataSimulator] Simulation already running')
    return
  }

  console.log('🎬 [DataSimulator] Starting data simulation...')
  simulationTime = 0

  interval = setInterval(() => {
    simulationTime++

    const updated = {
      riskPools: mockData.riskPools.map((pool, index) => {
        // Simulate pool size changes with sine wave
        const poolVariation = Math.sin(simulationTime / 5 + index) * 50000
        const rewardVariation = Math.cos(simulationTime / 7 + index) * 2000
        const validatorVariation = Math.floor(Math.sin(simulationTime / 10 + index) * 3)

        return {
          ...pool,
          totalStaked: Math.max(1000000, pool.totalStaked + poolVariation),
          rewards: Math.max(10000, pool.rewards + rewardVariation),
          validators: Math.max(5, pool.validators + validatorVariation),
          avgPremium: (pool.avgPremium + Math.sin(simulationTime / 8 + index) * 0.1).toFixed(2),
        }
      }),
      proposals: mockData.proposals.map((p, i) => {
        // Simulate vote count changes
        const forVariation = Math.floor(Math.random() * 1000)
        const againstVariation = Math.floor(Math.random() * 500)
        const abstainVariation = Math.floor(Math.random() * 200)

        return {
          ...p,
          forVotes: Math.max(0, p.forVotes + forVariation),
          againstVotes: Math.max(0, p.againstVotes + againstVariation),
          abstainVotes: Math.max(0, p.abstainVotes + abstainVariation),
          // Update timestamp to current time for active proposals
          timestamp: p.state === 1 ? Date.now() : p.timestamp,
        }
      }),
      governanceParams: {
        ...mockData.governanceParams,
        // Slight variations in quorum
        quorum: mockData.governanceParams.quorum + Math.floor(Math.sin(simulationTime / 20) * 1000000),
      },
    }

    setData(updated)
  }, 3000) // Update every 3 seconds

  // Set initial data
  setData({
    riskPools: mockData.riskPools,
    proposals: mockData.proposals,
    governanceParams: mockData.governanceParams,
  })
}

/**
 * Stop data simulation
 */
export const stopDataSimulation = () => {
  if (interval) {
    console.log('🛑 [DataSimulator] Stopping data simulation...')
    clearInterval(interval)
    interval = null
    simulationTime = 0
  }
}

/**
 * Get initial mock data
 */
export const getMockData = () => {
  return {
    riskPools: mockData.riskPools,
    proposals: mockData.proposals,
    governanceParams: mockData.governanceParams,
  }
}

/**
 * Check if simulation is running
 */
export const isSimulationRunning = () => {
  return interval !== null
}

















