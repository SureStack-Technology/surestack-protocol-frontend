import { motion } from 'framer-motion'
import { ArrowUpRight, Radio } from 'lucide-react'
import toast from 'react-hot-toast'

const BENEFITS = [
  'Real narrative anomaly detection',
  'Whale behavior monitoring',
  'Liquidity concentration analysis',
  'Smart money movement tracking',
  'Continuous threat monitoring',
]

/**
 * Frontend-only upgrade CTA — no billing or provider wiring.
 */
export default function PrimeLiveIntelligenceCta() {
  const handleActivate = () => {
    toast('Live provider activation is available on Intelligence Pro — contact your account team.', {
      icon: '✦',
      duration: 4500,
    })
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="prime-live-cta scroll-mt-28"
      aria-labelledby="prime-live-cta-title"
    >
      <div className="prime-live-cta__glow" aria-hidden />
      <div className="prime-live-cta__inner">
        <div className="flex items-start gap-3">
          <div className="prime-live-cta__icon-wrap">
            <Radio size={20} className="text-violet-200" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-violet-200/90">
              Provider upgrade
            </p>
            <h2 id="prime-live-cta-title" className="text-xl sm:text-2xl font-heading text-white mt-1 tracking-tight">
              Unlock Live Intelligence Monitoring
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Activate live provider intelligence for continuous narrative, behavior, and threat coverage across
              your verified wallet surfaces.
            </p>
          </div>
        </div>

        <ul className="prime-live-cta__benefits mt-6">
          {BENEFITS.map((item) => (
            <li key={item} className="prime-live-cta__benefit">
              <span className="prime-live-cta__check" aria-hidden>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>

        <button type="button" onClick={handleActivate} className="prime-live-cta__btn mt-6">
          Activate Live Intelligence
          <ArrowUpRight size={16} aria-hidden />
        </button>
      </div>
    </motion.section>
  )
}
