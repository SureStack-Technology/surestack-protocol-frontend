import { motion } from 'framer-motion'
import { Activity, Loader2, RefreshCw } from 'lucide-react'
import { useBirdeyeIntel } from '@/hooks/useBirdeyeIntel.js'
import { formatIntelProviderUserMessage } from '@/utils/primeApiErrors.js'

const PROVIDER_READY_BANNER_HEADLINE = 'Provider Ready — Live Feed Pending'
const PROVIDER_READY_BANNER_BODY =
  'Live Birdeye feed is pending provider activation. SureStack behavior intelligence layer is ready.'

const PENDING_ASSET_FIELDS = {
  liquidityHealth: 'Provider Ready',
  holderConcentration: 'Pending',
  tradeVelocity: 'Pending',
  whaleActivity: 'Pending',
  smartMoneySignal: 'Awaiting live feed',
}

function isPendingProviderStatus(status) {
  return status === 'fallback' || status === 'unavailable'
}

function isWatchlistProviderPending(watchlist) {
  if (!watchlist) return false
  return watchlist.status !== 'live'
}

function statusBadgeClass(status) {
  if (status === 'live') return 'text-emerald-300/90 border-emerald-500/30 bg-emerald-950/20'
  if (isPendingProviderStatus(status)) return 'text-amber-200/90 border-amber-500/30 bg-amber-950/20'
  return 'text-slate-400 border-slate-500/30 bg-slate-900/40'
}

function statusLabel(status) {
  if (status === 'live') return 'Live feed'
  if (isPendingProviderStatus(status)) return 'Provider pending'
  return 'Provider pending'
}

function MetricRow({ label, value }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2.5">
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="text-sm text-white mt-1 leading-snug">{value || '—'}</p>
    </div>
  )
}

function AssetCard({ asset, providerPending }) {
  const fields = providerPending
    ? PENDING_ASSET_FIELDS
    : {
        liquidityHealth: asset.liquidityHealth,
        holderConcentration: asset.holderConcentration,
        tradeVelocity: asset.tradeVelocity,
        whaleActivity: asset.whaleActivity,
        smartMoneySignal: asset.smartMoneySignal,
      }

  return (
    <div className="rounded-xl border border-cyan-500/15 bg-cyan-950/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-heading text-white">
            {asset.watchlistSymbol || asset.symbol}
            <span className="text-slate-500 font-normal ml-2 text-xs">{asset.name}</span>
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-wider">{asset.chain}</p>
        </div>
        <span
          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${statusBadgeClass(asset.status)}`}
        >
          {statusLabel(asset.status)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MetricRow label="Liquidity health" value={fields.liquidityHealth} />
        <MetricRow label="Holder concentration" value={fields.holderConcentration} />
        <MetricRow label="Trade velocity" value={fields.tradeVelocity} />
        <MetricRow label="Whale activity" value={fields.whaleActivity} />
      </div>
      <div className="rounded-lg border border-violet-500/15 bg-violet-950/15 px-3 py-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-violet-200/80 mb-1">Smart money signal</p>
        <p className="text-xs text-slate-200 leading-relaxed">{fields.smartMoneySignal}</p>
      </div>
      {!providerPending && asset.riskInterpretation ? (
        <p className="text-[11px] text-slate-500 leading-relaxed">{asset.riskInterpretation}</p>
      ) : null}
    </div>
  )
}

/**
 * Prime — Birdeye on-chain behavior intelligence (complements LunarCrush social layer).
 * @param {'full' | 'embed'} [variant]
 */
export default function OnChainBehaviorPanel({ profile, variant = 'full' }) {
  const { watchlist, assets, loading, error, isLocked, isUnavailable, refresh } = useBirdeyeIntel({
    profile,
  })

  if (isLocked) {
    return null
  }

  const providerPending =
    isUnavailable || isWatchlistProviderPending(watchlist) || assets.some((a) => isPendingProviderStatus(a.status))

  const safeError = formatIntelProviderUserMessage(error)

  const inner = (
    <>
      {providerPending && !loading && variant === 'full' ? (
        <div className="prime-provider-ready-banner mb-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-200/90 mb-1.5">
            {PROVIDER_READY_BANNER_HEADLINE}
          </p>
          <p className="text-sm text-amber-100/90 leading-relaxed">{PROVIDER_READY_BANNER_BODY}</p>
        </div>
      ) : null}

      {loading && !watchlist ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 className="animate-spin" size={18} aria-hidden />
          Loading on-chain behavior…
        </div>
      ) : (
        <div className="space-y-4">
          {watchlist?.status ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Watchlist</span>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${statusBadgeClass(watchlist.status)}`}
              >
                {statusLabel(watchlist.status)}
              </span>
            </div>
          ) : null}
          <div className={`grid gap-3 ${variant === 'embed' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {assets.map((asset) => (
              <AssetCard
                key={`${asset.chain}-${asset.tokenAddress}`}
                asset={asset}
                providerPending={providerPending || isPendingProviderStatus(asset.status)}
              />
            ))}
          </div>
          {safeError ? <p className="text-[11px] text-amber-200/80">{safeError}</p> : null}
        </div>
      )}
    </>
  )

  if (variant === 'embed') {
    return (
      <div className="prime-behavior-embed max-h-[420px] overflow-y-auto pr-1">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-200/80">
            {providerPending ? 'Behavior Engine Ready' : 'Birdeye live'}
          </p>
          <button
            type="button"
            onClick={() => refresh()}
            className="text-slate-400 hover:text-cyan-200 p-1"
            aria-label="Refresh Birdeye intelligence"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        {inner}
      </div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="prime-glass p-6 sm:p-7 border border-cyan-500/25 prime-panel-hover"
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-cyan-200/90 flex items-center gap-2">
            <Activity size={14} aria-hidden />
            On-Chain Behavior Intelligence
          </p>
          <h2 className="text-lg font-heading text-white mt-1">Liquidity, holders & flow</h2>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-xl">
            On-chain behavior layer — complements LunarCrush narrative intelligence. Not a trade signal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-slate-400 hover:text-cyan-200 transition-colors p-1 shrink-0"
          aria-label="Refresh Birdeye intelligence"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {inner}
    </motion.section>
  )
}
