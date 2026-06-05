import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useAuthApi } from '@/hooks/useAuthApi'
import { fetchAuthMeDeduped } from '@/lib/authMeClient.js'
import {
  ATLAS_INTELLIGENCE_FEATURES,
  ATLAS_INTELLIGENCE_PRICE,
  ATLAS_INTELLIGENCE_SHORT_DESCRIPTOR,
  ATLAS_INTELLIGENCE_DESCRIPTION,
  ALPHA_INTELLIGENCE_PRICE,
  EXPLORER_AI_WALLET_ANALYST_FEATURE,
  EXPLORER_POSITIONING_TAGLINE,
  PRIME_INTELLIGENCE_BETA_BADGE,
  PRIME_INTELLIGENCE_FEATURES,
  PRIME_INTELLIGENCE_PRICE,
  WEEKLY_MARKET_THREAT_INTELLIGENCE_BRIEF,
  getTierDisplayName,
} from '@/constants/intelligenceTiers.js'
import { PRIME_BETA_SECTION_ID } from '@/constants/primeBetaTelegram.js'
import '@/styles/explorer-console.css'

const EXPLORER_PLAN_LINE =
  `${EXPLORER_POSITIONING_TAGLINE} Snapshot-only wallet risk — upgrade to Prime for continuous monitoring, full Scenario Intelligence Simulator, Wallet Health Timeline, Alert Center, and full AI Wallet Risk Analyst access.`

const TIER_TAGLINE = {
  EXPLORER_ACCESS: EXPLORER_PLAN_LINE,
  INTELLIGENCE_PRO:
    `Your AI digital asset risk co-pilot — continuous monitoring, scenarios, market volatility intelligence, ${WEEKLY_MARKET_THREAT_INTELLIGENCE_BRIEF}, and threat awareness playbooks.`,
  STRATEGIC_ACCESS: ATLAS_INTELLIGENCE_DESCRIPTION,
}

const INCLUDED_BY_TIER = {
  EXPLORER_ACCESS: [
    'Secure account access',
    'Optional wallet verification',
    'Explorer Intelligence Console',
    'Reference market context (ETH/USD)',
    'Security orientation',
    'Wallet risk snapshot (no continuous monitoring)',
    'Founders Pass access',
    EXPLORER_AI_WALLET_ANALYST_FEATURE,
    'Scenario Intelligence — 2 fixed presets (ETH volatility shock, stablecoin depeg)',
    'Membership & upgrade paths',
  ],
  INTELLIGENCE_PRO: [...PRIME_INTELLIGENCE_FEATURES],
  STRATEGIC_ACCESS: ATLAS_INTELLIGENCE_FEATURES,
}

function formatTier(tier) {
  return getTierDisplayName(tier || 'EXPLORER_ACCESS')
}

export default function CurrentPlanCard({
  useParentProfile = false,
  parentProfile = null,
  parentProfileLoading = false,
} = {}) {
  const { isLoaded, userId } = useAuth()
  const { api } = useAuthApi()
  const apiRef = useRef(api)
  apiRef.current = api
  const [localProfile, setLocalProfile] = useState(null)
  const [localLoading, setLocalLoading] = useState(true)

  useEffect(() => {
    if (useParentProfile) return
    if (!isLoaded || !userId) {
      setLocalLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { res, data } = await fetchAuthMeDeduped(apiRef.current, userId)
        if (!cancelled) setLocalProfile(res.ok ? data : null)
      } catch {
        if (!cancelled) setLocalProfile(null)
      } finally {
        if (!cancelled) setLocalLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [useParentProfile, isLoaded, userId])

  const profile = useParentProfile ? parentProfile : localProfile
  const loading = useParentProfile ? parentProfileLoading : localLoading

  const tierKey = profile?.membershipTier || 'EXPLORER_ACCESS'
  const planName = formatTier(tierKey)
  const isExplorer = tierKey === 'EXPLORER_ACCESS'
  const includedLines = INCLUDED_BY_TIER[tierKey] || INCLUDED_BY_TIER.EXPLORER_ACCESS
  const planTagline = TIER_TAGLINE[tierKey] || TIER_TAGLINE.EXPLORER_ACCESS
  const includedHeading = tierKey === 'EXPLORER_ACCESS' ? 'Included now' : 'Your intelligence bundle'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`${
        isExplorer
          ? 'explorer-card-premium border border-indigo-500/20 shadow-[0_24px_80px_rgba(0,0,0,0.35)]'
          : 'glass-panel holo-glow'
      } p-6 sm:p-8 md:p-9 card-hoverable relative overflow-hidden`}
    >
      <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-mono">Current plan</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-heading text-white">{loading ? '…' : planName}</h2>
            {!loading && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.18)]">
                <Sparkles size={12} />
                Active
              </span>
            )}
          </div>
          {!isExplorer ? (
            <p className="text-sm text-slate-400 mt-3 max-w-xl leading-relaxed">{planTagline}</p>
          ) : (
            <p className="text-[13px] text-slate-500 mt-3 max-w-md leading-snug">
              Upgrade when you are ready — paths are listed below.
            </p>
          )}
          {!isExplorer && (
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Tier is synced from your account; paid checkout and tier changes follow Membership when available.
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0 self-start">
          {!isExplorer ? (
            <>
              <Link
                to="/membership"
                className="explorer-btn-gradient text-[13px] !py-2.5 !px-5 inline-flex items-center justify-center gap-2"
              >
                View Membership
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/membership"
                className="explorer-btn-outline text-[13px] !py-2.5 !px-5 inline-flex items-center justify-center"
              >
                Manage Membership
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <div
        className={`relative z-10 mt-7 grid gap-6 ${
          isExplorer ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        {!isExplorer && (
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400 font-mono mb-3">{includedHeading}</p>
            <ul className="text-sm text-slate-200/90 space-y-1.5">
              {includedLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={`rounded-xl border border-white/10 bg-slate-950/40 p-5 ${isExplorer ? 'max-w-2xl' : ''}`}>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400 font-mono mb-3">
            {isExplorer ? 'Upgrade paths' : 'Paid tiers'}
          </p>
          {isExplorer ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-white">Explorer Access</p>
                  <p className="text-[11px] text-emerald-200/85">Active</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-200">
                  Current
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/35 px-3 py-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  <Lock className="text-slate-500 shrink-0 mt-0.5" size={16} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200">Prime Intelligence — {PRIME_INTELLIGENCE_PRICE}</p>
                    <p className="text-[11px] text-slate-500">{PRIME_INTELLIGENCE_BETA_BADGE}</p>
                  </div>
                </div>
                <Link
                  to={`/membership#${PRIME_BETA_SECTION_ID}`}
                  className="explorer-btn-outline !text-[11px] !py-1.5 !px-3 shrink-0"
                >
                  Apply for Prime Beta
                </Link>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/35 px-3 py-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  <Lock className="text-slate-500 shrink-0 mt-0.5" size={16} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200">Alpha Intelligence — {ALPHA_INTELLIGENCE_PRICE}</p>
                    <p className="text-[11px] text-slate-500">Advanced operators · includes Prime depth</p>
                  </div>
                </div>
                <Link
                  to="/membership"
                  className="explorer-btn-outline !text-[11px] !py-1.5 !px-3 shrink-0 border-fuchsia-500/25 text-fuchsia-100/95"
                >
                  Request
                </Link>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/35 px-3 py-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  <Lock className="text-slate-500 shrink-0 mt-0.5" size={16} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200">Atlas Intelligence — {ATLAS_INTELLIGENCE_PRICE}</p>
                    <p className="text-[11px] text-slate-500">{ATLAS_INTELLIGENCE_SHORT_DESCRIPTOR} · EARLY ACCESS</p>
                  </div>
                </div>
                <Link
                  to="/membership"
                  className="explorer-btn-outline !text-[11px] !py-1.5 !px-3 shrink-0 border-cyan-500/25 text-cyan-100/95"
                >
                  Request Atlas Intelligence access
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Prime Intelligence — {PRIME_INTELLIGENCE_PRICE}</p>
                  <p className="text-xs text-slate-400">
                    Full Prime stack — AI analyst, scenarios, timelines, Alert Center,{' '}
                    {WEEKLY_MARKET_THREAT_INTELLIGENCE_BRIEF}
                  </p>
                </div>
                <Link to="/membership" className="btn-outline px-3 py-1 text-xs border-white/15 text-slate-200 shrink-0">
                  View
                </Link>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Alpha Intelligence — {ALPHA_INTELLIGENCE_PRICE}</p>
                  <p className="text-xs text-slate-400">Everything in Prime plus operator-grade maps, trust engine, and smart-money surfaces</p>
                </div>
                <Link to="/membership" className="btn-outline px-3 py-1 text-xs border-fuchsia-400/25 text-fuchsia-100 shrink-0">
                  View
                </Link>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Atlas Intelligence — {ATLAS_INTELLIGENCE_PRICE}</p>
                  <p className="text-xs text-slate-400">{ATLAS_INTELLIGENCE_SHORT_DESCRIPTOR} · EARLY ACCESS</p>
                </div>
                <Link to="/membership" className="btn-brand px-3 py-1 text-xs inline-flex items-center gap-2 shrink-0">
                  View <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
