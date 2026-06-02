import { Droplets } from 'lucide-react'
import { buildLiquidityIntelFromScanner } from '@/lib/liquidityIntelligence/buildLiquidityIntelFromScanner.js'
import {
  LIQUIDITY_INTEL_DISCLAIMER,
  MARKET_IMPACT_DISCLAIMER,
} from '@/lib/liquidityIntelligence/liquidityIntelligenceEngine.mjs'

function impactTone(level) {
  const l = String(level || '').toUpperCase()
  if (l.includes('LOW')) return 'prime-liq-impact--low'
  if (l.includes('MODERATE')) return 'prime-liq-impact--moderate'
  if (l.includes('ELEVATED')) return 'prime-liq-impact--elevated'
  return 'prime-liq-impact--high'
}

function MetricRow({ label, value, sub }) {
  return (
    <div className="prime-liq-card__metric">
      <p className="prime-liq-card__metric-label">{label}</p>
      <p className="prime-liq-card__metric-value">{value}</p>
      {sub ? <p className="prime-liq-card__metric-sub">{sub}</p> : null}
    </div>
  )
}

/**
 * Institutional liquidity intelligence card — educational estimates only.
 * @param {{ scannerReport?: object | null, variant?: 'card' | 'embed' }} props
 */
export default function LiquidityIntelligenceCard({ scannerReport = null, variant = 'card' }) {
  const intel = buildLiquidityIntelFromScanner(scannerReport)
  const pending = !scannerReport?.tokenConcentration && intel.dataQuality === 'limited'

  const rootClass =
    variant === 'embed'
      ? 'prime-liq-card prime-liq-card--embed'
      : 'prime-liq-card'

  return (
    <section className={rootClass} aria-labelledby="prime-liq-intel-heading">
      <div className="prime-liq-card__header">
        <div className="prime-liq-card__icon" aria-hidden>
          <Droplets size={18} />
        </div>
        <div className="min-w-0">
          <h3 id="prime-liq-intel-heading" className="prime-liq-card__title">
            Liquidity Intelligence
          </h3>
          <p className="prime-liq-card__subtitle">
            Educational estimates from publicly observable market conditions
          </p>
        </div>
        <div className="prime-liq-card__score-block shrink-0 text-right">
          <p className="prime-liq-card__score-label">Liquidity score</p>
          <p className="prime-liq-card__score-value tabular-nums">
            {pending ? '—' : intel.intelligenceScore}
            <span className="text-slate-500 font-normal text-sm"> / 100</span>
          </p>
          <p className="prime-liq-card__score-band">{intel.intelligenceBand}</p>
        </div>
      </div>

      <div className="prime-liq-card__grid">
        <MetricRow label="Liquidity depth" value={intel.liquidityDepthLabel} />
        <MetricRow
          label="Estimated market impact"
          value={intel.estimatedMarketImpactSummary}
          sub="Illustrative notional tiers"
        />
        <MetricRow
          label="Liquidity concentration"
          value={intel.liquidityConcentration}
          sub={intel.liquidityConcentrationReason}
        />
        <MetricRow
          label="Venue diversity"
          value={intel.venueDiversity}
          sub={intel.venueEvidence?.length ? intel.venueEvidence.join(' · ') : '—'}
        />
        <MetricRow
          label="Liquidity stability"
          value={intel.liquidityStability}
          sub={intel.liquidityStabilityNote}
        />
      </div>

      <div className="prime-liq-card__impact-table" role="table" aria-label="Estimated market impact by notional">
        <p className="prime-liq-card__impact-title">Estimated market impact</p>
        <ul className="prime-liq-card__impact-rows">
          {(intel.estimatedMarketImpact || []).map((row) => (
            <li key={row.tradeUsd} className="prime-liq-card__impact-row">
              <span className="font-mono text-slate-400 tabular-nums">{row.tradeLabel}</span>
              <span className={`prime-liq-impact-pill ${impactTone(row.level)}`}>{row.level}</span>
            </li>
          ))}
        </ul>
        <p className="prime-liq-card__disclaimer-inline">{MARKET_IMPACT_DISCLAIMER}</p>
      </div>

      <div className="prime-liq-card__analyst">
        <p className="prime-liq-card__analyst-label">AI analyst commentary</p>
        <p className="prime-liq-card__analyst-body">{intel.analystCommentary}</p>
      </div>

      <p className="prime-liq-card__disclaimer">{LIQUIDITY_INTEL_DISCLAIMER}</p>
    </section>
  )
}
