import { Shield } from 'lucide-react'
import {
  buildWalletExposureView,
  exposureBadgeClass,
  formatExposureUsd,
  STALE_INVENTORY_NOTICE,
} from '@/utils/walletExposureFormat.js'
import { APPROVAL_STATUS_COPY } from '@/utils/approvalInventoryStatus.js'

const PANEL_TITLE = 'Prime Exclusive · Wallet Exposure Intelligence'

/**
 * @param {'loading' | 'clear' | 'exposed' | 'unavailable' | 'rate_limited' | 'provider_missing' | 'rpc_error' | 'auth_error'} exposureStatus
 */
export default function WalletExposurePanel({
  walletExposure,
  exposureStatus = 'loading',
  hasWallet = false,
}) {
  if (!hasWallet) {
    return (
      <Shell>
        <PanelHeader />
        <p className="text-sm text-slate-400 mt-3">Connect wallet to analyze personal exposure.</p>
      </Shell>
    )
  }

  if (exposureStatus === 'rate_limited') {
    return (
      <Shell>
        <PanelHeader />
        <p className="text-sm font-medium text-slate-200 mt-3">{APPROVAL_STATUS_COPY.rate_limited}</p>
      </Shell>
    )
  }

  if (exposureStatus === 'provider_missing') {
    return (
      <Shell>
        <PanelHeader />
        <p className="text-sm font-medium text-slate-200 mt-3">{APPROVAL_STATUS_COPY.provider_missing}</p>
        <p className="text-sm text-slate-400 mt-2">Contract risk analysis remains available.</p>
      </Shell>
    )
  }

  if (exposureStatus === 'rpc_error') {
    return (
      <Shell>
        <PanelHeader />
        <p className="text-sm font-medium text-slate-200 mt-3">{APPROVAL_STATUS_COPY.rpc_error}</p>
        <p className="text-sm text-slate-400 mt-2">Contract risk analysis remains available.</p>
      </Shell>
    )
  }

  if (exposureStatus === 'auth_error') {
    return (
      <Shell>
        <PanelHeader />
        <p className="text-sm font-medium text-slate-200 mt-3">{APPROVAL_STATUS_COPY.auth_error}</p>
      </Shell>
    )
  }

  if (exposureStatus === 'unavailable') {
    return (
      <Shell>
        <PanelHeader />
        <p className="text-sm font-medium text-slate-200 mt-3">
          Wallet Exposure Intelligence temporarily unavailable.
        </p>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Personal approval intelligence could not be loaded. Contract risk analysis remains available.
        </p>
      </Shell>
    )
  }

  if (exposureStatus === 'loading') {
    return (
      <Shell className="space-y-4">
        <PanelHeader />
        <div className="space-y-2">
          <p className="text-sm text-slate-200">Loading personal wallet exposure analysis…</p>
          <p className="text-xs text-slate-500">
            Checking active approvals and contract relationships.
          </p>
        </div>
        <div className="space-y-3 prime-wallet-exposure-shimmer" aria-hidden>
          <div className="h-3 w-56 bg-white/10 rounded animate-pulse" />
          <div className="h-14 bg-white/5 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 bg-white/5 rounded animate-pulse" />
            <div className="h-12 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </Shell>
    )
  }

  const view = buildWalletExposureView(walletExposure)
  if (!view) {
    return (
      <Shell>
        <PanelHeader />
        <p className="text-sm text-slate-400 mt-3">Loading personal wallet exposure analysis…</p>
      </Shell>
    )
  }

  const isClear = exposureStatus === 'clear' || view.riskLevel === 'CLEAR' || !view.hasExposure

  return (
    <div className="prime-wallet-exposure border border-violet-500/25 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-violet-950/30 to-slate-950/50 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <PanelHeader />
        <span className={exposureBadgeClass(view.riskLevel)}>{view.riskLevel}</span>
      </div>

      {view.inventoryStale ? (
        <p className="text-xs text-amber-200/90 border border-amber-500/25 bg-amber-500/10 rounded-lg px-3 py-2 leading-relaxed">
          {STALE_INVENTORY_NOTICE}
        </p>
      ) : null}

      {isClear ? (
        <p className="text-sm text-slate-300">No direct wallet exposure detected.</p>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <span className="text-slate-400 tabular-nums">{view.approvalCount}</span> active approval
              {view.approvalCount === 1 ? '' : 's'}
            </li>
            <li>
              <span className="text-slate-400 tabular-nums">{view.unlimitedApprovals}</span> unlimited
              approval{view.unlimitedApprovals === 1 ? '' : 's'}
            </li>
            <li>
              Estimated exposure:{' '}
              <span className="text-white font-mono tabular-nums">
                {formatExposureUsd(view.estimatedExposureUsd)}
              </span>
              {view.pendingUsd ? (
                <span className="text-slate-500 text-xs ml-1">(refining…)</span>
              ) : null}
            </li>
          </ul>

          {view.assetSymbolsLabel ? (
            <p className="text-sm text-violet-100">
              <span className="text-slate-500">Affected assets:</span> {view.assetSymbolsLabel}
            </p>
          ) : null}
        </div>
      )}

      {!isClear && view.recommendation ? (
        <p className="text-xs text-slate-400 border-t border-white/10 pt-3 leading-relaxed">
          <span className="text-slate-500 uppercase tracking-wider text-[9px] font-mono mr-2">
            Recommendation
          </span>
          {view.recommendation}
        </p>
      ) : null}
    </div>
  )
}

function PanelHeader() {
  return (
    <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-violet-300/90 flex items-center gap-2">
      <Shield className="w-3.5 h-3.5" aria-hidden />
      {PANEL_TITLE}
    </p>
  )
}

function Shell({ children, className = '' }) {
  return (
    <div
      className={`prime-wallet-exposure border border-violet-500/20 rounded-xl p-4 sm:p-5 bg-slate-950/40 ${className}`}
    >
      {children}
    </div>
  )
}
