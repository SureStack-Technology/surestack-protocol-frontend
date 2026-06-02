import { buildWalletExposureIntel } from '@/lib/walletExposureIntelligence/buildWalletExposureIntel.js'
import { WALLET_EXPOSURE_DISCLAIMER } from '@/lib/walletExposureIntelligence/walletExposureIntelligenceEngine.mjs'

function threatTone(level) {
  const l = String(level || '').toUpperCase()
  if (l === 'HIGH') return 'prime-wallet-exp-threat--high'
  if (l === 'MEDIUM') return 'prime-wallet-exp-threat--medium'
  return 'prime-wallet-exp-threat--low'
}

/**
 * Compact wallet exposure proof for evidence accordion — full card lives above in scan body.
 */
export default function WalletExposureEvidenceSummary({
  riskData = null,
  walletExposureProfile = null,
  approvalRows = [],
  hasWallet = false,
}) {
  const profile =
    walletExposureProfile ||
    buildWalletExposureIntel(riskData, { approvalRows, hasWallet })
  const pending = !hasWallet || profile.dataQuality === 'pending'
  const primary = profile.exposureDrivers?.[0]
  const topAsset = profile.topAssets?.[0]

  return (
    <div className="prime-wallet-exp-evidence">
      <div className="prime-wallet-exp-evidence__score-row">
        <div>
          <p className="prime-wallet-exp-evidence__label">Exposure score</p>
          <p className="prime-wallet-exp-evidence__score tabular-nums">
            {pending ? '—' : profile.exposureScore}
            {!pending ? <span className="text-slate-500 font-normal text-sm"> / 100</span> : null}
          </p>
          <p className="prime-wallet-exp-evidence__band">{profile.exposureBand}</p>
        </div>
        {topAsset ? (
          <div className="text-right">
            <p className="prime-wallet-exp-evidence__label">Top asset concentration</p>
            <p className="text-sm text-slate-200 font-medium">
              {topAsset.symbol} · {topAsset.pct}%
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{profile.assetConcentration} concentration</p>
          </div>
        ) : null}
      </div>

      {primary ? (
        <div className="prime-wallet-exp-evidence__driver">
          <p className="prime-wallet-exp-evidence__label">Primary driver</p>
          <p className="text-sm text-slate-200 font-medium">{primary.label}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{primary.detail}</p>
        </div>
      ) : null}

      {profile.threatIndicators?.length ? (
        <div className="prime-wallet-exp-evidence__threats">
          <p className="prime-wallet-exp-evidence__label">Threat indicators</p>
          <div className="flex flex-wrap gap-2">
            {profile.threatIndicators.slice(0, 4).map((t) => (
              <span key={t.label} className={`prime-wallet-exp-threat-pill ${threatTone(t.level)}`}>
                {t.label} · {t.level}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <p className="prime-wallet-exp-evidence__view-hint">View full analysis above</p>
      <p className="prime-wallet-exp-evidence__disclaimer">{WALLET_EXPOSURE_DISCLAIMER}</p>
    </div>
  )
}
