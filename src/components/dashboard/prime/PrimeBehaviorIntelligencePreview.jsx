import { useMemo } from 'react'
import { Activity } from 'lucide-react'
import { assessBehaviorCoverage, isBehaviorFieldPopulated } from '@/utils/behaviorIntelligenceStatus.js'

function MetricCell({ label, value }) {
  return (
    <div className="prime-intel-preview__metric">
      <p className="prime-intel-preview__metric-label">{label}</p>
      <p className="prime-intel-preview__metric-value">{value}</p>
    </div>
  )
}

function pickLeadAsset(assets) {
  if (!Array.isArray(assets) || !assets.length) return null
  return assets.find((a) => a.status === 'live') || assets[0]
}

/**
 * Compact Birdeye behavior layer — not the full OnChainBehaviorPanel watchlist.
 */
export default function PrimeBehaviorIntelligencePreview({ watchlist, assets = [] }) {
  const coverage = useMemo(() => assessBehaviorCoverage(watchlist, assets), [watchlist, assets])
  const lead = useMemo(() => pickLeadAsset(assets), [assets])

  const metrics = useMemo(() => {
    if (coverage.mode === 'full' && lead) {
      return {
        whale: lead.whaleActivity || 'Balanced footprint',
        liquidity: lead.liquidityHealth || lead.holderConcentration || 'Indexed',
        smartMoney: lead.smartMoneySignal
          ? String(lead.smartMoneySignal).slice(0, 72)
          : 'Smart-money heuristics active',
      }
    }
    if (coverage.mode === 'partial' && lead) {
      return {
        whale: isBehaviorFieldPopulated(lead.whaleActivity)
          ? lead.whaleActivity
          : 'Provider data unavailable',
        liquidity: isBehaviorFieldPopulated(lead.holderConcentration)
          ? lead.holderConcentration
          : 'Pending provider coverage',
        smartMoney: isBehaviorFieldPopulated(lead.smartMoneySignal)
          ? String(lead.smartMoneySignal).slice(0, 72)
          : 'Provider data unavailable',
      }
    }
    return {
      whale: 'Pending provider coverage',
      liquidity: 'Pending provider coverage',
      smartMoney: 'Pending provider coverage',
    }
  }, [coverage.mode, lead])

  return (
    <section className="prime-intel-preview prime-intel-preview--behavior" aria-labelledby="prime-behavior-preview-title">
      <div className="prime-intel-preview__head">
        <div className="prime-intel-preview__icon prime-intel-preview__icon--behavior" aria-hidden>
          <Activity size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-cyan-200/90">Behavior layer</p>
          <h3 id="prime-behavior-preview-title" className="text-sm font-heading text-white mt-0.5">
            Behavior Intelligence Preview
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">{coverage.subtitle}</p>
        </div>
        <span
          className={`prime-intel-preview__badge ${coverage.mode === 'full' ? 'prime-intel-preview__badge--live' : ''}`}
        >
          {coverage.badge}
        </span>
      </div>
      <div className="prime-intel-preview__metrics">
        <MetricCell label="Whale behavior" value={metrics.whale} />
        <MetricCell label="Liquidity concentration" value={metrics.liquidity} />
        <MetricCell label="Smart money movement" value={metrics.smartMoney} />
      </div>
    </section>
  )
}
