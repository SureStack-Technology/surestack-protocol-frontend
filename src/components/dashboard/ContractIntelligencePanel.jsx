import { useState } from 'react'
import { Loader2, FileSearch, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthApi } from '@/hooks/useAuthApi.js'
import { useContractIntelligence } from '@/hooks/useContractIntelligence.js'
import { hasStrategicTierOrEnterprise } from '@/utils/dashboardPersonalization.js'
import { formatHoneypotLabel, formatOwnershipLabel } from '@/utils/contractIntelDisplay.js'

const CHAINS = [
  { id: 1, label: 'Ethereum' },
  { id: 8453, label: 'Base' },
  { id: 42161, label: 'Arbitrum' },
  { id: 10, label: 'Optimism' },
  { id: 137, label: 'Polygon' },
]

const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

function TrustBadge({ band, score }) {
  const tone =
    band === 'TRUSTED'
      ? 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10'
      : band === 'HIGH_RISK'
        ? 'text-rose-300 border-rose-400/40 bg-rose-500/10'
        : 'text-amber-200 border-amber-400/35 bg-amber-500/10'
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-wider ${tone}`}>
      <Shield size={14} aria-hidden />
      {band} · {score}
    </span>
  )
}

/**
 * Contract Intelligence Engine — Prime lite / Alpha advanced (via membership tier).
 * @param {'explorer' | 'prime'} [variant]
 */
export default function ContractIntelligencePanel({
  api: apiProp,
  profile,
  variant = 'explorer',
  lastInteractedAddress = null,
  walletAddress = null,
}) {
  const { api: apiFromHook } = useAuthApi()
  const api = apiProp || apiFromHook
  const { report, busy, error, analyze, loadCached } = useContractIntelligence(api)
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState(1)
  const [related, setRelated] = useState('')

  const isAlpha = hasStrategicTierOrEnterprise(profile)
  const isPrime = variant === 'prime'

  const runAnalyze = async (addrOverride) => {
    const addr = (addrOverride || address).trim()
    if (!addr) {
      toast.error('Enter a contract address')
      return
    }
    if (addrOverride) setAddress(addr)
    const relatedAddresses = related
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const { ok, error: analyzeError } = await analyze({ address: addr, chainId, relatedAddresses })
    if (ok) toast.success('Contract analysis complete')
    else toast.error(analyzeError || 'Analysis could not complete. Please try again.')
  }

  const quickActions = [
    lastInteractedAddress
      ? { id: 'last', label: 'Analyze last interacted contract', address: lastInteractedAddress }
      : null,
    { id: 'uniswap', label: 'Analyze Uniswap Router', address: UNISWAP_V3_ROUTER },
    { id: 'permit2', label: 'Analyze Permit2', address: PERMIT2 },
    walletAddress
      ? { id: 'wallet', label: 'Analyze connected wallet recent target', address: lastInteractedAddress || walletAddress }
      : null,
  ].filter(Boolean)

  return (
    <div
      className={`explorer-card-premium border rounded-xl p-5 space-y-4 ${
        isPrime ? 'prime-contract-panel border-violet-500/25' : 'border-violet-500/20'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-violet-300/90">
            {isPrime ? 'Contract Trust Engine' : 'Contract Intelligence Engine'}
          </p>
          <h3 className="text-lg font-heading text-white mt-1">Smart contract trust surface</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {isPrime
              ? 'Production contract intelligence across privilege analysis, proxy architecture, behavioral heuristics, and trust scoring.'
              : 'Production-grade smart contract trust intelligence.'}
            {isAlpha ? ' Alpha includes privilege mapping and dependency graph.' : null}
          </p>
        </div>
        <FileSearch className="text-violet-300 shrink-0" size={22} aria-hidden />
      </div>

      {isPrime && quickActions.length ? (
        <div className="flex flex-wrap gap-2">
          {quickActions.map((q) => (
            <button
              key={q.id}
              type="button"
              disabled={busy}
              onClick={() => runAnalyze(q.address)}
              className="prime-contract-quick-chip"
            >
              {q.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className={`grid grid-cols-1 gap-3 ${isPrime ? 'sm:grid-cols-[1fr_9rem]' : 'sm:grid-cols-[1fr_auto]'}`}>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x… contract address"
          className="prime-contract-input rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white font-mono"
        />
        <select
          value={chainId}
          onChange={(e) => setChainId(Number(e.target.value))}
          className="prime-contract-select rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-slate-200"
        >
          {CHAINS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {isAlpha ? (
        <input
          value={related}
          onChange={(e) => setRelated(e.target.value)}
          placeholder="Related contracts (comma-separated)"
          className="w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-xs text-slate-300 font-mono"
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => runAnalyze()} className="explorer-btn-gradient text-sm !py-2 !px-4">
          {busy ? <Loader2 className="animate-spin inline mr-1" size={16} /> : null}
          Analyze contract
        </button>
        <button
          type="button"
          disabled={busy || !address.trim()}
          onClick={() => loadCached(address.trim(), chainId)}
          className="explorer-btn-outline text-sm !py-2 !px-4"
        >
          Load cached
        </button>
      </div>

      {error && !report ? <p className="text-xs text-rose-300">{error}</p> : null}

      {report && report.isContract === false ? (
        <div className="space-y-3 border-t border-white/10 pt-5">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Externally owned account</p>
          {report.aiSummary ? (
            <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-violet-500/40 pl-3">{report.aiSummary}</p>
          ) : null}
          <ul className="space-y-2">
            {(report.findings || []).map((f) => (
              <li key={f.code} className="text-xs text-slate-400">
                <strong className="text-slate-200">{f.title}</strong> — {f.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report?.trustScore != null ? (
        <div className="space-y-4 border-t border-white/10 pt-5">
          <TrustBadge band={report.trustBand} score={report.trustScore} />
          {report.aiSummary ? (
            <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-violet-500/40 pl-3">{report.aiSummary}</p>
          ) : null}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
              <p className="text-slate-500 uppercase tracking-wider text-[9px]">Honeypot</p>
              <p className="text-slate-200 font-medium mt-1">{formatHoneypotLabel(report.honeypotRisk)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
              <p className="text-slate-500 uppercase tracking-wider text-[9px]">Ownership</p>
              <p className="text-slate-200 font-medium mt-1">{formatOwnershipLabel(report.ownershipConcentration)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
              <p className="text-slate-500 uppercase tracking-wider text-[9px]">Proxy</p>
              <p className="text-slate-200 font-medium mt-1">{report.upgradeableProxy ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {(report.findings || []).slice(0, 6).map((f) => (
              <li key={f.code} className="text-xs text-slate-400 flex gap-2">
                <span className="text-violet-400 shrink-0 font-mono">{f.severity}</span>
                <span>
                  <strong className="text-slate-200">{f.title}</strong> — {f.detail}
                </span>
              </li>
            ))}
          </ul>
          {isAlpha && report.functionPrivilegeMap?.length ? (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-3 space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-200/90">Alpha · privilege map</p>
              <ul className="text-xs text-slate-300 space-y-1">
                {report.functionPrivilegeMap.map((row) => (
                  <li key={row.fn}>
                    <span className="font-mono text-cyan-100/90">{row.fn}</span> — {row.risk}
                  </li>
                ))}
              </ul>
              {report.advancedAiBreakdown?.executiveSummary ? (
                <p className="text-xs text-slate-400 leading-relaxed border-t border-white/10 pt-2">
                  {report.advancedAiBreakdown.executiveSummary}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
