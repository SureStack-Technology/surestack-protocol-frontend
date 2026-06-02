import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ClipboardCheck,
  FileSearch,
  Layers,
  Shield,
  Wallet,
} from 'lucide-react'
import { isLiveLunarCrushStatus } from '@/data/lunarCrushScenarioShowcase.js'
import { walletRiskBandLabel } from '@/hooks/useWalletRiskIndex.js'

const DISCLAIMER =
  'Decision Intelligence is educational risk support only. SureStack does not provide financial advice, trading recommendations, custody, or transaction execution.'

const CHAINS = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'solana', label: 'Solana' },
  { id: 'base', label: 'Base' },
  { id: 'arbitrum', label: 'Arbitrum' },
  { id: 'polygon', label: 'Polygon' },
]

const INTERACTION_ACTIONS = [
  { id: 'analyze_token', label: 'Analyze Token', icon: Layers },
  { id: 'review_contract', label: 'Review Contract', icon: FileSearch },
  { id: 'check_wallet_exposure', label: 'Check Wallet Exposure', icon: Wallet },
  { id: 'review_approval', label: 'Review Approval / Spender', icon: ClipboardCheck },
]

const INTERACTION_LABELS = {
  analyze_token: 'Token',
  review_contract: 'Contract',
  check_wallet_exposure: 'Wallet Exposure',
  review_approval: 'Approval / Spender',
}

const RISK_LEVELS = ['Low', 'Moderate', 'High', 'Critical']
const RISK_INDEX = Object.fromEntries(RISK_LEVELS.map((l, i) => [l, i]))

function exposurePhrase(band) {
  return walletRiskBandLabel(band).toLowerCase()
}

function normalizeTargetInput(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''
  try {
    if (trimmed.startsWith('http')) {
      const url = new URL(trimmed)
      const path = url.pathname.replace(/\/$/, '')
      const segment = path.split('/').filter(Boolean).pop()
      return segment || trimmed
    }
  } catch {
    /* keep raw */
  }
  return trimmed
}

function narrativeContext(primeTrends) {
  if (isLiveLunarCrushStatus(primeTrends?.status)) {
    return 'Live narrative feed active.'
  }
  if (primeTrends?.status === 'fallback' || primeTrends) {
    return 'Narrative intelligence model active — live narrative feed pending.'
  }
  return 'Narrative provider pending.'
}

function behaviorContext(watchlist) {
  if (watchlist?.status === 'live') {
    return 'Live behavior feed active.'
  }
  return 'Birdeye behavior layer has partial provider coverage; live feed pending.'
}

function contractTrustCopy(contractsUnderReview, hasWallet) {
  if (!hasWallet) {
    return 'Run Universal Risk Scanner before signing.'
  }
  if (contractsUnderReview > 0) {
    return `${contractsUnderReview} contract surface(s) under review — validate bytecode and admin controls in scanner.`
  }
  return 'Scanner ready — no contracts flagged in current wallet snapshot.'
}

function walletFitCopy(intel) {
  if (!intel?.hasWallet) {
    return 'No verified wallet linked. Connect and verify a wallet to assess fit against current exposure.'
  }
  const score = Number.isFinite(Number(intel?.score)) ? Math.round(Number(intel.score)) : null
  const band = intel?.band
  if (score != null && band) {
    return `Wallet currently shows ${exposurePhrase(band)} (${score} / 100). New interaction should be reviewed against concentration and approval risk.`
  }
  if (band) {
    return `Wallet currently shows ${exposurePhrase(band)}. New interaction should be reviewed against concentration and approval risk.`
  }
  return 'Wallet risk snapshot pending — refresh wallet intelligence before increasing exposure.'
}

function bumpRisk(level) {
  const idx = Math.min(RISK_LEVELS.length - 1, (RISK_INDEX[level] ?? 1) + 1)
  return RISK_LEVELS[idx]
}

function baseRiskFromBand(band) {
  const b = String(band || '').toUpperCase()
  if (b === 'LOW') return 'Low'
  if (b === 'MODERATE') return 'Moderate'
  if (b === 'ELEVATED' || b === 'HIGH') return 'High'
  if (b === 'CRITICAL') return 'Critical'
  return 'Moderate'
}

function deriveDecisionRisk({ band, interactionType, hasWallet, contractsUnderReview, lunarLive, birdeyeLive }) {
  let level = hasWallet ? baseRiskFromBand(band) : 'Moderate'
  if (interactionType === 'review_contract' || interactionType === 'review_approval') {
    level = bumpRisk(level)
  }
  if (contractsUnderReview > 0) {
    level = bumpRisk(level)
  }
  if (!lunarLive || !birdeyeLive) {
    if (level === 'Low') level = 'Moderate'
  }
  if (interactionType === 'check_wallet_exposure' && (band === 'HIGH' || band === 'CRITICAL' || band === 'ELEVATED')) {
    level = 'Critical'
  }
  return level
}

function buildNextSteps({
  interactionType,
  lunarLive,
  birdeyeLive,
  hasWallet,
  contractsUnderReview,
  hasTarget,
}) {
  const steps = ['Run Universal Risk Scanner']
  if (interactionType === 'review_approval' || interactionType === 'review_contract') {
    steps.push('Review approval permissions', 'Avoid unlimited approvals')
  }
  if (interactionType === 'analyze_token') {
    steps.push('Verify official protocol URL')
  }
  if (!birdeyeLive) {
    steps.push('Check liquidity and holder concentration once Birdeye feed is active')
  } else {
    steps.push('Review liquidity and holder concentration in behavior panel')
  }
  if (!lunarLive) {
    steps.push('Monitor narrative/behavior divergence once provider feeds are live')
  }
  if (contractsUnderReview > 0) {
    steps.push('Resolve flagged contract surfaces before signing')
  }
  if (!hasWallet) {
    steps.push('Verify wallet before pre-interaction review')
  }
  if (hasTarget && interactionType === 'review_contract') {
    steps.push('Compare target address against official deployment records')
  }
  return [...new Set(steps)]
}

function buildStatusChips({ lunarLive, birdeyeLive, contractsUnderReview }) {
  const chips = []
  if (lunarLive) chips.push({ label: 'Live', tone: 'live' })
  else chips.push({ label: 'Narrative Model', tone: 'showcase' })
  if (birdeyeLive) chips.push({ label: 'Live', tone: 'live' })
  else chips.push({ label: 'Provider Pending', tone: 'pending' })
  if (contractsUnderReview > 0) {
    chips.push({ label: 'Scanner Recommended', tone: 'scanner' })
  }
  return chips
}

function BriefSection({ title, children }) {
  return (
    <div className="prime-decision-brief__section">
      <p className="prime-decision-brief__section-title">{title}</p>
      <div className="prime-decision-brief__section-body">{children}</div>
    </div>
  )
}

function StatusChip({ label, tone }) {
  return <span className={`prime-decision-chip prime-decision-chip--${tone}`}>{label}</span>
}

function riskLevelClass(level) {
  if (level === 'Critical') return 'prime-decision-risk--critical'
  if (level === 'High') return 'prime-decision-risk--high'
  if (level === 'Moderate') return 'prime-decision-risk--moderate'
  return 'prime-decision-risk--low'
}

/**
 * Pre-interaction decision support — local deterministic brief from Prime state (no new APIs).
 */
export default function DecisionIntelligenceWorkbench({ intel, primeTrends, watchlist }) {
  const [interactionType, setInteractionType] = useState('analyze_token')
  const [chain, setChain] = useState('ethereum')
  const [targetInput, setTargetInput] = useState('')
  const [brief, setBrief] = useState(null)

  const lunarLive = isLiveLunarCrushStatus(primeTrends?.status)
  const birdeyeLive = watchlist?.status === 'live'
  const contractsUnderReview = intel?.contractsUnderReview ?? 0

  const handleGenerate = () => {
    const target = normalizeTargetInput(targetInput)
    const interactionLabel = INTERACTION_LABELS[interactionType] || 'Target'
    const decisionRisk = deriveDecisionRisk({
      band: intel?.band,
      interactionType,
      hasWallet: intel?.hasWallet,
      contractsUnderReview,
      lunarLive,
      birdeyeLive,
    })

    setBrief({
      generatedAt: new Date().toISOString(),
      target: target || 'No target entered — brief uses wallet and module readiness only.',
      chain: CHAINS.find((c) => c.id === chain)?.label || chain,
      interactionType: interactionLabel,
      walletFit: walletFitCopy(intel),
      contractTrust: contractTrustCopy(contractsUnderReview, intel?.hasWallet),
      narrative: narrativeContext(primeTrends),
      behavior: behaviorContext(watchlist),
      decisionRisk,
      nextSteps: buildNextSteps({
        interactionType,
        lunarLive,
        birdeyeLive,
        hasWallet: intel?.hasWallet,
        contractsUnderReview,
        hasTarget: Boolean(target),
      }),
      chips: buildStatusChips({ lunarLive, birdeyeLive, contractsUnderReview }),
    })
  }

  const scrollToScanner = () => {
    document.getElementById('prime-risk-scanner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeAction = useMemo(
    () => INTERACTION_ACTIONS.find((a) => a.id === interactionType) || INTERACTION_ACTIONS[0],
    [interactionType],
  )

  return (
    <motion.section
      id="prime-decision-workbench"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="prime-glass prime-decision-workbench p-6 sm:p-7 border border-indigo-500/30 prime-panel-hover scroll-mt-28"
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-indigo-200/90 flex items-center gap-2">
            <Shield size={14} aria-hidden />
            Pre-Interaction Risk Intelligence
          </p>
          <h2 className="text-lg sm:text-xl font-heading text-white">Decision Intelligence Workbench</h2>
          <p className="text-[11px] sm:text-sm text-slate-400 leading-relaxed">
            Evaluate tokens, contracts, spenders, or protocols before you interact.
          </p>
          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
            Decision support · not a trade signal
          </p>
        </div>
      </div>

      <div className="prime-decision-workbench__actions" role="tablist" aria-label="Interaction type">
        {INTERACTION_ACTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={interactionType === id}
            onClick={() => setInteractionType(id)}
            className={`prime-decision-workbench__action ${
              interactionType === id ? 'prime-decision-workbench__action--active' : ''
            }`}
          >
            <Icon size={14} aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4">
        <label className="md:col-span-7 flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">
            Token / contract / spender / protocol
          </span>
          <input
            type="text"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="Address or official URL"
            className="prime-decision-workbench__input"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="md:col-span-3 flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Chain</span>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="prime-decision-workbench__select"
          >
            {CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2 flex items-end">
          <button type="button" onClick={handleGenerate} className="prime-decision-workbench__cta w-full">
            Generate Risk Brief
          </button>
        </div>
      </div>

      {brief ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="prime-decision-brief mt-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-4 border-b border-white/[0.08]">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-200/90">
                Risk intelligence brief
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                {activeAction.label} · {brief.chain}
                {brief.target ? ` · ${brief.target.slice(0, 42)}${brief.target.length > 42 ? '…' : ''}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {brief.chips.map((chip) => (
                <StatusChip key={`${chip.label}-${chip.tone}`} label={chip.label} tone={chip.tone} />
              ))}
            </div>
          </div>

          <div className="prime-decision-brief__grid">
            <BriefSection title="1. Interaction Type">
              <p>{brief.interactionType}</p>
            </BriefSection>
            <BriefSection title="2. Wallet Fit">
              <p>{brief.walletFit}</p>
            </BriefSection>
            <BriefSection title="3. Contract Trust">
              <p>{brief.contractTrust}</p>
            </BriefSection>
            <BriefSection title="4. Narrative Context">
              <p>{brief.narrative}</p>
            </BriefSection>
            <BriefSection title="5. On-Chain Behavior Context">
              <p>{brief.behavior}</p>
            </BriefSection>
            <BriefSection title="6. Decision Risk Summary">
              <p className={`prime-decision-risk ${riskLevelClass(brief.decisionRisk)}`}>
                {brief.decisionRisk}
              </p>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Derived from wallet index readiness and module status — not live token pricing.
              </p>
            </BriefSection>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.08]">
            <p className="prime-decision-brief__section-title mb-2">7. Recommended Next Steps</p>
            <ul className="prime-decision-brief__steps">
              {brief.nextSteps.map((step) => (
                <li key={step}>
                  {step === 'Run Universal Risk Scanner' ? (
                    <button type="button" onClick={scrollToScanner} className="prime-decision-brief__step-link">
                      → {step}
                    </button>
                  ) : (
                    <span>→ {step}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed mt-4 border border-white/10 rounded-xl px-4 py-3 bg-black/25 flex gap-2">
            <AlertTriangle size={14} className="text-amber-300/80 shrink-0 mt-0.5" aria-hidden />
            <span>{DISCLAIMER}</span>
          </p>
        </motion.div>
      ) : null}
    </motion.section>
  )
}
