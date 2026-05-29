import { useMemo } from 'react'
import { buildContractTrustProof } from '@/components/dashboard/prime/primeContractAnalyzerFields.js'

function ProofRow({ label, value }) {
  return (
    <div className="prime-contract-trust-proof__row">
      <p className="prime-contract-trust-proof__label">{label}</p>
      <p className="prime-contract-trust-proof__value">{value}</p>
    </div>
  )
}

/**
 * Concise contract trust proof — no duplicate scanner field grid.
 */
export default function PrimeContractTrustEvidence({ scannerReport, scanTarget, approvalRows = [] }) {
  const proof = useMemo(
    () => buildContractTrustProof(scannerReport, scanTarget, approvalRows),
    [scannerReport, scanTarget, approvalRows],
  )

  return (
    <div className="prime-contract-trust-proof space-y-3">
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Proof layer for Contract Analyzer results — summary fields live in the analyzer panel above.
      </p>
      <div className="prime-contract-trust-proof__grid">
        {proof.rows.map((row) => (
          <ProofRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
      {proof.findings?.length ? (
        <ul className="space-y-2 border-t border-white/[0.06] pt-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Key findings</p>
          {proof.findings.map((f) => (
            <li key={f.code || f.title} className="text-xs text-slate-400 flex gap-2">
              <span className="text-violet-400 font-mono text-[10px] shrink-0">{f.severity}</span>
              <span>
                <strong className="text-slate-200">{f.title}</strong>
                {f.detail ? ` — ${f.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
