import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Layers, Sparkles, Shield } from 'lucide-react'
import PublicMarketingShell from '@/components/layout/PublicMarketingShell.jsx'
import PublicMarketingHeader from '@/components/layout/PublicMarketingHeader.jsx'

const whySureStack = [
  {
    icon: Sparkles,
    title: 'AI Risk Intelligence',
    description: 'Continuous digital asset monitoring powered by advanced intelligence.',
    accent: 'text-violet-300/95',
    border: 'border-violet-500/20',
  },
  {
    icon: Layers,
    title: 'Multi-Layer Visibility',
    description: 'Market signals, ecosystem context, and portfolio-level perspective.',
    accent: 'text-emerald-300/95',
    border: 'border-emerald-500/20',
  },
  {
    icon: Shield,
    title: 'Trusted Access',
    description: 'Secure identity, wallet continuity, and premium intelligence access.',
    accent: 'text-cyan-300/95',
    border: 'border-cyan-500/25',
  },
]

export default function LandingPage() {
  return (
    <PublicMarketingShell>
      <PublicMarketingHeader current="landing" />
      <main className="max-w-6xl mx-auto px-5 pb-28 pt-14 md:pt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-12 items-start">
          <div className="lg:col-span-7 space-y-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/35 bg-violet-950/45 px-4 py-1.5 text-[10px] uppercase tracking-[0.32em] text-violet-200">
                <Sparkles size={13} /> AI-powered intelligence
              </div>
              <h1 className="mt-7 text-4xl sm:text-5xl lg:text-[2.95rem] font-heading uppercase tracking-[0.08em] leading-[1.08] bg-gradient-to-br from-white via-slate-100 to-slate-500 bg-clip-text text-transparent">
                Real-time crypto intelligence for digital asset confidence
              </h1>
              <p className="mt-6 text-lg text-slate-300 max-w-xl leading-relaxed">
                SureStack delivers digital asset risk intelligence — AI-powered monitoring, wallet and protocol
                analytics, and threat awareness for decision support. Explorer Access is free and public. Prime
                Intelligence Beta opens through Telegram verification and admin approval.
              </p>
              <div className="flex flex-wrap gap-3 pt-9">
                <Link to="/sign-up" className="public-cta-primary gap-2">
                  Start Explorer Access <ArrowRight size={18} />
                </Link>
                <Link to="/pricing" className="public-cta-secondary">
                  Explore Intelligence
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-8 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <Shield size={14} className="text-emerald-400/90" /> Built for trust
                </span>
                <span className="hidden sm:inline text-white/20">|</span>
                <span>Web3-native · institutional-grade clarity</span>
              </div>
            </motion.div>

            <div className="space-y-4 pt-2">
              <h2 className="text-[10px] uppercase tracking-[0.32em] text-slate-500 font-mono">Why SureStack</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {whySureStack.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + i * 0.08 }}
                      className={`public-premium-card p-5 ${item.border} hover:border-white/20 transition-colors duration-300`}
                    >
                      <div className={`inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-2 ${item.accent}`}>
                        <Icon size={20} strokeWidth={1.75} aria-hidden />
                      </div>
                      <p className={`mt-4 text-[10px] uppercase tracking-[0.26em] ${item.accent}`}>{item.title}</p>
                      <p className="mt-2 text-sm text-slate-300 leading-relaxed">{item.description}</p>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="public-premium-card public-premium-card-elevated p-6 md:p-8 relative overflow-visible"
            >
              <div className="absolute -top-3 left-8 h-px w-28 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-transparent" aria-hidden />
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">A calmer view of complexity</p>
              <p className="mt-6 text-xl font-heading text-white leading-snug tracking-tight">
                Intelligence that meets you where you are
              </p>
              <p className="mt-4 text-sm text-slate-400 leading-relaxed">
                Whether you are exploring digital asset markets or steering treasury decisions, SureStack brings signal
                forward and noise to the background—so you can move with confidence.
              </p>
              <div className="mt-10 pt-6 border-t border-white/10">
                <Link
                  to="/pricing"
                  className="public-cta-secondary !text-[13px] !py-2.5 !px-4 !inline-flex gap-2"
                >
                  Explore Intelligence <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </PublicMarketingShell>
  )
}
