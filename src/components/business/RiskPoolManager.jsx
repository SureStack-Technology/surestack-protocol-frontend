import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSimulation } from '../../contexts/SimulationContext'
import { useStaking } from '@shared/hooks'
import { startDataSimulation, stopDataSimulation } from '../../utils/dataSimulator'
import { formatNumber } from '../../utils/formatters'
import { TrendingUp, Users, Shield, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const DEFAULT_STATS = {
  totalPools: 0,
  totalValue: 0,
  avgPremium: 0,
  activeValidators: 0,
}

const formatAmount = (value) => {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, numeric)
}

export default function RiskPoolManager() {
  const { simulationMode } = useSimulation()
  const {
    pools: contractPools,
    stats: contractStats,
    loading: contractLoading,
    error: contractError,
  } = useStaking()
  const [simulatedData, setSimulatedData] = useState(null)

  useEffect(() => {
    if (simulationMode) {
      startDataSimulation(setSimulatedData)
      return () => stopDataSimulation()
    }
    stopDataSimulation()
    setSimulatedData(null)
  }, [simulationMode])

  const safePools = useMemo(() => {
    if (simulationMode && simulatedData?.riskPools) {
      return Array.isArray(simulatedData.riskPools) ? simulatedData.riskPools : []
    }
    return Array.isArray(contractPools) ? contractPools : []
  }, [simulationMode, simulatedData, contractPools])

  const aggregatedStats = useMemo(() => {
    if (simulationMode && simulatedData?.riskPools?.length) {
      const totalValue = simulatedData.riskPools.reduce(
        (sum, pool) => sum + Number(pool.totalStaked ?? 0),
        0
      )
      const avgPremium =
        simulatedData.riskPools.reduce(
          (sum, pool) => sum + Number(pool.avgPremium ?? 0),
          0
        ) / simulatedData.riskPools.length
      const activeValidators = simulatedData.riskPools.reduce(
        (sum, pool) => sum + Number(pool.validators ?? pool.activeValidators ?? 0),
        0
      )
      return {
        totalPools: simulatedData.riskPools.length,
        totalValue: totalValue / 1e18,
        avgPremium: Number.isFinite(avgPremium) ? avgPremium : 0,
        activeValidators,
      }
    }

    const stats = contractStats ?? DEFAULT_STATS
    return {
      totalPools: Number(stats.totalPools ?? safePools.length ?? 0),
      totalValue: Number(stats.totalValue ?? 0),
      avgPremium: Number(stats.avgPremium ?? 0),
      activeValidators: Number(stats.activeValidators ?? 0),
    }
  }, [simulationMode, simulatedData, contractStats, safePools])

  const loading = simulationMode ? false : Boolean(contractLoading)
  const chartData = useMemo(() => {
    if (!safePools.length) return []

    return safePools.map((pool, idx) => {
      const name = pool.name || pool.id || `Pool ${idx + 1}`
      const totalStakedRaw =
        pool.totalStaked ?? pool.totalValue ?? pool.totalBalance ?? 0
      const totalRewardsRaw = pool.totalRewards ?? pool.rewards ?? 0
      const activeValidators =
        pool.activeValidators ?? pool.validators ?? pool.validatorCount ?? 0

      const totalStaked = simulationMode
        ? Number(totalStakedRaw) / 1e18
        : typeof totalStakedRaw === 'bigint'
        ? Number(totalStakedRaw) / 1e18
        : Number(totalStakedRaw)

      const totalRewards = simulationMode
        ? Number(totalRewardsRaw) / 1e18
        : typeof totalRewardsRaw === 'bigint'
        ? Number(totalRewardsRaw) / 1e18
        : Number(totalRewardsRaw)

      return {
        name,
        totalStaked: formatAmount(totalStaked),
        totalRewards: formatAmount(totalRewards),
        activeValidators: Math.max(0, Number(activeValidators)),
      }
    })
  }, [safePools, simulationMode])

  const emptyState =
    (!simulationMode && contractError) || (!loading && safePools.length === 0)

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {contractError && (
        <div className="glass-card border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
          <p className="font-semibold uppercase tracking-[0.25em] text-xs mb-1">
            Risk Pool Data Notice
          </p>
          <p>
            Live pool metrics are temporarily unavailable (provider error). Displaying cached or simulated data when possible.
          </p>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="card-dark p-4">
          <div className="flex items-center justify-between mb-3">
            <Shield className="h-8 w-8 text-blue-400" />
            <span className="text-sm text-gray-400">Total Pools</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatNumber(aggregatedStats.totalPools ?? 0, 0)}
          </div>
          <p className="text-sm text-gray-400 mt-2">Active underwriting pools</p>
        </div>

        <div className="card-dark p-4">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="h-8 w-8 text-green-400" />
            <span className="text-sm text-gray-400">Total Pool Value</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {formatNumber(aggregatedStats.totalValue ?? 0, 2)} SST
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Combined battle-tested liquidity
          </p>
        </div>

        <div className="card-dark p-4">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="h-8 w-8 text-yellow-400" />
            <span className="text-sm text-gray-400">Avg Premium</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {formatNumber(aggregatedStats.avgPremium ?? 0, 2)}%
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Weighted average across active pools
          </p>
        </div>

        <div className="card-dark p-4">
          <div className="flex items-center justify-between mb-3">
            <Users className="h-8 w-8 text-purple-400" />
            <span className="text-sm text-gray-400">Active Validators</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {formatNumber(aggregatedStats.activeValidators ?? 0, 0)}
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Validators underwriting this sector
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
        className="card-dark"
      >
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4 text-white">
            Pool Capacity Overview
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-56 gap-3 text-gray-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
              Loading pool telemetry…
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101826',
                    border: '1px solid rgba(0,255,240,0.3)',
                    borderRadius: '10px',
                  }}
                  labelStyle={{ color: '#E6F3FF' }}
                />
                <Legend />
                <Bar dataKey="totalStaked" fill="#60a5fa" name="Total Staked (SST)" />
                <Bar dataKey="totalRewards" fill="#34d399" name="Rewards (SST)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-56 text-gray-400">
              No pool telemetry available right now.
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        className="card-dark"
      >
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4 text-white">
            Pool Composition
          </h2>
          {safePools.length === 0 ? (
            <p className="text-sm text-gray-400">
              {emptyState
                ? 'Risk pool data is currently unavailable.'
                : 'No active pools yet — deploy a pool to populate this section.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 text-gray-400 text-xs uppercase tracking-[0.25em]">
                    <th className="text-left py-3 px-4">Pool</th>
                    <th className="text-right py-3 px-4">Total Staked</th>
                    <th className="text-right py-3 px-4">Active Validators</th>
                    <th className="text-right py-3 px-4">Avg Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {safePools.map((pool, index) => {
                    const name = pool.name || pool.id || `Pool ${index + 1}`
                    const totalStaked =
                      simulationMode
                        ? Number(pool.totalStaked ?? 0) / 1e18
                        : typeof pool.totalStaked === 'bigint'
                        ? Number(pool.totalStaked) / 1e18
                        : Number(pool.totalStaked ?? 0)
                    const premium =
                      typeof pool.avgPremium === 'number'
                        ? pool.avgPremium
                        : Number(pool.avgPremium ?? 0)
                    const validators =
                      pool.activeValidators ?? pool.validators ?? 0

                    return (
                      <tr
                        key={pool.id || name || index}
                        className="border-b border-slate-700/40 hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-white font-medium">{name}</td>
                        <td className="py-3 px-4 text-right text-green-400">
                          {formatNumber(totalStaked, 2)} SST
                        </td>
                        <td className="py-3 px-4 text-right text-purple-300">
                          {formatNumber(validators, 0)}
                        </td>
                        <td className="py-3 px-4 text-right text-yellow-300">
                          {formatNumber(premium, 2)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </motion.section>
  )
}

