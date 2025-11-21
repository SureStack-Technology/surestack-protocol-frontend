import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useWeb3 } from '../../contexts/Web3Context'
import OracleFeedPanel from '../ui/OracleFeedPanel.jsx'
import RiskRadar from '../visuals/RiskRadar.jsx'
import HolographicCard from '../ui/HolographicCard.jsx'
import LiveEventsPanel from '../ui/LiveEventsPanel.jsx'
import SimulationPanel from '../dashboard/SimulationPanel.jsx'
import { formatNumber } from '../../utils/formatters'
import TokenIcon from '../ui/TokenIcon.jsx'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'

const SSTValue = ({ amount, digits = 2 }) => (
  <span className="inline-flex items-center gap-2">
    <TokenIcon className="h-6 w-6 drop-shadow-[0_0_14px_rgba(0,255,240,0.45)]" />
    <span>{Number(amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: digits })} SST</span>
  </span>
)

export default function BusinessDashboard() {
  const { isConnected } = useWeb3()
  const { analytics, loading, error } = useProtocolAnalytics()

  const protocol = analytics?.protocol ?? {}
  const validators = analytics?.validators ?? {}
  const governanceData = analytics?.governance ?? {}
  const stress = analytics?.stress ?? {}
  const oracle = analytics?.oracle ?? {}

  const totals = useMemo(() => {
    const totalCoverageUSD = protocol.totalCoverageUSD ?? 0
    const totalPolicies = protocol.activePolicies ?? 0
    const totalPremiums = protocol.premiumBufferSST ?? 0

    const totalStakedSST = protocol.totalStakedSST ?? validators.totalStaked ?? 0
    const daoTreasurySST = protocol.treasurySST ?? 0
    const validatorCount = validators.total ?? 0
    const totalRewardsDistributed = validators.totalRewards ?? 0

    const sigma30 = stress.vol24h ?? 0
    const sigma7 = stress.vol7d ?? 0
    const ethPrice = oracle.ethPrice ?? 0

    const apyEstimate = totalStakedSST > 0
      ? Math.min(((totalRewardsDistributed / totalStakedSST) * 100), 9999)
      : 0

    return {
      totalCoverageUSD,
      totalPolicies,
      totalPremiums,
      totalStakedSST,
      daoTreasurySST,
      validatorCount,
      totalRewardsDistributed,
      sigma30,
      sigma7,
      ethPrice,
      apyEstimate,
    }
  }, [protocol, validators, stress, oracle])

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Please connect your wallet to view business dashboard</p>
      </div>
    )
  }

  const showOracleWarning = oracle?.ethPrice == null || Number(oracle?.ethPrice ?? 0) === 0

  const skeletonCard = (
    <div className="glass-panel p-4 h-32 animate-pulse bg-white/5 border border-white/10" />
  )

  if (loading) {
    return (
      <section className="min-h-screen text-white pt-28 animate-fade-in">
        <div className="space-y-6">
          <div className="w-full h-[300px] rounded-xl overflow-hidden shadow-xl border border-slate-700">
            <img
              src="/assets/banner/surestack-banner.png"
              alt="SureStack Enterprise Banner"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 pt-4 pb-6">
            <div className="space-y-4 flex-1">
              <div className="h-8 w-64 bg-white/10 animate-pulse rounded" />
              <div className="h-2 w-24 bg-primary-cyan/20 animate-pulse rounded" />
              <div className="h-16 bg-white/5 animate-pulse rounded" />
              <div className="h-6 w-48 bg-white/10 animate-pulse rounded" />
            </div>
            <div className="w-full max-w-[560px] lg:max-w-[600px] xl:max-w-[680px] max-h-[340px] bg-white/5 animate-pulse rounded-2xl border border-white/10" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {skeletonCard}
            {skeletonCard}
            {skeletonCard}
            {skeletonCard}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {skeletonCard}
                {skeletonCard}
                {skeletonCard}
                {skeletonCard}
              </div>
              <div className="glass-panel h-64 animate-pulse bg-white/5 border border-white/10" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {skeletonCard}
                {skeletonCard}
                {skeletonCard}
                {skeletonCard}
              </div>
            </div>
            <div className="lg:col-span-4 space-y-4">
              <div className="glass-panel h-72 animate-pulse bg-white/5 border border-white/10" />
              <div className="glass-panel h-48 animate-pulse bg-white/5 border border-white/10" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  const statusLabel = error ? 'Degraded' : 'Operational'
  const statusSubtitle = error?.message ?? 'All systems nominal'

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen text-white pt-28 space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Enterprise Control Centre</h1>
        <p className="text-md opacity-80">
          Risk intelligence, coverage oversight, and institutional policy management.
        </p>
      </div>

      <div className="w-full h-[300px] rounded-xl overflow-hidden shadow-xl border border-slate-700">
        <img
          src="/assets/banner/surestack-banner.png"
          alt="SureStack Enterprise Banner"
          className="w-full h-full object-cover"
        />
      </div>

      {showOracleWarning && (
        <div className="glass-card border border-amber-500/40 bg-amber-500/10 text-amber-100 px-4 py-3 text-sm">
          Oracle feed inactive — using mock data.
        </div>
      )}

      <SimulationPanel />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <HolographicCard
            title="Total Coverage"
            value={loading ? '…' : `$${formatNumber(totals.totalCoverageUSD, 0)}`}
            subtitle="USD across all active pools"
            riskScore={totals.sigma30}
          />
          <HolographicCard
            title="DAO Treasury"
            value={loading ? '…' : <SSTValue amount={totals.daoTreasurySST} />}
            subtitle="Governance reserves"
            riskScore={20}
          />
          <HolographicCard
            title="Total Staked"
            value={loading ? '…' : <SSTValue amount={totals.totalStakedSST} />}
            subtitle={`${totals.validatorCount.toLocaleString()} validators`}
            riskScore={Math.min(totals.sigma30 * 1.5, 100)}
          />
          <HolographicCard
            title="Active Policies"
            value={loading ? '…' : totals.totalPolicies.toLocaleString()}
            subtitle={`${formatNumber(totals.totalPremiums, 0)} SST premiums`}
            riskScore={totals.totalPolicies / 5}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <HolographicCard
                title="Coverage (USD)"
                value={loading ? '…' : `$${formatNumber(totals.totalCoverageUSD, 0)}`}
                subtitle="Across all active pools"
                riskScore={totals.sigma30}
              />
              <HolographicCard
                title="Rewards Pool"
                value={loading ? '…' : <SSTValue amount={totals.totalRewardsDistributed} />}
                subtitle="Distributed to validators"
                riskScore={Math.min((totals.totalRewardsDistributed / (totals.totalStakedSST || 1)) * 100, 100)}
              />
              <HolographicCard
                title="ETH / USD"
                value={totals.ethPrice ? `$${formatNumber(totals.ethPrice, 2)}` : '—'}
                subtitle="Latest oracle price"
                riskScore={totals.sigma30}
              />
              <HolographicCard
                title="Estimated APY"
                value={totals.totalStakedSST ? `${totals.apyEstimate.toFixed(2)}%` : '—'}
                subtitle="Validator capital efficiency"
                riskScore={totals.apyEstimate}
              />
            </div>

            <OracleFeedPanel />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <HolographicCard
                title="24h Volatility"
                value={`${totals.sigma30.toFixed(1)}%`}
                subtitle="Derived from analytics"
                riskScore={totals.sigma30}
              />
              <HolographicCard
                title="7d Volatility"
                value={`${totals.sigma7.toFixed(1)}%`}
                subtitle="Smoothed weekly signal"
                riskScore={totals.sigma7}
              />
              <HolographicCard
                title="Governance"
                value={`${(governanceData?.active?.length ?? 0).toLocaleString()} Active`}
                subtitle={`${(governanceData?.proposalCount ?? 0).toLocaleString()} Proposals Total`}
                riskScore={(governanceData?.active?.length ?? 0) * 10}
              />
              <HolographicCard
                title="Status"
                value={statusLabel}
                subtitle={statusSubtitle}
                riskScore={error ? 80 : 15}
              />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <RiskRadar
              simulatedRiskScore={Math.min(Math.round(totals.sigma30 * 1.5), 100)}
              simulatedPrice={totals.ethPrice}
            />
            <LiveEventsPanel />
          </div>
        </div>
    </motion.section>
  )
}
