import { useState, useEffect } from 'react'

/**
 * Hook to fetch revenue simulation data from the latest simulation results
 * Reads from /reports/simulations/revenue-latest.json
 */
export const useRevenueData = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to fetch from public directory (for Vite/React)
        const response = await fetch('/reports/simulations/revenue-latest.json', {
          cache: 'no-cache', // Always fetch latest
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch revenue data: ${response.status} ${response.statusText}`)
        }

        const jsonData = await response.json()
        setData(jsonData)
      } catch (err) {
        console.warn('⚠️ Could not load revenue simulation data:', err.message)
        // Return default values if file doesn't exist
        setData({
          protocolFees: 0,
          accuracyFactor: 0,
          totalStaked: 0,
          apyMonthly: 0,
          apyAnnual: 0,
          baseAPY: 0,
          effectiveYield: 0,
          timestamp: new Date().toISOString(),
        })
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRevenueData()

    // Refresh every 30 seconds to get latest simulation data
    const interval = setInterval(fetchRevenueData, 30000)
    return () => clearInterval(interval)
  }, [])

  return {
    data,
    loading,
    error,
    // Convenience getters
    protocolFees: data?.protocolFees || 0,
    accuracyFactor: data?.accuracyFactor || 0,
    totalStaked: data?.totalStaked || 0,
    apyMonthly: data?.apyMonthly || 0,
    apyAnnual: data?.apyAnnual || 0,
    effectiveYield: data?.effectiveYield || 0,
    timestamp: data?.timestamp || null,
  }
}

