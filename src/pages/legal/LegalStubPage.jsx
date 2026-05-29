import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'
import { SITE_LEGAL_ENTITY_DEFINITION } from '@/constants/siteLegalCopy.js'

/**
 * Lightweight legal document shell — full policies can be linked or replaced later without changing routing.
 */
export default function LegalStubPage({ title, children }) {
  return (
    <PublicMarketingShell>
      <PublicMarketingHeader current="landing" />
      <main className="max-w-3xl mx-auto px-5 pb-12 pt-12 md:pt-16 relative z-10 text-white space-y-6">
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="public-premium-card p-6 sm:p-8 border border-white/10 space-y-5"
        >
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500 font-mono">Legal</p>
          <h1 className="text-2xl md:text-3xl font-heading text-white tracking-tight">{title}</h1>
          <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-violet-500/40 pl-4">
            {SITE_LEGAL_ENTITY_DEFINITION}
          </p>
          <div className="text-sm text-slate-400 leading-relaxed space-y-3">{children}</div>
          <Link to="/" className="inline-block text-xs text-violet-300 hover:text-violet-200 underline underline-offset-2">
            ← Back to home
          </Link>
        </motion.article>
      </main>
    </PublicMarketingShell>
  )
}
