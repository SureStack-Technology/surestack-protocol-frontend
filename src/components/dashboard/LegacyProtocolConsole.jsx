import { Link } from 'react-router-dom'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'
import { useDashboardProfile } from '@/hooks/useDashboardProfile'
import OracleFeedPanel from '../ui/OracleFeedPanel.jsx'
import RiskRadar from '../visuals/RiskRadar.jsx'
import HolographicCard from '../ui/HolographicCard.jsx'
import LiveEventsPanel from './LiveEventsPanel.jsx'
import AnalyticsPanel from './AnalyticsPanel.jsx'
import SimulationPanel from './SimulationPanel.jsx'
import TokenIcon from '../ui/TokenIcon.jsx'
import { motion } from 'framer-motion'
import VAFBanner from '../../user-app/dashboard/VAFBanner.jsx'
import VAFAlert from '../../user-app/components/VAFAlert.jsx'
import CurrentPlanCard from './CurrentPlanCard.jsx'
import PrimeWalletIntelligenceConsole from './PrimeWalletIntelligenceConsole.jsx'
import { CARRIER_DISCLAIMER } from '@/constants/complianceCopy.js'
import { ATLAS_INTELLIGENCE_DESCRIPTION } from '@/constants/intelligenceTiers.js'
import {
  isDemoModeEnabled,
  shouldShowProtocolDemoMetrics,
  hasIntelligenceProOrHigher,
  hasStrategicTierOrEnterprise,
  getConsoleExperienceLabels,
} from '@/utils/dashboardPersonalization'

/**
 * Legacy RISK Protocol / insurance demo console — investor telemetry, VAF, DAO metrics.
 * Reachable at /legacy-protocol-console only; not used for Explorer / Prime / Atlas dashboards.
 */
export default function LegacyProtocolConsole() {
  const { profile, loading: profileLoading, error: profileError, refetchProfile } = useDashboardProfile()
  const { analytics, loading, error } = useProtocolAnalytics()

  const protocol = analytics?.protocol ?? {}
  const validators = analytics?.validators ?? {}
  const stress = analytics?.stress ?? {}
  const oracle = analytics?.oracle ?? {}

  const renderSSTValue = (amount, formatOptions = { maximumFractionDigits: 2 }) => {
    const formatted = Number(amount ?? 0).toLocaleString(undefined, formatOptions)
    return (
      <span className="inline-flex items-center gap-2">
        <TokenIcon className="h-6 w-6 drop-shadow-[0_0_12px_rgba(0,255,240,0.5)]" />
        <span>{formatted} SST</span>
      </span>
    )
  }

  const coverageUSD = protocol.totalCoverageUSD ?? 0
  const totalStakedSST = protocol.totalStakedSST ?? validators.totalStaked ?? 0
  const treasurySST = protocol.treasurySST ?? 0
  const totalRewards = validators.totalRewards ?? 0
  const sigma24h = stress.vol24h ?? 0
  const sigma7d = stress.vol7d ?? 0
  const ethPrice = oracle.ethPrice ?? 0
  const maxRiskScore = Math.max(sigma24h || 0, sigma7d || 0)
  const apy = totalStakedSST > 0 ? Math.min((totalRewards / totalStakedSST) * 100, 9999) : 0

  const showProtocolDemoBlocks = profileLoading ? false : !profile || profileError ? true : shouldShowProtocolDemoMetrics(profile)
  const hasEnterpriseSignals = Boolean(profile?.institutionalIntent || profile?.governanceAccessEligible)
  const showProductAnalytics =
    isDemoModeEnabled() || hasIntelligenceProOrHigher(profile) || hasEnterpriseSignals
  const showStrategicStrip = showProductAnalytics && profile && hasStrategicTierOrEnterprise(profile)
  const showVafSurface = showProductAnalytics
  const consoleLabels = getConsoleExperienceLabels(profile ?? undefined)

  return (
    <section className="relative z-0 pointer-events-auto space-y-10 pt-8 min-h-screen text-white">
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-xs text-amber-100/95 leading-relaxed">
        <strong className="text-amber-200">Legacy protocol demo console</strong> — insurance / DAO telemetry preserved for
        presentations. Explorer and Prime use the{' '}
        <Link to="/dashboard" className="underline text-amber-50">
          Digital Asset Risk Intelligence workspace
        </Link>
        .
      </div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 sm:mb-12 space-y-5 sm:space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading gradient-text uppercase tracking-wider">
            Protocol Intelligence Hub
          </h1>
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500 font-mono mt-2">
            Legacy demo · not the production intelligence product
          </p>
        </div>
        <img
          src="/assets/banner/surestack-banner.png"
          alt="SureStack legacy protocol console"
          className="w-full max-h-64 object-cover rounded-3xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        />
        <p className="neon-soft font-mono text-sm">Real-time Risk Intelligence · legacy protocol telemetry</p>
      </motion.div>

      {showProtocolDemoBlocks && isDemoModeEnabled() ? (
        <motion.div className="rounded-xl border border-amber-500/35 bg-amber-950/20 px-4 py-3 text-xs text-amber-50/95 leading-relaxed">
          <strong className="text-amber-200">Investor demo mode</strong> — sample protocol and analytics telemetry for
          presentations. Disable with <span className="font-mono text-amber-100/90">VITE_DEMO_MODE=false</span> for
          production-style tier gating.
        </motion.div>
      ) : null}

      <p className="text-[11px] text-slate-500 max-w-3xl leading-relaxed border border-white/10 rounded-lg px-3 py-2 bg-black/20">
        {CARRIER_DISCLAIMER}
      </p>

      {showVafSurface ? (
        <>
          <VAFAlert rate={0.5} />
          <VAFBanner rate={0.5} membershipFee={25} />
        </>
      ) : null}

      <CurrentPlanCard useParentProfile parentProfile={profile} parentProfileLoading={profileLoading} />

      {profile?.wallets?.some((w) => w.verifiedAt) ? (
        <PrimeWalletIntelligenceConsole
          profile={profile ?? undefined}
          variant="prime"
          profileLoading={profileLoading}
          profileError={profileError}
          onProfileRefresh={refetchProfile}
        />
      ) : null}

      {showStrategicStrip ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-50/95 leading-relaxed flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <p>
            <strong className="text-cyan-200">Atlas Intelligence workspace</strong> — {ATLAS_INTELLIGENCE_DESCRIPTION}
          </p>
        </motion.div>
      ) : null}

      {showProductAnalytics ? (
        <>
          <AnalyticsPanel variant="protocol" />
          <SimulationPanel
            membershipTier={profile?.membershipTier ?? 'EXPLORER_ACCESS'}
            enterpriseProtocols={Boolean(profile?.institutionalIntent || profile?.governanceAccessEligible)}
            investorDemoUnlock={isDemoModeEnabled()}
          />
        </>
      ) : null}

      {showProtocolDemoBlocks ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4 section-fade"
        >
          <div className="glass-panel holo-glow p-6 card-hoverable">
            <h3 className="text-xs uppercase tracking-[0.3em] neon-soft mb-3">Value monitored</h3>
            <p className="text-3xl font-heading text-neon-cyan drop-shadow-lg">
              {loading ? '…' : `$${coverageUSD.toLocaleString()}`}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-mono">USD across observed pools</p>
          </div>
          <div className="glass-panel holo-glow p-6 card-hoverable">
            <h3 className="text-xs uppercase tracking-[0.3em] neon-soft mb-3">DAO Treasury</h3>
            <p className="text-3xl font-heading text-neon-pink drop-shadow-lg flex items-center gap-3">
              {loading ? '…' : renderSSTValue(treasurySST, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-mono">Governance reserves</p>
          </div>
          <div className="glass-panel holo-glow p-6 card-hoverable">
            <h3 className="text-xs uppercase tracking-[0.3em] neon-soft mb-3">Total Staked</h3>
            <p className="text-3xl font-heading text-neon-yellow drop-shadow-lg flex items-center gap-3">
              {loading ? '…' : renderSSTValue(totalStakedSST, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-mono">Validator capital</p>
          </div>
        </motion.div>
      ) : null}

      {showProductAnalytics ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {showProtocolDemoBlocks ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <HolographicCard
                    title="Value monitored"
                    value={`$${coverageUSD.toLocaleString()}`}
                    subtitle="Across observed pools"
                    riskScore={maxRiskScore}
                  />
                  <HolographicCard
                    title="Total Staked"
                    value={loading ? '…' : renderSSTValue(totalStakedSST, { maximumFractionDigits: 0 })}
                    subtitle="Validator capital"
                    riskScore={Math.min(maxRiskScore, 50)}
                  />
                  <HolographicCard
                    title="DAO Treasury"
                    value={loading ? '…' : renderSSTValue(treasurySST, { maximumFractionDigits: 2 })}
                    subtitle="Governance reserves"
                    riskScore={20}
                  />
                  <HolographicCard
                    title="Market data — ETH/USD"
                    value={ethPrice ? `$${ethPrice.toFixed(2)}` : '—'}
                    subtitle="Reference price (oracle path)"
                    riskScore={30}
                  />
                </div>
                <OracleFeedPanel />
                <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <HolographicCard title="24h Risk Index" value={sigma24h.toFixed(1)} subtitle="From ETH/USD volatility" riskScore={sigma24h} />
                  <HolographicCard title="7d Risk Index" value={sigma7d.toFixed(1)} subtitle="From ETH/USD volatility" riskScore={sigma7d} />
                  <HolographicCard title="APY (Annual)" value={`${apy.toFixed(2)}%`} subtitle="From reward rate" riskScore={20} />
                  <HolographicCard
                    title="Status"
                    value={error ? 'Degraded' : 'Demo feed'}
                    subtitle={error?.message || 'Investor demo telemetry'}
                    riskScore={error ? 80 : 20}
                  />
                </motion.div>
              </>
            ) : null}
          </div>
          <div className="lg:col-span-4 space-y-6">
            <RiskRadar simulatedRiskScore={Math.min(Math.round(maxRiskScore * 1.5), 100)} simulatedPrice={ethPrice} />
            <LiveEventsPanel />
          </div>
        </div>
      ) : null}
    </section>
  )
}
