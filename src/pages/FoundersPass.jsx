import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Sparkles, Loader2, Users, Shield } from 'lucide-react'
import FoundersPassActivationFlow from '@/components/founders-pass/FoundersPassActivationFlow.jsx'
import { FOUNDERS_PASS_MILESTONES } from '@/constants/foundersPassActivation.js'
import { useAuth } from '@clerk/clerk-react'
import { useAuthApi } from '@/hooks/useAuthApi'
import { fetchAuthMeDeduped } from '@/lib/authMeClient.js'
import toast from 'react-hot-toast'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'

const ACTIVATION_REQUIREMENTS = FOUNDERS_PASS_MILESTONES.map((m) => m.label)

const BENEFITS = [
  'Founders Pass badge',
  'Private founders Telegram',
  'Early product previews',
  'Feedback sessions',
  'Founder roadmap calls',
  'Priority ecosystem announcements',
  'Potential whitelist consideration',
  'Optional future soulbound credential',
]

const NOT_OFFERED = [
  'Not a subscription membership tier',
  'Not an investment or financial product',
  'Not a regulated insurance or coverage entitlement',
  'Not a token sale or NFT offering at launch',
  'Not a guarantee of future benefits',
]

const BENEFITS_SUMMARY_LINE =
  'Founders Pass badge · Private founders Telegram · Early previews · Feedback & roadmap calls · Priority announcements'

const FOOTER_DISCLAIMERS = [
  'Founders Pass is a private community credential for early SureStack supporters.',
  'Community access, privileges, and future ecosystem opportunities may evolve as the platform develops.',
  'SureStack provides Digital Asset Risk Intelligence, awareness tools, and member services. It is not a licensed insurance carrier, broker, or investment advisor.',
]

export default function FoundersPass() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { api } = useAuthApi()
  const apiRef = useRef(api)
  apiRef.current = api
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [fp, setFp] = useState(null)
  const [fpLoading, setFpLoading] = useState(false)
  const [xBusy, setXBusy] = useState(false)
  const [engBusy, setEngBusy] = useState(false)
  const [tgBusy, setTgBusy] = useState(false)
  const [xInput, setXInput] = useState('')
  const [engInput, setEngInput] = useState('')
  const [tgInput, setTgInput] = useState('')

  const loadProfile = useCallback(async () => {
    if (!isSignedIn) {
      setProfile(null)
      return
    }
    setProfileLoading(true)
    try {
      const { res, data } = await fetchAuthMeDeduped(apiRef.current, userId)
      setProfile(res.ok ? data : null)
    } catch {
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [isSignedIn, userId])

  const loadFp = useCallback(async () => {
    if (!isSignedIn) {
      setFp(null)
      return
    }
    setFpLoading(true)
    try {
      const r = await apiRef.current('/api/founders-pass/status')
      const j = await r.json().catch(() => ({}))
      if (r.ok) {
        setFp(j)
        if (j.xHandle) setXInput(j.xHandle)
        if (j.engagementProofUrl) setEngInput(j.engagementProofUrl)
        if (j.telegramUsername) setTgInput(j.telegramUsername)
      } else {
        setFp(null)
      }
    } catch {
      setFp(null)
    } finally {
      setFpLoading(false)
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isLoaded) return
    loadProfile()
  }, [isLoaded, loadProfile])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    loadFp()
  }, [isLoaded, isSignedIn, loadFp])

  const walletVerified = Boolean(profile?.wallets?.some((w) => w.verifiedAt))
  const foundingActive =
    Boolean(profile?.foundingMember) && profile?.founderCredentialStatus === 'ACTIVE'
  const apiActive = fp?.status === 'active'
  const isActive = apiActive || foundingActive

  const progress = fp?.progress
  const submitted = fp?.submitted
  const completedSteps = fp?.completedSteps ?? 0
  const totalSteps = fp?.totalSteps ?? 4
  const cohortBlocked = fp?.activationBlockedReason === 'cohort_full'

  const postStep = async (path, body, setBusy, { successToast } = {}) => {
    setBusy(true)
    try {
      const r = await api(path, { method: 'POST', body })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast.error(j.message || j.error || 'Submit failed')
        return
      }
      const { success: _s, ...rest } = j
      setFp(rest)
      toast.success(successToast || 'Submitted — pending team verification where applicable.')
      await loadProfile()
    } catch (e) {
      toast.error(e?.message || 'Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicMarketingShell>
      <PublicMarketingHeader current="founders" />
      <div className="max-w-4xl mx-auto px-5 pb-28 pt-10 text-white relative z-10 space-y-10">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="public-premium-card p-8 md:p-10 space-y-5 border border-amber-500/25 shadow-[0_0_48px_rgba(245,158,11,0.08)]"
        >
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-amber-200/90">
            <Sparkles size={14} /> Founders Pass · private early access credential
          </div>
          <h1 className="text-3xl md:text-4xl font-heading uppercase tracking-[0.12em] text-white">Founders Pass</h1>
          <p className="text-base text-violet-200/95 font-medium">
            Private access credential for SureStack&apos;s earliest supporters.
          </p>
          <p className="text-sm md:text-[15px] text-slate-300 max-w-2xl leading-relaxed">
            Reserved for members helping shape the future of SureStack Intelligence through early participation, community
            access, and strategic feedback.
          </p>
          <div className="space-y-2.5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-mono">Activation requirements</p>
            <ul className="space-y-2 text-sm text-slate-200/95">
              {ACTIVATION_REQUIREMENTS.map((line) => (
                <li key={line} className="flex gap-2.5 items-start">
                  <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed border-t border-white/10 pt-5">
            This credential is separate from paid Digital Asset Risk Intelligence memberships, including Explorer Access,
            Prime Intelligence, Alpha Intelligence, and Atlas Intelligence.
          </p>
          <div className="flex flex-wrap gap-3 items-center text-xs text-slate-400">
            <span className="inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-100">
              <Users size={14} /> Exclusive access for the first 100 founding members
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2">
              <Shield size={14} /> Web3-verified identity via signed wallet message
            </span>
          </div>
        </motion.header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-white/10 bg-slate-950/50 p-6 space-y-3"
          >
            <h2 className="text-sm font-heading text-white uppercase tracking-[0.2em]">Benefits</h2>
            <ul className="space-y-2.5 text-sm text-slate-300">
              {BENEFITS.map((line) => (
                <li key={line} className="flex gap-2">
                  <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-rose-500/25 bg-rose-950/15 p-6 space-y-3"
          >
            <h2 className="text-sm font-heading text-rose-100 uppercase tracking-[0.2em]">What this is not</h2>
            <ul className="space-y-2 text-sm text-rose-100/90">
              {NOT_OFFERED.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="public-premium-card p-8 border border-violet-500/20 space-y-6"
        >
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500 font-mono">Your status</p>
            {!isLoaded || profileLoading ? (
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} /> Loading…
              </p>
            ) : !isSignedIn ? (
              <p className="text-sm text-slate-400">
                Sign up for SureStack, then verify a wallet to begin your Founders Pass activation.
              </p>
            ) : fpLoading && !fp ? (
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} /> Loading Founders Pass…
              </p>
            ) : isActive ? (
              <div className="space-y-2">
                <p className="text-sm text-emerald-200/95">
                  Founders Pass is <strong className="text-white">active</strong>
                  {profile?.foundingCohort ? ` · ${profile.foundingCohort}` : ''}.
                </p>
                <p className="text-xs text-slate-400">Credential verified · Private founder community unlocked</p>
                <p className="text-[11px] text-slate-500">
                  <span className="font-medium text-slate-400">Benefits: </span>
                  {BENEFITS_SUMMARY_LINE}
                </p>
              </div>
            ) : !walletVerified ? (
              <p className="text-sm text-slate-300">
                Verify a wallet in onboarding to unlock Founders Pass steps.{' '}
                <Link to="/onboarding" className="text-violet-300 underline underline-offset-2">
                  Go to onboarding
                </Link>
              </p>
            ) : fp ? (
              <motion.div className="space-y-5">
                <p className="text-sm text-slate-400">
                  Status: <span className="font-mono text-amber-200/90">pending activation</span>
                </p>
                {cohortBlocked ? (
                  <p className="text-sm text-rose-200/90 rounded-lg border border-rose-500/25 bg-rose-950/20 px-4 py-3">
                    All milestones are satisfied, but Founders Pass capacity for this wave is full. We will notify you
                    if capacity opens.
                  </p>
                ) : null}
                <FoundersPassActivationFlow
                  progress={progress}
                  submitted={submitted}
                  completedSteps={completedSteps}
                  totalSteps={totalSteps}
                  xInput={xInput}
                  setXInput={setXInput}
                  engInput={engInput}
                  setEngInput={setEngInput}
                  tgInput={tgInput}
                  setTgInput={setTgInput}
                  xBusy={xBusy}
                  engBusy={engBusy}
                  tgBusy={tgBusy}
                  onSubmitX={() => postStep('/api/founders-pass/submit-x', { xHandle: xInput }, setXBusy)}
                  onSubmitEngagement={() =>
                    postStep('/api/founders-pass/submit-engagement', { engagementProofUrl: engInput }, setEngBusy)
                  }
                  onSubmitTelegram={() =>
                    postStep('/api/founders-pass/submit-telegram', { telegramUsername: tgInput }, setTgBusy, {
                      successToast: 'Telegram access request received.',
                    })
                  }
                />
              </motion.div>
            ) : (
              <p className="text-sm text-slate-400">Could not load Founders Pass status.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {!isSignedIn ? (
              <button
                type="button"
                onClick={() => navigate('/sign-up')}
                className="btn-brand px-8 py-3 text-sm inline-flex items-center gap-2"
              >
                <Sparkles size={18} /> Create account
              </button>
            ) : isActive ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-brand px-8 py-3 text-sm inline-flex items-center gap-2"
              >
                Open dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => loadFp()}
                disabled={fpLoading}
                className="btn-outline px-6 py-3 text-sm border-white/20 text-slate-200 disabled:opacity-50"
              >
                {fpLoading ? <Loader2 className="animate-spin" size={18} /> : 'Refresh status'}
              </button>
            )}
            <Link to="/membership" className="btn-outline px-6 py-3 text-sm border-white/20 text-slate-200">
              Membership &amp; paid tiers
            </Link>
            <Link to="/pricing" className="btn-outline px-6 py-3 text-sm border-white/20 text-slate-200">
              Retail pricing
            </Link>
          </div>
        </motion.section>

        <div className="text-xs text-slate-500 leading-relaxed border border-white/10 rounded-xl p-4 bg-black/25 space-y-3">
          {FOOTER_DISCLAIMERS.map((para) => (
            <p key={para}>{para}</p>
          ))}
        </div>
      </div>
    </PublicMarketingShell>
  )
}
