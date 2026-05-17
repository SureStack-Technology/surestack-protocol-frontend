import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SiChainlink } from 'react-icons/si'
import { useEthUsdFeed } from '@shared/hooks/useEthUsdFeed'

const COMPACT_SPARK_W = 124
const COMPACT_SPARK_H = 28

/**
 * Premium micro placeholder when the feed has not accumulated enough ticks yet.
 */
function CompactSparklinePlaceholder({ uid, reduceMotion }) {
  const gradId = `sp-ph-${uid}`
  const flowId = `sp-flow-${uid}`
  const label = 'Establishing signal flow…'
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-sm"
      style={{ width: COMPACT_SPARK_W, height: COMPACT_SPARK_H }}
      role="status"
      aria-label={label}
    >
      <svg className="absolute inset-0 block h-full w-full" viewBox={`0 0 ${COMPACT_SPARK_W} ${COMPACT_SPARK_H}`} aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity="0.1" />
            <stop offset="40%" stopColor="rgb(45 212 191)" stopOpacity="0.32" />
            <stop offset="70%" stopColor="rgb(56 189 248)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id={flowId} x1="0" y1="14" x2="40" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity="0" />
            <stop offset="50%" stopColor="rgb(103 232 249)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M 2 19.5 L 122 19"
          fill="none"
          stroke="rgb(148 163 184)"
          strokeOpacity="0.12"
          strokeWidth="0.65"
          strokeLinecap="round"
        />
        {!reduceMotion ? (
          <motion.rect
            x="-36"
            y="0"
            width="36"
            height={COMPACT_SPARK_H}
            fill={`url(#${flowId})`}
            opacity={0.45}
            initial={false}
            animate={{ x: [-36, COMPACT_SPARK_W + 8] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          />
        ) : null}
        <motion.path
          d="M 3 17 Q 38 13 62 16 T 121 15"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="1.15"
          strokeLinecap="round"
          initial={false}
          animate={
            reduceMotion
              ? { opacity: 0.5, pathLength: 1 }
              : { pathLength: [0.32, 1, 0.32], opacity: [0.4, 0.62, 0.4] }
          }
          transition={
            reduceMotion ? { duration: 0 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
          }
        />
        {!reduceMotion ? (
          <motion.g
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path
              d="M 4 20 Q 34 18 64 19.5 T 118 18.5"
              fill="none"
              stroke="rgb(103 232 249)"
              strokeOpacity="0.22"
              strokeWidth="0.85"
              strokeLinecap="round"
            />
          </motion.g>
        ) : null}
      </svg>
    </div>
  )
}

/**
 * @param {{ rows: Array<{ price: number }> | undefined, compact?: boolean }} props
 * `compact` — Explorer Signal Flow: micro sparkline (smaller canvas, no fill hero treatment).
 */
function MiniSparkline({ rows, compact = false }) {
  const uid = useId().replace(/:/g, '')
  const reduceMotion = useReducedMotion()

  const finitePrices = (rows ?? []).map((r) => Number(r?.price)).filter((n) => Number.isFinite(n))
  const insufficient = finitePrices.length < 2

  if (insufficient) {
    if (compact) {
      return <CompactSparklinePlaceholder uid={uid} reduceMotion={reduceMotion} />
    }
    return (
      <div
        className="shrink-0 rounded-md border border-white/[0.06] bg-white/[0.02] h-12 w-full max-w-[160px]"
        aria-hidden
      />
    )
  }

  const prices = finitePrices
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const w = compact ? COMPACT_SPARK_W : 160
  const h = compact ? COMPACT_SPARK_H : 48
  const pad = compact ? 2.5 : 4
  const range = max - min || 1
  const n = prices.length
  const pairs = prices.map((p, i) => {
    const x = pad + (n <= 1 ? w / 2 : (i / (n - 1)) * (w - pad * 2))
    const y = h - pad - ((p - min) / range) * (h - pad * 2)
    return [x, y]
  })
  const points = pairs.map(([x, y]) => `${x},${y}`).join(' ')

  const gradId = `spark-mp-${uid}`
  const strokeW = compact ? 1.2 : 1.75

  const line = (
    <polyline
      fill="none"
      stroke={`url(#${gradId})`}
      strokeWidth={strokeW}
      strokeLinecap="round"
      strokeLinejoin="round"
      points={points}
    />
  )

  return (
    <motion.svg
      width={w}
      height={h}
      className="shrink-0"
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      animate={compact && !reduceMotion ? { filter: ['brightness(1)', 'brightness(1.09)', 'brightness(1)'] } : false}
      transition={{ duration: 2.5, repeat: compact && !reduceMotion ? Infinity : 0, ease: 'easeInOut' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
          {compact ? (
            <>
              <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity="0.5" />
              <stop offset="55%" stopColor="rgb(45 212 191)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="rgb(56 189 248)" stopOpacity="0.48" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="rgb(56 189 248)" stopOpacity="0.75" />
              <stop offset="100%" stopColor="rgb(129 140 248)" stopOpacity="0.75" />
            </>
          )}
        </linearGradient>
      </defs>
      {compact && !reduceMotion ? (
        <motion.g
          animate={{ opacity: [0.88, 1, 0.88] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {line}
        </motion.g>
      ) : (
        line
      )}
    </motion.svg>
  )
}

/** Subtle orientation-only signal from recent reference ticks — not a volatility model */
function pathMicroSignal(rows) {
  if (!rows?.length || rows.length < 2) return null
  const prices = rows.map((r) => Number(r.price)).filter((n) => Number.isFinite(n))
  if (prices.length < 2) return null
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const mid = (min + max) / 2 || 1
  const band = ((max - min) / mid) * 100
  if (!Number.isFinite(band) || band <= 0) return null
  if (band < 0.25) return { label: 'Path · calm', detail: null, tone: 'slate' }
  if (band < 0.85) return { label: 'Path · active', detail: `${band.toFixed(2)}% band`, tone: 'indigo' }
  return { label: 'Path · wider band', detail: `${band.toFixed(2)}% band`, tone: 'sky' }
}

/**
 * @param {{ variant?: 'full' | 'context' }} props
 * `context` — market framing only; ETH/USD price lives in ExplorerReferenceBar.
 */
export default function MarketPulseWidget({ variant = 'full' }) {
  const {
    quoteForUi,
    hasValidQuote,
    updatedAt,
    warmup,
    connectionState,
    isStreaming,
    restLoading,
    restAttempted,
    rows,
  } = useEthUsdFeed()

  const reduceMotionExplorer = useReducedMotion()

  const loading = !hasValidQuote && (warmup || restLoading)
  const feedUnavailable = !hasValidQuote && !loading && restAttempted
  const showPrice = hasValidQuote && quoteForUi != null

  const statusLabel =
    connectionState === 'connected' && isStreaming ? 'Live reference' : 'Reference feed'

  const priceLine = showPrice
    ? `$${quoteForUi.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null

  if (variant === 'context') {
    const path = pathMicroSignal(rows)
    const chipTone =
      path?.tone === 'sky'
        ? 'border-cyan-500/25 bg-cyan-500/10 text-cyan-100/90'
        : path?.tone === 'indigo'
          ? 'border-teal-500/25 bg-teal-500/10 text-teal-100/85'
          : 'border-white/10 bg-white/[0.04] text-slate-400'

    return (
      <motion.div
        id="explorer-market"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="explorer-card-premium text-slate-100 h-full flex flex-col scroll-mt-28 px-4 py-3.5 sm:px-[1.35rem] sm:py-4 border border-cyan-500/10"
      >
        <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-h-0">
          <motion.div
            className="rounded-lg border border-cyan-500/25 bg-cyan-500/[0.08] p-2 shrink-0 shadow-[0_0_18px_rgba(34,211,238,0.08)]"
            animate={
              reduceMotionExplorer
                ? undefined
                : { boxShadow: ['0 0 12px rgba(34,211,238,0.06)', '0 0 22px rgba(34,211,238,0.14)', '0 0 12px rgba(34,211,238,0.06)'] }
            }
            transition={{ duration: 2.6, repeat: reduceMotionExplorer ? 0 : Infinity, ease: 'easeInOut' }}
          >
            <SiChainlink className="text-cyan-300/95" size={18} aria-hidden />
          </motion.div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-cyan-400/85 font-mono">
              Signal flow
            </p>
            <h3 className="text-sm font-heading font-semibold text-white leading-snug tracking-tight">
              Short-horizon movement analysis
            </h3>
            <p className="text-[11px] text-slate-500 leading-snug max-w-[17rem]">
              Signal routing through widening volatility bands.
            </p>
            {path ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.12em] ${chipTone}`}
                >
                  {path.label}
                  {path.detail ? (
                    <span className="font-mono normal-case tracking-normal text-[8px] opacity-80">{path.detail}</span>
                  ) : null}
                </span>
              </div>
            ) : null}
            {feedUnavailable ? (
              <p className="text-[11px] text-slate-500">Feed unavailable — check connection.</p>
            ) : loading ? (
              <p className="text-[11px] text-cyan-200/45 font-medium tracking-wide">Establishing signal flow…</p>
            ) : null}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-0.5 pl-1 pt-0.5">
            <motion.div
              className="rounded-md border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.08] to-white/[0.02] px-1 py-0.5 relative overflow-hidden"
              animate={
                reduceMotionExplorer
                  ? undefined
                  : { borderColor: ['rgba(34,211,238,0.22)', 'rgba(103,232,249,0.35)', 'rgba(34,211,238,0.22)'] }
              }
              transition={{ duration: 2.4, repeat: reduceMotionExplorer ? 0 : Infinity, ease: 'easeInOut' }}
            >
              <MiniSparkline rows={rows} compact />
            </motion.div>
            <span className="text-[9px] uppercase tracking-[0.16em] text-cyan-500/55 font-mono text-right leading-tight max-w-[6rem]">
              Market telemetry layer
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="explorer-card-premium p-5 sm:p-6 text-slate-100"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-2.5 shrink-0">
            <SiChainlink className="text-sky-300" size={20} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-sky-400/80 font-mono">Market Intelligence</p>
            <h3 className="text-lg font-heading text-white mt-0.5">ETH / USD reference</h3>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed max-w-md">
              Reference intelligence for Explorer access. Advanced context unlocks on premium intelligence tiers.
            </p>
          </div>
        </div>

        <div className="text-right min-w-[10rem]">
          {feedUnavailable ? (
            <>
              <p className="text-sm font-semibold text-slate-200">Market data temporarily unavailable</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug max-w-xs ml-auto">
                Reference feed will resume when the network or contract is reachable.
              </p>
            </>
          ) : loading ? (
            <>
              <p className="text-sm font-medium text-slate-300">Awaiting market feed</p>
              <p className="text-[11px] text-slate-500 mt-1">Connecting to reference pricing.</p>
            </>
          ) : showPrice ? (
            <>
              <p className="text-2xl font-heading text-sky-200 tabular-nums drop-shadow-[0_0_20px_rgba(56,189,248,0.15)]">
                {priceLine}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                {updatedAt ? new Date(updatedAt).toLocaleTimeString() : '—'}
              </p>
              <p className="text-[10px] text-sky-200/85 mt-1">Reference pricing available</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-300">Awaiting market feed</p>
              <p className="text-[11px] text-slate-500 mt-1">Reference pricing is not ready yet.</p>
            </>
          )}

          <p className="mt-2 inline-flex items-center rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-indigo-200/90">
            {statusLabel}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
