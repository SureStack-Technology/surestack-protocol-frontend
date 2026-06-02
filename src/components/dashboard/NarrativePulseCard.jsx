import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, MessageCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useLunarCrushIntel } from '@/hooks/useLunarCrushIntel.js'
import { EXPLORER_UPGRADE_CTA } from '@/constants/intelligenceTiers.js'

function MoodIcon({ mood }) {
  if (mood === 'bullish') return <TrendingUp className="text-emerald-400" size={18} aria-hidden />
  if (mood === 'bearish') return <TrendingDown className="text-rose-400" size={18} aria-hidden />
  return <Minus className="text-slate-400" size={18} aria-hidden />
}

function moodLabel(mood) {
  if (mood === 'bullish') return 'Constructive'
  if (mood === 'bearish') return 'Cautious'
  return 'Mixed'
}

/**
 * Explorer — lightweight social market mood teaser (LunarCrush via backend).
 */
export default function NarrativePulseCard({ profile }) {
  const { explorerSentiment, loading, error, refresh } = useLunarCrushIntel({ profile })

  const mood = explorerSentiment?.marketMood || 'neutral'
  const status = explorerSentiment?.status || 'fallback'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="explorer-glass rounded-2xl border border-violet-500/20 p-5 sm:p-6 h-full flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-violet-200/90 flex items-center gap-2">
            <MessageCircle size={14} aria-hidden />
            Narrative Pulse
          </p>
          <h3 className="text-sm font-heading text-white mt-1">Social Market Mood</h3>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-[10px] font-mono uppercase tracking-wider text-slate-500 hover:text-sky-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && !explorerSentiment ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-6">
          <Loader2 className="animate-spin" size={16} aria-hidden />
          Loading social mood…
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3">
            <MoodIcon mood={mood} />
            <div>
              <p className="text-lg font-heading text-white capitalize">{moodLabel(mood)}</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                {status === 'live' ? 'Live social signal' : status === 'unavailable' ? 'Reference mode' : 'Cached reference'}
              </p>
            </div>
            {explorerSentiment?.sentimentScore != null ? (
              <span className="ml-auto text-sm font-mono text-sky-200/90 tabular-nums">
                {Math.round(explorerSentiment.sentimentScore)}%
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-300/95 leading-relaxed flex-1">
            {explorerSentiment?.summary ||
              'Social mood summary will appear when the intelligence service is configured.'}
          </p>
          {error ? (
            <p className="text-[11px] text-amber-200/80 mt-2 font-mono">Signal degraded — showing last known context.</p>
          ) : null}
          {status !== 'live' ? (
            <p className="text-[11px] text-violet-300/85 mt-3 font-mono leading-relaxed">
              Prime Narrative Intelligence Model available in Social Intelligence — indexed market observations for analyst review.
            </p>
          ) : null}
        </>
      )}

      <p className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-white/10 leading-relaxed">
        Upgrade to Prime for full social trend intelligence and narrative anomaly signals.{' '}
        <Link to="/membership" className="text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline">
          {EXPLORER_UPGRADE_CTA}
        </Link>
      </p>
    </motion.div>
  )
}
