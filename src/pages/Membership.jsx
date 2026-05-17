import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Crown, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthApi } from '@/hooks/useAuthApi'
import { useDashboardProfile } from '@/hooks/useDashboardProfile'
import { resolveMembershipEntitlements } from '@/utils/dashboardPersonalization.js'
import { CARRIER_DISCLAIMER } from '@/constants/complianceCopy.js'
import {
  ATLAS_INTELLIGENCE_BADGE,
  ATLAS_INTELLIGENCE_DESCRIPTION,
  ATLAS_INTELLIGENCE_FEATURES,
  ATLAS_INTELLIGENCE_PRICE,
  ATLAS_INTELLIGENCE_SHORT_DESCRIPTOR,
  ALPHA_INTELLIGENCE_FEATURES,
  EXPLORER_AI_WALLET_ANALYST_FEATURE,
  EXPLORER_POSITIONING_TAGLINE,
  EXPLORER_UPGRADE_CTA,
  MARKETING_ONLY_TIERS,
  MEMBERSHIP_LADDER_PREMIUM_INTRO,
  PRIME_INTELLIGENCE_FEATURES,
} from '@/constants/intelligenceTiers.js'

const EXPLORER_FEATURES = [
  'Secure account access',
  'Optional wallet verification',
  'Explorer Intelligence Console',
  'Reference market context',
  'Security orientation',
  'Wallet risk snapshot (no continuous monitoring)',
  'Founders Pass access',
  EXPLORER_AI_WALLET_ANALYST_FEATURE,
  'Scenario Intelligence — 2 fixed presets only: ETH volatility shock, stablecoin depeg scenario',
]

const ENTERPRISE_FEATURES = [
  'White-label dashboards',
  'SSO',
  'Audit logs',
  'Custom APIs',
  'Compliance reporting surfaces',
  'Strategic intelligence dashboards',
  'Branded portals',
  'Dedicated solutions architecture',
  'SLA-backed monitoring',
  'Custom alert integrations',
]

function AccessCard({
  title,
  price,
  statusLabel,
  tagline,
  statusTone = 'slate',
  features,
  borderClass,
  children,
  compact = false,
}) {
  const tone =
    statusTone === 'emerald'
      ? 'text-emerald-300 border-emerald-500/35 bg-emerald-950/40'
      : statusTone === 'violet'
        ? 'text-violet-200 border-violet-500/35 bg-violet-950/40'
        : statusTone === 'cyan'
          ? 'text-cyan-200 border-cyan-500/35 bg-cyan-950/30'
          : statusTone === 'amber'
            ? 'text-amber-200 border-amber-500/35 bg-amber-950/25'
            : 'text-slate-400 border-white/15 bg-slate-950/50'

  const minH = compact ? 'min-h-[300px]' : 'min-h-[380px]'

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 sm:p-6 flex flex-col gap-3 ${minH} ${borderClass} bg-slate-950/55 backdrop-blur-sm shadow-[0_24px_70px_rgba(0,0,0,0.4)]`}
    >
      <motion.div>
        <h2 className="text-lg sm:text-xl font-heading text-white tracking-wide leading-snug">{title}</h2>
        <p className="text-xl sm:text-2xl font-heading text-safe mt-1.5">{price}</p>
        <p
          className={`mt-2.5 inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.2em] ${tone}`}
        >
          {statusLabel}
        </p>
        {tagline ? (
          <p className="text-[11px] text-slate-500 mt-2 leading-snug">{tagline}</p>
        ) : null}
      </motion.div>
      <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="text-emerald-400/90 shrink-0 mt-0.5" size={15} />
            {f}
          </li>
        ))}
      </ul>
      <div className="pt-2 border-t border-white/10 space-y-2">{children}</div>
    </motion.article>
  )
}

export default function MembershipPage() {
  const { api } = useAuthApi()
  const { profile, loading: profileLoading } = useDashboardProfile()
  const [primeLoading, setPrimeLoading] = useState(false)
  const [alphaLoading, setAlphaLoading] = useState(false)
  const [atlasLoading, setAtlasLoading] = useState(false)

  const entitlements = useMemo(() => resolveMembershipEntitlements(profile), [profile])
  const { hasPrime, hasAtlas, hasEnterprise, isExplorerOnly } = entitlements

  const showDevOverrideBadge =
    import.meta.env.DEV && Boolean(profile?.devMembershipOverrideActive)

  const joinPrimeWaitlist = async () => {
    if (hasPrime) {
      toast.success('Prime Intelligence is active on your account.')
      return
    }
    setPrimeLoading(true)
    try {
      const res = await api('/api/membership/waitlist/pro', {
        method: 'POST',
        body: { note: 'Prime Intelligence waitlist' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'waitlist_failed')
      toast.success(data.message || 'You are on the Prime Intelligence waitlist.')
    } catch (e) {
      toast.error(e?.message || 'Could not join waitlist')
    } finally {
      setPrimeLoading(false)
    }
  }

  const joinAlphaInterest = async () => {
    if (hasAtlas) {
      toast.success('Alpha Intelligence is included with your Atlas access.')
      return
    }
    setAlphaLoading(true)
    try {
      const res = await api('/api/membership/waitlist/pro', {
        method: 'POST',
        body: { note: 'Alpha Intelligence interest' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'waitlist_failed')
      toast.success(data.message || 'Alpha Intelligence interest recorded.')
    } catch (e) {
      toast.error(e?.message || 'Could not save interest')
    } finally {
      setAlphaLoading(false)
    }
  }

  const requestAtlas = async () => {
    if (hasAtlas) {
      toast.success('Atlas Intelligence is active on your account.')
      return
    }
    setAtlasLoading(true)
    try {
      const res = await api('/api/membership/request/strategic', {
        method: 'POST',
        body: { note: 'Atlas Intelligence access request' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'request_failed')
      toast.success(data.message || 'Atlas Intelligence request received.')
    } catch (e) {
      toast.error(e?.message || 'Could not submit request')
    } finally {
      setAtlasLoading(false)
    }
  }

  const primeStatusLabel = profileLoading
    ? 'Loading…'
    : hasPrime
      ? hasAtlas
        ? 'Included with Atlas'
        : 'Active on your account'
      : 'Flagship paid tier · Early Access'

  const primeStatusTone = hasPrime ? 'emerald' : 'violet'

  const alphaStatusLabel = profileLoading
    ? 'Loading…'
    : hasAtlas
      ? 'Active on your account'
      : 'Priority Access'

  const atlasStatusLabel = profileLoading
    ? 'Loading…'
    : hasAtlas
      ? 'Active on your account'
      : ATLAS_INTELLIGENCE_BADGE

  const explorerStatusLabel = profileLoading
    ? 'Loading…'
    : isExplorerOnly
      ? 'Active on your account'
      : 'Included in your plan'

  return (
    <section className="space-y-12 pt-6 pb-24 text-white">
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 font-mono">Membership &amp; access</p>
        <h1 className="text-3xl md:text-4xl font-heading gradient-text uppercase tracking-wider">
          SureStack Intelligence access ladder
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">{MEMBERSHIP_LADDER_PREMIUM_INTRO}</p>
        {showDevOverrideBadge ? (
          <p className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-amber-200">
            Developer override active
          </p>
        ) : null}
        {isExplorerOnly ? (
          <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 px-4 py-3 text-xs text-slate-300 max-w-3xl">
            <strong className="text-violet-200">Note:</strong> waitlist and requests do not change your server tier until
            checkout and fulfillment complete.
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-xs text-slate-300 max-w-3xl">
            <strong className="text-emerald-200">Your access is active.</strong> Intelligence features on the dashboard
            reflect your current membership tier.
          </div>
        )}
      </motion.header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <AccessCard
          title="Explorer Access"
          price="Free"
          statusLabel={explorerStatusLabel}
          tagline={EXPLORER_POSITIONING_TAGLINE}
          statusTone={isExplorerOnly ? 'emerald' : 'slate'}
          features={EXPLORER_FEATURES}
          borderClass="border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.12)]"
          compact
        >
          {isExplorerOnly ? (
            <>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                Snapshot intelligence only — Prime unlocks continuous monitoring, full simulator, timelines, Alert Center,
                and full analyst access.
              </p>
              <Link
                to="/membership"
                className="public-cta-primary w-full justify-center py-2.5 text-sm inline-flex items-center gap-2"
              >
                {EXPLORER_UPGRADE_CTA}
                <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Explorer capabilities remain available; your active paid tier unlocks additional intelligence on the console.
            </p>
          )}
          <Link
            to="/dashboard"
            className="btn-outline w-full justify-center py-2 text-xs border-white/15 text-slate-300 inline-flex items-center gap-2 mt-2"
          >
            Continue to console
          </Link>
        </AccessCard>

        <AccessCard
          title="Prime Intelligence"
          price="$59/mo"
          statusLabel={primeStatusLabel}
          tagline="Your AI digital asset risk co-pilot"
          statusTone={primeStatusTone}
          features={PRIME_INTELLIGENCE_FEATURES}
          borderClass={
            hasPrime
              ? 'border-emerald-500/35 shadow-[0_0_40px_rgba(16,185,129,0.14)]'
              : 'border-violet-500/30 shadow-[0_0_36px_rgba(139,92,246,0.12)]'
          }
          compact
        >
          {hasPrime ? (
            <>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                Prime Wallet Intelligence, contract intel, scenarios, timelines, and analyst tools are unlocked on your
                dashboard.
              </p>
              <Link
                to="/dashboard"
                className="public-cta-primary w-full justify-center py-2.5 text-sm inline-flex items-center gap-2 border-emerald-500/40"
              >
                Open Prime console
                <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <button
              type="button"
              disabled={primeLoading || profileLoading}
              onClick={joinPrimeWaitlist}
              className="btn-outline w-full justify-center py-2.5 text-sm border-violet-400/35 text-violet-100 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {primeLoading ? <Loader2 className="animate-spin" size={18} /> : null}
              Join Prime Intelligence
            </button>
          )}
        </AccessCard>

        <AccessCard
          title="Alpha Intelligence"
          price="$129/mo"
          statusLabel={alphaStatusLabel}
          tagline="Operator-grade digital asset intelligence"
          statusTone={hasAtlas ? 'emerald' : 'violet'}
          features={ALPHA_INTELLIGENCE_FEATURES}
          borderClass={
            hasAtlas
              ? 'border-emerald-500/30 shadow-[0_0_32px_rgba(16,185,129,0.12)]'
              : 'border-fuchsia-500/25 shadow-[0_0_32px_rgba(217,70,239,0.1)]'
          }
          compact
        >
          {hasAtlas ? (
            <Link
              to="/dashboard"
              className="btn-outline w-full justify-center py-2.5 text-sm border-emerald-400/35 text-emerald-100 inline-flex items-center gap-2"
            >
              Open intelligence console
              <ArrowRight size={16} />
            </Link>
          ) : (
            <button
              type="button"
              disabled={alphaLoading || profileLoading || hasPrime}
              onClick={joinAlphaInterest}
              className="btn-outline w-full justify-center py-2.5 text-sm border-fuchsia-400/35 text-fuchsia-100 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {alphaLoading ? <Loader2 className="animate-spin" size={18} /> : null}
              {hasPrime ? 'Upgrade path via Atlas' : 'Register Alpha Intelligence interest'}
            </button>
          )}
        </AccessCard>

        <AccessCard
          title="Atlas Intelligence"
          price={ATLAS_INTELLIGENCE_PRICE}
          statusLabel={atlasStatusLabel}
          tagline={ATLAS_INTELLIGENCE_SHORT_DESCRIPTOR}
          statusTone={hasAtlas ? 'emerald' : 'cyan'}
          features={ATLAS_INTELLIGENCE_FEATURES}
          borderClass={
            hasAtlas
              ? 'border-emerald-500/35 shadow-[0_0_40px_rgba(16,185,129,0.12)]'
              : 'border-cyan-500/30 shadow-[0_0_36px_rgba(34,211,238,0.1)]'
          }
          compact
        >
          {hasAtlas ? (
            <Link
              to="/dashboard"
              className="btn-cyber w-full justify-center py-2.5 text-sm inline-flex items-center gap-2"
            >
              Open Atlas console
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">{ATLAS_INTELLIGENCE_DESCRIPTION}</p>
              <button
                type="button"
                disabled={atlasLoading || profileLoading}
                onClick={requestAtlas}
                className="btn-cyber w-full justify-center py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                {atlasLoading ? <Loader2 className="animate-spin" size={18} /> : null}
                Request Atlas Intelligence access
              </button>
            </>
          )}
        </AccessCard>

        <AccessCard
          title={MARKETING_ONLY_TIERS.ENTERPRISE_INTELLIGENCE}
          price="Custom"
          statusLabel={
            profileLoading
              ? 'Loading…'
              : hasEnterprise
                ? 'Active on your account'
                : 'Request Enterprise Access'
          }
          tagline="Institutional digital asset intelligence infrastructure"
          statusTone={hasEnterprise ? 'emerald' : 'amber'}
          features={ENTERPRISE_FEATURES}
          borderClass={
            hasEnterprise
              ? 'border-emerald-500/35 shadow-[0_0_40px_rgba(16,185,129,0.12)]'
              : 'border-amber-500/30 shadow-[0_0_36px_rgba(245,158,11,0.12)]'
          }
          compact
        >
          <Link
            to={hasEnterprise ? '/dashboard' : '/enterprise'}
            className="btn-brand w-full justify-center py-2.5 text-sm inline-flex items-center gap-2 bg-gradient-to-r from-amber-600/90 to-violet-700/90 border-0"
          >
            {hasEnterprise ? 'Open console' : 'Explore Enterprise Intelligence'}
            <ArrowRight size={16} />
          </Link>
        </AccessCard>
      </div>

      <AccessCard
        title="Founders Pass"
        price="Free · community credential"
        statusLabel="Private early access · not a subscription tier"
        statusTone="slate"
        features={[
          'Founders Pass badge',
          'Private founders Telegram',
          'Early product previews',
          'Feedback sessions',
          'Founder roadmap calls',
          'Priority ecosystem announcements',
          'Potential whitelist consideration',
          'Optional future soulbound credential',
        ]}
        borderClass="border-amber-500/35 bg-gradient-to-b from-amber-950/20 to-slate-950/40 max-w-4xl mx-auto w-full"
      >
        <p className="text-xs text-slate-500 mb-2">
          Community credential only — no paid Digital Asset Risk Intelligence analytics. Separate from Prime Intelligence,
          Alpha Intelligence, Atlas Intelligence, and Enterprise Intelligence.
        </p>
        <Link
          to="/founders-pass"
          className="btn-brand w-full sm:w-auto justify-center py-3 text-sm inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-violet-700 border-0"
        >
          View Founders Pass
          <Crown size={16} />
        </Link>
      </AccessCard>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="flex flex-wrap gap-3"
      >
        <Link to="/pricing" className="btn-outline px-5 py-2.5 text-sm border-white/15 text-slate-200">
          View intelligence access
        </Link>
        <Link to="/billing" className="btn-outline px-5 py-2.5 text-sm border-white/15 text-slate-200">
          Membership fees
        </Link>
        <Link to="/enterprise" className="btn-outline px-5 py-2.5 text-sm border-white/15 text-slate-200">
          Institutional overview
        </Link>
      </motion.div>

      <motion.div className="glass-panel border border-white/10 rounded-2xl p-5 text-xs text-slate-400 leading-relaxed">
        {CARRIER_DISCLAIMER}
      </motion.div>
    </section>
  )
}
