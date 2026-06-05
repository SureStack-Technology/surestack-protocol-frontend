import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, Mail } from 'lucide-react'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'
import { PRIME_INTELLIGENCE_DISCLAIMER } from '@/constants/complianceCopy.js'

export default function EnterprisePage() {
  return (
    <PublicMarketingShell>
      <PublicMarketingHeader current="about" />
      <main className="max-w-4xl mx-auto px-5 pb-28 pt-12 md:pt-16 relative z-10 text-white space-y-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/35 bg-cyan-950/40 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-cyan-200">
            <Building2 size={14} /> Private pilot
          </div>
          <h1 className="text-3xl md:text-4xl font-heading uppercase tracking-[0.12em]">
            Institutional Intelligence — Coming Soon
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl">
            SureStack is preparing an institutional intelligence program for treasury teams, exchanges, custodians, and
            protocol operators. This surface is not publicly available during the current beta phase.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            Digital asset risk intelligence for awareness and decision support only — not financial advice, insurance,
            guaranteed protection, custody, brokerage, or regulated advisory services.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="public-premium-card p-6 sm:p-8 border border-white/10 space-y-5"
          aria-labelledby="enterprise-company-info-heading"
        >
          <h2 id="enterprise-company-info-heading" className="text-lg font-heading text-white tracking-tight">
            Company information
          </h2>
          <dl className="grid gap-4 sm:grid-cols-1 text-sm">
            <div className="space-y-1">
              <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono">Legal entity</dt>
              <dd className="text-slate-200 font-medium tracking-wide">SURESTACK TECHNOLOGY GROUP INC.</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono">Jurisdiction</dt>
              <dd className="text-slate-300">Delaware, United States</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono">Business model</dt>
              <dd className="text-slate-300 leading-relaxed">Digital Asset Risk Intelligence Platform</dd>
            </div>
          </dl>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="public-premium-card p-6 sm:p-8 space-y-4 border border-cyan-500/20"
        >
          <h2 className="text-lg font-heading text-white">Private pilot inquiries</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Institutional teams may request early conversation about future workspace design, API access, and team
            intelligence workflows. Pilot onboarding is manual and separate from Explorer Access and Prime Intelligence
            Beta.
          </p>
          <a
            href="mailto:pilot@surestack.tech?subject=SureStack%20Institutional%20Intelligence%20Private%20Pilot"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-950/60 transition-colors"
          >
            <Mail size={16} /> pilot@surestack.tech
          </a>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 text-sm text-violet-300 hover:text-violet-200 transition-colors"
          >
            Explore public intelligence tiers <ArrowRight size={14} />
          </Link>
        </motion.div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{PRIME_INTELLIGENCE_DISCLAIMER}</p>
      </main>
    </PublicMarketingShell>
  )
}
