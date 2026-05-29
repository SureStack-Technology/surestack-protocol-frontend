import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import {
  DEFAULT_SHOWCASE_SCENARIO_ID,
  getLunarCrushScenarioById,
  isLiveLunarCrushStatus,
} from '@/data/lunarCrushScenarioShowcase.js'

function formatMood(mood) {
  if (!mood) return '—'
  const s = String(mood)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function MetricCell({ label, value }) {
  return (
    <div className="prime-intel-preview__metric">
      <p className="prime-intel-preview__metric-label">{label}</p>
      <p className="prime-intel-preview__metric-value">{value}</p>
    </div>
  )
}

/**
 * Compact LunarCrush / scenario narrative layer — not the full SocialIntelligencePanel.
 */
export default function PrimeNarrativeIntelligencePreview({ primeTrends }) {
  const live = isLiveLunarCrushStatus(primeTrends?.status)

  const metrics = useMemo(() => {
    if (live && primeTrends) {
      const topSignal = primeTrends.anomalySignals?.[0]
      const anomaly =
        topSignal?.label != null
          ? String(topSignal.label).slice(0, 48)
          : primeTrends.anomalySignals?.length
            ? `${primeTrends.anomalySignals.length} signal(s)`
            : 'Monitoring'

      const narrativeStrength =
        primeTrends.sentimentScore != null
          ? `${Math.round(Number(primeTrends.sentimentScore))}% sentiment`
          : primeTrends.trendingNarratives?.[0]?.title
            ? String(primeTrends.trendingNarratives[0].title).slice(0, 40)
            : 'Active narratives'

      return {
        marketMood: formatMood(primeTrends.marketMood),
        narrativeStrength,
        anomalyConfidence: anomaly,
      }
    }

    const scenario = getLunarCrushScenarioById(DEFAULT_SHOWCASE_SCENARIO_ID)
    return {
      marketMood: formatMood(scenario?.marketMood),
      narrativeStrength: scenario?.narrativeStrength != null ? `${scenario.narrativeStrength} / 100` : '—',
      anomalyConfidence:
        scenario?.anomalyConfidence != null ? `${scenario.anomalyConfidence}%` : 'Scenario baseline',
    }
  }, [live, primeTrends])

  const statusLine = live
    ? 'LunarCrush live feed active'
    : 'Scenario Intelligence Active — live provider activation pending.'

  return (
    <section className="prime-intel-preview prime-intel-preview--narrative" aria-labelledby="prime-narrative-preview-title">
      <div className="prime-intel-preview__header">
        <div className="prime-intel-preview__icon prime-intel-preview__icon--narrative" aria-hidden>
          <Sparkles size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-fuchsia-200/90">Narrative layer</p>
          <h3 id="prime-narrative-preview-title" className="text-sm font-heading text-white mt-0.5">
            Narrative Intelligence Preview
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">{statusLine}</p>
        </div>
        <span className={`prime-intel-preview__badge ${live ? 'prime-intel-preview__badge--live' : ''}`}>
          {live ? 'Live' : 'Scenario'}
        </span>
      </div>
      <div className="prime-intel-preview__metrics">
        <MetricCell label="Market mood" value={metrics.marketMood} />
        <MetricCell label="Narrative strength" value={metrics.narrativeStrength} />
        <MetricCell label="Anomaly confidence" value={metrics.anomalyConfidence} />
      </div>
    </section>
  )
}
