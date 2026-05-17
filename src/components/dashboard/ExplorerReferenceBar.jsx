import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { useExplorerMacroMarket } from '@/hooks/useExplorerMacroMarket'
import {
  classifyMacroMarketPulse,
  formatMacroAssetUsd,
  formatMacroPct,
  macroMicroSparkTrend,
  macroOrbClass,
} from '@/utils/macroMarketPulse.js'
import { formatMacroRegimeProvenanceLabel } from '@/utils/primeIntelligenceFormat.js'
import SignalWave from '@/components/dashboard/SignalWave.jsx'
import MacroAssetLogo from '@/components/dashboard/MacroAssetLogo.jsx'

function shortAddr(a) {
  if (!a || a.length < 10) return null
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function deltaPillClass(pct) {
  if (pct == null || !Number.isFinite(Number(pct))) return 'explorer-mpulse-delta explorer-mpulse-delta--na'
  const n = Number(pct)
  if (n > 0.02) return 'explorer-mpulse-delta explorer-mpulse-delta--up'
  if (n < -0.02) return 'explorer-mpulse-delta explorer-mpulse-delta--down'
  return 'explorer-mpulse-delta explorer-mpulse-delta--flat'
}

function MacroAssetGlassCard({ symbol, variant, priceStr, pct, showMicroSpark = false }) {
  const isTotal = variant === 'total'
  const spark = showMicroSpark && !isTotal ? macroMicroSparkTrend(pct, symbol) : null
  return (
    <div className="explorer-mintel-glass-card min-w-0">
      <div className="flex items-center gap-3 mb-3">
        {!isTotal ? <MacroAssetLogo symbol={symbol} className="h-9 w-9 shrink-0 drop-shadow-[0_0_12px_rgba(99,102,241,0.25)]" /> : null}
        <p className={isTotal ? 'explorer-mpulse__ticker-label explorer-mpulse__ticker-label--total' : 'explorer-mpulse__ticker-label'}>
          {isTotal ? 'Total market cap' : symbol}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <p className="explorer-mpulse__price">{priceStr}</p>
        <span className={deltaPillClass(pct)}>{formatMacroPct(pct)}</span>
      </div>
      {spark ? (
        <p className="prime-macro-spark mt-2.5" aria-hidden title="24h micro trend (orientation)">
          {spark}
        </p>
      ) : null}
    </div>
  )
}

function macroSignalConfidence(data, error) {
  if (!data || error) return 68
  const spread = Math.abs(Number(data.btc?.change24h || 0) - Number(data.eth?.change24h || 0))
  return Math.round(Math.max(55, Math.min(94, 78 - spread * 2)))
}

/**
 * Market Intelligence strip — BTC, ETH, XRP, total cap, regime state (orientation only).
 * @param {'explorer' | 'prime'} [variant]
 */
export default function ExplorerReferenceBar({ profile, variant = 'explorer', macroSnapshot = null }) {
  const { loading, data, error } = useExplorerMacroMarket()

  const signal = useMemo(
    () => classifyMacroMarketPulse(data?.btc?.change24h, data?.eth?.change24h, data?.xrp?.change24h, data?.total?.change24h),
    [data?.btc?.change24h, data?.eth?.change24h, data?.xrp?.change24h, data?.total?.change24h],
  )

  const verified = profile?.wallets?.find((w) => w.verifiedAt)
  const walletLine = verified?.address
    ? shortAddr(verified.address)
    : profile?.wallets?.[0]?.address
      ? shortAddr(profile.wallets[0].address)
      : null

  const stamp = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null

  const statusLabel =
    error && !data
      ? 'Intelligence unavailable'
      : data?.stale
        ? 'Delayed feed'
        : data?.cached
          ? 'Last intelligence refresh'
          : 'Live intelligence'

  const btcStr = formatMacroAssetUsd(data?.btc?.usd)
  const ethStr = formatMacroAssetUsd(data?.eth?.usd)
  const xrpStr = formatMacroAssetUsd(data?.xrp?.usd)
  const totalStr = formatMacroAssetUsd(data?.total?.usd)

  const showSkeleton = loading && !data
  const isPrime = variant === 'prime'
  const confidence = macroSignalConfidence(data, error)
  const regimeEyebrow = isPrime ? 'Market Regime' : 'Regime state'
  const regimeSubtext = error && !data
    ? 'Reference market intelligence'
    : isPrime
      ? 'AI-classified macro positioning model'
      : signal.subtext

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="explorer-ref-bar explorer-market-pulse explorer-mpulse-card explorer-mintel-strip px-5 py-6 sm:px-7 sm:py-7 flex flex-col gap-6 sm:gap-7 text-slate-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="explorer-mpulse__title">Market Intelligence</h2>
        {data?.stale ? (
          <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.16em] text-amber-100/90 border border-amber-400/25 rounded-full px-2.5 py-1 bg-amber-500/[0.09] backdrop-blur-sm">
            May be delayed
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {showSkeleton ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[6.5rem] rounded-xl bg-white/[0.035] border border-white/[0.07] animate-pulse" />
            ))}
          </>
        ) : (
          <>
            <MacroAssetGlassCard symbol="BTC" priceStr={btcStr} pct={data?.btc?.change24h} showMicroSpark={isPrime} />
            <MacroAssetGlassCard symbol="ETH" priceStr={ethStr} pct={data?.eth?.change24h} showMicroSpark={isPrime} />
            <MacroAssetGlassCard symbol="XRP" priceStr={xrpStr} pct={data?.xrp?.change24h} showMicroSpark={isPrime} />
            <MacroAssetGlassCard variant="total" priceStr={totalStr} pct={data?.total?.change24h} />
          </>
        )}
      </div>

      <motion.div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10 pt-1">
        <div className="min-w-0 flex-1 lg:max-w-[30rem] space-y-4">
          <p className="explorer-mpulse__signal-eyebrow">{regimeEyebrow}</p>
          {isPrime ? (
            <>
              <h3 className={`explorer-mpulse-signal-headline explorer-mpulse-signal-headline--${signal.orb}`}>
                {signal.headline}
              </h3>
              <motion.div className="flex flex-wrap items-center gap-2">
                <span className="prime-macro-pill">
                  Signal confidence: <strong>{confidence}%</strong>
                </span>
                {macroSnapshot?.provenance ? (
                  <span
                    className={
                      macroSnapshot.provenance === 'LATEST_SNAPSHOT'
                        ? 'prime-data-status prime-data-status--snapshot'
                        : macroSnapshot.provenance === 'ESTIMATED'
                          ? 'prime-data-status prime-data-status--estimated'
                          : macroSnapshot.provenance === 'MODEL_GENERATED'
                            ? 'prime-data-status prime-data-status--model'
                            : 'prime-data-status prime-data-status--demo'
                    }
                  >
                    {formatMacroRegimeProvenanceLabel(macroSnapshot.provenance)}
                  </span>
                ) : null}
              </motion.div>
              <p className="explorer-mpulse__signal-sub">{regimeSubtext}</p>
            </>
          ) : (
            <>
              <div className="explorer-mpulse-signal-visual flex items-center gap-2.5 sm:gap-3 min-w-0">
                <span className={macroOrbClass(signal.orb)} title={signal.headline} aria-hidden />
                <SignalWave state={signal.headline} color={signal.orb} />
              </div>
              <h3 className={`explorer-mpulse-signal-headline explorer-mpulse-signal-headline--${signal.orb}`}>
                {signal.headline}
              </h3>
              <p className="explorer-mpulse__signal-sub">{regimeSubtext}</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10 lg:flex-col lg:items-end lg:gap-4 lg:text-right lg:shrink-0 lg:min-w-[11rem]">
          <div className="space-y-1.5 min-w-0 sm:text-right">
            <p className="explorer-mpulse-meta-label">Wallet</p>
            <div className="flex items-center gap-2 sm:justify-end">
              <Wallet className="h-3.5 w-3.5 text-slate-600 shrink-0 opacity-90" aria-hidden />
              <p className="explorer-mpulse-meta-value truncate max-w-[15rem]">{walletLine ?? 'Not linked'}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 sm:items-end">
            {stamp ? (
              <p className="explorer-mpulse-meta-time">{stamp}</p>
            ) : showSkeleton ? (
              <p className="explorer-mpulse-meta-time text-slate-600">Syncing timestamp…</p>
            ) : (
              <p className="explorer-mpulse-meta-time">—</p>
            )}
            <span className="explorer-mpulse-status sm:ml-auto">{statusLabel}</span>
          </div>
        </div>
      </motion.div>

      {error && !data ? (
        <p className="text-[11px] text-slate-500 border-t border-white/[0.06] pt-4 leading-relaxed">
          Macro feed unreachable — run the API or check network. Explorer orientation continues without live macro.
        </p>
      ) : null}
    </motion.div>
  )
}
