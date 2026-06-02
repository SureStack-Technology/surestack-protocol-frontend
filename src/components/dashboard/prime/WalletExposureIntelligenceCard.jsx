import { Shield } from 'lucide-react'
import { buildWalletExposureIntel } from '@/lib/walletExposureIntelligence/buildWalletExposureIntel.js'
import { WALLET_EXPOSURE_DISCLAIMER } from '@/lib/walletExposureIntelligence/walletExposureIntelligenceEngine.mjs'

function threatTone(level) {
  const l = String(level || '').toUpperCase()
  if (l === 'HIGH') return 'prime-wallet-exp-threat--high'
  if (l === 'MEDIUM') return 'prime-wallet-exp-threat--medium'
  return 'prime-wallet-exp-threat--low'
}

function MetricRow({ label, value, sub }) {
  return (
    <div className="prime-wallet-exp-card__metric">
      <p className="prime-wallet-exp-card__metric-label">{label}</p>
      <p className="prime-wallet-exp-card__metric-value">{value}</p>
      {sub ? <p className="prime-wallet-exp-card__metric-sub">{sub}</p> : null}
    </div>
  )
}

function AllocationBars({ rows, labelKey = 'category' }) {
  if (!rows?.length) return <p className="text-xs text-slate-500">—</p>
  return (
    <ul className="prime-wallet-exp-card__alloc-list">
      {rows.slice(0, 6).map((row) => (
        <li key={row[labelKey]} className="prime-wallet-exp-card__alloc-row">
          <div className="flex justify-between gap-2 text-[11px] mb-1">
            <span className="text-slate-300">{row[labelKey]}</span>
            <span className="font-mono text-slate-400 tabular-nums">{row.pct?.toFixed?.(0) ?? row.pct}%</span>
          </div>
          <div className="prime-wallet-exp-card__alloc-bar" aria-hidden>
            <span style={{ width: `${Math.min(100, row.pct || 0)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * @param {{ riskData?: object | null, approvalRows?: object[], hasWallet?: boolean, variant?: 'card' | 'embed' }} props
 */
export default function WalletExposureIntelligenceCard({
  riskData = null,
  approvalRows = [],
  hasWallet = false,
  variant = 'card',
}) {
  const profile = buildWalletExposureIntel(riskData, { approvalRows, hasWallet })
  const pending = !hasWallet || profile.dataQuality === 'pending'

  const rootClass =
    variant === 'embed' ? 'prime-wallet-exp-card prime-wallet-exp-card--embed' : 'prime-wallet-exp-card'

  return (
    <section className={rootClass} aria-labelledby="prime-wallet-exp-intel-heading">
      <div className="prime-wallet-exp-card__header">
        <div className="prime-wallet-exp-card__icon" aria-hidden>
          <Shield size={18} />
        </div>
        <div className="min-w-0">
          <h3 id="prime-wallet-exp-intel-heading" className="prime-wallet-exp-card__title">
            Wallet Exposure Intelligence
          </h3>
          <p className="prime-wallet-exp-card__subtitle">
            Transparent exposure analysis from observable wallet activity
          </p>
        </div>
        <div className="prime-wallet-exp-card__score-block shrink-0 text-right">
          <p className="prime-wallet-exp-card__score-label">Exposure score</p>
          <p className="prime-wallet-exp-card__score-value tabular-nums">
            {pending ? '—' : profile.exposureScore}
            <span className="text-slate-500 font-normal text-sm"> / 100</span>
          </p>
          <p className="prime-wallet-exp-card__score-band">{profile.exposureBand}</p>
        </div>
      </div>

      <div className="prime-wallet-exp-card__grid">
        <div className="prime-wallet-exp-card__panel">
          <p className="prime-wallet-exp-card__panel-title">Asset allocation</p>
          <AllocationBars rows={profile.assetAllocation} labelKey="category" />
        </div>
        <div className="prime-wallet-exp-card__panel">
          <p className="prime-wallet-exp-card__panel-title">Sector allocation</p>
          <AllocationBars rows={profile.sectorAllocation} labelKey="sector" />
        </div>
      </div>

      <div className="prime-wallet-exp-card__grid prime-wallet-exp-card__grid--metrics">
        <MetricRow
          label="Asset concentration"
          value={profile.assetConcentration}
          sub={profile.assetConcentrationReason}
        />
        <MetricRow label="Sector risk" value={profile.sectorRisk} sub={profile.sectorRiskReason} />
        <MetricRow
          label="Contract exposure"
          value={`${profile.contractExposureScore} / 100`}
          sub={profile.contractExposureLabel}
        />
        <MetricRow
          label="Counterparty exposure"
          value={profile.counterpartyExposure}
          sub={profile.counterparties?.length ? profile.counterparties.join(' · ') : '—'}
        />
      </div>

      <div className="prime-wallet-exp-card__panel">
        <p className="prime-wallet-exp-card__panel-title">Top asset exposure</p>
        <ul className="prime-wallet-exp-card__top-assets">
          {(profile.topAssets || []).map((a) => (
            <li key={`${a.symbol}-${a.pct}`} className="flex justify-between text-xs">
              <span className="text-slate-300">{a.symbol}</span>
              <span className="font-mono text-slate-400 tabular-nums">{a.pct}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="prime-wallet-exp-card__drivers">
        <p className="prime-wallet-exp-card__panel-title">Exposure drivers</p>
        <ul className="space-y-2">
          {(profile.exposureDrivers || []).map((d) => (
            <li key={d.rank} className="prime-wallet-exp-card__driver">
              <p className="text-[10px] font-mono uppercase tracking-wider text-violet-300/90">{d.rank}</p>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">{d.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{d.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="prime-wallet-exp-card__threats">
        <p className="prime-wallet-exp-card__panel-title">Threat indicators</p>
        <div className="flex flex-wrap gap-2">
          {(profile.threatIndicators || []).map((t) => (
            <span key={t.label} className={`prime-wallet-exp-threat-pill ${threatTone(t.level)}`}>
              {t.label} · {t.level}
            </span>
          ))}
        </div>
      </div>

      <div className="prime-wallet-exp-card__analyst">
        <p className="prime-wallet-exp-card__analyst-label">AI analyst commentary</p>
        <p className="prime-wallet-exp-card__analyst-body">{profile.analystCommentary}</p>
      </div>

      <p className="prime-wallet-exp-card__disclaimer">{WALLET_EXPOSURE_DISCLAIMER}</p>
    </section>
  )
}
