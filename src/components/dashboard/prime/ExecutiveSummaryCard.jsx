import { FileText } from 'lucide-react'

function riskBandClass(bandId) {
  if (bandId === 'low') return 'prime-exec-summary__risk--low'
  if (bandId === 'moderate') return 'prime-exec-summary__risk--moderate'
  if (bandId === 'elevated') return 'prime-exec-summary__risk--elevated'
  if (bandId === 'high') return 'prime-exec-summary__risk--high'
  return 'prime-exec-summary__risk--pending'
}

/**
 * @param {{ summary?: object | null, variant?: 'card' | 'embed' }} props
 */
export default function ExecutiveSummaryCard({ summary = null, variant = 'card' }) {
  if (!summary) return null

  const rootClass =
    variant === 'embed' ? 'prime-exec-summary prime-exec-summary--embed' : 'prime-exec-summary'

  return (
    <section className={rootClass} aria-labelledby="prime-exec-summary-heading">
      <div className="prime-exec-summary__header">
        <div className="prime-exec-summary__icon" aria-hidden>
          <FileText size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="prime-exec-summary-heading" className="prime-exec-summary__title">
            Executive Summary
          </h3>
          <p className="prime-exec-summary__subtitle">Scanner-backed briefing · read in under 10 seconds</p>
        </div>
      </div>

      <div className="prime-exec-summary__meta prime-exec-summary__meta--triple">
        <div className="prime-exec-summary__meta-cell">
          <p className="prime-exec-summary__label">Asset</p>
          <p className="prime-exec-summary__value">{summary.assetLabel}</p>
        </div>
        <div className="prime-exec-summary__meta-cell">
          <p className="prime-exec-summary__label">Risk score</p>
          <p className="prime-exec-summary__score tabular-nums">
            {summary.riskScore != null ? (
              <>
                {summary.riskScore}
                <span className="text-slate-500 font-normal text-sm"> / 100</span>
              </>
            ) : (
              '—'
            )}
          </p>
        </div>
        <div className="prime-exec-summary__meta-cell">
          <p className="prime-exec-summary__label">Risk band</p>
          <p className={`prime-exec-summary__risk ${riskBandClass(summary.overallRiskBand)}`}>
            {summary.overallRisk}
          </p>
        </div>
      </div>

      <div className="prime-exec-summary__columns">
        <div className="prime-exec-summary__column">
          <p className="prime-exec-summary__section-title">Primary strengths</p>
          <ul className="prime-exec-summary__list prime-exec-summary__list--strength">
            {summary.primaryStrengths.map((line) => (
              <li key={line}>
                <span aria-hidden>✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="prime-exec-summary__column">
          <p className="prime-exec-summary__section-title">Primary risks</p>
          <ul className="prime-exec-summary__list prime-exec-summary__list--risk">
            {summary.primaryRisks.map((line) => (
              <li key={line}>
                <span aria-hidden>⚠</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="prime-exec-summary__action">
        <p className="prime-exec-summary__label">Recommended action</p>
        <p className="prime-exec-summary__action-text">{summary.recommendedAction}</p>
      </div>
    </section>
  )
}
