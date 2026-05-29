import { useMemo } from 'react'
import { Activity, ArrowRight, FileSearch, Shield, Sparkles } from 'lucide-react'
import {
  buildBehaviorLayer,
  buildContractTrustLayer,
  buildNarrativeLayer,
  buildWalletExposureLayer,
} from '@/components/dashboard/prime/primeIntelligenceLayersBuild.js'

const LAYER_META = {
  narrative: { icon: Sparkles, tone: 'narrative' },
  behavior: { icon: Activity, tone: 'behavior' },
  contract: { icon: FileSearch, tone: 'contract' },
  wallet: { icon: Shield, tone: 'wallet' },
}

function statusChipClass(tone) {
  if (tone === 'live') return 'prime-intel-layers__status prime-intel-layers__status--live'
  if (tone === 'scenario') return 'prime-intel-layers__status prime-intel-layers__status--scenario'
  if (tone === 'ready') return 'prime-intel-layers__status prime-intel-layers__status--ready'
  return 'prime-intel-layers__status prime-intel-layers__status--pending'
}

function CheckChips({ line }) {
  return (
    <div className="prime-intel-layers__check-block">
      <p className="prime-intel-layers__metric-label">{line.label}</p>
      <div className="prime-intel-layers__check-chips" role="list" aria-label={line.label}>
        {(line.chips || []).map((chip) => (
          <span key={chip} className="prime-intel-layers__check-chip" role="listitem">
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}

function StoryBlock({ line }) {
  if (line.kind === 'chips') {
    return <CheckChips line={line} />
  }

  if (line.kind === 'prose') {
    return (
      <div className="prime-intel-layers__story-prose">
        <p className="prime-intel-layers__metric-label">{line.label}</p>
        <p className="prime-intel-layers__story-text">{line.value}</p>
      </div>
    )
  }

  if (line.kind === 'headline') {
    return (
      <div className="prime-intel-layers__story-headline">
        <p className="prime-intel-layers__metric-label">{line.label}</p>
        <p className="prime-intel-layers__story-headline-value">{line.value}</p>
      </div>
    )
  }

  return (
    <div className="prime-intel-layers__metric-row">
      <span className="prime-intel-layers__metric-label">{line.label}</span>
      <span className="prime-intel-layers__metric-value">{line.value}</span>
    </div>
  )
}

function LayerCard({ id, title, layer, onLayerAction }) {
  const meta = LAYER_META[id]
  const Icon = meta.icon

  const handleAction = (e) => {
    e.stopPropagation()
    onLayerAction?.(layer.actionType || id)
  }

  return (
    <article
      className={`prime-intel-layers__card prime-intel-layers__card--${meta.tone} prime-intel-layers__card--interactive`}
    >
      <div className="prime-intel-layers__card-head">
        <div className={`prime-intel-layers__icon prime-intel-layers__icon--${meta.tone}`} aria-hidden>
          <Icon size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="prime-intel-layers__card-title">{title}</h4>
          {layer.statusNote ? (
            <p className="prime-intel-layers__status-note">{layer.statusNote}</p>
          ) : null}
        </div>
        <span className={statusChipClass(layer.statusTone)}>{layer.status}</span>
      </div>
      <div className="prime-intel-layers__story">
        {layer.story.map((line) => (
          <StoryBlock key={`${line.label}-${line.value}`} line={line} />
        ))}
      </div>
      <div className="prime-intel-layers__card-foot">
        {layer.buttonLabel ? (
          <button type="button" className="prime-intel-layers__action-btn" onClick={handleAction}>
            {layer.buttonLabel}
            <ArrowRight size={14} aria-hidden />
          </button>
        ) : null}
        {layer.footerHint ? <p className="prime-intel-layers__footer-hint">{layer.footerHint}</p> : null}
      </div>
    </article>
  )
}

/**
 * Pre-scan Prime cockpit — 2×2 intelligence layer grid with launch actions into the terminal.
 */
export default function PrimeIntelligenceLayersGrid({
  primeTrends,
  watchlist,
  birdeyeAssets = [],
  walletSnapshot,
  intel,
  showRiskScanner,
  scannerReport,
  approvalRows = [],
  query = '',
  riskDrivers = [],
  analysisModeId = 'default',
  onLayerAction,
}) {
  const layers = useMemo(
    () => ({
      narrative: buildNarrativeLayer(primeTrends),
      behavior: buildBehaviorLayer(watchlist, birdeyeAssets),
      contract: buildContractTrustLayer({
        showRiskScanner,
        scannerReport,
        approvalRows,
        approvalsAtRisk: intel?.approvalsAtRisk ?? 0,
        query,
        analysisModeId,
      }),
      wallet: buildWalletExposureLayer(walletSnapshot, intel, riskDrivers),
    }),
    [
      primeTrends,
      watchlist,
      birdeyeAssets,
      walletSnapshot,
      intel,
      showRiskScanner,
      scannerReport,
      approvalRows,
      query,
      analysisModeId,
      riskDrivers,
    ],
  )

  return (
    <section className="prime-intel-layers" aria-labelledby="prime-intel-layers-heading">
      <div className="prime-intel-layers__heading">
        <p id="prime-intel-layers-heading" className="prime-intel-layers__title">
          Threat Investigation Modules
        </p>
        <p className="prime-intel-layers__subtitle">
          Launch narrative, behavior, contract, or wallet investigations into the terminal.
        </p>
      </div>
      <div className="prime-intel-layers__grid">
        <LayerCard
          id="narrative"
          title="Narrative Intelligence"
          layer={layers.narrative}
          onLayerAction={onLayerAction}
        />
        <LayerCard
          id="behavior"
          title="Behavior Intelligence"
          layer={layers.behavior}
          onLayerAction={onLayerAction}
        />
        <LayerCard
          id="contract"
          title="Contract Trust"
          layer={layers.contract}
          onLayerAction={onLayerAction}
        />
        <LayerCard
          id="wallet"
          title="Wallet Exposure"
          layer={layers.wallet}
          onLayerAction={onLayerAction}
        />
      </div>
    </section>
  )
}
