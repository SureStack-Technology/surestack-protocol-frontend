import { motion, useReducedMotion } from 'framer-motion'
import { Shield } from 'lucide-react'

/** Rotating advisory lines — daily rotation, non-personalized */
const GUIDANCE = [
  {
    kind: 'Threat advisory',
    headline: 'Blind signing risk elevated',
    sub: 'Treat unknown typed data and opaque calldata as high risk until validated on a second channel.',
  },
  {
    kind: 'Contract caution',
    headline: 'Unknown spender approvals increase risk',
    sub: 'Revoke stale allowances and avoid unlimited approvals unless you fully trust the spender contract.',
  },
  {
    kind: 'Security Advisory',
    headline: 'Copycat domain activity rising',
    sub: 'Bookmark official sites and re-verify URLs after airdrops or high-attention launches.',
  },
  {
    kind: 'Threat advisory',
    headline: 'Hot-wallet interaction density',
    sub: 'Dense contract traffic amplifies exposure — isolate material balances from everyday signing keys.',
  },
  {
    kind: 'Contract caution',
    headline: 'Bridge front-end spoofing risk',
    sub: 'Bridge incidents often start with spoofed UIs; match contract targets to official deployments only.',
  },
  {
    kind: 'Security Advisory',
    headline: 'Impersonation support DMs spiking',
    sub: 'Legitimate teams never DM seed phrases; archive unknown "support" threads without engaging.',
  },
]

function pickGuidance() {
  const i = Math.floor(Date.now() / 86400000) % GUIDANCE.length
  return GUIDANCE[i]
}

/**
 * Rotating, non-personalized security orientation for Explorer — not analytics or paid upsell.
 */
export default function SecurityPulseWidget() {
  const tip = pickGuidance()
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      id="explorer-security"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="explorer-card-premium explorer-card-tight text-slate-100 h-full flex flex-col relative overflow-hidden border border-amber-500/10"
    >
      <div
        className="pointer-events-none absolute inset-y-3 left-0 w-px bg-gradient-to-b from-transparent via-amber-400/35 to-transparent rounded-full"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_40px_rgba(245,158,11,0.04)]" aria-hidden />
      <div className="flex items-start gap-3 flex-1 pl-1">
        <motion.div
          className="rounded-xl border border-amber-500/30 bg-amber-500/[0.09] p-2.5 text-amber-200 shrink-0 shadow-[0_0_22px_rgba(245,158,11,0.12)]"
          animate={reduceMotion ? { opacity: 1 } : { opacity: [0.86, 1, 0.86] }}
          transition={{ duration: 2.4, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
        >
          <Shield size={22} aria-hidden />
        </motion.div>
        <div className="min-w-0 space-y-2.5 flex-1 border-l border-amber-500/15 pl-3 -ml-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-amber-300/90 font-mono">
              Risk engine
            </p>
            <span className="inline-flex items-center rounded-full border border-amber-400/35 bg-amber-500/[0.12] px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-[0.18em] text-amber-50/95">
              Advisory
            </span>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-amber-200/70 font-mono mb-1">
              {tip.kind}
            </p>
            <h3 className="text-base font-heading text-white leading-snug">{tip.headline}</h3>
            <p className="text-[12px] text-slate-300/95 leading-relaxed mt-1.5">{tip.sub}</p>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed pt-0.5 max-w-xl border-t border-white/[0.05] mt-1 pt-2">
            Explorer awareness layer. Institutional monitoring surfaces unlock with premium intelligence tiers.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
