import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Beaker, Loader2, MessageCircle, RefreshCw, Sparkles } from 'lucide-react'
import { useLunarCrushIntel } from '@/hooks/useLunarCrushIntel.js'
import { formatIntelProviderUserMessage } from '@/utils/primeApiErrors.js'
import {
  DEFAULT_SHOWCASE_SCENARIO_ID,
  getLunarCrushScenarioById,
  isLiveLunarCrushStatus,
  LUNARCRUSH_SCENARIOS,
} from '@/data/lunarCrushScenarioShowcase.js'
import { buildCategoryNarrativePanelData } from '@/shared/services/tokenNarrativeFallback.js'

const SHOWCASE_DISCLOSURE =
  'Scenario Showcase uses simulated social intelligence data to demonstrate how SureStack will interpret premium LunarCrush signals once full provider access is enabled.'

const CATEGORY_FALLBACK_DISCLOSURE =
  'Category narrative fallback uses token-type templates until LunarCrush live data is enabled. Meme tokens may use the scenario showcase; other categories do not include meme trending assets.'

function moodClass(mood) {
  if (mood === 'bullish') return 'text-emerald-300'
  if (mood === 'bearish') return 'text-rose-300'
  return 'text-slate-200'
}

function severityClass(severity) {
  if (severity === 'CRITICAL') return 'border-rose-500/40 bg-rose-950/30 text-rose-200'
  if (severity === 'HIGH') return 'border-amber-500/40 bg-amber-950/25 text-amber-100'
  if (severity === 'MEDIUM') return 'border-sky-500/30 bg-sky-950/20 text-sky-200'
  return 'border-slate-500/30 bg-slate-900/40 text-slate-300'
}

function formatVolume(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  const v = Number(n)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  return Math.round(v).toLocaleString()
}

function MetricCard({ label, value, subtext, wide }) {
  return (
    <div className={`prime-social-metric ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="text-sm text-white mt-1 font-medium tabular-nums">{value}</p>
      {subtext ? <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{subtext}</p> : null}
    </div>
  )
}

function NarrativesList({ items }) {
  return (
    <ul className="space-y-2">
      {items.length ? (
        items.map((n) => (
          <li
            key={n.topic}
            className="text-xs text-slate-300 border border-white/[0.06] rounded-lg px-3 py-2 bg-black/20"
          >
            <span className="text-white font-medium">{n.title}</span>
            {n.rank != null ? <span className="text-slate-500 font-mono ml-2">#{n.rank}</span> : null}
          </li>
        ))
      ) : (
        <li className="text-xs text-slate-500">No narrative rows in this cycle.</li>
      )}
    </ul>
  )
}

function AssetsList({ items }) {
  return (
    <ul className="space-y-2">
      {items.length ? (
        items.map((a) => (
          <li
            key={a.symbol}
            className="text-xs text-slate-300 border border-white/[0.06] rounded-lg px-3 py-2 bg-black/20 flex justify-between gap-2"
          >
            <span>
              <span className="text-white font-medium">{a.symbol}</span>
              <span className="text-slate-500 ml-1">{a.name}</span>
            </span>
            {a.sentiment != null ? (
              <span className="font-mono text-sky-200/80 tabular-nums shrink-0">{Math.round(a.sentiment)}%</span>
            ) : null}
          </li>
        ))
      ) : (
        <li className="text-xs text-slate-500">No asset rows in this cycle.</li>
      )}
    </ul>
  )
}

function AnomaliesList({ items }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">Anomaly signals</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((s, i) => (
          <li
            key={`${s.type}-${i}`}
            className="text-[11px] px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-950/25 text-amber-100/90"
          >
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function LiveSocialView({ data, errorMessage }) {
  const narratives = data?.trendingNarratives || []
  const assets = data?.trendingAssets || []
  const anomalies = data?.anomalySignals || []

  return (
    <div className="space-y-5">
      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-300/80">Live LunarCrush feed</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Market mood"
          value={<span className={`capitalize ${moodClass(data?.marketMood)}`}>{data?.marketMood || 'neutral'}</span>}
        />
        <MetricCard
          label="Sentiment score"
          value={data?.sentimentScore != null ? `${Math.round(data.sentimentScore)}%` : '—'}
        />
        <MetricCard label="Social volume" value={formatVolume(data?.socialVolume)} wide />
      </div>

      <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-950/25 to-black/30 px-4 py-3.5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5 flex items-center gap-1.5">
          <Sparkles size={12} aria-hidden />
          Intelligence summary
        </p>
        <p className="text-sm text-slate-100 leading-relaxed">{data?.summary || 'Summary unavailable.'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">Trending narratives</p>
          <NarrativesList items={narratives} />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">Trending assets</p>
          <AssetsList items={assets} />
        </div>
      </div>

      <AnomaliesList items={anomalies} />
      {errorMessage ? (
        <p className="text-[11px] text-amber-200/80">Refresh issue — {errorMessage}</p>
      ) : null}
    </div>
  )
}

function CategoryFallbackSocialView({ panel }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border border-sky-500/35 bg-sky-950/30 text-sky-100">
          Category narrative fallback
        </span>
        {panel.symbol ? (
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400">{panel.symbol}</span>
        ) : null}
        <span
          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${severityClass(panel.severity)}`}
        >
          {panel.severity}
        </span>
      </div>

      <div className="rounded-xl border border-sky-500/25 bg-gradient-to-br from-sky-950/20 via-violet-950/15 to-black/30 px-4 py-3.5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-sky-200/80 mb-1.5">{panel.title}</p>
        <p className="text-sm text-slate-100 leading-relaxed">{panel.intelligenceBrief}</p>
        <p className="text-xs text-slate-400/90 mt-3 leading-relaxed border-t border-white/[0.06] pt-3 max-w-prose">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500 block mb-1">
            Risk interpretation
          </span>
          {panel.riskInterpretation}
        </p>
      </div>

      {panel.trendingNarratives?.length ? (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">
            Narrative focus areas
          </p>
          <NarrativesList items={panel.trendingNarratives} />
        </div>
      ) : null}

      {panel.recommendedActions?.length ? (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">Recommended actions</p>
          <ul className="space-y-2">
            {panel.recommendedActions.map((action) => (
              <li
                key={action}
                className="text-xs text-slate-200 border border-violet-500/15 rounded-lg px-3 py-2.5 bg-violet-950/15 flex gap-2"
              >
                <span className="text-violet-300 font-mono shrink-0">→</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-[11px] text-slate-500 leading-relaxed border border-white/10 rounded-xl px-4 py-3 bg-black/25">
        {CATEGORY_FALLBACK_DISCLOSURE}
      </p>
    </div>
  )
}

function ShowcaseSocialView({ scenario }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border border-fuchsia-500/35 bg-fuchsia-950/30 text-fuchsia-100">
          <Beaker size={12} aria-hidden />
          Scenario Showcase Mode
        </span>
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Demo Intelligence Simulation</span>
        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${severityClass(scenario.severity)}`}>
          {scenario.severity}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Market mood"
          value={<span className={`capitalize ${moodClass(scenario.marketMood)}`}>{scenario.marketMood}</span>}
        />
        <MetricCard label="Sentiment score" value={`${scenario.sentimentScore}%`} />
        <MetricCard label="Social velocity" value={`+${scenario.socialVelocity}%`} subtext="vs 7d baseline index" />
        <MetricCard label="Anomaly confidence" value={`${scenario.anomalyConfidence}%`} />
        <MetricCard label="Social volume" value={formatVolume(scenario.socialVolume)} subtext="24h interactions (sim)" />
        <MetricCard label="Whale signal" value={scenario.whaleSignal} />
        <MetricCard label="Narrative strength" value={`${scenario.narrativeStrength} / 100`} />
        <MetricCard label="Retail activity" value={scenario.retailActivity} subtext={`Influencers: ${scenario.influencerAmplification}`} />
      </div>

      <div className="rounded-xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-950/20 via-violet-950/15 to-black/30 px-4 py-3.5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-fuchsia-200/80 mb-1.5 flex items-center gap-1.5">
          <Sparkles size={12} aria-hidden />
          Intelligence brief
        </p>
        <p className="text-sm text-slate-100 leading-relaxed">{scenario.intelligenceBrief}</p>
        <p className="text-xs text-slate-400/90 mt-3 leading-relaxed border-t border-white/[0.06] pt-3 max-w-prose">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500 block mb-1">
            Risk interpretation
          </span>
          {scenario.riskInterpretation}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">Trending narratives</p>
          <NarrativesList items={scenario.trendingNarratives} />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">Trending assets</p>
          <AssetsList items={scenario.trendingAssets} />
        </div>
      </div>

      <AnomaliesList items={scenario.anomalySignals} />

      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">Recommended actions</p>
        <ul className="space-y-2">
          {scenario.recommendedActions.map((action) => (
            <li
              key={action}
              className="text-xs text-slate-200 border border-violet-500/15 rounded-lg px-3 py-2.5 bg-violet-950/15 flex gap-2"
            >
              <span className="text-violet-300 font-mono shrink-0">→</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed border border-white/10 rounded-xl px-4 py-3 bg-black/25">
        {SHOWCASE_DISCLOSURE}
      </p>
    </div>
  )
}

/**
 * Prime — LunarCrush social intelligence (live feed or scenario showcase when provider limited).
 * @param {'full' | 'embed'} [variant]
 */
export default function SocialIntelligencePanel({ profile, variant = 'full', narrativeTargetSymbol = null }) {
  const { primeTrends, loading, error, refresh } = useLunarCrushIntel({ profile })
  const [scenarioId, setScenarioId] = useState(DEFAULT_SHOWCASE_SCENARIO_ID)

  const showLive = isLiveLunarCrushStatus(primeTrends?.status)
  const showShowcase = !showLive

  const categoryPanel = useMemo(
    () => (narrativeTargetSymbol ? buildCategoryNarrativePanelData(narrativeTargetSymbol) : null),
    [narrativeTargetSymbol],
  )

  const useCategoryFallback = showShowcase && categoryPanel?.viewMode === 'category_fallback'
  const useMemeShowcase = showShowcase && categoryPanel?.viewMode === 'meme_showcase'

  const scenario = useMemo(() => {
    if (useMemeShowcase && categoryPanel?.scenario) return categoryPanel.scenario
    return getLunarCrushScenarioById(scenarioId) || LUNARCRUSH_SCENARIOS[0]
  }, [scenarioId, useMemeShowcase, categoryPanel])

  const body =
    loading && !primeTrends ? (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <Loader2 className="animate-spin" size={18} aria-hidden />
        Loading social intelligence…
      </div>
    ) : showLive ? (
      <LiveSocialView data={primeTrends} errorMessage={formatIntelProviderUserMessage(error)} />
    ) : useCategoryFallback ? (
      <CategoryFallbackSocialView panel={categoryPanel} />
    ) : (
      <ShowcaseSocialView scenario={scenario} />
    )

  const embedHeaderLabel = showLive
    ? 'LunarCrush live'
    : useCategoryFallback
      ? 'Category narrative fallback'
      : useMemeShowcase
        ? 'Scenario Intelligence Active'
        : 'Scenario Intelligence Active'

  if (variant === 'embed') {
    return (
      <div className="prime-social-embed max-h-[420px] overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-fuchsia-200/80">
            {embedHeaderLabel}
          </p>
          {showShowcase && !useCategoryFallback ? (
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="text-[10px] font-mono rounded border border-fuchsia-500/30 bg-black/40 px-2 py-1 text-fuchsia-100"
              aria-label="Select narrative scenario"
            >
              {LUNARCRUSH_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : showLive ? (
            <button
              type="button"
              onClick={() => refresh()}
              className="text-slate-400 hover:text-violet-200 p-1"
              aria-label="Refresh social intelligence"
            >
              <RefreshCw size={14} />
            </button>
          ) : null}
        </div>
        {body}
      </div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="prime-glass p-6 sm:p-7 border border-fuchsia-500/25 prime-panel-hover"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-fuchsia-200/90 flex items-center gap-2">
            <MessageCircle size={14} aria-hidden />
            Social Intelligence Layer
          </p>
          <h2 className="text-lg font-heading text-white">
            {showLive
              ? 'Market narratives & anomalies'
              : useCategoryFallback
                ? categoryPanel?.title || 'Narrative intelligence'
                : 'Narrative scenario cockpit'}
          </h2>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Premium narrative risk detection powered by LunarCrush.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showShowcase && !useCategoryFallback ? (
            <label className="prime-scenario-select flex flex-col gap-1.5 min-w-[12rem] px-3 py-2.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-fuchsia-200/80">
                Scenario selector
              </span>
              <select
                value={scenarioId}
                onChange={(e) => setScenarioId(e.target.value)}
                aria-label="Select narrative scenario"
              >
                {LUNARCRUSH_SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => refresh()}
            className="text-slate-400 hover:text-violet-200 transition-colors p-2 mt-5 sm:mt-0"
            aria-label="Refresh social intelligence"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      {body}
    </motion.section>
  )
}
