import { useMemo, useState } from 'react'
import { Loader2, Shield } from 'lucide-react'
import {
  buildContractAnalyzerSummary,
  contractAddressFromQuery,
  TERMINAL_CHAIN_TO_SCAN_ID,
} from '@/components/dashboard/prime/primeContractAnalyzerFields.js'

const SCAN_CHAINS = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'base', label: 'Base' },
  { id: 'arbitrum', label: 'Arbitrum' },
  { id: 'polygon', label: 'Polygon' },
]

function FieldCell({ label, value, pending, tone }) {
  return (
    <div className={`prime-contract-analyzer__cell prime-contract-analyzer__cell--${tone || 'pending'}`}>
      <p className="prime-contract-analyzer__cell-label">{label}</p>
      <p className="prime-contract-analyzer__cell-value">{pending ? 'Pending scan' : value || '—'}</p>
    </div>
  )
}

/**
 * Sole Prime scanner UX — inline deep contract scan (no legacy scanner workspace).
 */
export default function PrimeContractAnalyzerPanel({
  scanTarget,
  terminalChain = 'ethereum',
  scannerReport,
  approvalRows = [],
  showRiskScanner,
  onRunDeepScan,
  busy = false,
  scanError = null,
}) {
  const [chain, setChain] = useState(terminalChain)
  const summary = useMemo(
    () => buildContractAnalyzerSummary(scannerReport, scanTarget, approvalRows),
    [scannerReport, scanTarget, approvalRows],
  )

  const targetAddress = contractAddressFromQuery(scanTarget)

  const handleScan = () => {
    const addr = targetAddress
    if (!addr) return
    const chainId = TERMINAL_CHAIN_TO_SCAN_ID[chain] ?? 1
    onRunDeepScan?.(addr, chainId)
  }

  if (!showRiskScanner) {
    return (
      <section className="prime-contract-analyzer" aria-labelledby="prime-contract-analyzer-title">
        <p className="text-sm text-slate-400 leading-relaxed">
          Verify a wallet with Intelligence Pro to unlock Contract Analyzer.
        </p>
      </section>
    )
  }

  return (
    <section className="prime-contract-analyzer" aria-labelledby="prime-contract-analyzer-title">
      <div className="prime-contract-analyzer__header">
        <div className="flex items-start gap-3 min-w-0">
          <div className="prime-contract-analyzer__icon" aria-hidden>
            <Shield size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-indigo-200/90">
              Core Prime module · sole scanner
            </p>
            <h3 id="prime-contract-analyzer-title" className="text-lg font-heading text-white mt-1 tracking-tight">
              Contract Analyzer
            </h3>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
              Scanner-backed review of bytecode, approval surface, source verification, proxy status, ownership,
              liquidity, and honeypot heuristics.
            </p>
            {targetAddress ? (
              <p className="text-[10px] font-mono text-violet-200/90 mt-2 break-all">Target · {targetAddress}</p>
            ) : null}
          </div>
        </div>
        {summary.hasScan && summary.scannerVerdict ? (
          <div className="prime-contract-analyzer__verdict-chip shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">Scan verdict</span>
            <span className="text-xs font-semibold text-white mt-0.5">{summary.scannerVerdict}</span>
          </div>
        ) : null}
      </div>

      <div className="prime-contract-analyzer__scan-bar">
        <select
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          className="prime-preinteract-chain-select"
          aria-label="Scan chain"
          disabled={busy}
        >
          {SCAN_CHAINS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !targetAddress}
          onClick={handleScan}
          className="prime-contract-analyzer__btn-primary"
        >
          {busy ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Shield size={16} aria-hidden />}
          {summary.hasScan ? 'Re-run Deep Contract Scan' : 'Run Deep Contract Scan'}
        </button>
      </div>

      {scanError && !summary.hasScan ? (
        <p className="text-xs text-rose-300/90">{scanError}</p>
      ) : null}

      <div className="prime-contract-analyzer__trust">
        <p className="prime-contract-analyzer__cell-label">Trust score</p>
        <p className="prime-contract-analyzer__trust-value">
          {summary.hasScan && summary.trustScore != null ? (
            <>
              <span className="tabular-nums">{summary.trustScore}</span>
              <span className="text-slate-500 font-normal text-sm"> / 100</span>
            </>
          ) : (
            <span className="text-slate-500 text-sm font-normal">Pending scan</span>
          )}
        </p>
      </div>

      <div className="prime-contract-analyzer__grid">
        {summary.fields.map((field) => (
          <FieldCell
            key={field.label}
            label={field.label}
            value={field.value}
            pending={field.pending}
            tone={field.tone}
          />
        ))}
      </div>

      <p className="text-[11px] text-slate-500 leading-snug">
        {summary.hasScan
          ? 'Executive verdict updates when scan completes. Expand Contract Trust Evidence below for proof details.'
          : 'Run Deep Contract Scan to validate this contract before interaction — verdict stays preliminary until complete.'}
      </p>
    </section>
  )
}
