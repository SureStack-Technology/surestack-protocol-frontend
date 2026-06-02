import { useMemo } from 'react'
import { Loader2, Radar } from 'lucide-react'
import { buildSolanaTokenPanelSummary } from '@/components/dashboard/prime/primeSolanaTokenFields.js'
import { scannerFieldValue } from '@/utils/scannerProofStatus.mjs'

function createPendingSolanaPanelSummary(mintAddress, symbol, tokenName) {
  return {
    hasScan: false,
    providerPending: true,
    scannerVerdict: null,
    scannerVerdictDetail: null,
    trustScore: null,
    technicalTrustScore: null,
    technicalTrustLabel: null,
    narrativeRiskLabel: null,
    scannerConfidenceScore: null,
    scannerConfidenceTier: null,
    scannerConfidenceProviders: null,
    recommendation: null,
    narrative: null,
    fields: [
      { label: 'Mint address', value: mintAddress || '—', pending: !mintAddress },
      { label: 'Symbol', value: symbol || '—', pending: false },
      { label: 'Token name', value: tokenName || '—', pending: false },
    ],
    evidenceSections: {},
    findings: [],
    dataConfidence: null,
  }
}

function FieldCell({ label, value, pending, confidence }) {
  return (
    <div className={`prime-contract-analyzer__cell ${pending ? 'prime-contract-analyzer__cell--pending' : ''}`}>
      <p className="prime-contract-analyzer__cell-label">
        {label}
        {confidence === 'UNKNOWN' ? (
          <span className="ml-1 text-amber-300/80 font-normal normal-case tracking-normal">· unknown</span>
        ) : null}
      </p>
      <p className="prime-contract-analyzer__cell-value">
        {pending ? scannerFieldValue(false, value) : value || '—'}
      </p>
    </div>
  )
}

/**
 * Solana SPL mint intelligence — separate from EVM Contract Analyzer.
 */
export default function PrimeSolanaTokenPanel({
  mintAddress,
  symbol,
  tokenName,
  scannerReport,
  showRiskScanner,
  onRunSolanaScan,
  busy = false,
  scanError = null,
}) {
  const summary = useMemo(() => {
    try {
      return buildSolanaTokenPanelSummary(scannerReport ?? null, mintAddress, symbol, tokenName)
    } catch (err) {
      console.warn('[PrimeSolanaTokenPanel] summary build failed — using pending state', err)
      return createPendingSolanaPanelSummary(mintAddress, symbol, tokenName)
    }
  }, [scannerReport, mintAddress, symbol, tokenName])

  const handleScan = () => {
    if (!mintAddress) return
    onRunSolanaScan?.(mintAddress)
  }

  if (!showRiskScanner) {
    return (
      <section className="prime-contract-analyzer prime-solana-token-panel" aria-labelledby="prime-solana-token-title">
        <p className="text-sm text-slate-400 leading-relaxed">
          Verify a wallet with Intelligence Pro to unlock Solana Token Intelligence.
        </p>
      </section>
    )
  }

  return (
    <section className="prime-contract-analyzer prime-solana-token-panel" aria-labelledby="prime-solana-token-title">
      <div className="prime-contract-analyzer__header">
        <div className="flex items-start gap-3 min-w-0">
          <div className="prime-contract-analyzer__icon prime-solana-token-panel__icon" aria-hidden>
            <Radar size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-cyan-200/90">
              Solana · SPL mint
            </p>
            <h3 id="prime-solana-token-title" className="text-lg font-heading text-white mt-1 tracking-tight">
              Solana Token Intelligence
            </h3>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
              Scanner-backed liquidity, holder concentration, mint/freeze authorities, and DEX routing — not EVM
              bytecode or proxy analysis.
            </p>
            {mintAddress ? (
              <p className="text-[10px] font-mono text-cyan-200/90 mt-2 break-all">Mint · {mintAddress}</p>
            ) : null}
          </div>
        </div>
        {summary.hasScan && summary.scannerVerdict ? (
          <div className="prime-contract-analyzer__verdict-chip shrink-0 max-w-xs">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">Scan verdict</span>
            <span className="text-xs font-semibold text-white mt-0.5">{summary.scannerVerdict}</span>
            {summary.scannerVerdictDetail ? (
              <span className="text-[10px] text-amber-200/90 mt-1 block leading-snug">
                {summary.scannerVerdictDetail}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="prime-contract-analyzer__scan-bar">
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-500 px-2">Solana mainnet</span>
        <button
          type="button"
          disabled={busy || !mintAddress}
          onClick={handleScan}
          className="prime-contract-analyzer__btn-primary prime-solana-token-panel__btn"
        >
          {busy ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Radar size={16} aria-hidden />}
          {summary.hasScan ? 'Re-run Solana Token Scan' : 'Run Solana Token Scan'}
        </button>
      </div>

      {scanError && !summary.hasScan ? (
        <p className="text-xs text-rose-300/90">{scanError}</p>
      ) : null}

      {summary.providerPending && !summary.hasScan ? (
        <p className="text-xs text-amber-200/90 bg-amber-950/30 border border-amber-500/25 rounded-lg px-3 py-2">
          Solana scanner pending provider activation — configure SOLANA_RPC_URL and market providers for live
          mint evidence.
        </p>
      ) : null}

      <div className="prime-contract-analyzer__trust prime-solana-token-panel__scores">
        <div>
          <p className="prime-contract-analyzer__cell-label">Composite trust</p>
          <p className="prime-contract-analyzer__trust-value">
            {summary.hasScan && summary.trustScore != null ? (
              <>
                <span className="tabular-nums">{summary.trustScore}</span>
                <span className="text-slate-500 font-normal text-sm"> / 100</span>
              </>
            ) : (
              <span className="text-slate-500 text-sm font-normal">Coverage pending</span>
            )}
          </p>
          {summary.technicalTrustLabel ? (
            <p className="text-[10px] text-slate-400 mt-1">
              Technical · {summary.technicalTrustLabel}
              {summary.technicalTrustScore != null ? ` (${summary.technicalTrustScore})` : ''}
              {summary.narrativeRiskLabel ? ` · Narrative · ${summary.narrativeRiskLabel}` : ''}
            </p>
          ) : null}
        </div>
        {summary.scannerConfidenceScore != null ? (
          <div>
            <p className="prime-contract-analyzer__cell-label">Scanner confidence</p>
            <p className="prime-contract-analyzer__trust-value">
              <span className="tabular-nums">{summary.scannerConfidenceScore}%</span>
            </p>
            {summary.scannerConfidenceTier ? (
              <p className="text-[10px] text-slate-500 mt-1 leading-snug max-w-xs">
                {summary.scannerConfidenceTier}
                {summary.scannerConfidenceProviders
                  ? ` · ${summary.scannerConfidenceProviders}`
                  : ''}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="prime-contract-analyzer__grid">
        {summary.fields.map((field) => (
          <FieldCell
            key={field.label}
            label={field.label}
            value={field.value}
            pending={field.pending}
            confidence={field.confidence}
          />
        ))}
      </div>

      <p className="text-[11px] text-slate-500 leading-snug">
        {summary.hasScan
          ? 'Scanner evidence available. Expand Market Structure Evidence in supporting evidence for proof details.'
          : 'Run Solana Token Scan for liquidity, holder concentration, and authority evidence.'}
      </p>
    </section>
  )
}
