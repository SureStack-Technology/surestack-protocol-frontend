import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { motion } from 'framer-motion'
import { CheckCircle2, Wallet, ArrowRight, Loader2, Lock, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWeb3 } from '@/contexts/Web3Context.jsx'
import { useAuthApi } from '@/hooks/useAuthApi'
import { useOnboardingWalletVerify } from '@/hooks/useOnboardingWalletVerify'
import { fetchAuthMeDeduped } from '@/lib/authMeClient.js'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'
import { clearExplorerWalletConsoleSkip, markExplorerWalletConsoleSkipped } from '@/utils/dashboardPersonalization'
import { ProfileSyncShell } from '@/components/auth/AuthSessionShell.jsx'
import {
  ATLAS_INTELLIGENCE_BADGE,
  ATLAS_INTELLIGENCE_DESCRIPTION,
  ATLAS_INTELLIGENCE_PRICE,
  ATLAS_INTELLIGENCE_SHORT_DESCRIPTOR,
  WEEKLY_MARKET_THREAT_INTELLIGENCE_BRIEF,
  formatActivePlanLabel,
} from '@/constants/intelligenceTiers.js'

const UPGRADE_TIERS = [
  {
    id: 'INTELLIGENCE_PRO',
    label: 'Prime Intelligence',
    description:
      `$59/mo — your AI digital asset risk co-pilot: continuous monitoring, full Scenario Intelligence Simulator, Wallet Health Timeline, Alert Center, ${WEEKLY_MARKET_THREAT_INTELLIGENCE_BRIEF}, and flagship paid tier depth.`,
    badge: 'Flagship paid tier',
    badgeClass:
      'border-violet-400/35 bg-violet-500/10 text-violet-200',
    ctaLabel: 'Join Prime Intelligence',
    ctaTo: '/membership',
  },
  {
    id: 'ALPHA_INTELLIGENCE',
    label: 'Alpha Intelligence',
    description:
      '$129/mo — operator-grade intelligence: Live Protocol Exposure Graph, Protocol Exposure Map, multi-wallet analytics, Smart Contract Trust Engine, and smart-money surfaces.',
    badge: 'Priority operators',
    badgeClass:
      'border-fuchsia-400/35 bg-fuchsia-950/40 text-fuchsia-100',
    ctaLabel: 'Register Alpha Intelligence interest',
    ctaTo: '/membership',
  },
  {
    id: 'STRATEGIC_ACCESS',
    label: 'Atlas Intelligence',
    description: `${ATLAS_INTELLIGENCE_PRICE} · ${ATLAS_INTELLIGENCE_BADGE} — ${ATLAS_INTELLIGENCE_DESCRIPTION} ${ATLAS_INTELLIGENCE_SHORT_DESCRIPTOR}.`,
    badge: ATLAS_INTELLIGENCE_BADGE,
    badgeClass:
      'border-cyan-400/35 bg-cyan-950/40 text-cyan-100',
    ctaLabel: 'Request Atlas Intelligence access',
    ctaTo: '/membership',
  },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { api } = useAuthApi()
  const apiRef = useRef(api)
  apiRef.current = api
  const { connectWallet, account, isConnected } = useWeb3()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verifiedWallet, setVerifiedWallet] = useState(null)
  const [walletProfileSyncing, setWalletProfileSyncing] = useState(false)
  const [profileSyncError, setProfileSyncError] = useState(null)
  const walletSectionRef = useRef(null)

  const refreshProfile = useCallback(async () => {
    if (!userId) return null
    const { res, data } = await fetchAuthMeDeduped(apiRef.current, userId)
    if (!res.ok || data == null) {
      setProfile(null)
      setVerifiedWallet(null)
      setProfileSyncError(data?.error || `http_${res.status}`)
      return null
    }
    setProfileSyncError(null)
    if (data.onboardingCompleted) {
      setProfile(data)
      const withVerified = data?.wallets?.find((w) => w.verifiedAt) || data?.wallets?.[0]
      setVerifiedWallet(withVerified && withVerified.verifiedAt ? withVerified : null)
      if (import.meta.env.DEV) {
        console.log('[Onboarding] refreshProfile: onboarding complete → dashboard', {
          profileWallets: data?.wallets,
          verifiedWallet: withVerified && withVerified.verifiedAt ? withVerified : null,
          walletVerifiedOnAccount: Boolean(data?.wallets?.some((w) => w.verifiedAt)),
        })
      }
      navigate('/dashboard', { replace: true })
      return data
    }
    setProfile(data)
    const withVerified = data?.wallets?.find((w) => w.verifiedAt) || data?.wallets?.[0]
    setVerifiedWallet(withVerified && withVerified.verifiedAt ? withVerified : null)
    if (import.meta.env.DEV) {
      console.log('[Onboarding] refreshProfile', {
        profileWallets: data?.wallets,
        verifiedWallet: withVerified && withVerified.verifiedAt ? withVerified : null,
        walletVerifiedOnAccount: Boolean(data?.wallets?.some((w) => w.verifiedAt)),
      })
    }
    return data
  }, [userId, navigate])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        const data = await refreshProfile()
        if (import.meta.env.DEV) {
          console.log('[Onboarding] /api/auth/me', {
            ok: Boolean(data),
            onboardingCompleted: data?.onboardingCompleted,
          })
        }
        if (data?.onboardingCompleted) return
      } catch {
        toast.error('Could not load profile')
      } finally {
        setLoading(false)
      }
    })()
  }, [userId, refreshProfile])

  const scrollToWalletSection = useCallback(() => {
    walletSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const onWalletVerified = useCallback(
    async (wallet) => {
      if (wallet?.verifiedAt) setVerifiedWallet(wallet)
      setWalletProfileSyncing(true)
      try {
        await refreshProfile()
      } finally {
        setWalletProfileSyncing(false)
      }
    },
    [refreshProfile],
  )

  const {
    handleWalletVerify,
    handleFoundersPassVerifyClick,
    walletBusy,
    phaseLabel,
    lastError,
    verifyDisabled,
    verifyDisabledReason,
  } = useOnboardingWalletVerify({
    onVerified: onWalletVerified,
    scrollToWalletSection,
  })

  const serverWalletVerified = Boolean(profile?.wallets?.some((w) => w.verifiedAt))
  const walletVerifiedOnAccount = Boolean(
    verifiedWallet?.verifiedAt || serverWalletVerified
  )
  const foundingActive =
    Boolean(profile?.foundingMember) && profile?.founderCredentialStatus === 'ACTIVE'

  const finishOnboarding = async (skipWallet) => {
    const t = toast.loading('Completing onboarding…')
    try {
      const res = await api('/api/auth/me/onboarding', {
        method: 'PATCH',
        body: {
          onboardingCompleted: true,
          onboardingStep: 3,
          skipWallet,
        },
      })
      if (!res.ok) throw new Error('update_failed')
      if (skipWallet) {
        markExplorerWalletConsoleSkipped()
      } else {
        clearExplorerWalletConsoleSkip()
      }
      toast.success('Welcome to your intelligence console', { id: t })
      navigate('/membership', { replace: true })
    } catch {
      toast.error('Could not finish onboarding', { id: t })
    }
  }

  if (loading) {
    return (
      <PublicMarketingShell>
        <PublicMarketingHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24 px-4">
          <Loader2 className="animate-spin text-violet-400" size={38} />
          <p className="text-sm text-slate-400 font-mono uppercase tracking-[0.2em] text-center">
            Syncing your SureStack profile…
          </p>
        </div>
      </PublicMarketingShell>
    )
  }

  if (!profile && profileSyncError && userId) {
    return (
      <PublicMarketingShell>
        <PublicMarketingHeader />
        <div className="flex-1 flex items-center justify-center py-16">
          <ProfileSyncShell
            errorCode={profileSyncError}
            onRetry={() => {
              setLoading(true)
              refreshProfile().finally(() => setLoading(false))
            }}
          />
        </div>
      </PublicMarketingShell>
    )
  }

  return (
    <PublicMarketingShell>
      <PublicMarketingHeader />
      <div className="max-w-xl mx-auto px-4 pb-24 pt-8 text-white sm:px-5">
        <div className="mx-auto space-y-8 sm:space-y-10 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <p className="text-[10px] uppercase tracking-[0.35em] text-safe">Phase 1 · Onboarding</p>
            <h1 className="text-2xl sm:text-3xl font-heading gradient-text uppercase tracking-wider px-1">
              Intelligence onboarding
            </h1>
            <p className="text-slate-400 text-sm px-1">
              Email verified through Clerk. <strong className="text-slate-200">Explorer Access</strong> is active on your
              account — your free intelligence entry layer.
            </p>
          </motion.div>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed text-center px-1 border border-white/10 rounded-xl bg-slate-950/50 py-3 sm:py-3.5">
            Paid Digital Asset Risk Intelligence tiers (Prime Intelligence, Alpha Intelligence, and Atlas Intelligence) unlock
            from{' '}
            <Link to="/membership" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Membership
            </Link>{' '}
            when billing is available — not from this screen.
          </p>

          <div className="public-premium-card p-5 sm:p-6 rounded-xl border border-safe/40 bg-safe/[0.06] space-y-4 ring-1 ring-safe/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-safe text-xs uppercase tracking-[0.28em]">Your access</h2>
                <p className="mt-2 text-lg font-heading text-white">Explorer Access</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Your secure entry into SureStack Intelligence — secure account access, optional wallet verification,
                  Explorer Intelligence Console, reference market context, and a limited wallet risk snapshot. Full Digital Asset
                  Risk Intelligence unlocks with Prime Intelligence and above.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">
                Active
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-emerald-200/95">
              <CheckCircle2 className="text-safe shrink-0" size={18} />
              <span>This is your default tier after signup — no selection required.</span>
            </div>
            <p className="text-[11px] text-slate-500 border-t border-white/10 pt-3">
              {profile ? (
                <span className="text-slate-300 font-medium">{formatActivePlanLabel(profile)}</span>
              ) : (
                <span className="text-slate-300 font-medium">Active plan: Explorer Access</span>
              )}
              {profile?.membershipTier && profile.membershipTier !== 'EXPLORER_ACCESS' ? (
                <span className="block mt-1 text-amber-200/90">
                  Upgrades route through Membership when advanced intelligence tiers are available.
                </span>
              ) : null}
            </p>
          </div>

          <div>
            <h2 className="font-heading text-slate-400 text-xs uppercase tracking-[0.25em] mb-3 px-0.5">
              Future upgrade paths
            </h2>
            <p className="text-[11px] text-slate-500 mb-3 px-0.5">
              Not selectable here — activation requires backend entitlement through Membership.
            </p>
            <ul className="space-y-3">
              {UPGRADE_TIERS.map((tier) => (
                <li
                  key={tier.id}
                  className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3.5 sm:px-4 sm:py-4 opacity-[0.78]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3 min-w-0 pointer-events-none select-none">
                      <Lock className="text-slate-500 shrink-0 mt-0.5" size={18} aria-hidden />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 flex flex-wrap items-center gap-2">
                          {tier.label}
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] ${tier.badgeClass}`}
                          >
                            {tier.badge}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{tier.description}</p>
                      </div>
                    </div>
                    <Link
                      to={tier.ctaTo}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-slate-900/80 px-3 py-2.5 text-xs font-semibold text-slate-100 hover:border-violet-400/50 hover:text-white hover:shadow-[0_0_22px_rgba(124,58,237,0.18)] transition-all w-full sm:w-auto sm:shrink-0 min-h-[44px] sm:min-h-0"
                    >
                      {tier.ctaLabel}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div
            id="onboarding-wallet-verify"
            ref={walletSectionRef}
            className={`public-premium-card p-5 sm:p-6 rounded-xl space-y-4 scroll-mt-24 transition-colors duration-300 ${
              walletVerifiedOnAccount && isConnected
                ? 'border border-emerald-500/35 bg-emerald-950/[0.08] ring-1 ring-emerald-500/20'
                : 'border border-white/10'
            }`}
          >
            <motion.div className="flex items-center gap-2">
              <Wallet className="text-safe shrink-0" size={20} />
              <h2 className="font-heading text-white text-base sm:text-lg">Wallet verification (recommended)</h2>
            </motion.div>
            <p className="text-sm text-slate-400">
              Sign a one-time message to link an on-chain identity — continuity for your intelligence workspace, secure
              environment attestation, and{' '}
              <strong className="text-slate-200">Founders Pass eligibility</strong>. You can skip and verify later from
              the console; deeper intelligence features may prompt for a verified wallet.
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Not an investment, NFT sale, regulated coverage product, or guarantee of benefits. Founders Pass is a free
              community funnel with limited availability — not a paid subscription tier.
            </p>
            {!isConnected ? (
              <button type="button" onClick={() => connectWallet()} className="btn-cyber w-full sm:w-auto px-6 py-2">
                Connect wallet
              </button>
            ) : (
              <motion.div className="space-y-3" layout>
                {!walletVerifiedOnAccount ? (
                  <>
                    <p className="text-xs font-mono text-slate-300 break-all">{account}</p>
                    <button
                      type="button"
                      disabled={verifyDisabled || loading || Boolean(profileSyncError)}
                      onClick={handleWalletVerify}
                      title={verifyDisabledReason || undefined}
                      className="btn-brand px-6 py-2 inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {walletBusy ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                      Sign & verify
                    </button>
                    {verifyDisabledReason && !walletBusy ? (
                      <p className="text-xs text-amber-200/90">{verifyDisabledReason}</p>
                    ) : null}
                    {walletBusy && phaseLabel ? (
                      <p className="text-xs text-violet-200/90 flex items-center gap-2">
                        <Loader2 className="animate-spin shrink-0" size={14} />
                        {phaseLabel}
                      </p>
                    ) : null}
                    {lastError && !walletBusy ? (
                      <p className="text-xs text-rose-300/95" role="alert">
                        {lastError}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3.5 space-y-2.5"
                  >
                    <p className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 size={18} className="shrink-0" aria-hidden />
                      Wallet verified successfully
                    </p>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Your on-chain identity is now linked to your SureStack intelligence workspace and Founders Pass
                      eligibility.
                    </p>
                    <p className="text-xs font-mono text-slate-300/95 break-all pt-2 border-t border-emerald-500/15">
                      {account}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          <div
            className={`public-premium-card p-5 sm:p-6 rounded-xl space-y-4 transition-colors duration-300 ${
              walletVerifiedOnAccount && !foundingActive
                ? 'border border-emerald-500/30 bg-gradient-to-br from-emerald-950/25 via-slate-950/50 to-violet-950/30 ring-1 ring-emerald-500/15'
                : 'border border-amber-500/25 bg-amber-950/10'
            }`}
          >
            <div className="flex items-start gap-2">
              <Sparkles
                className={`shrink-0 mt-0.5 ${walletVerifiedOnAccount && !foundingActive ? 'text-emerald-300' : 'text-amber-300'}`}
                size={20}
              />
              <div className="min-w-0 flex-1 space-y-1">
                {foundingActive ? (
                  <>
                    <h3 className="font-heading text-white text-sm uppercase tracking-[0.2em]">Founders Pass active</h3>
                    <p className="text-sm text-emerald-200/95">
                      Cohort {profile?.foundingCohort || '2026'} · community credential on your account.
                    </p>
                    <Link
                      to="/founders-pass"
                      className="text-xs text-amber-200/90 hover:text-amber-100 underline underline-offset-2 inline-flex items-center gap-1 pt-1"
                    >
                      View Founders Pass <ArrowRight size={12} />
                    </Link>
                  </>
                ) : !walletVerifiedOnAccount ? (
                  <>
                    <h3 className="font-heading text-white text-sm uppercase tracking-[0.2em]">Founders Pass</h3>
                    <p className="text-sm text-amber-100/90">Wallet verification required</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Founders Pass starts with a verified wallet, then X, engagement, and Telegram steps confirmed by
                      the team. Use the section above to connect and sign.
                    </p>
                    <button
                      type="button"
                      disabled={walletBusy || loading}
                      onClick={handleFoundersPassVerifyClick}
                      title={verifyDisabledReason || undefined}
                      className="mt-2 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
                    >
                      {walletBusy ? <Loader2 className="animate-spin shrink-0" size={16} /> : null}
                      Verify wallet first
                      <ArrowRight size={16} />
                    </button>
                    {walletBusy && phaseLabel ? (
                      <p className="text-xs text-violet-200/90 flex items-center gap-2">
                        <Loader2 className="animate-spin shrink-0" size={14} />
                        {phaseLabel}
                      </p>
                    ) : null}
                    <Link
                      to="/founders-pass"
                      className="block text-center sm:text-left text-[11px] text-slate-500 hover:text-slate-400 pt-1"
                    >
                      Learn more · Founders Pass
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="font-heading text-white text-sm uppercase tracking-[0.2em]">Founders Pass</h3>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-200">
                        <CheckCircle2 size={12} className="shrink-0" aria-hidden />
                        Wallet verified
                      </span>
                      <span className="text-sm font-medium text-emerald-100/95">Activation unlocked.</span>
                    </div>
                    {walletProfileSyncing ? (
                      <p className="text-[11px] text-slate-500 flex items-center gap-2">
                        <Loader2 className="animate-spin shrink-0" size={12} aria-hidden />
                        Syncing verification to your account…
                      </p>
                    ) : null}
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className="mt-3 rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3.5 space-y-3"
                    >
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Complete the remaining community steps to activate your Founders Pass:
                      </p>
                      <ul className="space-y-2 text-sm text-slate-200/95 list-none">
                        <li className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400/90" aria-hidden />
                          Follow SureStack on X
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400/90" aria-hidden />
                          Engage with the launch community
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400/90" aria-hidden />
                          Join the private founders Telegram
                        </li>
                      </ul>
                    </motion.div>
                    <Link
                      to="/founders-pass"
                      className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600/90 via-amber-600 to-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(16,185,129,0.12)] hover:from-emerald-500 hover:via-amber-500 hover:to-violet-600 no-underline transition-all"
                    >
                      <Sparkles size={18} aria-hidden />
                      Continue Founders Pass
                    </Link>
                    <Link
                      to="/founders-pass"
                      className="block text-center sm:text-left text-[11px] text-slate-500 hover:text-slate-400 pt-1"
                    >
                      Program details &amp; disclaimers
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-stretch sm:justify-center pt-1">
            <button
              type="button"
              onClick={() => finishOnboarding(!verifiedWallet)}
              className="btn-brand px-8 py-3 flex-1 min-h-[44px]"
            >
              Continue to Console
            </button>
            <button
              type="button"
              onClick={() => finishOnboarding(true)}
              className="btn-outline px-8 py-3 flex-1 border-white/20 text-slate-300 min-h-[44px]"
            >
              Skip wallet for now
            </button>
          </div>
        </div>
      </div>
    </PublicMarketingShell>
  )
}
