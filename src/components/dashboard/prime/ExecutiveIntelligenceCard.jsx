import { Scale } from 'lucide-react'
import { EXECUTIVE_INTEL_DISCLAIMER } from '@/lib/executiveIntelligence/executiveIntelligenceEngine.mjs'

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

/**
 * @param {{ executive?: object | null, coverageSources?: object[] | null, variant?: 'card' | 'embed' }} props
 */
export default function ExecutiveIntelligenceCard({ executive = null, coverageSources = null, variant = 'card' }) {
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
            {executive.executiveRiskScore}
            <span className="text-slate-500 font-normal text-sm"> / 100</span>
          </p>
          <p className="prime-exec-intel__band">{executive.executiveRiskBand}</p>
        </div>
        <div className="prime-exec-intel__hero-cell">
          <p className="prime-exec-intel__label">Intelligence confidence</p>
          <p className="prime-exec-intel__score tabular-nums text-slate-200">
            {executive.confidenceScore}%
          </p>
          <p className="prime-exec-intel__band">{executive.confidenceInterpretation}</p>
        </div>
      </div>

      {coverageSources?.length ? (
        <div className="prime-exec-intel__coverage">
          <p className="prime-exec-intel__section-title">Coverage sources</p>
          <ul className="prime-exec-intel__coverage-list">
            {coverageSources.map((source) => (
              <li
                key={source.label}
                className={`prime-exec-intel__coverage-item prime-exec-intel__coverage-item--${source.status}`}
              >
                <span aria-hidden>{source.status === 'active' ? '✓' : source.status === 'partial' ? '⚠' : '○'}</span>
                <span>{source.label}</span>
                {source.status === 'partial' ? <span className="prime-exec-intel__coverage-tag">Partial</span> : null}
                {source.status === 'pending' ? (
                  <span className="prime-exec-intel__coverage-tag">Pending</span>
                ) : null}
              </li>
            ))}
          </ul>
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
