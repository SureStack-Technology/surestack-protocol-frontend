import { useMemo } from 'react'
import { Activity } from 'lucide-react'

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
  const live = watchlist?.status === 'live'
  const lead = useMemo(() => pickLeadAsset(assets), [assets])

  const metrics = useMemo(() => {
    if (live && lead) {
      return {
        whale: lead.whaleActivity || 'Balanced footprint',
        liquidity: lead.liquidityHealth || lead.holderConcentration || 'Indexed',
        smartMoney: lead.smartMoneySignal
          ? String(lead.smartMoneySignal).slice(0, 72)
          : 'Smart-money heuristics active',
      }
    }
    return {
      whale: 'Pending provider feed',
      liquidity: 'Pending provider feed',
      smartMoney: 'Pending provider feed',
    }
  }, [live, lead])

  const statusLine = live
    ? 'Birdeye live feed active'
    : 'Behavior Engine Ready — provider activation pending.'

  return (
    <section className="prime-intel-preview prime-intel-preview--behavior" aria-labelledby="prime-behavior-preview-title">
      <div className="prime-intel-preview__header">
        <div className="prime-intel-preview__icon prime-intel-preview__icon--behavior" aria-hidden>
          <Activity size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-cyan-200/90">Behavior layer</p>
          <h3 id="prime-behavior-preview-title" className="text-sm font-heading text-white mt-0.5">
            Behavior Intelligence Preview
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">{statusLine}</p>
        </div>
        <span className={`prime-intel-preview__badge ${live ? 'prime-intel-preview__badge--live' : ''}`}>
          {live ? 'Live' : 'Ready'}
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
