import { buildSolanaTokenPanelSummary } from '@/components/dashboard/prime/primeSolanaTokenFields.js'

function EvidenceSection({ title, rows }) {
  if (!rows?.length) return null
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-200/80">{title}</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
            <dt className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">{row.label}</dt>
            <dd className="text-slate-200 mt-1 break-all">{row.value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function DataConfidenceLegend({ dataConfidence }) {
  if (!dataConfidence) return null
  const unknown = Object.entries(dataConfidence).filter(([, v]) => v === 'UNKNOWN')
  if (!unknown.length) return null
  return (
    <p className="text-[11px] text-slate-500 leading-relaxed">
      Fields marked unavailable use <span className="text-amber-200/90">UNKNOWN</span> confidence — they do not
      increase risk score; scanner confidence is reduced instead.
    </p>
  )
}

/**
 * Token Mint Evidence accordion body for Solana SPL mints.
 */
export default function PrimeSolanaMintEvidence({
  scannerReport,
  mintAddress,
  symbol,
  tokenName,
}) {
  const summary = buildSolanaTokenPanelSummary(scannerReport, mintAddress, symbol, tokenName)
  const sections = summary.evidenceSections || {}

  if (!summary.hasScan) {
    return (
      <p className="text-sm text-slate-400 leading-relaxed">
        Solana scanner pending provider activation — run Solana Token Scan above to populate mint authority,
        holder concentration, liquidity, and pool status.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-[11px] text-slate-500">
        Proof layer for Solana Token Scan — market structure, authorities, holders, and tradability. No EVM
        bytecode, proxy, or honeypot heuristics.
      </p>

      <EvidenceSection title="Market Structure" rows={sections.marketStructure} />
      <EvidenceSection title="Authority Controls" rows={sections.authorityControls} />
      <EvidenceSection title="Holder Distribution" rows={sections.holderDistribution} />
      <EvidenceSection title="Tradability" rows={sections.tradability} />
      <EvidenceSection title="Provider Health" rows={sections.providerHealth} />

      <DataConfidenceLegend dataConfidence={summary.dataConfidence} />

      {summary.narrative ? (
        <p className="text-xs text-slate-400 leading-relaxed border-l-2 border-cyan-500/40 pl-3">
          {summary.narrative}
        </p>
      ) : null}
    </div>
  )
}
