import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'
import { CARRIER_DISCLAIMER } from '@/constants/complianceCopy.js'
import {
  ATLAS_INTELLIGENCE_BADGE,
  ATLAS_INTELLIGENCE_DESCRIPTION,
  ATLAS_INTELLIGENCE_FEATURES,
  ATLAS_INTELLIGENCE_PRICE,
  ATLAS_INTELLIGENCE_SHORT_DESCRIPTOR,
  ALPHA_INTELLIGENCE_FEATURES,
  ALPHA_INTELLIGENCE_PRICE,
  EXPLORER_AI_WALLET_ANALYST_FEATURE,
  EXPLORER_POSITIONING_TAGLINE,
  INTELLIGENCE_ACCESS_HEADING,
  PRIME_INTELLIGENCE_BETA_BADGE,
  PRIME_INTELLIGENCE_FEATURES,
  PRIME_INTELLIGENCE_PRICE,
  WEEKLY_MARKET_THREAT_INTELLIGENCE_BRIEF,
} from '@/constants/intelligenceTiers.js'
import { PRIME_BETA_SECTION_ID } from '@/constants/primeBetaTelegram.js'
import PrimeBetaTelegramOnboarding from '@/components/marketing/PrimeBetaTelegramOnboarding.jsx'

const tiers = [
  {
    name: 'Explorer Access',
    badge: 'Discovery · free',
    price: 'Free',
    description: `${EXPLORER_POSITIONING_TAGLINE} Discovery and trust-building on SureStack — useful orientation and a real intelligence check, with intentional limits so you can feel value before upgrading. Wallet risk is snapshot-only (no continuous monitoring). Decision-support analytics only — not custody, insurance, brokerage, investment advice, or managed incident response.`,
    features: [
      'Secure account access',
      'Optional wallet verification',
      'Explorer Intelligence Console',
      'Reference market context',
      'Security orientation',
      'Wallet risk snapshot (not continuous monitoring)',
      'Founders Pass access',
      EXPLORER_AI_WALLET_ANALYST_FEATURE,
      'Scenario Intelligence — 2 fixed presets: ETH volatility shock, stablecoin depeg',
    ],
    cta: 'Start Explorer Access',
    ctaTo: '/sign-up',
    highlight: true,
  },
  {
    name: 'Prime Intelligence',
    badge: PRIME_INTELLIGENCE_BETA_BADGE,
    price: PRIME_INTELLIGENCE_PRICE,
    description:
      `Your AI digital asset risk co-pilot — continuous intelligence refresh, Adaptive Threat Intelligence Terminal, Universal Contract Analyzer, Executive Verdict Engine, full Scenario Intelligence Simulator, full AI Wallet Risk Analyst, ${WEEKLY_MARKET_THREAT_INTELLIGENCE_BRIEF}, and Alert Center. Currently available to approved beta users via Telegram verification and admin review. Analytics and awareness for self-directed decisions — not a licensed carrier, broker, investment advisor, or retained incident response firm.`,
    features: PRIME_INTELLIGENCE_FEATURES,
    cta: 'Apply for Prime Beta',
    ctaTo: `#${PRIME_BETA_SECTION_ID}`,
    highlight: false,
  },
  {
    name: 'Alpha Intelligence',
    badge: 'Active operators',
    price: ALPHA_INTELLIGENCE_PRICE,
    description:
      'Operator-grade digital asset intelligence for advanced traders, operators, and serious DeFi users. Includes everything in Prime Intelligence plus multi-wallet intelligence, cross-wallet analytics, smart-money surfaces, and advanced alert routing — still intelligence and decision support, not custody or regulated advice.',
    features: ALPHA_INTELLIGENCE_FEATURES,
    cta: 'Register Alpha Intelligence interest',
    ctaTo: '/membership',
    highlight: false,
  },
  {
    name: 'Atlas Intelligence',
    badge: ATLAS_INTELLIGENCE_BADGE,
    price: ATLAS_INTELLIGENCE_PRICE,
    priceNote: ATLAS_INTELLIGENCE_BADGE,
    shortDescriptor: ATLAS_INTELLIGENCE_SHORT_DESCRIPTOR,
    description: `${ATLAS_INTELLIGENCE_DESCRIPTION} Premium Digital Asset Risk Intelligence — not insurance, managed response, regulated coverage, brokerage, or investment advisory.`,
    features: ATLAS_INTELLIGENCE_FEATURES,
    cta: 'Request Atlas Intelligence access',
    ctaTo: '/membership',
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <PublicMarketingShell>
      <PublicMarketingHeader current="intelligence" />
      <main className="max-w-7xl mx-auto px-5 pb-32 pt-14 md:pt-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-14 space-y-5"
        >
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-violet-300">
            <Sparkles size={13} /> SureStack Intelligence
          </div>
          <h1 className="text-3xl md:text-[2.35rem] font-heading uppercase tracking-[0.12em] text-white leading-tight">
            {INTELLIGENCE_ACCESS_HEADING}
          </h1>
          <p className="text-slate-400 text-sm md:text-[15px] leading-relaxed">
            AI-powered Digital Asset Risk Intelligence — wallet, protocol, market, and treasury analytics with threat
            awareness and AI decision-support. <strong className="text-emerald-300/95">Explorer Access</strong> is free
            and public for your first risk check. Prime Intelligence Beta is approval-based during testing — join
            Telegram, verify, and sign up with the same email. Alpha and Atlas add operator and organizational depth.{' '}
            <strong className="text-white/90">Founders Pass</strong> remains a separate community credential — not a paid
            intelligence tier.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <motion.article
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className={`public-premium-card p-7 md:p-8 flex flex-col min-h-[24rem] ${
                tier.highlight ? 'public-premium-card-elevated' : ''
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {tier.highlight && (
                  <span className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/90 px-2.5 py-1 rounded-full border border-emerald-500/35 bg-emerald-950/50">
                    {tier.badge}
                  </span>
                )}
                {!tier.highlight && (
                  <span className="text-[10px] uppercase tracking-[0.22em] text-violet-300/90 px-2.5 py-1 rounded-full border border-violet-500/30 bg-violet-950/40">
                    {tier.badge}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-heading text-white tracking-tight">{tier.name}</h2>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <p className="text-3xl font-heading text-safe">{tier.price}</p>
                {tier.priceNote ? (
                  <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/90 px-2 py-0.5 rounded-full border border-cyan-500/35 bg-cyan-950/40 font-mono">
                    {tier.priceNote}
                  </span>
                ) : null}
              </div>
              {tier.shortDescriptor ? (
                <p className="text-[11px] text-slate-500 mt-2 font-mono tracking-wide">{tier.shortDescriptor}</p>
              ) : null}
              <p className="text-sm text-slate-400 mt-3 flex-1 leading-relaxed">{tier.description}</p>
              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="text-violet-400 shrink-0 mt-0.5" size={16} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={tier.ctaTo}
                className={`mt-8 inline-flex items-center justify-center gap-2 ${
                  tier.highlight ? 'public-cta-primary' : 'public-cta-secondary'
                }`}
              >
                {tier.cta}
                <ArrowRight size={15} />
              </Link>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10"
        >
          <PrimeBetaTelegramOnboarding />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-12 public-premium-card p-8 border border-amber-500/25 bg-amber-950/15"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/90">Community credential</p>
              <h2 className="text-2xl font-heading text-white">Founders Pass</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Founders Pass is a limited private early access credential, separate from paid intelligence tiers. Complete
                activation after signup — not an investment, regulated coverage product, or checkout bundle.
              </p>
            </div>
            <Link
              to="/founders-pass"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-violet-700 hover:from-amber-500 hover:to-violet-600 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(124,58,237,0.2)] shrink-0 transition-all"
            >
              Founders Pass <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>

        <p className="mt-12 text-xs text-slate-500 text-center max-w-3xl mx-auto leading-relaxed">{CARRIER_DISCLAIMER}</p>
      </main>
    </PublicMarketingShell>
  )
}
