import { motion } from 'framer-motion'
import { Loader2, MessageCircle, RefreshCw, Sparkles } from 'lucide-react'
import { useLunarCrushIntel } from '@/hooks/useLunarCrushIntel.js'

function moodClass(mood) {
  if (mood === 'bullish') return 'text-emerald-300'
  if (mood === 'bearish') return 'text-rose-300'
  return 'text-slate-200'
}

/**
 * Prime — full LunarCrush social intelligence panel (backend-proxied).
 */
export default function SocialIntelligencePanel({ profile }) {
  const { primeTrends, loading, error, refresh } = useLunarCrushIntel({ profile })

  const data = primeTrends
  const narratives = data?.trendingNarratives || []
  const assets = data?.trendingAssets || []
  const anomalies = data?.anomalySignals || []

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="prime-glass p-6 sm:p-7 border border-fuchsia-500/25 prime-panel-hover"
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-fuchsia-200/90 flex items-center gap-2">
            <MessageCircle size={14} aria-hidden />
            Social Intelligence
          </p>
          <h2 className="text-lg font-heading text-white mt-1">Market narratives & anomalies</h2>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-slate-400 hover:text-violet-200 transition-colors p-1"
          aria-label="Refresh social intelligence"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
          <Loader2 className="animate-spin" size={18} aria-hidden />
          Loading social intelligence…
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2.5">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Mood</p>
              <p className={`text-sm font-semibold mt-1 capitalize ${moodClass(data?.marketMood)}`}>
                {data?.marketMood || 'neutral'}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2.5">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Sentiment</p>
              <p className="text-sm text-white mt-1 tabular-nums">
                {data?.sentimentScore != null ? `${Math.round(data.sentimentScore)}%` : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2.5 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Social volume</p>
              <p className="text-sm text-white mt-1 tabular-nums">
                {data?.socialVolume != null
                  ? data.socialVolume >= 1_000_000
                    ? `${(data.socialVolume / 1_000_000).toFixed(1)}M`
                    : Math.round(data.socialVolume).toLocaleString()
                  : '—'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-950/25 to-black/30 px-4 py-3.5">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Sparkles size={12} aria-hidden />
              Intelligence summary
            </p>
            <p className="text-sm text-slate-100 leading-relaxed">{data?.summary || 'Summary unavailable.'}</p>
            {data?.status !== 'live' ? (
              <p className="text-[10px] font-mono text-amber-200/70 mt-2 uppercase tracking-wider">
                {data?.status === 'unavailable' ? 'LunarCrush not configured' : 'Fallback reference data'}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">Trending narratives</p>
              <ul className="space-y-2">
                {narratives.length ? (
                  narratives.map((n) => (
                    <li
                      key={n.topic}
                      className="text-xs text-slate-300 border border-white/[0.06] rounded-lg px-3 py-2 bg-black/20"
                    >
                      <span className="text-white font-medium">{n.title}</span>
                      {n.rank != null ? (
                        <span className="text-slate-500 font-mono ml-2">#{n.rank}</span>
                      ) : null}
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500">No narrative rows in this cycle.</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">Trending assets</p>
              <ul className="space-y-2">
                {assets.length ? (
                  assets.map((a) => (
                    <li
                      key={a.symbol}
                      className="text-xs text-slate-300 border border-white/[0.06] rounded-lg px-3 py-2 bg-black/20 flex justify-between gap-2"
                    >
                      <span>
                        <span className="text-white font-medium">{a.symbol}</span>
                        <span className="text-slate-500 ml-1">{a.name}</span>
                      </span>
                      {a.sentiment != null ? (
                        <span className="font-mono text-sky-200/80 tabular-nums">{Math.round(a.sentiment)}%</span>
                      ) : null}
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500">No asset rows in this cycle.</li>
                )}
              </ul>
            </div>
          </div>

          {anomalies.length ? (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">Anomaly signals</p>
              <ul className="flex flex-wrap gap-2">
                {anomalies.map((s, i) => (
                  <li
                    key={`${s.type}-${i}`}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-950/25 text-amber-100/90"
                  >
                    {s.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="text-[11px] text-amber-200/80 font-mono">Refresh issue — {error}</p>
          ) : null}
        </div>
      )}
    </motion.section>
  )
}
