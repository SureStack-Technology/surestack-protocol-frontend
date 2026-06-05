import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDashboardProfile } from '@/hooks/useDashboardProfile'
import ExplorerIntelligenceBackdrop from '@/components/dashboard/ExplorerIntelligenceBackdrop.jsx'
import ExplorerReferenceBar from '@/components/dashboard/ExplorerReferenceBar.jsx'
import MarketPulseWidget from '@/components/dashboard/MarketPulseWidget.jsx'
import NarrativePulseCard from '@/components/dashboard/NarrativePulseCard.jsx'
import SecurityPulseWidget from '@/components/dashboard/SecurityPulseWidget.jsx'
import CurrentPlanCard from '@/components/dashboard/CurrentPlanCard.jsx'
import PrimeCommandCenter from '@/components/dashboard/prime/PrimeCommandCenter.jsx'
import PrimeWalletIntelligenceConsole from '@/components/dashboard/PrimeWalletIntelligenceConsole.jsx'
import {
  ExplorerWalletPanel,
  ExplorerIntelligenceAccessPanel,
  ExplorerFoundingPanel,
} from '@/components/dashboard/ExplorerAcquisitionView.jsx'
import { EXPLORER_CONSOLE_COMPLIANCE_LINE } from '@/constants/complianceCopy.js'
import {
  ATLAS_INTELLIGENCE_DESCRIPTION,
  EXPLORER_POSITIONING_TAGLINE,
} from '@/constants/intelligenceTiers.js'
import { getConsoleExperienceLabels } from '@/utils/dashboardPersonalization.js'
import '@/styles/explorer-console.css'

/**
 * Digital Asset Risk Intelligence console — Explorer, Prime, and Atlas workspaces.
 * @param {'explorer' | 'prime' | 'atlas'} variant
 */
export default function ModernIntelligenceDashboard({
  variant,
  profile: profileProp,
  profileLoading: profileLoadingProp,
  profileError: profileErrorProp,
  refetchProfile: refetchProfileProp,
}) {
  const ctx = useDashboardProfile()
  const profile = profileProp ?? ctx.profile
  const profileLoading = profileLoadingProp ?? ctx.profileLoading
  const profileError = profileErrorProp ?? ctx.profileError
  const refetchProfile = refetchProfileProp ?? ctx.refetchProfile

  const { hash } = useLocation()
  const consoleLabels = getConsoleExperienceLabels(profile ?? undefined)
  const isExplorer = variant === 'explorer'
  const isPrime = variant === 'prime'
  const isAtlas = variant === 'atlas'
  const hasVerifiedWallet = Boolean(profile?.wallets?.some((w) => w.verifiedAt))

  useEffect(() => {
    if (!hash) return
    const id = hash.replace('#', '')
    if (!id) return
    const el = document.getElementById(id)
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [hash])

  const heroBody = isExplorer
    ? `${EXPLORER_POSITIONING_TAGLINE} Reference market telemetry, verified wallet continuity, and orientation help you decide if SureStack is useful — snapshot wallet risk, one complimentary AI Wallet Risk Analyst analysis, and two preset scenarios. Continuous monitoring, the full Scenario Intelligence Simulator, timelines, and Alert Center unlock with Prime Intelligence.`
    : `${ATLAS_INTELLIGENCE_DESCRIPTION} Team-scale workflows, advanced operator surfaces, and strategic intelligence — billing and API enablement per your agreement.`

  if (isPrime) {
    return (
      <PrimeCommandCenter
        profile={profile}
        profileLoading={profileLoading}
        profileError={profileError}
        refetchProfile={refetchProfile}
      />
    )
  }

  return (
    <section className="explorer-workspace relative z-0 pointer-events-auto pt-6 sm:pt-8 pb-20 sm:pb-24 min-h-screen text-white">
      <div className="relative mb-11 sm:mb-14 rounded-3xl border border-indigo-500/15 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <ExplorerIntelligenceBackdrop className="h-full w-full min-h-[320px]" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#05080f] to-transparent z-[1] pointer-events-none" />
        <div className="relative z-10 p-6 sm:p-8 md:p-11 space-y-8">
          <ExplorerReferenceBar profile={profile ?? undefined} />

          <motion.div
            id="explorer-overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="explorer-hero-panel p-7 sm:p-9 md:p-11 space-y-7 scroll-mt-28"
          >
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-[2.4rem] font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-sky-200 tracking-tight leading-[1.1]">
                {consoleLabels.dashboardHeroTitle}
              </h1>
              {consoleLabels.dashboardHeroSubtitle ? (
                <p className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.26em] text-sky-400/85 max-w-2xl">
                  {consoleLabels.dashboardHeroSubtitle}
                </p>
              ) : null}
            </div>
            <p className="text-sm sm:text-[15px] text-slate-300/95 max-w-3xl leading-relaxed">{heroBody}</p>
            <p className="text-[11px] sm:text-xs text-slate-500 max-w-3xl leading-relaxed border border-white/10 rounded-xl px-4 py-3.5 bg-black/25">
              {EXPLORER_CONSOLE_COMPLIANCE_LINE}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 space-y-11 sm:space-y-12 lg:space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 lg:gap-9 items-stretch">
          <MarketPulseWidget variant="context" />
          {isExplorer ? <NarrativePulseCard profile={profile ?? undefined} /> : null}
          <SecurityPulseWidget />
          <ExplorerWalletPanel profile={profile ?? undefined} onProfileRefresh={refetchProfile} />
        </div>

        {hasVerifiedWallet ? (
          <div id="prime-wallet-intelligence" className="scroll-mt-28">
            <PrimeWalletIntelligenceConsole
              profile={profile ?? undefined}
              variant={isExplorer ? 'explorer' : 'prime'}
              profileLoading={profileLoading}
              profileError={profileError}
              onProfileRefresh={refetchProfile}
            />
          </div>
        ) : null}

        {isAtlas ? (
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-7 lg:gap-9 items-stretch">
          <CurrentPlanCard useParentProfile parentProfile={profile} parentProfileLoading={profileLoading} />
          {isExplorer ? (
            <ExplorerIntelligenceAccessPanel />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="explorer-card-premium explorer-card-tight border border-indigo-500/15 flex flex-col h-full"
            >
              <p className="text-[10px] uppercase tracking-[0.26em] text-indigo-300/85 font-mono">Upgrade paths</p>
              <p className="text-[13px] text-slate-400 mt-2 leading-relaxed flex-1">
                {isPrime
                  ? 'Your Prime Intelligence workspace is active. Atlas Intelligence adds team workflows, strategic reporting, and operator-grade surfaces when you are ready to scale.'
                  : 'Atlas Intelligence extends this console with team workflows, strategic reporting, and operator-grade surfaces.'}
              </p>
              <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-white/[0.06]">
                <Link to="/membership" className="explorer-btn-gradient text-[13px] !py-2.5 !px-4">
                  View membership ladder
                </Link>
                <Link to="/pricing" className="explorer-btn-outline text-[13px] !py-2.5 !px-4">
                  Explore Intelligence
                </Link>
              </div>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7 items-stretch">
          <motion.div
            id="explorer-workspace-orientation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="explorer-card-premium explorer-card-tight border border-white/[0.08] scroll-mt-28"
          >
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500 font-mono mb-2">Console orientation</p>
            <h3 className="text-base font-heading text-white mb-3">Intelligence discipline</h3>
            <ul className="text-[13px] text-slate-300/95 space-y-2.5 max-w-xl leading-relaxed">
              <li>
                <span className="text-sky-200/90 font-medium">Security</span> — verify domains and contracts; treat
                unsolicited &ldquo;support&rdquo; DMs as untrusted.
              </li>
              <li>
                <span className="text-slate-200 font-medium">Reference data</span> — orientation and awareness only; not
                investment, treasury, or execution advice.
              </li>
              <li>
                <span className="text-slate-200 font-medium">Custody</span> — self-custody wallets you control; isolate
                material balances from routine signing keys.
              </li>
            </ul>
          </motion.div>
          <ExplorerFoundingPanel profile={profile ?? undefined} onProfileRefresh={refetchProfile} />
        </div>
      </div>
    </section>
  )
}
