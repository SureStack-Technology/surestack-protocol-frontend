import { useEffect, useRef, useState, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import EnterpriseBadge from '@/components/ui/EnterpriseBadge.jsx'
import BusinessValidatorConsole from '@/components/business/BusinessValidatorConsole.jsx'
import { useConsensusStaking } from '@/hooks/useConsensusStaking'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'
import { formatNumber } from '@/utils/formatters'
import TokenIcon from '@/components/ui/TokenIcon.jsx'

const MemoBusinessValidatorConsole = memo(BusinessValidatorConsole)

export default function BusinessValidatorsPage() {
  const { validators: consensusValidators, loading, error } = useConsensusStaking()
  const { analytics, loading: analyticsLoading, error: analyticsError } = useProtocolAnalytics()

  const protocol = analytics?.protocol ?? {}
  const validatorStats = analytics?.validators ?? {}

  const analyticsTotals = useMemo(() => ({
    totalCoverageUSD: protocol.totalCoverageUSD ?? 0,
    totalPolicies: protocol.activePolicies ?? 0,
    totalPremiums: protocol.premiumBufferSST ?? 0,
    totalStakedSST: protocol.totalStakedSST ?? validatorStats.totalStaked ?? 0,
    daoTreasurySST: protocol.treasurySST ?? 0,
    validatorCount: validatorStats.total ?? 0,
    totalRewardsDistributed: validatorStats.totalRewards ?? 0,
  }), [protocol, validatorStats])

  const renderSSTAmount = (amount) => (
    <span className="inline-flex items-center gap-2">
      <TokenIcon symbol="SST" className="h-5 w-5 drop-shadow-[0_0_10px_rgba(0,255,240,0.6)]" />
      {Number(amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      <span className="opacity-80 font-semibold">SST</span>
    </span>
  )

  const hasLoadedOnceRef = useRef(false)
  const [tierFilter, setTierFilter] = useState('ALL')

  useEffect(() => {
    if (!loading && Array.isArray(consensusValidators)) {
      hasLoadedOnceRef.current = true
    }
  }, [loading, consensusValidators])

  const isFrozen = hasLoadedOnceRef.current
  const tableLoading = !isFrozen && (loading || !Array.isArray(consensusValidators))

  const [displayValidators, setDisplayValidators] = useState([])

  useEffect(() => {
    if (Array.isArray(consensusValidators)) {
      const handler = setTimeout(() => {
        setDisplayValidators(consensusValidators)
      }, 300)
      return () => clearTimeout(handler)
    }
    setDisplayValidators([])
  }, [consensusValidators])

  const tierCounts = useMemo(() => {
    const counts = { T1: 0, T2: 0, T3: 0 }
    for (const validator of displayValidators) {
      if (validator?.tier && counts[validator.tier] != null) {
        counts[validator.tier] += 1
      } else {
        counts.T3 += 1
      }
    }
    return counts
  }, [displayValidators])

  const filteredValidators = useMemo(() => {
    if (tierFilter === 'ALL') return displayValidators
    return displayValidators.filter((validator) => validator.tier === tierFilter)
  }, [displayValidators, tierFilter])

  const hasValidators = Array.isArray(filteredValidators) && filteredValidators.length > 0

  const derivedTotals = useMemo(() => {
    const source = Array.isArray(displayValidators) ? displayValidators : []
    const totalStakeSST = source.reduce((sum, validator) => sum + Number(validator.stakeSST ?? validator.stakedAmount ?? 0), 0)
    const totalRewardsSST = source.reduce((sum, validator) => sum + Number(validator.totalRewards ?? 0), 0)
    const totalCount = source.length
    const activeCount = source.filter((validator) => validator.status === 'active' || validator.isActive).length
    const inactiveCount = Math.max(totalCount - activeCount, 0)

    return {
      totalStakeSST,
      totalRewardsSST,
      totalCount,
      activeCount,
      inactiveCount,
    }
  }, [displayValidators])

  const skeletonRow = (
    <div className="animate-pulse bg-slate-700/20 rounded-lg h-12 w-full" />
  )

  const skeletonCard = (
    <div className="animate-pulse glass-panel p-4 h-32" />
  )

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass-card p-5 space-y-2"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-heading text-[var(--primary-cyan)] uppercase tracking-wider">
            Validator Operations
          </h1>
          <EnterpriseBadge />
        </div>
        <div className="w-24 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.72)]">
          Monitor validator health, staking exposure, and participation posture across the SureStack consensus layer.
        </p>
      </motion.header>

      {analyticsError && (
        <div className="glass-card p-4 border border-amber-400/30 bg-amber-500/10 text-amber-100 text-sm">
          Analytics temporarily unavailable. Showing cached validator metrics.
        </div>
      )}

      {error && (
        <div className="glass-card p-5 border border-amber-400/40 bg-amber-500/10 text-amber-100 text-sm">
          Unable to load validator data. Displaying cached or partial information when available.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
        className="grid grid-cols-1 lg:grid-cols-4 gap-4"
      >
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Total Coverage</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? '…' : `$${formatNumber(analyticsTotals.totalCoverageUSD, 0)}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">USD policies across all validators</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Total Validators</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? '…' : analyticsTotals.validatorCount.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">Registered validator addresses</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Total Staked</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? '…' : renderSSTAmount(analyticsTotals.totalStakedSST)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Validator capital currently locked</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Rewards Distributed</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? '…' : renderSSTAmount(analyticsTotals.totalRewardsDistributed)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Total validator rewards issued</p>
        </div>
      </motion.div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Tier 1 Validators</p>
          <p className="text-xl font-semibold">{tierCounts.T1}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Tier 2 Validators</p>
          <p className="text-xl font-semibold">{tierCounts.T2}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Tier 3 Validators</p>
          <p className="text-xl font-semibold">{tierCounts.T3}</p>
        </div>
      </section>

      {!tableLoading && !hasValidators && (
        <div className="glass-card p-5 text-slate-400 text-sm">
          No validators registered.
        </div>
      )}

      <div className="flex gap-4 my-4">
        {['ALL', 'T1', 'T2', 'T3'].map((tier) => (
          <button
            key={tier}
            className={`px-3 py-1 rounded-lg text-sm ${
              tierFilter === tier ? 'bg-primary-cyan text-black' : 'bg-slate-800 text-white'
            }`}
            onClick={() => setTierFilter(tier)}
          >
            {tier === 'ALL' ? 'All Validators' : `Tier ${tier[1]}`}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
      >
        {tableLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {skeletonCard}
              {skeletonCard}
              {skeletonCard}
              {skeletonCard}
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-xl font-semibold mb-4">Validator Management Console</h3>
              <div className="space-y-3">
                {skeletonRow}
                {skeletonRow}
                {skeletonRow}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-xl font-semibold mb-4">Top Validators Performance</h3>
              <div className="animate-pulse h-48 bg-slate-700/20 rounded-lg" />
            </div>
          </div>
        ) : (
          <MemoBusinessValidatorConsole
            validators={filteredValidators}
            loading={loading}
            error={error}
            totals={{
              totalStakeSST: derivedTotals.totalStakeSST,
              totalCount: derivedTotals.totalCount,
              activeCount: derivedTotals.activeCount,
              inactiveCount: derivedTotals.inactiveCount,
              totalRewardsSST: derivedTotals.totalRewardsSST,
            }}
            isFrozen={isFrozen}
          />
        )}
      </motion.div>
    </motion.section>
  )
}

