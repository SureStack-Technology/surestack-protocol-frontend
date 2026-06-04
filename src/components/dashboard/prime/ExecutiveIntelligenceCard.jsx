import { Scale } from 'lucide-react'
import { EXECUTIVE_INTEL_DISCLAIMER } from '@/lib/executiveIntelligence/executiveIntelligenceEngine.mjs'
import CompositeRiskBreakdown from '@/components/dashboard/prime/CompositeRiskBreakdown.jsx'

export function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') return value ? [value] : []
  if (value && typeof value === 'object') {
    if (Array.isArray(value.items)) return value.items.filter(Boolean)
    if (Array.isArray(value.recommendations)) return value.recommendations.filter(Boolean)
    if (typeof value.label === 'string') return [value.label]
    if (typeof value.title === 'string') return [value.title]
  }
  return []
}

function riskBandClass(bandId) {
  if (bandId === 'low') return 'prime-exec-intel__risk--low'
  if (bandId === 'moderate') return 'prime-exec-intel__risk--moderate'
  if (bandId === 'elevated') return 'prime-exec-intel__risk--elevated'
  if (bandId === 'high') return 'prime-exec-intel__risk--high'
  return 'prime-exec-intel__risk--pending'
}

function coverageStatusIcon(status) {
  if (status === 'live' || status === 'active') return '✓'
  if (status === 'partial') return '⚠'
  if (status === 'rate_limited') return '⏱'
  if (status === 'unsupported') return '—'
  return '○'
}

/**
 * @param {{ executive?: object | null, coverageSources?: object[] | null, coverageNote?: string | null, riskExplainability?: object | null, variant?: 'card' | 'embed' }} props
 */
export default function ExecutiveIntelligenceCard({
  executive = null,
  coverageSources = null,
  coverageNote = null,
  riskExplainability = null,
  variant = 'card',
}) {
  if (!executive) return null

  const keyFindings = normalizeList(executive?.keyFindings)
  const recommendedNextInvestigations = normalizeList(executive?.recommendedNextInvestigation)
  const investigationsToRender =
    recommendedNextInvestigations.length > 0 ? recommendedNextInvestigations : ['Review evidence layers']

  const rootClass =
    variant === 'embed' ? 'prime-exec-intel prime-exec-intel--embed' : 'prime-exec-intel'

  return (
    <section className={rootClass} aria-labelledby="prime-exec-intel-heading">
      <div className="prime-exec-intel__header">
        <div className="prime-exec-intel__icon" aria-hidden>
          <Scale size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="prime-exec-intel-heading" className="prime-exec-intel__title">
            Executive Intelligence
          </h3>
          <p className="prime-exec-intel__subtitle">
            Institutional synthesis across technical, narrative, behavior, liquidity, and wallet exposure
          </p>
        </div>
      </div>

      <div className="prime-exec-intel__hero-grid">
        <div className="prime-exec-intel__hero-cell">
          <p className="prime-exec-intel__label">Asset</p>
          <p className="prime-exec-intel__value">{executive.assetLabel}</p>
        </div>
        <div className="prime-exec-intel__hero-cell">
          <p className="prime-exec-intel__label">Classification</p>
          <p className="prime-exec-intel__value prime-exec-intel__value--class">{executive.classification}</p>
          {executive.classificationSecondaryDriver ? (
            <p className="prime-exec-intel__secondary-driver">
              Secondary driver · {executive.classificationSecondaryDriver}
            </p>
          ) : null}
        </div>
        <div className="prime-exec-intel__hero-cell">
          <p className="prime-exec-intel__label">Executive risk</p>
          <p className={`prime-exec-intel__score tabular-nums ${riskBandClass(executive.executiveRiskBandId)}`}>
            {executive.unverified || executive.classification === 'UNKNOWN ASSET'
              ? '—'
              : executive.executiveRiskScore}
            {!executive.unverified && executive.classification !== 'UNKNOWN ASSET' ? (
              <span className="text-slate-500 font-normal text-sm"> / 100</span>
            ) : null}
          </p>
          <p className="prime-exec-intel__band">
            {executive.unverified || executive.classification === 'UNKNOWN ASSET'
              ? 'Pending validation'
              : executive.executiveRiskBand}
          </p>
        </div>
        <div className="prime-exec-intel__hero-cell">
          <p className="prime-exec-intel__label">Intelligence confidence</p>
          <p className="prime-exec-intel__score tabular-nums text-slate-200">
            {executive.confidenceScore != null && executive.confidenceScore !== '—'
              ? `${executive.confidenceScore}%`
              : '—'}
          </p>
          <p className="prime-exec-intel__band">{executive.confidenceInterpretation}</p>
          {executive.assessmentStage ? (
            <p className="prime-exec-intel__stage text-[10px] font-mono uppercase tracking-wider text-slate-500 mt-1">
              {executive.assessmentStage}
              {executive.assessmentStatus ? ` · ${executive.assessmentStatus}` : ''}
            </p>
          ) : null}
        </div>
      </div>

      {coverageSources?.length ? (
        <div className="prime-exec-intel__coverage">
          <p className="prime-exec-intel__section-title">Coverage status</p>
          <ul className="prime-exec-intel__coverage-list">
            {coverageSources.map((source) => {
              const tag =
                source.statusLabel ||
                (source.status === 'partial'
                  ? 'Partial'
                  : source.status === 'fallback' || source.status === 'pending'
                    ? 'Fallback'
                    : source.status === 'rate_limited'
                      ? 'Rate limited'
                      : source.status === 'unsupported'
                        ? 'Unsupported'
                        : null)
              return (
              <li
                key={source.label}
                className={`prime-exec-intel__coverage-item prime-exec-intel__coverage-item--${source.status}`}
              >
                <span aria-hidden>{coverageStatusIcon(source.status)}</span>
                <span>{source.label}</span>
                {tag && source.status !== 'live' && source.status !== 'active' ? (
                  <span className="prime-exec-intel__coverage-tag">{tag}</span>
                ) : null}
              </li>
              )
            })}
          </ul>
          {coverageNote ? (
            <p className="prime-exec-intel__coverage-note text-[11px] text-slate-400 mt-3 leading-relaxed">
              {coverageNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {riskExplainability && !executive.unverified && executive.classification !== 'UNKNOWN ASSET' ? (
        <div className="prime-exec-intel__risk-breakdown mt-4">
          <CompositeRiskBreakdown explainability={riskExplainability} variant="embed" />
        </div>
      ) : null}

      {executive.compositeInterpretation ? (
        <p className="prime-exec-intel__composite-note">
          Composite synthesis: {executive.compositeInterpretation}
        </p>
      ) : null}

      <div className="prime-exec-intel__section">
        <p className="prime-exec-intel__section-title">Key findings</p>
        <ul className="prime-exec-intel__findings">
          {keyFindings.map((line) => (
            <li key={line} className="prime-exec-intel__finding">
              <span className="prime-exec-intel__check" aria-hidden>
                ✓
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="prime-exec-intel__section">
        <p className="prime-exec-intel__section-title">Executive conclusion</p>
        <p className="prime-exec-intel__conclusion">{executive.executiveConclusion}</p>
      </div>

      <div className="prime-exec-intel__section">
        <p className="prime-exec-intel__section-title">Recommended next investigation</p>
        <ul className="prime-exec-intel__investigations">
          {investigationsToRender.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <p className="prime-exec-intel__disclaimer">{executive.disclaimer || EXECUTIVE_INTEL_DISCLAIMER}</p>
    </section>
  )
}
