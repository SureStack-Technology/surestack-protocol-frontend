import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ExplorerIntelligenceBackdrop from '@/components/dashboard/ExplorerIntelligenceBackdrop.jsx'
import ExplorerReferenceBar from '@/components/dashboard/ExplorerReferenceBar.jsx'
import PrimeWalletIntelligenceConsole from '@/components/dashboard/PrimeWalletIntelligenceConsole.jsx'
import UniversalRiskScanner from '@/components/dashboard/prime/UniversalRiskScanner.jsx'
import SocialIntelligencePanel from '@/components/dashboard/prime/SocialIntelligencePanel.jsx'
import { ExplorerFoundingPanel } from '@/components/dashboard/ExplorerAcquisitionView.jsx'
import { usePrimeCommandCenter } from '@/hooks/usePrimeCommandCenter.js'
import { hasIntelligenceProOrHigher } from '@/utils/dashboardPersonalization.js'
import { walletRiskBandLabel } from '@/hooks/useWalletRiskIndex.js'
import { PRIME_INTELLIGENCE_DISCLAIMER } from '@/constants/complianceCopy.js'
import { dataStatusClass, formatDataStatusLabel } from '@/utils/primeIntelligenceFormat.js'
import '@/styles/prime-command-center.css'

function DataStatusBadge({ status }) {
  const label = formatDataStatusLabel(status)
  return (
    <span className={dataStatusClass(status)} title={`Data provenance: ${label}`}>
      {label}
    </span>
  )
}

function IntelChip({ label, value, subtext, tone = 'indigo', loading = false }) {
  const toneClass =
    tone === 'rose'
      ? 'prime-intel-chip prime-intel-chip--rose'
      : tone === 'amber'
        ? 'prime-intel-chip prime-intel-chip--amber'
        : tone === 'emerald'
          ? 'prime-intel-chip prime-intel-chip--emerald'
          : 'prime-intel-chip'
  if (loading) {
    return <motion.div className={`${toneClass} prime-intel-chip--skeleton`} aria-hidden />
  }
  return (
    <motion.div
      className={`${toneClass} prime-intel-chip--interactive h-full flex flex-col justify-between min-h-[5.5rem]`}
      layout
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
    >
      <p className="prime-intel-chip__label mb-2">{label}</p>
      <motion.div className="mt-auto">
        <p className="prime-intel-chip__value tabular-nums">{value}</p>
        {subtext ? <p className="prime-intel-chip__sub mt-1">{subtext}</p> : null}
      </motion.div>
    </motion.div>
  )
}

function PriorityBadge({ level }) {
  const cls =
    level === 'HIGH'
      ? 'prime-priority prime-priority--high'
      : level === 'MEDIUM'
        ? 'prime-priority prime-priority--medium'
        : 'prime-priority prime-priority--low'
  return <span className={cls}>{level}</span>
}

function severityBar(severity) {
  if (severity === 'HIGH') return 'bg-rose-500'
  if (severity === 'MEDIUM') return 'bg-amber-400'
  return 'bg-sky-400'
}

const EXPOSURE_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']

function ExposureSeverityMeter({ active }) {
  return (
    <div className="prime-exposure-meter" role="group" aria-label="Exposure severity">
      {EXPOSURE_LEVELS.map((lvl) => (
        <div
          key={lvl}
          className={`prime-exposure-meter__seg ${
            lvl === active ? `prime-exposure-meter__seg--active prime-exposure-meter__seg--${lvl.toLowerCase()}` : ''
          }`}
        >
          <span>{lvl}</span>
        </div>
      ))}
    </div>
  )
}

function trendChipClass(trend) {
  if (trend === 'Critical') return 'prime-trend-chip prime-trend-chip--critical'
  if (trend === 'Elevating') return 'prime-trend-chip prime-trend-chip--elevating'
  if (trend === 'Improving') return 'prime-trend-chip prime-trend-chip--improving'
  return 'prime-trend-chip prime-trend-chip--stable'
}

function WalletExposureHeatmap({ rows, status }) {
  return (
    <div className="prime-heatmap">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-violet-200/90">Wallet Exposure Map</p>
          <p className="text-[11px] text-slate-500 mt-1">Relative exposure bands from current wallet findings</p>
        </div>
        <DataStatusBadge status={status} />
      </div>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="prime-heatmap-row">
            <div className="flex justify-between gap-3 text-[11px] mb-1">
              <span className="text-slate-300 font-medium">{row.label}</span>
              <span className="font-mono text-slate-500 tabular-nums">
                {row.level}/{row.max}
              </span>
            </div>
            <div className="prime-heatmap-bar" aria-hidden>
              {Array.from({ length: row.max }).map((_, i) => (
                <span
                  key={i}
                  className={`prime-heatmap-bar__seg ${i < row.level ? 'prime-heatmap-bar__seg--on' : ''}`}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function WeeklyExposureTrendChart({ points }) {
  const w = 240
  const h = 56
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const coords = points.map((v, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * w
    const y = h - ((v - min) / range) * (h - 10) - 5
    return { x, y }
  })
  const pts = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const area = `${coords[0].x},${h} ${pts} ${coords[coords.length - 1].x},${h}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16 prime-sparkline" aria-hidden>
      <defs>
        <linearGradient id="prime-exposure-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(99,102,241,0.4)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0)" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#prime-exposure-fill)" />
      <line x1="0" y1={h - 1} x2={w} y2={h - 1} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke="rgb(129 140 248)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function formatRefreshTime(d) {
  if (!d) return 'Awaiting refresh'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PrimeCommandCenter({ profile, profileLoading, profileError, refetchProfile }) {
  const intel = usePrimeCommandCenter(profile)
  const [analystBusy, setAnalystBusy] = useState(false)
  const hasVerifiedWallet = Boolean(profile?.wallets?.some((w) => w.verifiedAt))
  const showRiskScanner = hasVerifiedWallet && hasIntelligenceProOrHigher(profile)
  const verifiedWalletAddress = profile?.wallets?.find((w) => w.verifiedAt)?.address || null

  const handleFreshAnalysis = async () => {
    setAnalystBusy(true)
    try {
      const { ok, body } = await intel.runFreshAnalysis()
      if (!ok) {
        toast.error(body?.message || body?.error || 'Brief refresh failed')
        return
      }
      toast.success('Intelligence brief refreshed')
    } catch {
      toast.error('Brief refresh failed')
    } finally {
      setAnalystBusy(false)
    }
  }

  const deltaUp = intel.scoreDelta >= 0
  const DeltaIcon = deltaUp ? TrendingUp : TrendingDown
  const series = intel.scoreSeries.points
  const feed = intel.intelligenceFeed

  return (
    <section className="prime-command-workspace relative z-0 pointer-events-auto pt-6 sm:pt-8 pb-20 sm:pb-24 min-h-screen text-white">
      <div className="relative mb-10 sm:mb-12 rounded-3xl border border-violet-500/20 overflow-hidden prime-command-hero-shell">
        <div className="absolute inset-0 z-0">
          <ExplorerIntelligenceBackdrop className="h-full w-full min-h-[360px]" />
        </div>
        <motion.div
          className="absolute inset-0 z-[1] bg-gradient-to-br from-violet-950/40 via-transparent to-indigo-950/30 pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 p-6 sm:p-8 md:p-10 space-y-8">
          <ExplorerReferenceBar profile={profile} variant="prime" macroSnapshot={intel.macroState} />

          <motion.div
            id="explorer-overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 scroll-mt-28"
          >
            <div className="space-y-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-violet-300/90">
                Prime Intelligence
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-[2.5rem] font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-100 to-indigo-200 tracking-tight leading-[1.08]">
                Command Center
              </h1>
              <p className="text-sm sm:text-[15px] text-slate-300/95 max-w-3xl leading-relaxed">
                Wallet exposure, approvals, contract trust, and scenario analysis — refreshed on each intelligence cycle.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">Command metrics</p>
              {!intel.loading ? <DataStatusBadge status={intel.heroProvenance} /> : null}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
              {intel.loading && !intel.riskFromApi
                ? [0, 1, 2, 3, 4].map((i) => <IntelChip key={i} label="" value="" loading />)
                : intel.heroChips.map((chip) => (
                    <IntelChip
                      key={chip.key}
                      label={chip.label}
                      value={chip.value}
                      subtext={chip.subtext}
                      tone={chip.tone}
                    />
                  ))}
            </div>

            {showRiskScanner ? (
              <div id="prime-risk-scanner" className="scroll-mt-28 pt-1">
                <UniversalRiskScanner
                  api={intel.api}
                  lastInteractedAddress={intel.lastInteractedContract}
                  walletAddress={verifiedWalletAddress}
                  walletCacheKey={intel.walletKey}
                  approvalInventory={intel.approvalInventory}
                  showWalletExposure={hasIntelligenceProOrHigher(profile)}
                />
              </div>
            ) : null}

            <p className="text-[11px] text-slate-500 max-w-3xl leading-relaxed border border-white/10 rounded-xl px-4 py-3 bg-black/25">
              {PRIME_INTELLIGENCE_DISCLAIMER}
            </p>
          </motion.div>
        </div>
      </div>

      <motion.div className="relative z-10 space-y-8 sm:space-y-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-7">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="prime-glass xl:col-span-7 p-6 sm:p-7 space-y-5 border border-violet-500/25 prime-panel-hover"
          >
            <motion.div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-violet-200/90">AI Intelligence Brief</p>
                <h2 className="text-lg font-heading text-white mt-1">{intel.aiBrief.headline}</h2>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Sparkles className="text-violet-300 shrink-0" size={22} aria-hidden />
                <DataStatusBadge status={intel.aiBrief.dataStatus} />
              </div>
            </motion.div>

            <div className="prime-brief-summary-card rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-black/30 px-4 py-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-2">Summary</p>
              <p className="text-sm text-slate-100 leading-relaxed">{intel.aiBrief.summary}</p>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3.5 shadow-[0_0_24px_rgba(245,158,11,0.06)]">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-200/90 mb-1.5">Top recommendation</p>
              <p className="text-sm text-slate-100 leading-relaxed font-medium">{intel.aiBrief.recommendation}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2.5">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Risk posture</p>
                <p className="text-sm text-white mt-1">{intel.aiBrief.riskPosture}</p>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2.5 flex flex-col gap-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Confidence</p>
                <p className="text-sm text-violet-200 mt-1 font-medium">{intel.aiBrief.certainty}</p>
              </div>
            </div>

            <button
              type="button"
              disabled={analystBusy || !hasVerifiedWallet}
              onClick={handleFreshAnalysis}
              className="explorer-btn-gradient text-sm !py-2.5 inline-flex items-center gap-2 disabled:opacity-50 transition-transform hover:scale-[1.01]"
            >
              {analystBusy ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Refresh Intelligence Brief
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="prime-glass xl:col-span-5 p-6 sm:p-7 border border-indigo-500/20 prime-panel-hover"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-indigo-200/85">Weekly Exposure Trend</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Exposure trajectory across recent intelligence refresh cycles.
                </p>
              </div>
              <DataStatusBadge status={intel.scoreSeries.status} />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Trend</span>
              <span className={trendChipClass(intel.exposureTrend)}>{intel.exposureTrend}</span>
            </div>
            <div className="prime-sparkline-wrap rounded-lg border border-white/[0.06] bg-black/20 px-3 py-3">
              <WeeklyExposureTrendChart points={series} />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-3 pt-1 border-t border-white/[0.06]">
              <span>Recent cycles</span>
              <span className="text-indigo-200 tabular-nums">
                Latest {series[series.length - 1] ?? intel.score}
              </span>
            </div>
          </motion.div>
        </div>

        <SocialIntelligencePanel profile={profile} />

        <motion.div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7">
          <motion.div
            id="explorer-security"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="prime-glass lg:col-span-5 p-6 sm:p-7 border border-indigo-400/25 scroll-mt-28 prime-panel-hover"
          >
            <div className="flex items-start justify-between gap-2 mb-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-indigo-200/90">Wallet Risk Index</p>
              <DataStatusBadge status={intel.walletRiskStatus} />
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-heading font-bold text-white tabular-nums">{intel.score}</span>
              <span className="text-sm text-slate-500 font-mono pb-2">/ 100</span>
            </div>
            <p
              className={`text-sm font-mono font-semibold uppercase tracking-[0.2em] mt-2 ${
                intel.band === 'HIGH'
                  ? 'text-rose-300'
                  : intel.band === 'ELEVATED'
                    ? 'text-amber-200'
                    : intel.band === 'MODERATE'
                      ? 'text-amber-200/90'
                      : 'text-emerald-300'
              }`}
            >
              {walletRiskBandLabel(intel.band)}
            </p>
            <p
              className={`text-xs font-mono mt-2 flex items-center gap-1 ${
                deltaUp ? 'text-rose-300/90' : 'text-emerald-300/90'
              }`}
            >
              <DeltaIcon size={14} aria-hidden />
              {intel.deltaDisplay} vs prior cycle
            </p>
            <p className="text-[10px] font-mono text-slate-500 mt-2">
              Last refresh: {formatRefreshTime(intel.riskLastRefresh)}
            </p>

            <div className="mt-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-2">Exposure severity</p>
              <ExposureSeverityMeter active={intel.exposureSeverity} />
            </div>

            <ul className="mt-5 space-y-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Risk drivers</p>
              {intel.riskDrivers.map((d) => (
                <li key={d.title} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-200">{d.title}</span>
                    <PriorityBadge level={d.severity === 'WATCH' ? 'LOW' : d.severity} />
                  </div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${severityBar(d.severity)}`}
                      initial={{ width: 0 }}
                      animate={{
                        width: d.severity === 'HIGH' ? '88%' : d.severity === 'MEDIUM' ? '62%' : '38%',
                      }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="prime-glass lg:col-span-4 p-6 sm:p-7 border border-white/10 prime-panel-hover"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-slate-400 flex items-center gap-2">
                <Activity size={14} className="text-violet-300" />
                Intelligence Feed
              </p>
              <DataStatusBadge status={feed.sectionStatus} />
            </div>
            {feed.hasInferred ? (
              <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500 mb-3">
                Includes inferred timeline signals
              </p>
            ) : null}
            <ul className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 prime-feed-scroll">
              {feed.items.map((ev) => (
                <li
                  key={ev.id}
                  className={`prime-feed-item prime-feed-item--${String(ev.severity).toLowerCase()}`}
                >
                  <PriorityBadge level={ev.severity} />
                  <motion.div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-200 font-medium leading-snug">{ev.summary}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {new Date(ev.at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </motion.div>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="prime-glass lg:col-span-3 p-6 sm:p-7 border border-emerald-500/15 prime-panel-hover"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-200/80">Recommended Actions</p>
            <p className="text-[10px] text-slate-500 mt-1 mb-4 leading-snug">
              Operational actions generated from current intelligence state.
            </p>
            <ul className="space-y-3">
              {intel.recommendedActions.map((a) => (
                <li key={a.id} className="prime-action-card">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold text-white">{a.title}</p>
                    <PriorityBadge level={a.priority} />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{a.detail}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="prime-glass p-6 sm:p-7 border border-violet-500/25 prime-panel-hover"
        >
          <WalletExposureHeatmap rows={intel.exposureHeatmap} status={intel.heatmapStatus} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="prime-glass border border-amber-500/25 p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-start prime-panel-hover"
        >
          <Shield className="text-amber-300 shrink-0" size={22} aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-amber-200/90">Operational advisory</p>
            <h3 className="text-base font-heading text-white mt-1">{intel.operationalAdvisory.headline}</h3>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">{intel.operationalAdvisory.action}</p>
          </div>
        </motion.div>

        {hasVerifiedWallet ? (
          <div id="prime-wallet-intelligence" className="scroll-mt-28">
            <PrimeWalletIntelligenceConsole
              profile={profile}
              variant="prime"
              profileLoading={profileLoading}
              profileError={profileError}
              onProfileRefresh={refetchProfile}
              commandCenterMode
            />
          </div>
        ) : (
          <div className="prime-glass p-6 text-sm text-slate-400 border border-white/10">
            Verify a wallet to unlock Prime intelligence modules.
            <Link to="/dashboard#explorer-wallet-identity" className="text-violet-300 underline ml-1">
              Connect wallet
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="prime-glass prime-plan-compact p-4 sm:p-5 border border-emerald-500/20 prime-panel-hover"
          >
            <h2 className="text-sm font-heading font-semibold text-white">Prime Intelligence Active</h2>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-300">
              {[
                { short: 'Monitoring', full: 'Continuous monitoring' },
                { short: 'AI Brief', full: 'AI intelligence brief' },
                { short: 'Scenarios', full: 'Scenario stress lab' },
                { short: 'Risk Scanner', full: 'Universal risk scanner' },
                { short: 'Contract Trust', full: 'Contract trust engine' },
                { short: 'Alerts', full: 'Threat alerts' },
              ].map((item) => (
                <li key={item.short} className="flex items-center gap-1.5" title={item.full}>
                  <span className="text-emerald-400 text-[10px]" aria-hidden>
                    ✓
                  </span>
                  {item.short}
                </li>
              ))}
            </ul>
            <Link
              to="/membership"
              className="explorer-btn-outline text-[11px] mt-3 inline-flex items-center gap-1 !py-1.5 !px-2.5 transition-colors hover:border-violet-400/40"
            >
              Manage Membership <ArrowUpRight size={12} />
            </Link>
          </motion.div>
          <ExplorerFoundingPanel profile={profile} onProfileRefresh={refetchProfile} compact />
        </div>
      </motion.div>
    </section>
  )
}
