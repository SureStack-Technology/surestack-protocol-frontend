import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'

export default function AboutPage() {
  return (
    <PublicMarketingShell>
      <PublicMarketingHeader current="about" />
      <main className="max-w-3xl mx-auto px-5 pb-12 pt-12 md:pt-16 relative z-10 text-white space-y-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-mono">About</p>
          <h1 className="text-3xl md:text-4xl font-heading uppercase tracking-[0.12em] text-white">SureStack</h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            SureStack is developed and operated by{' '}
            <strong className="text-white/95 font-semibold">SURESTACK TECHNOLOGY GROUP INC.</strong>, focused on AI-powered
            digital asset risk intelligence, monitoring, and analytics infrastructure.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">
            SureStack Intelligence surfaces are built for orientation, analytics, and threat awareness — not custody of
            user assets, not a licensed insurance carrier, broker, or investment advisor, and not a substitute for
            professional advice where your situation requires it.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/pricing" className="text-xs text-violet-300 hover:text-violet-200 underline underline-offset-2">
              SureStack Intelligence
            </Link>
            <Link to="/enterprise" className="text-xs text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Enterprise
            </Link>
            <Link to="/membership" className="text-xs text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Membership
            </Link>
          </div>
        </motion.div>
      </main>
    </PublicMarketingShell>
  )
}
