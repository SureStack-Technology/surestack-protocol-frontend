import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Shield, LineChart, Bell, FlaskConical, ChevronRight, FileSearch } from 'lucide-react'
import ContractIntelligencePanel from '@/components/dashboard/ContractIntelligencePanel.jsx'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useAuthApi } from '@/hooks/useAuthApi.js'
import { usePrimeWalletIntel } from '@/hooks/usePrimeWalletIntel.js'
import { hasIntelligenceProOrHigher, isExplorerAcquisitionTier } from '@/utils/dashboardPersonalization.js'

function verifiedWalletKeyFromProfile(profile) {
  const w = profile?.wallets?.find((x) => x.verifiedAt)
  if (!w?.address || !w.verifiedAt) return null
  return `${String(w.address).toLowerCase()}-${new Date(w.verifiedAt).toISOString()}`
}

/**
 * Wallet + protocol risk intelligence cockpit — wired to `/api/prime/*` (deterministic scoring + orchestration).
 * @param {'explorer' | 'prime'} variant
 */
const PRIME_MODULE_TABS = [
  { id: 'analyst', label: 'AI Intelligence Brief', icon: Shield },
  { id: 'timeline', label: 'Exposure Timeline', icon: LineChart },
  { id: 'approvals', label: 'Approval Risk Center', icon: Shield },
  { id: 'threats', label: 'Activity Intelligence', icon: Shield },
  { id: 'simulator', label: 'Scenario Stress Lab', icon: FlaskConical },
  { id: 'contracts', label: 'Contract Trust Engine', icon: FileSearch, primeOnly: true },
  { id: 'alerts', label: 'Threat Alerts', icon: Bell },
]

const EXPLORER_MODULE_TABS = [
  { id: 'analyst', label: 'AI analyst', icon: Shield },
  { id: 'timeline', label: 'Health timeline', icon: LineChart },
  { id: 'approvals', label: 'Approvals', icon: Shield },
  { id: 'threats', label: 'Interaction intel', icon: Shield },
  { id: 'simulator', label: 'Scenarios', icon: FlaskConical },
  { id: 'alerts', label: 'Alerts', icon: Bell },
]

export default function PrimeWalletIntelligenceConsole({
  profile,
  variant: variantProp,
  profileLoading,
  profileError,
  onProfileRefresh,
  commandCenterMode = false,
}) {
  const { api } = useAuthApi()
  const inferredVariant = useMemo(() => {
    if (variantProp) return variantProp
    const explorer = isExplorerAcquisitionTier(profile, profileLoading, profileError)
    return explorer ? 'explorer' : 'prime'
  }, [variantProp, profile, profileLoading, profileError])

  const walletKey = useMemo(() => verifiedWalletKeyFromProfile(profile), [profile])

  const {
    timeline,
    timelineLoading,
    timelineErr,
    refetchTimeline,
    alerts,
    unreadAlertCount,
    scenarioCatalog,
    runAnalyst,
    runSimulator,
    fetchApprovals,
    fetchThreatFeed,
  } = usePrimeWalletIntel(api, walletKey)

  const [tab, setTab] = useState('analyst')
  const [analystBusy, setAnalystBusy] = useState(false)
  const [analystPack, setAnalystPack] = useState(null)
  const [simBusy, setSimBusy] = useState(false)
  const [simResult, setSimResult] = useState(null)
  const [approvals, setApprovals] = useState(null)
  const [threats, setThreats] = useState(null)
  const [scenarioId, setScenarioId] = useState('eth_shock_minus_20')

  useEffect(() => {
    if (tab === 'approvals' && walletKey && !approvals?.rows) {
      fetchApprovals().then(({ ok, body }) => {
        if (ok) setApprovals(body)
      })
    }
    if (tab === 'threats' && walletKey) {
      fetchThreatFeed().then(({ ok, body }) => {
        if (ok) setThreats(body)
      })
    }
  }, [tab, walletKey, approvals?.rows, fetchApprovals, fetchThreatFeed])

  const explorerPrimaryScenarios = useMemo(() => {
    const list = scenarioCatalog || []
    const filtered = list.filter((s) => s.explorerUnlocked === true || s.id === 'eth_shock_minus_20' || s.id === 'stablecoin_depeg')
    const seen = new Map()
    for (const s of filtered) {
      if (s?.id) seen.set(s.id, s)
    }
    if (seen.size >= 2) return [...seen.values()]
    return [
      { id: 'eth_shock_minus_20', explorerUnlocked: true },
      { id: 'stablecoin_depeg', explorerUnlocked: true },
    ]
  }, [scenarioCatalog])

  const primeScenarioOptions = useMemo(
    () => [
      { id: 'eth_shock_minus_20' },
      { id: 'stablecoin_depeg' },
      { id: 'protocol_exploit_surface' },
      { id: 'liquidity_fragmentation' },
      { id: 'market_wide_drawdown' },
    ],
    [],
  )

  const scenarioOptionsForSimulator = useMemo(() => {
    if (inferredVariant === 'explorer') return explorerPrimaryScenarios
    if (scenarioCatalog?.length) return scenarioCatalog
    return primeScenarioOptions
  }, [inferredVariant, explorerPrimaryScenarios, scenarioCatalog, primeScenarioOptions])

  useEffect(() => {
    const ids = scenarioOptionsForSimulator.map((s) => s.id).filter(Boolean)
    if (!ids.includes(scenarioId) && ids[0]) {
      setScenarioId(ids[0])
    }
  }, [inferredVariant, scenarioOptionsForSimulator, scenarioId])

  const explorerComplimentaryConsumed = Boolean(profile?.explorerComplimentaryPrimeAnalystConsumed)
  const showContractIntel =
    inferredVariant === 'prime' && hasIntelligenceProOrHigher(profile)

  const headline = commandCenterMode
    ? 'Intelligence modules'
    : inferredVariant === 'explorer'
      ? 'Prime Intelligence preview'
      : 'Prime Wallet Intelligence'

  const moduleTabs = useMemo(() => {
    const base = inferredVariant === 'prime' ? PRIME_MODULE_TABS : EXPLORER_MODULE_TABS
    return base.filter((t) => !t.primeOnly || showContractIntel)
  }, [inferredVariant, showContractIntel])

  if (!walletKey) {
    return null
  }

  const handleAnalyst = async () => {
    setAnalystBusy(true)
    try {
      const { ok, status, body } = await runAnalyst()
      if (!ok) {
        if (status === 402) {
          toast.error(body?.message || 'Complimentary analyst pass already used.')
        } else {
          toast.error(body?.message || body?.error || 'Analyst run failed')
        }
        return
      }
      setAnalystPack(body)
      toast.success('Analyst report generated')
      refetchTimeline(30)
      await onProfileRefresh?.()
    } catch {
      toast.error('Analyst run failed')
    } finally {
      setAnalystBusy(false)
    }
  }

  const handleSim = async () => {
    setSimBusy(true)
    setSimResult(null)
    try {
      const { ok, body } = await runSimulator(scenarioId)
      if (!ok) {
        toast.error(body?.message || body?.error || 'Simulator blocked')
        return
      }
      setSimResult(body?.scenario || null)
    } catch {
      toast.error('Simulator failed')
    } finally {
      setSimBusy(false)
    }
  }

  const lastScores = useMemo(() => {
    const s = timeline?.series
    if (!Array.isArray(s) || s.length === 0) return null
    const last = s[s.length - 1]
    const prev = s.length > 1 ? s[s.length - 2] : null
    return { last, prev }
  }, [timeline?.series])

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="explorer-card-premium explorer-card-tight border border-indigo-400/20 shadow-[0_0_40px_rgba(79,70,229,0.12)] space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-xl border border-indigo-400/35 bg-indigo-500/[0.13] p-2.5 text-indigo-100 shrink-0">
            <Shield size={20} aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-indigo-300/90 font-mono">{headline}</p>
            {!commandCenterMode ? (
              <p className="text-xs text-slate-400 leading-snug max-w-2xl">
                Deterministic scoring with structured AI narrative. SureStack does not move funds or revoke approvals —
                intelligence only.
              </p>
            ) : (
              <p className="text-xs text-slate-500 leading-snug max-w-2xl">
                Deep modules — brief, timeline, approvals, activity, scenarios, contracts, and alerts.
              </p>
            )}
          </div>
        </div>
        {inferredVariant === 'explorer' ? (
          <Link
            to="/membership"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-200 hover:text-white shrink-0"
          >
            Unlock Prime <ChevronRight size={14} aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-[0.18em]">
        {moduleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition ${
              tab === t.id
                ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-50'
                : 'border-white/10 bg-black/20 text-slate-400 hover:text-slate-200'
            }`}
          >
            <t.icon size={12} aria-hidden />
            {t.id === 'alerts' && unreadAlertCount ? `${t.label} (${unreadAlertCount})` : t.label}
          </button>
        ))}
      </div>
      {tab === 'analyst' ? (
        <div className="space-y-3 text-sm text-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={analystBusy || (inferredVariant === 'explorer' && explorerComplimentaryConsumed)}
              onClick={handleAnalyst}
              className="explorer-btn-primary text-[11px] !py-2 !px-4 inline-flex items-center gap-2 disabled:opacity-60"
            >
              {analystBusy ? <Loader2 className="animate-spin" size={14} /> : null}
              {inferredVariant === 'explorer'
                ? explorerComplimentaryConsumed
                  ? 'Complimentary analyst redeemed'
                  : 'Run complimentary analyst'
                : 'Refresh analyst report'}
            </button>
            <p className="text-[11px] text-slate-500 max-w-md">
              {inferredVariant === 'explorer'
                ? explorerComplimentaryConsumed
                  ? 'Upgrade to Prime Intelligence for continuous analyst refreshes and full scenario coverage.'
                  : 'Includes one lifetime structured report for Explorer. Prime enables continuous refresh cadence.'
                : 'Refreshes deterministic intelligence and narrative using current chain snapshot inputs.'}
            </p>
          </div>
          {analystPack?.analyst ? (
            <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-3">
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono">Wallet risk score</p>
                  <p className="text-2xl font-heading text-white">{analystPack.analyst.score} / 100</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono">Band</p>
                  <p className="text-lg text-indigo-100 font-mono">{analystPack.analyst.band}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono mb-1.5">Key findings</p>
                <ul className="space-y-1.5 text-[13px] text-slate-300">
                  {(analystPack.analyst.keyFindings || []).slice(0, 6).map((f) => (
                    <li key={`${f.code}-${f.title}`}>
                      <span className="text-slate-100 font-medium">{f.title}</span>
                      <span className="text-slate-500"> — {f.severity}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {analystPack.analyst.narrative ? (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono mb-1">AI narrative</p>
                  <p className="text-[13px] text-slate-300 leading-relaxed">{analystPack.analyst.narrative}</p>
                </div>
              ) : (
                <p className="text-[12px] text-slate-500">Narrative unavailable (configure OpenAI or internal AI service).</p>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-slate-500">Run the analyst to materialize a structured intelligence pack.</p>
          )}
        </div>
      ) : null}

      {tab === 'timeline' ? (
        <div className="space-y-2 text-sm text-slate-200">
          {timelineLoading ? (
            <p className="text-[12px] text-slate-500 inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} /> Loading timeline…
            </p>
          ) : null}
          {timelineErr ? <p className="text-[12px] text-amber-200/90">{timelineErr}</p> : null}
          {lastScores?.last ? (
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-slate-300">
              Latest score {lastScores.last.score} ({lastScores.last.band})
              {lastScores.prev ? (
                <span className="text-slate-500">
                  {' '}
                  — prior {lastScores.prev.score} (
                  {lastScores.last.score - lastScores.prev.score >= 0 ? '+' : ''}
                  {lastScores.last.score - lastScores.prev.score})
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {(timeline?.feed || []).slice(-12).map((row, idx) => (
              <div key={`${row.at}-${idx}`} className="rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2">
                <p className="text-[10px] text-slate-500 font-mono">{new Date(row.at).toLocaleString()}</p>
                {(row.events || []).map((ev) => (
                  <p key={`${ev.label}-${ev.detail}`} className="text-[12px] text-slate-300">
                    <span className="text-slate-100">{ev.label}:</span> {ev.detail}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'approvals' ? (
        <div className="space-y-2 text-[12px] text-slate-300 max-h-64 overflow-y-auto">
          {(approvals?.rows || []).length === 0 ? (
            <p className="text-slate-500">Pulling allowance inventory requires live chain telemetry.</p>
          ) : (
            approvals.rows.map((r) => (
              <div key={`${r.token}-${r.spender}`} className="rounded-lg border border-white/[0.06] px-3 py-2 bg-black/15">
                <p className="text-slate-100 font-medium">
                  Token {String(r.token).slice(0, 8)}… → spender {String(r.spender).slice(0, 8)}…
                </p>
                <p className="text-slate-400">
                  {r.unlimited ? 'Unlimited allowance' : 'Finite allowance'} · {r.spenderCategory} · {r.riskLevel}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{r.recommendation}</p>
              </div>
            ))
          )}
          {approvals?.stats?.upgradeNote ? (
            <p className="text-[11px] text-indigo-200/85">{approvals.stats.upgradeNote}</p>
          ) : null}
        </div>
      ) : null}

      {tab === 'threats' ? (
        <div className="space-y-2 text-[12px] text-slate-300 max-h-64 overflow-y-auto">
          {(threats?.items || []).length === 0 ? (
            <p className="text-slate-500">
              No elevated interaction drivers at this snapshot tier — intelligence updates as exposures surface.
            </p>
          ) : (
            threats.items.map((item) => (
              <div key={`${item.code}-${item.title}`} className="rounded-lg border border-white/[0.06] px-3 py-2 bg-black/15">
                <p className="text-slate-100">{item.title}</p>
                <p className="text-slate-500 text-[11px]">{item.detail}</p>
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === 'simulator' ? (
        <div className="space-y-3 text-sm text-slate-200">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Synthetic deterministic scenarios layered on sampled wallet exposures — illustrative only, not financial advice.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[12px] text-slate-100"
            >
              {scenarioOptionsForSimulator.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={simBusy}
              onClick={handleSim}
              className="explorer-btn-tertiary text-[11px] !py-1.5 inline-flex items-center gap-2 disabled:opacity-60"
            >
              {simBusy ? <Loader2 className="animate-spin" size={14} /> : null}
              Run scenario
            </button>
          </div>
          {simResult ? (
            <div className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-2 text-[13px] text-slate-300">
              <p className="text-slate-100 font-semibold">{simResult.title}</p>
              <p className="text-indigo-100 font-mono text-xs">{simResult.band.replaceAll('_', ' ')} · impact idx {simResult.impactPoints}</p>
              <p className="leading-relaxed">{simResult.rationale}</p>
              <ul className="text-[11px] text-slate-500 space-y-1 list-disc ml-4">
                {(simResult.disclaimers || []).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'contracts' && showContractIntel ? (
        <ContractIntelligencePanel
          api={api}
          profile={profile}
          variant={inferredVariant}
          lastInteractedAddress={
            approvals?.rows?.[0]?.spender || approvals?.rows?.[0]?.token || null
          }
          walletAddress={profile?.wallets?.find((w) => w.verifiedAt)?.address || null}
        />
      ) : null}
      {tab === 'alerts' ? (
        <div className="space-y-2 text-[12px] text-slate-300 max-h-64 overflow-y-auto">
          {(alerts || []).length === 0 ? (
            <p className="text-slate-500">No in-app alerts yet — they appear when posture shifts materially.</p>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border px-3 py-2 ${
                  a.read ? 'border-white/[0.04] bg-black/10 opacity-70' : 'border-amber-500/25 bg-amber-500/5'
                }`}
              >
                <p className="text-slate-100 flex items-center justify-between gap-2">
                  {a.title}
                  <span className="text-[10px] font-mono text-slate-500">{a.severity}</span>
                </p>
                <p className="text-slate-500 text-[11px]">{new Date(a.createdAt).toLocaleString()}</p>
                <p className="mt-1 text-slate-400">{a.detail}</p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </motion.section>
  )
}
