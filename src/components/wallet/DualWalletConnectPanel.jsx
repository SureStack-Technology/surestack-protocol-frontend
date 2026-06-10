import { Loader2, CheckCircle2 } from 'lucide-react'
import { detectWalletProviders } from '@/lib/walletProviders.js'
import {
  formatWalletChainLabel,
  formatWalletTypeLabel,
  WALLET_TYPES,
} from '@/constants/walletTypes.js'

/**
 * Dual EVM + Solana wallet onboarding panel.
 */
export default function DualWalletConnectPanel({
  evmAccount,
  evmConnected,
  evmConnecting,
  onConnectEvm,
  onVerifyEvm,
  evmVerifyDisabled,
  evmVerifyDisabledReason,
  evmBusy,
  evmPhaseLabel,
  evmLastError,
  solanaPublicKey,
  solanaConnected,
  solanaConnecting,
  onConnectSolana,
  onVerifySolana,
  solanaVerifyDisabled,
  solanaVerifyDisabledReason,
  solanaBusy,
  solanaPhaseLabel,
  solanaLastError,
  verifiedWallet,
  profileWallets = [],
}) {
  const providers = detectWalletProviders()
  const verifiedFromProfile =
    profileWallets.find((w) => w.verifiedAt) ||
    (verifiedWallet?.verifiedAt ? verifiedWallet : null)

  const renderVerifiedBadge = (wallet) => (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3.5 space-y-2">
      <p className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
        <CheckCircle2 size={18} className="shrink-0" aria-hidden />
        Wallet verified
      </p>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-emerald-500/25 bg-emerald-950/40 px-2 py-0.5 text-emerald-200">
          {formatWalletTypeLabel(wallet.walletType)}
        </span>
        <span className="rounded-full border border-white/10 bg-slate-900/60 px-2 py-0.5 text-slate-300">
          {formatWalletChainLabel(wallet)}
        </span>
      </div>
      <p className="text-xs font-mono text-slate-300/95 break-all pt-2 border-t border-emerald-500/15">
        {wallet.address}
      </p>
    </div>
  )

  if (verifiedFromProfile?.verifiedAt) {
    return renderVerifiedBadge(verifiedFromProfile)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">EVM wallet</h3>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            {providers.metamask ? 'MetaMask detected' : providers.evm ? 'Injected provider' : 'Not detected'}
          </span>
        </div>
        <p className="text-xs text-slate-400">MetaMask / injected Ethereum wallet (EIP-191 signature).</p>

        {!evmConnected ? (
          <button
            type="button"
            onClick={onConnectEvm}
            disabled={evmConnecting}
            className="btn-cyber w-full px-4 py-2 text-sm disabled:opacity-50"
          >
            {evmConnecting ? 'Connecting…' : 'Connect EVM wallet'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-mono text-slate-300 break-all">{evmAccount}</p>
            <button
              type="button"
              disabled={evmVerifyDisabled}
              onClick={onVerifyEvm}
              title={evmVerifyDisabledReason || undefined}
              className="btn-brand w-full px-4 py-2 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {evmBusy ? <Loader2 className="animate-spin" size={16} /> : null}
              Sign & verify EVM
            </button>
            {evmVerifyDisabledReason && !evmBusy ? (
              <p className="text-xs text-amber-200/90">{evmVerifyDisabledReason}</p>
            ) : null}
            {evmBusy && evmPhaseLabel ? (
              <p className="text-xs text-violet-200/90 flex items-center gap-2">
                <Loader2 className="animate-spin shrink-0" size={14} />
                {evmPhaseLabel}
              </p>
            ) : null}
            {evmLastError && !evmBusy ? (
              <p className="text-xs text-rose-300/95" role="alert">
                {evmLastError}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Solana wallet</h3>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            {providers.phantom ? 'Phantom detected' : 'Not detected'}
          </span>
        </div>
        <p className="text-xs text-slate-400">Phantom wallet (ed25519 signMessage verification).</p>

        {!solanaConnected ? (
          <button
            type="button"
            onClick={onConnectSolana}
            disabled={solanaConnecting || !providers.phantom}
            className="btn-outline w-full px-4 py-2 text-sm border-violet-400/30 text-violet-100 hover:border-violet-300/50 disabled:opacity-50"
          >
            {solanaConnecting ? 'Connecting…' : 'Connect Solana wallet'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-mono text-slate-300 break-all">{solanaPublicKey}</p>
            <button
              type="button"
              disabled={solanaVerifyDisabled}
              onClick={onVerifySolana}
              title={solanaVerifyDisabledReason || undefined}
              className="btn-brand w-full px-4 py-2 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {solanaBusy ? <Loader2 className="animate-spin" size={16} /> : null}
              Sign & verify Solana
            </button>
            {solanaVerifyDisabledReason && !solanaBusy ? (
              <p className="text-xs text-amber-200/90">{solanaVerifyDisabledReason}</p>
            ) : null}
            {solanaBusy && solanaPhaseLabel ? (
              <p className="text-xs text-violet-200/90 flex items-center gap-2">
                <Loader2 className="animate-spin shrink-0" size={14} />
                {solanaPhaseLabel}
              </p>
            ) : null}
            {solanaLastError && !solanaBusy ? (
              <p className="text-xs text-rose-300/95" role="alert">
                {solanaLastError}
              </p>
            ) : null}
          </div>
        )}

        {!providers.phantom ? (
          <p className="text-[11px] text-slate-500">
            Install{' '}
            <a
              href="https://phantom.app/"
              target="_blank"
              rel="noreferrer"
              className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
            >
              Phantom
            </a>{' '}
            to connect a Solana wallet.
          </p>
        ) : null}
      </div>
    </div>
  )
}

export { WALLET_TYPES }
