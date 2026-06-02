import { isPrimeLunarCrushLive } from '@/data/lunarCrushScenarioShowcase.js'
import PrimeContractTrustEvidence from '@/components/dashboard/prime/PrimeContractTrustEvidence.jsx'
import PrimeSolanaMintEvidence from '@/components/dashboard/prime/PrimeSolanaMintEvidence.jsx'
import PrimeProviderFeedCta from '@/components/dashboard/prime/PrimeProviderFeedCta.jsx'
import SocialIntelligencePanel from '@/components/dashboard/prime/SocialIntelligencePanel.jsx'
import OnChainBehaviorPanel from '@/components/dashboard/prime/OnChainBehaviorPanel.jsx'
import PrimeBehaviorIntelligencePreview from '@/components/dashboard/prime/PrimeBehaviorIntelligencePreview.jsx'
import LiquidityIntelligenceCard from '@/components/dashboard/prime/LiquidityIntelligenceCard.jsx'
import WalletExposureEvidenceSummary from '@/components/dashboard/prime/WalletExposureEvidenceSummary.jsx'
import { assessBehaviorCoverage } from '@/utils/behaviorIntelligenceStatus.js'
import { scannerEvidenceBadge } from '@/utils/scannerProofStatus.mjs'
import { dataStatusClass, formatDataStatusLabel } from '@/utils/primeIntelligenceFormat.js'
import { exposureAccordionBadge } from '@/utils/walletExposureHeatmap.js'

function DataStatusBadge({ status }) {
  const label = formatDataStatusLabel(status)
  return (
    <span className={dataStatusClass(status)} title={`Data provenance: ${label}`}>
      {label}
    </span>
  )
}

function PriorityBadge({ level }) {
  const cls =
    level === 'HIGH'
      ? 'prime-priority prime-priority--high'
      : level === 'MEDIUM'
        ? 'prime-priority prime-priority--medium'
        : 'prime-priority prime-priority--low'
  return <span className={cls}>{level}</span>
}

function WalletExposureHeatmap({ rows, status, subtitle, sources = [] }) {
  return (
    <div className="prime-heatmap">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-violet-200/90">Exposure bands</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {subtitle || 'Relative exposure from current wallet findings'}
          </p>
          {sources.length > 0 ? (
            <p className="text-[10px] text-slate-600 mt-1 font-mono">
              Sources: {sources.join(' · ')}
            </p>
          ) : null}
        </div>
        <DataStatusBadge status={status} />
      </div>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="prime-heatmap-row">
            <div className="flex justify-between gap-3 text-[11px] mb-1">
              <span className="text-slate-300 font-medium">{row.label}</span>
              <span className="font-mono text-slate-500 tabular-nums">
                {row.pending ? 'Provider pending' : `${row.level}/${row.max}`}
              </span>
            </div>
            <div className="prime-heatmap-bar" aria-hidden>
              {Array.from({ length: row.max }).map((_, i) => (
                <span
                  key={i}
                  className={`prime-heatmap-bar__seg ${
                    !row.pending && row.level != null && i < row.level ? 'prime-heatmap-bar__seg--on' : ''
                  } ${row.pending ? 'prime-heatmap-bar__seg--pending' : ''}`}
                />
              ))}
            </div>
            {row.reasons?.length && !row.pending ? (
              <div className="mt-2 pl-2 border-l border-violet-500/25">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Reason</p>
                <ul className="space-y-0.5">
                  {row.reasons.slice(0, 4).map((line) => (
                    <li key={line} className="text-[11px] text-slate-400 leading-snug">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function EvidenceAccordion({ id, title, subtitle, badge, children, defaultOpen = false }) {
  return (
    <details id={id} className="prime-evidence-accordion group" open={defaultOpen ? true : undefined}>
      <summary className="prime-evidence-accordion__summary">
        <div className="prime-evidence-accordion__head">
          <div className="min-w-0">
            <p className="prime-evidence-accordion__title">{title}</p>
            {subtitle ? <p className="prime-evidence-accordion__subtitle">{subtitle}</p> : null}
            <p className="prime-evidence-accordion__hint">Click to expand</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {badge ? <span className="prime-evidence-accordion__badge">{badge}</span> : null}
            <span className="prime-evidence-accordion__chevron" aria-hidden />
          </div>
        </div>
      </summary>
      <div className="prime-evidence-accordion__body">{children}</div>
    </details>
  )
}

/**
 * Evidence accordions — contract trust proof, wallet, narrative, behavior, timeline.
 */
export default function PrimeEvidenceLayers({
  profile,
  walletSnapshot,
  scannerReport,
  scanTarget,
  approvalRows,
  exposureHeatmap,
  exposureHeatmapSubtitle,
  exposureHeatmapSources = [],
  heatmapStatus,
  intelligenceFeed,
  narrativeSubtitle,
  narrativeTargetSymbol = null,
  behaviorSubtitle,
  analysisModeId,
  solanaMintAddress = null,
  solanaSymbol = null,
  solanaTokenName = null,
  primeTrends,
  watchlist,
  birdeyeAssets = [],
  riskData = null,
  walletExposureProfile = null,
  approvalRowsForExposure = [],
  report = null,
}) {
  const feed = intelligenceFeed
  const lunarLive = isPrimeLunarCrushLive(primeTrends)
  const behaviorCoverage = assessBehaviorCoverage(watchlist, birdeyeAssets)
  const birdeyeHasFeed = behaviorCoverage.mode !== 'pending'
  const showContractProof = analysisModeId === 'contract'
  const showSolanaMintProof = analysisModeId === 'solana_token'
  const solanaScannerReport = scannerReport?.chain === 'solana' ? scannerReport : null
  const solanaProofBadge = scannerEvidenceBadge(report, solanaScannerReport)
  const contractProofBadge = scannerEvidenceBadge(report, scannerReport)

  return (
    <div className="prime-evidence-stack space-y-3">
      {showSolanaMintProof ? (
        <EvidenceAccordion
          id="prime-evidence-solana-mint"
          title="Market Structure Evidence"
          subtitle="Mint address, authority status, holder concentration, liquidity depth, and routing coverage."
          badge={solanaProofBadge}
        >
          <PrimeSolanaMintEvidence
            scannerReport={solanaScannerReport}
            mintAddress={solanaMintAddress}
            symbol={solanaSymbol}
            tokenName={solanaTokenName}
          />
        </EvidenceAccordion>
      ) : null}

      {showContractProof ? (
        <EvidenceAccordion
          id="prime-evidence-contract"
          title="Contract Trust"
          subtitle="Verified source, admin surface, proxy, bytecode fingerprint, and key findings."
          badge={contractProofBadge}
        >
          <PrimeContractTrustEvidence
            scannerReport={scannerReport}
            scanTarget={scanTarget}
            approvalRows={approvalRows}
          />
        </EvidenceAccordion>
      ) : null}

      <EvidenceAccordion
        id="prime-evidence-wallet-exposure-intel"
        title="Wallet Exposure Intelligence"
        subtitle="Exposure score, primary driver, and threat proof summary"
        badge={
          walletExposureProfile?.exposureScore != null
            ? `Score ${walletExposureProfile.exposureScore}`
            : exposureAccordionBadge(walletSnapshot?.hasWallet, heatmapStatus)
        }
      >
        <WalletExposureEvidenceSummary
          riskData={riskData}
          walletExposureProfile={walletExposureProfile}
          approvalRows={approvalRowsForExposure.length ? approvalRowsForExposure : approvalRows}
          hasWallet={Boolean(walletSnapshot?.hasWallet)}
        />
      </EvidenceAccordion>

      <EvidenceAccordion
        id="prime-evidence-wallet"
        title="Wallet Exposure Bands"
        subtitle={
          walletSnapshot?.compact
            ? `Canonical index ${walletSnapshot.compact} — matches hero & verdict`
            : 'Connect wallet for exposure map'
        }
        badge={exposureAccordionBadge(walletSnapshot?.hasWallet, heatmapStatus)}
      >
        {walletSnapshot?.hasWallet ? (
          <WalletExposureHeatmap
            rows={exposureHeatmap}
            status={heatmapStatus}
            subtitle={exposureHeatmapSubtitle}
            sources={exposureHeatmapSources}
          />
        ) : (
          <p className="text-sm text-slate-400">Link a verified wallet to populate exposure bands.</p>
        )}
      </EvidenceAccordion>

      <EvidenceAccordion
        id="prime-evidence-narrative"
        title="Narrative Intelligence"
        subtitle={narrativeSubtitle}
        badge="Narrative"
      >
        <SocialIntelligencePanel
          profile={profile}
          variant="embed"
          narrativeTargetSymbol={narrativeTargetSymbol}
        />
        {!lunarLive ? <PrimeProviderFeedCta /> : null}
      </EvidenceAccordion>

      <EvidenceAccordion
        id="prime-evidence-liquidity"
        title="Liquidity Intelligence"
        subtitle="Depth, estimated market impact, venue diversity, and stability from indexed market data"
        badge={
          scannerReport?.liquidityIntelligence?.intelligenceScore != null
            ? `Score ${scannerReport.liquidityIntelligence.intelligenceScore}`
            : 'Liquidity'
        }
      >
        <LiquidityIntelligenceCard scannerReport={scannerReport} variant="embed" />
      </EvidenceAccordion>

      <EvidenceAccordion
        id="prime-evidence-behavior"
        title="Behavior Intelligence"
        subtitle={behaviorSubtitle}
        badge={behaviorCoverage.badge}
      >
        {birdeyeHasFeed ? (
          <OnChainBehaviorPanel profile={profile} variant="embed" />
        ) : (
          <>
            <PrimeBehaviorIntelligencePreview watchlist={watchlist} assets={birdeyeAssets} />
            <PrimeProviderFeedCta />
          </>
        )}
      </EvidenceAccordion>

      <EvidenceAccordion
        id="prime-evidence-timeline"
        title="Threat Timeline"
        subtitle="Intelligence feed · alerts, findings, and timeline signals"
        badge={feed?.items?.length ? `${feed.items.length} events` : 'Feed'}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
            {feed?.hasInferred ? 'Includes inferred timeline signals' : 'Latest intelligence events'}
          </p>
          {feed?.sectionStatus ? <DataStatusBadge status={feed.sectionStatus} /> : null}
        </div>
        <ul className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 prime-feed-scroll">
          {(feed?.items || []).map((ev) => (
            <li
              key={ev.id}
              className={`prime-feed-item prime-feed-item--${String(ev.severity).toLowerCase()}`}
            >
              <PriorityBadge level={ev.severity} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-200 font-medium leading-snug">{ev.summary}</p>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                  {new Date(ev.at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </EvidenceAccordion>
    </div>
  )
}
