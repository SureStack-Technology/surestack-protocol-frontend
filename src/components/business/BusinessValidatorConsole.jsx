import { useState, useEffect, useMemo, memo } from 'react'
import { useWeb3 } from '@contexts/Web3Context'
import { useContracts } from '@/hooks/useContracts'
import { formatNumber } from '../../utils/formatters'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Users, TrendingUp, Shield, Award, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import EnterpriseBadge from '@/components/ui/EnterpriseBadge.jsx'
import TokenIcon from '@/components/ui/TokenIcon.jsx'
import TierBadge from './validators/TierBadge.jsx'

const metricMotionConfig = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' },
}

const renderSSTAmount = (amount) => (
  <span className="inline-flex items-center gap-2">
    <TokenIcon symbol="SST" className="h-5 w-5 drop-shadow-[0_0_10px_rgba(0,255,240,0.6)]" />
    {Number(amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
    <span className="opacity-80 font-semibold">SST</span>
  </span>
)

const MetricCard = ({ icon: Icon, iconClass, label, value, subtitle, valueClass = '', delay = 0 }) => (
  <motion.div
    initial={metricMotionConfig.initial}
    animate={metricMotionConfig.animate}
    transition={{ ...metricMotionConfig.transition, delay }}
    className="card-dark p-4"
  >
    <div className="flex items-center justify-between mb-4">
      <Icon className={`h-8 w-8 ${iconClass}`} />
      <span className="text-sm text-gray-400">{label}</span>
    </div>
    <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
    <p className="text-sm text-gray-400 mt-2">{subtitle}</p>
  </motion.div>
)

const ValidatorPerformanceChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
      <XAxis dataKey="name" stroke="#9ca3af" />
      <YAxis stroke="#9ca3af" />
      <Tooltip
        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
        labelStyle={{ color: '#f8fafc' }}
      />
      <Bar dataKey="staked" fill="#8b5cf6" name="Staked (SST)" />
      <Bar dataKey="rewards" fill="#34d399" name="Rewards (SST)" />
    </BarChart>
  </ResponsiveContainer>
)

const ConsensusHistoryChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
      <XAxis dataKey="roundId" stroke="#9ca3af" />
      <YAxis stroke="#9ca3af" />
      <Tooltip
        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
        labelStyle={{ color: '#f8fafc' }}
      />
      <Line type="monotone" dataKey="consensusScore" stroke="#8b5cf6" strokeWidth={2} name="Consensus Score" />
      <Line type="monotone" dataKey="submissionCount" stroke="#34d399" strokeWidth={2} name="Submissions" />
    </LineChart>
  </ResponsiveContainer>
)

const ValidatorTable = ({ validators }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: 'easeOut' }}
    className="card-dark"
  >
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4 text-white">Validators List</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Address</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Tier</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Staked</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Rewards</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Accuracy</th>
              <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {validators.map((validator, index) => (
              <motion.tr
                key={validator.address || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-slate-700/50 hover:bg-slate-800/50"
              >
                <td className="py-3 px-4 text-white font-mono text-sm">
                  {validator.address ? `${validator.address.slice(0, 6)}...${validator.address.slice(-4)}` : 'N/A'}
                </td>
                <td className="py-3 px-4">
                  <TierBadge tier={validator.tier} />
                </td>
                <td className="py-3 px-4 text-right text-purple-400">
                  {renderSSTAmount(validator.stakeSST ?? validator.stakedAmount ?? 0)}
                </td>
                <td className="py-3 px-4 text-right text-green-400">
                  {renderSSTAmount(validator.totalRewards ?? 0)}
                </td>
                <td className="py-3 px-4 text-right text-yellow-400">
                  {(
                    validator.accuracy != null
                      ? Number(validator.accuracy) * 100
                      : Number(validator.accuracyScore ?? 0)
                  ).toFixed(1)}%
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      validator.isActive
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}
                  >
                    {validator.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </motion.div>
)

const MemoMetricCard = memo(MetricCard)
const MemoValidatorPerformanceChart = memo(ValidatorPerformanceChart)
const MemoConsensusHistoryChart = memo(ConsensusHistoryChart)
const MemoValidatorTable = memo(ValidatorTable)

export default function BusinessValidatorConsole({
  validators = [],
  loading = false,
  error: validatorsError = null,
  totals,
  isFrozen = false,
}) {
  const { isConnected, provider } = useWeb3()
  const { consensusStakingV2 } = useContracts()
  const [roundHistory, setRoundHistory] = useState([])
  const [filter, setFilter] = useState('all') // all, active, inactive
  const validatorsArray = useMemo(
    () => (Array.isArray(validators) ? validators : []),
    [validators]
  )

  const showSkeleton =
    !isFrozen && (loading || validatorsArray.length === 0)

  const filterCounts = useMemo(() => {
    const active = validatorsArray.filter((v) => v.isActive).length
    return {
      all: validatorsArray.length,
      active,
      inactive: Math.max(validatorsArray.length - active, 0),
    }
  }, [validatorsArray])

  const filteredValidators = useMemo(() => {
    if (filter === 'active') {
      return validatorsArray.filter((validator) => validator.isActive)
    }
    if (filter === 'inactive') {
      return validatorsArray.filter((validator) => !validator.isActive)
    }
    return validatorsArray
  }, [validatorsArray, filter])

  const validatorStats = useMemo(() => {
    const totalValidators = totals?.totalCount ?? validatorsArray.length
    const activeValidators =
      totals?.activeCount ?? validatorsArray.filter((v) => v.isActive).length
    const totalStaked =
      totals?.totalStakeSST ??
      validatorsArray.reduce(
        (sum, v) => sum + Number(v.stakeSST ?? v.stakedAmount ?? 0),
        0
      )
    const totalRewards = validatorsArray.reduce(
      (sum, v) => sum + Number(v.totalRewards ?? 0),
      0
    )
    const inactiveCount =
      totals?.inactiveCount ?? Math.max(totalValidators - activeValidators, 0)

    if (
      totalValidators === 0 &&
      totalStaked === 0 &&
      totalRewards === 0 &&
      !totals
    ) {
      return null
    }

    return {
      totalValidators,
      activeValidators,
      inactiveValidators: inactiveCount,
      totalStaked,
      totalRewards,
    }
  }, [totals, validatorsArray])

  // Fetch recent round history for performance metrics
  useEffect(() => {
    if (!isConnected || !consensusStakingV2 || !provider) return

    let cancelled = false

    const fetchRounds = async () => {
      try {
        const currentRoundId = await consensusStakingV2.currentRoundId().catch(() => 0)
        const history = []
        const upperBound = Number(currentRoundId || 0)
        const lowerBound = Math.max(0, upperBound - 12)

        for (let i = lowerBound; i < upperBound; i++) {
          if (cancelled) break
          try {
            const round = await consensusStakingV2.roundHistory(i)
            history.push({
              roundId: i,
              consensusScore: round.consensusScore ? Number(round.consensusScore) : null,
              isSettled: round.isSettled,
              submissionCount: Array.isArray(round.submissions)
                ? round.submissions.length
                : Number(round.submissionCount ?? 0),
            })
          } catch (roundErr) {
            // ignore missing rounds
            console.debug('[BusinessValidatorConsole] round fetch skipped', i, roundErr?.message)
          }
        }

        if (!cancelled) {
          setRoundHistory(history.reverse())
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching round history:', error)
        }
      } finally {
        // no-op
      }
    }

    fetchRounds()
    const interval = setInterval(fetchRounds, 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isConnected, consensusStakingV2, provider])

  const shortAddress = (address = '') =>
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'

  const performanceData = useMemo(
    () =>
      filteredValidators.slice(0, 10).map((v) => ({
        name: `${shortAddress(v.address)} — ${v.tier ?? 'Tier 3'}`,
        staked: Number(v.stakeSST ?? v.stakedAmount ?? 0),
        rewards: Number(v.totalRewards ?? 0),
        accuracy:
          v.accuracy != null
            ? Number(v.accuracy) * 100
            : Number(v.accuracyScore ?? 0),
      })),
    [filteredValidators]
  )

  const metricItems = useMemo(() => {
    const totalValidators = validatorStats?.totalValidators ?? 0
    const activeValidators = validatorStats?.activeValidators ?? 0
    const totalStakedValue = renderSSTAmount(validatorStats?.totalStaked ?? 0)
    const totalRewardsValue = renderSSTAmount(validatorStats?.totalRewards ?? 0)

    return [
      {
        key: 'total',
        icon: Users,
        iconClass: 'text-purple-400',
        label: 'Total Validators',
        value: totalValidators,
        subtitle: 'All validators',
        valueClass: 'text-white',
        delay: 0,
      },
      {
        key: 'active',
        icon: Shield,
        iconClass: 'text-green-400',
        label: 'Active',
        value: activeValidators,
        subtitle: 'Currently active',
        valueClass: 'text-green-400',
        delay: 0.05,
      },
      {
        key: 'staked',
        icon: TrendingUp,
        iconClass: 'text-blue-400',
        label: 'Total Staked',
        value: totalStakedValue,
        subtitle: 'Total staked amount',
        valueClass: 'text-blue-400',
        delay: 0.1,
      },
      {
        key: 'rewards',
        icon: Award,
        iconClass: 'text-yellow-400',
        label: 'Total Rewards',
        value: totalRewardsValue,
        subtitle: 'Total rewards distributed',
        valueClass: 'text-yellow-400',
        delay: 0.15,
      },
    ]
  }, [validatorStats])

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Please connect your wallet to view validator console</p>
      </div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 min-h-screen bg-background text-foreground p-4"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="glass-card p-4 space-y-2"
      >
        <h1 className="text-3xl font-heading text-[var(--primary-cyan)] flex items-center">
          Validator Management Console
          <EnterpriseBadge />
        </h1>
        <div className="w-20 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.72)]">
          Monitor and manage validator performance, staking exposure, and participation posture.
        </p>
      </motion.div>

      {validatorsError && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="glass-card border border-red-500/30 bg-red-500/10 text-sm text-red-200 p-4"
        >
          <p className="font-semibold tracking-wide uppercase text-xs mb-1">Validator Data Notice</p>
          <p>
            We were unable to load the live validator registry (provider error). Displaying any cached or partial data that is
            available. Please retry in a few moments.
          </p>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metricItems.map((metric, index) =>
          showSkeleton ? (
            <div key={`metric-skeleton-${index}`} className="animate-pulse glass-panel p-4 h-32" />
          ) : (
            <MemoMetricCard key={metric.key} {...metric} />
          )
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-700">
        {['all', 'active', 'inactive'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 capitalize ${
              filter === filterType
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {filterType} ({filterCounts[filterType] ?? 0})
          </button>
        ))}
      </div>

      {/* Validator Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="card-dark"
      >
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4 text-white">Top Validators Performance</h2>
          {showSkeleton ? (
            <div className="animate-pulse h-64 bg-slate-700/20 rounded-xl" />
          ) : performanceData.length === 0 ? (
            <p className="text-sm text-gray-400">No validator performance data available.</p>
          ) : (
            <MemoValidatorPerformanceChart data={performanceData} />
          )}
        </div>
      </motion.div>

      {/* Round History Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="card-dark"
      >
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4 text-white">Consensus Score History</h2>
          {showSkeleton ? (
            <div className="animate-pulse h-64 bg-slate-700/20 rounded-xl" />
          ) : roundHistory.length === 0 ? (
            <p className="text-sm text-gray-400">No consensus history available yet.</p>
          ) : (
            <MemoConsensusHistoryChart data={roundHistory} />
          )}
        </div>
      </motion.div>

      {/* Validators List */}
      {showSkeleton ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="card-dark"
        >
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-semibold text-white">Validators List</h2>
            <div className="space-y-3">
              <div className="animate-pulse h-12 bg-slate-700/20 rounded-lg" />
              <div className="animate-pulse h-12 bg-slate-700/20 rounded-lg" />
              <div className="animate-pulse h-12 bg-slate-700/20 rounded-lg" />
            </div>
          </div>
        </motion.div>
      ) : filteredValidators.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="card-dark"
        >
          <div className="text-center py-10">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No validators found</p>
          </div>
        </motion.div>
      ) : (
        <MemoValidatorTable validators={filteredValidators} />
      )}
    </motion.section>
  )
}

