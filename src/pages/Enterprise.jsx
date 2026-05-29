import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, Mail } from 'lucide-react'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'
import { CARRIER_DISCLAIMER, PRODUCT_TAGLINE } from '@/constants/complianceCopy.js'

export default function EnterprisePage() {
  return (
    <PublicMarketingShell>
      <PublicMarketingHeader current="enterprise" />
      <main className="max-w-4xl mx-auto px-5 pb-28 pt-12 md:pt-16 relative z-10 text-white space-y-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/35 bg-cyan-950/40 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-cyan-200">
            <Building2 size={14} /> Enterprise Intelligence
          </div>
          <h1 className="text-3xl md:text-4xl font-heading uppercase tracking-[0.12em]">
            Institutional digital asset intelligence
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl">{PRODUCT_TAGLINE}</p>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            For funds, exchanges, custodians, protocols, and treasury teams: we offer{' '}
            <strong className="text-white/90">institutional reservation onboarding</strong>, risk evaluation, capacity
            planning, and protection program architecture — coordinated as intelligence and workflow, not a regulated
            financial product sale.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-xs text-amber-100/95 leading-relaxed"
        >
          {CARRIER_DISCLAIMER}
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="public-premium-card p-6 sm:p-8 border border-white/10 space-y-5"
          aria-labelledby="enterprise-company-info-heading"
        >
          <h2 id="enterprise-company-info-heading" className="text-lg font-heading text-white tracking-tight">
            Company Information
          </h2>
          <dl className="grid gap-4 sm:grid-cols-1 text-sm">
            <div className="space-y-1">
              <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono">Legal Entity</dt>
              <dd className="text-slate-200 font-medium tracking-wide">SURESTACK TECHNOLOGY GROUP INC.</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono">Jurisdiction</dt>
              <dd className="text-slate-300">Delaware, United States</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono">Business Model</dt>
              <dd className="text-slate-300 leading-relaxed">Digital Asset Risk Intelligence Platform</dd>
            </div>
          </dl>
        </motion.section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="public-premium-card p-6 space-y-4">
            <h2 className="text-lg font-heading text-white">Institutional reservation onboarding</h2>
            <p className="text-sm text-slate-400">
              Qualification, capacity mapping, governance review, and scheduling — aligned to your operating model and
              digital asset risk posture.
            </p>
            <a
              href="mailto:pilot@surestack.tech?subject=SureStack%20Institutional%20inquiry"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-950/60 transition-colors"
            >
              <Mail size={16} /> pilot@surestack.tech
            </a>
          </div>
          <div className="public-premium-card p-6 space-y-4">
            <h2 className="text-lg font-heading text-white">Enterprise console (demo)</h2>
            <p className="text-sm text-slate-400">
              Explore the institutional workspace prototype: monitoring, governance surfaces, and risk evaluation tools
              (Sepolia-connected where configured).
            </p>
            <Link
              to="/business"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(124,58,237,0.35)]"
            >
              Open enterprise console <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>
    </PublicMarketingShell>
  )
}
