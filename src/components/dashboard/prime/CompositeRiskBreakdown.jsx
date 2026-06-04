function scoreTone(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return 'prime-risk-breakdown__score--pending'
  if (n <= 30) return 'prime-risk-breakdown__score--low'
  if (n <= 50) return 'prime-risk-breakdown__score--moderate'
  if (n <= 72) return 'prime-risk-breakdown__score--elevated'
  return 'prime-risk-breakdown__score--high'
}

/**
 * @param {{ explainability?: object | null, variant?: 'embed' | 'compact' }} props
 */
export default function CompositeRiskBreakdown({ explainability = null, variant = 'embed' }) {
  if (!explainability?.components?.length) return null

  const rootClass =
    variant === 'compact'
      ? 'prime-risk-breakdown prime-risk-breakdown--compact'
      : 'prime-risk-breakdown'

  return (
    <div className={rootClass}>
      <p className="prime-risk-breakdown__title">Risk component breakdown</p>
      <ul className="prime-risk-breakdown__grid">
        {explainability.components.map((row) => (
          <li
            key={row.id}
            className={`prime-risk-breakdown__row ${row.highlight ? 'prime-risk-breakdown__row--composite' : ''}`}
          >
            <div className="prime-risk-breakdown__row-head">
              <span className="prime-risk-breakdown__label">{row.label}</span>
              {!row.highlight && row.weight ? (
                <span className="prime-risk-breakdown__weight">{Math.round(row.weight * 100)}% weight</span>
              ) : null}
            </div>
            <p className={`prime-risk-breakdown__score tabular-nums ${scoreTone(row.score)}`}>
              {row.pending ? 'Pending' : row.score != null ? `${row.score} / 100` : '—'}
            </p>
          </li>
        ))}
      </ul>

      {explainability.primaryContributor ? (
        <p className="prime-risk-breakdown__primary">
          Primary contributor:{' '}
          <span className="text-slate-200">{explainability.primaryContributor.label}</span>
          {' · '}
          {explainability.primaryContributor.score}/100
        </p>
      ) : null}

      {explainability.riskDrivers?.length ? (
        <div className="prime-risk-breakdown__section">
          <p className="prime-risk-breakdown__section-title">Risk drivers</p>
          <ul className="prime-risk-breakdown__list">
            {explainability.riskDrivers.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {explainability.positiveOffsets?.length ? (
        <div className="prime-risk-breakdown__section">
          <p className="prime-risk-breakdown__section-title">Risk reduction</p>
          <ul className="prime-risk-breakdown__list prime-risk-breakdown__list--positive">
            {explainability.positiveOffsets.map((line) => (
              <li key={line}>
                <span aria-hidden>✓ </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {explainability.confidenceMethodology ? (
        <div className="prime-risk-breakdown__methodology">
          <p className="prime-risk-breakdown__section-title">Confidence methodology</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <span className="font-mono uppercase tracking-wider text-slate-500">
              {explainability.confidenceMethodology.stage}
            </span>
            {' · '}
            {explainability.confidenceMethodology.status}
            {' — '}
            {explainability.confidenceMethodology.interpretation}
          </p>
        </div>
      ) : null}
    </div>
  )
}
