import { useRef, useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wallet, ShieldCheck, Link2, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthApi } from '@/hooks/useAuthApi'
import { useWalletRiskIndex, walletRiskBandLabel } from '@/hooks/useWalletRiskIndex.js'
import { postWalletVerify } from '@/utils/walletVerify'
import { formatWalletVerifyError } from '@/utils/walletVerifyErrors.js'
import { useWeb3 } from '@/contexts/Web3Context.jsx'
import { clearExplorerWalletConsoleSkip } from '@/utils/dashboardPersonalization'
import { EXPLORER_UPGRADE_CTA } from '@/constants/intelligenceTiers.js'

/** Wallet panel footer copy by effective membership tier. */
function walletPanelTierMessaging(profile) {
  const tier = profile?.membershipTier || 'EXPLORER_ACCESS'
  if (
    tier === 'STRATEGIC_ACCESS' ||
    profile?.institutionalIntent ||
    profile?.governanceAccessEligible
  ) {
    return {
      mode: 'atlas',
      line1: 'Atlas intelligence active.',
      line2:
        'Team-grade wallet, protocol, and treasury intelligence surfaces are available in this workspace.',
      ctaLabel: 'View Atlas Intelligence',
      ctaTo: '/dashboard#prime-wallet-intelligence',
    }
  }
  if (tier === 'INTELLIGENCE_PRO') {
    return {
      mode: 'prime',
      line1: 'Prime monitoring active.',
      line2:
        'Continuous wallet intelligence, analyst refreshes, scenarios, and alerts are available in this workspace.',
      ctaLabel: 'View Prime Intelligence',
      ctaTo: '/dashboard#prime-wallet-intelligence',
    }
  }
  return {
    mode: 'explorer',
    line1: 'Snapshot-grade insights on Explorer; continuous monitoring unlocks with Prime Intelligence.',
    line2: null,
    ctaLabel: EXPLORER_UPGRADE_CTA,
    ctaTo: '/membership',
  }
}

function shortAddr(a) {
  if (!a || a.length < 10) return a || '—'
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

/** Detects backend reference/offline payload without adding API fields (matches current server summary phrasing). */
function isWalletRiskReferenceMode(data) {
  return Boolean(data?.success && /reference mode/i.test(String(data.summary || '')))
}

/** Title-only rows; drops empty or punctuation-only titles so list stays clean. */
function isRenderableRiskDriverFinding(f) {
  const title = String(f?.title ?? '').trim()
  if (!title) return false
  if (/^[—\-–\u2014\u2013\s]+$/u.test(title)) return false
  return true
}

/** Display-only copy polish for wallet risk driver titles (semantic meaning preserved). */
function displayRiskDriverTitle(raw) {
  const t = String(raw ?? '').trim()
  if (!t) return t
  return t
    .replace(/\bconcentration risk detected\b/gi, 'Concentration exposure detected')
    .replace(/\bvolatility exposure moderate\b/gi, 'Moderate volatility sensitivity')
    .replace(/\bvolatility exposure high\b/gi, 'Elevated volatility sensitivity')
    .replace(/\bvolatility exposure low\b/gi, 'Limited volatility sensitivity')
}

const WALLET_RISK_AUTH_ERRORS = new Set([
  'wallet_risk_auth_missing',
  'missing_bearer_token',
  'empty_token',
  'invalid_token',
])

const WALLET_RISK_UNAVAILABLE_ERRORS = new Set([
  'risk_intel_unavailable',
  'wallet_risk_provider_unavailable',
  'risk_index_failed',
  'network',
])

function getWalletRiskPanelState({ riskLoading, riskData, riskError }) {
  if (riskLoading && !riskData && !riskError) return 'establishing'
  const code = riskError?.error
  if (code && WALLET_RISK_AUTH_ERRORS.has(code)) return 'auth_missing'
  if (code && WALLET_RISK_UNAVAILABLE_ERRORS.has(code)) return 'unavailable'
  if (riskError) return 'unavailable'
  if (riskData && riskData.success !== true && !riskError) return 'unavailable'
  if (riskData?.success && isWalletRiskReferenceMode(riskData)) return 'reference_mode'
  if (riskData?.success) return 'live'
  return 'establishing'
}

export function ExplorerWalletPanel({ profile, onProfileRefresh }) {
  const { api, baseUrl } = useAuthApi()
  const { connectWallet, isConnecting, account, isConnected, signer, chainId } = useWeb3()
  const walletAnchorRef = useRef(null)
  const [walletBusy, setWalletBusy] = useState(false)
  const [walletVerifySyncing, setWalletVerifySyncing] = useState(false)

  const verifiedOnServer = Boolean(profile?.wallets?.some((w) => w.verifiedAt))

  const verifiedWalletKey = useMemo(() => {
    const w = profile?.wallets?.find((x) => x.verifiedAt)
    if (!w?.address || !w.verifiedAt) return null
    return `${String(w.address).toLowerCase()}-${new Date(w.verifiedAt).toISOString()}`
  }, [profile])

  const { data: riskData, loading: riskLoading, error: riskError } = useWalletRiskIndex(api, verifiedWalletKey)

  const walletRiskPanelState = useMemo(
    () => getWalletRiskPanelState({ riskLoading, riskData, riskError }),
    [riskLoading, riskData, riskError],
  )

  const riskDriverFindings = useMemo(() => {
    const raw = riskData?.findings
    if (!Array.isArray(raw) || raw.length === 0) return []
    return raw.filter(isRenderableRiskDriverFinding).slice(0, 4)
  }, [riskData?.findings])

  const walletMessaging = useMemo(() => walletPanelTierMessaging(profile), [profile])

  const scrollToWallet = () => {
    walletAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleVerifyWallet = async () => {
    if (!signer || !account) {
      toast.error('Connect your wallet first')
      scrollToWallet()
      return
    }
    setWalletBusy(true)
    const noncePath = `/api/auth/wallet/nonce?address=${encodeURIComponent(account)}&chainId=${chainId || 11155111}`
    try {
      const nonceRes = await api(noncePath)
      const nonceText = await nonceRes.text()
      let nonceJson
      try {
        nonceJson = JSON.parse(nonceText)
      } catch {
        throw new Error(nonceRes.ok ? 'invalid_nonce_response' : `nonce_http_${nonceRes.status}`)
      }
      if (!nonceRes.ok) throw new Error(nonceJson.error || nonceJson.message || `nonce_failed_${nonceRes.status}`)

      const signature = await signer.signMessage(nonceJson.message)

      const verifyJson = await postWalletVerify(api, {
        address: account,
        signature,
        chainId: chainId || 11155111,
        nonce: nonceJson.nonce,
      })

      toast.success('Wallet verified')
      clearExplorerWalletConsoleSkip()
      setWalletVerifySyncing(true)
      try {
        const fresh = await onProfileRefresh?.()
        if (fresh && !fresh.wallets?.some((w) => w.verifiedAt)) {
          toast.error(
            'Wallet verified on the server, but your session profile has not refreshed yet. Wait a moment and try again, or reload the page.'
          )
        }
      } finally {
        setWalletVerifySyncing(false)
      }
    } catch (e) {
      console.error('[ExplorerWalletPanel walletVerify]', e)
      const msg = e?.message || ''
      const isNetwork =
        e?.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(String(msg))
      if (isNetwork) {
        toast.error(
          `Cannot reach the API (${baseUrl || 'same-origin /api'}). Run the backend or set VITE_BACKEND_URL.`
        )
      } else {
        toast.error(formatWalletVerifyError(msg) || 'Wallet verification failed')
      }
    } finally {
      setWalletBusy(false)
    }
  }

  return (
    <motion.div
      ref={walletAnchorRef}
      id="explorer-wallet-identity"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="explorer-card-premium explorer-card-tight border border-indigo-400/22 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 h-full scroll-mt-28 shadow-[0_0_32px_rgba(79,70,229,0.1)]"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="relative rounded-xl border border-indigo-400/35 bg-indigo-500/[0.13] p-2.5 text-indigo-100 shrink-0 shadow-[0_0_24px_rgba(99,102,241,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]">
          {verifiedOnServer ? (
            <ShieldCheck size={22} className="text-indigo-100 drop-shadow-[0_0_8px_rgba(165,180,252,0.45)]" aria-hidden />
          ) : (
            <Wallet size={22} className="text-indigo-200" aria-hidden />
          )}
        </div>
        <div className="min-w-0 space-y-1.5 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-indigo-300/90 font-mono">
            Wallet Risk Index
          </p>
          {verifiedOnServer ? (
            <>
              {walletRiskPanelState === 'establishing' ? (
                <div className="space-y-2 pt-0.5 min-h-[6rem] max-w-[19rem]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-100/95 flex items-center gap-2">
                    <Loader2 className="animate-spin shrink-0" size={14} aria-hidden />
                    Intelligence standby
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-300 leading-snug">
                    <p>Awaiting live chain telemetry</p>
                    <p className="text-slate-400">Establishing wallet intelligence</p>
                  </div>
                </div>
              ) : null}

              {walletRiskPanelState === 'auth_missing' ? (
                <p className="text-[11px] text-amber-200/85 leading-snug max-w-[18rem] pt-0.5 min-h-[6rem]">
                  Sign in to establish wallet intelligence
                </p>
              ) : null}

              {walletRiskPanelState === 'unavailable' ? (
                <p className="text-[11px] text-amber-200/85 leading-snug max-w-[18rem] pt-0.5 min-h-[6rem]">
                  Risk index temporarily unavailable.
                </p>
              ) : null}

              {walletRiskPanelState === 'reference_mode' ? (
                <div className="space-y-2 pt-0.5 min-h-[6rem] max-w-[19rem]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-100/95">
                    Reference mode
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-300 leading-snug">
                    <p>Baseline established</p>
                    <p className="text-slate-400">Live wallet intelligence initializing</p>
                  </div>
                </div>
              ) : null}

              {walletRiskPanelState === 'live' && riskData?.success ? (
                <div className="space-y-2.5 pt-0.5 min-h-[6rem]">
                  <div className="flex items-end gap-2 flex-wrap">
                    <span className="text-3xl font-heading font-bold text-white tabular-nums tracking-tight">
                      {riskData.score}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono pb-1">/ 100</span>
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200/95">
                    {walletRiskBandLabel(riskData.band)}
                  </p>
                  {riskDriverFindings.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-indigo-200/90 font-mono">
                        Risk Drivers
                      </p>
                      <ul className="space-y-1.5">
                        {riskDriverFindings.map((f) => (
                          <li
                            key={f.code}
                            className="flex gap-2.5 text-[11px] text-slate-200/95 leading-snug pl-0.5"
                          >
                            <span className="text-indigo-400/85 shrink-0 font-medium select-none" aria-hidden>
                              •
                            </span>
                            <span className="min-w-0 text-slate-100/95">{displayRiskDriverTitle(f.title)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {riskData.summary ? (
                    <p className="text-[11px] text-slate-400 leading-relaxed border-l border-indigo-500/25 pl-2.5 max-w-[19rem]">
                      {riskData.summary}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="pt-2 space-y-1 border-t border-white/[0.08] mt-1.5">
                <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-mono">Verified wallet</p>
                <p className="text-xs font-mono text-slate-200 truncate max-w-[18rem]">
                  {profile?.wallets?.find((w) => w.verifiedAt)?.address || profile?.wallets?.[0]?.address}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug max-w-[18rem]">
                Verified wallet continuity across the SureStack Intelligence console.
              </p>
              <p
                className={`text-[10px] leading-relaxed max-w-[18rem] pt-0.5 ${
                  walletMessaging.mode === 'explorer' ? 'text-slate-500' : 'text-indigo-200/90 font-medium'
                }`}
              >
                {walletMessaging.line1}
              </p>
              {walletMessaging.line2 ? (
                <p className="text-[10px] text-slate-500 leading-relaxed max-w-[18rem]">
                  {walletMessaging.line2}
                </p>
              ) : null}
              <Link
                to={walletMessaging.ctaTo}
                className={`mt-2 inline-flex items-center justify-center gap-2 text-[11px] font-semibold !py-2 !px-3.5 w-full sm:w-auto max-w-xs no-underline ${
                  walletMessaging.mode === 'explorer'
                    ? 'explorer-btn-gradient'
                    : 'explorer-btn-outline border-indigo-400/35 text-indigo-100'
                }`}
              >
                {walletMessaging.ctaLabel}
                <ArrowRight size={14} aria-hidden />
              </Link>
              {walletVerifySyncing ? (
                <p className="text-[11px] text-sky-300/90 flex items-center gap-2 pt-1">
                  <Loader2 className="animate-spin shrink-0" size={14} aria-hidden />
                  Syncing…
                </p>
              ) : null}
            </>
          ) : isConnected && account ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/95">Connected</p>
              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500 font-mono">Wallet</p>
              <p className="text-xs font-mono text-slate-300">{shortAddr(account)}</p>
              <p className="text-[11px] text-slate-500 leading-snug max-w-[18rem]">
                Verify this wallet to unlock Wallet Risk Index and continuity across Explorer.
              </p>
              <Link
                to="/membership"
                className="inline-flex mt-2 text-[10px] font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-2"
              >
                {EXPLORER_UPGRADE_CTA}
              </Link>
              {walletVerifySyncing ? (
                <p className="text-[11px] text-sky-300/90 flex items-center gap-2">
                  <Loader2 className="animate-spin shrink-0" size={14} aria-hidden />
                  Syncing…
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Not linked</p>
              <p className="text-[11px] text-slate-500 leading-snug max-w-[18rem]">
                Connect a wallet to calculate exposure.
              </p>
            </>
          )}
          <p className="text-[10px] text-slate-500 leading-snug max-w-[19rem] pt-2 mt-1 border-t border-white/[0.06]">
            Non-custodial: wallet signatures authenticate your SureStack session only. You retain control of your assets;
            SureStack does not move or take custody of funds through verification.
          </p>
        </div>
      </div>
      {!verifiedOnServer && (
        <div className="flex flex-col gap-2 shrink-0 min-w-[10.5rem]">
          {!isConnected || !account ? (
            <button
              type="button"
              onClick={() => connectWallet()}
              disabled={isConnecting}
              className="explorer-btn-outline min-h-[44px] w-full sm:w-auto disabled:opacity-60"
            >
              <Link2 size={16} />
              {isConnecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleVerifyWallet()}
              disabled={walletBusy || walletVerifySyncing}
              className="explorer-btn-gradient min-h-[44px] w-full sm:w-auto"
            >
              {walletBusy || walletVerifySyncing ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Link2 size={16} />
              )}
              {walletBusy ? 'Verifying…' : walletVerifySyncing ? 'Syncing…' : 'Verify wallet'}
            </button>
          )}
          <Link
            to="/onboarding"
            className="explorer-btn-tertiary text-center py-1.5 text-[11px] no-underline"
          >
            Full onboarding
          </Link>
        </div>
      )}
    </motion.div>
  )
}

export function ExplorerIntelligenceAccessPanel() {
  return (
    <motion.div
      id="explorer-intelligence-access"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="explorer-card-premium explorer-card-tight border border-indigo-500/15 flex flex-col h-full scroll-mt-28"
    >
      <p className="text-[10px] uppercase tracking-[0.26em] text-indigo-300/85 font-mono">Intelligence access</p>
      <p className="text-[13px] text-slate-400 mt-2 leading-relaxed flex-1">
        Explorer delivers a credible first intelligence check — verified wallet continuity, orientation, snapshot wallet
        risk, one complimentary AI Wallet Risk Analyst session, and two preset scenarios — without continuous monitoring or the full analyst and
        scenario surface. Prime Intelligence is the flagship upgrade for always-on monitoring, full scenarios, timelines,
        and Alert Center. Still Digital Asset Risk Intelligence — not custody, insurance, brokerage, advisory, or managed
        incident response.{' '}
        <strong className="text-slate-300 font-medium">Founders Pass</strong> remains a separate community credential.
      </p>
      <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-white/[0.06]">
        <Link to="/membership" className="explorer-btn-gradient text-[13px] !py-2.5 !px-4 inline-flex items-center gap-2">
          {EXPLORER_UPGRADE_CTA}
          <ArrowRight size={15} />
        </Link>
        <Link to="/pricing" className="explorer-btn-outline text-[13px] !py-2.5 !px-4 inline-flex items-center">
          Compare tiers
        </Link>
        <Link
          to="/enterprise"
          className="explorer-btn-tertiary text-[13px] !py-2.5 !px-3 inline-flex items-center"
        >
          Request Enterprise Access
        </Link>
      </div>
    </motion.div>
  )
}

export function ExplorerFoundingPanel({ profile, compact = false }) {
  const { api } = useAuthApi()
  const verifiedOnServer = Boolean(profile?.wallets?.some((w) => w.verifiedAt))
  const profileFoundingActive =
    Boolean(profile?.foundingMember) && profile?.founderCredentialStatus === 'ACTIVE'
  const foundingCohort = profile?.foundingCohort || '2026'

  const [fp, setFp] = useState(null)
  const [fpLoading, setFpLoading] = useState(false)
  const [fpError, setFpError] = useState(null)

  const scrollToWallet = () => {
    document.getElementById('explorer-wallet-identity')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (!profile?.id || !verifiedOnServer) {
      setFp(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setFpLoading(true)
      setFpError(null)
      try {
        const r = await api('/api/founders-pass/status')
        const j = await r.json().catch(() => ({}))
        if (!r.ok) {
          if (!cancelled) setFpError(j.message || j.error || 'status_failed')
          return
        }
        if (!cancelled) setFp(j)
      } catch {
        if (!cancelled) setFpError('network')
      } finally {
        if (!cancelled) setFpLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile?.id, verifiedOnServer, api])

  const completedSteps = fp?.completedSteps ?? 0
  const totalSteps = fp?.totalSteps ?? 4
  const apiActive = fp?.status === 'active'
  const cohortBlocked = fp?.activationBlockedReason === 'cohort_full'
  const isActive = apiActive || profileFoundingActive

  const cardTone = isActive
    ? 'border-emerald-500/25 bg-gradient-to-br from-emerald-950/20 via-slate-950/40 to-violet-950/25 ring-1 ring-emerald-500/10'
    : verifiedOnServer
      ? 'border-amber-500/20 bg-gradient-to-br from-amber-950/15 via-slate-950/40 to-violet-950/20'
      : 'border-white/[0.06] bg-slate-950/30'

  return (
    <motion.div
      id="explorer-founders-pass"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className={`explorer-founding-secondary rounded-xl border flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 scroll-mt-28 h-full ${
        compact
          ? 'prime-founding-compact px-2.5 py-2 sm:px-3 sm:py-2.5 max-h-[7.5rem] overflow-hidden'
          : 'px-4 py-3.5 sm:px-5 sm:py-4 gap-4'
      } ${cardTone}`}
    >
      <div className={`min-w-0 flex-1 ${compact ? 'space-y-1' : 'space-y-2'}`}>
        {isActive ? (
          <>
            <div className="flex items-center gap-2">
              <Sparkles className="text-emerald-300 shrink-0" size={compact ? 12 : 16} aria-hidden />
              <h3 className={`font-heading font-semibold text-white tracking-tight ${compact ? 'text-xs' : 'text-sm'}`}>
                Founders Pass Active
              </h3>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-emerald-400/35 bg-emerald-500/[0.12] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-100/95 font-mono">
              Founding Member · {foundingCohort}
            </span>
            <p className={`text-emerald-200/90 leading-snug ${compact ? 'text-[10px]' : 'text-[11px] leading-relaxed'}`}>
              {compact ? 'Founder community access' : 'Private founder access unlocked.'}
            </p>
            {!compact ? (
              <p className="text-[10px] text-slate-500 leading-snug border-t border-white/[0.06] pt-2.5 max-w-md">
                <span className="font-medium text-slate-400">Benefits: </span>
                Early product previews · Founder community · Strategic access
              </p>
            ) : null}
          </>
        ) : !verifiedOnServer ? (
          <>
            <h3 className={`font-heading font-semibold text-slate-100 tracking-tight ${compact ? 'text-xs' : 'text-sm'}`}>
              Founders Pass
            </h3>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-200/90">
              Wallet verification required
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-md">
              Verify your wallet to unlock Founders Pass activation.
            </p>
          </>
        ) : (
          <>
            <h3 className={`font-heading font-semibold text-slate-100 tracking-tight ${compact ? 'text-xs' : 'text-sm'}`}>
              Founders Pass
            </h3>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-violet-200/90">Activation in progress</p>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-md">
              Continue your Founders Pass activation: X follow, community engagement, and private founders access.
            </p>
            {fpLoading && !fp ? (
              <p className="text-[11px] text-slate-500 flex items-center gap-2">
                <Loader2 className="animate-spin shrink-0" size={14} aria-hidden />
                Loading activation status…
              </p>
            ) : null}
            {fpError ? <p className="text-[11px] text-rose-300/85">{fpError}</p> : null}
            {fp && !fpLoading ? (
              <p className="text-[10px] font-mono text-slate-500">
                {completedSteps} of {totalSteps} milestones completed
              </p>
            ) : null}
            {cohortBlocked ? (
              <p className="text-[11px] text-rose-300/85 rounded-md border border-rose-500/20 bg-rose-950/20 px-3 py-2 max-w-md">
                All milestones are satisfied, but capacity for this wave is full. We will notify you if capacity opens.
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className={`flex flex-col shrink-0 ${compact ? 'gap-1 sm:min-w-[8rem]' : 'gap-2 sm:min-w-[11.5rem]'}`}>
        {isActive ? (
          <Link
            to="/founders-pass"
            className="explorer-btn-gradient text-[11px] !py-2 !px-3 inline-flex items-center justify-center gap-1.5 no-underline"
          >
            View Founders Pass Benefits
            <ArrowRight size={14} aria-hidden />
          </Link>
        ) : !verifiedOnServer ? (
          <>
            <button
              type="button"
              onClick={() => {
                toast('Verify your wallet in the panel above.', { duration: 3500 })
                scrollToWallet()
              }}
              className="explorer-btn-gradient text-[11px] !py-2 !px-3 inline-flex items-center justify-center gap-1.5"
            >
              Verify wallet
              <ArrowRight size={14} aria-hidden />
            </button>
            <Link
              to="/founders-pass"
              className="explorer-btn-tertiary text-[10px] text-center py-1.5 no-underline text-slate-500 hover:text-slate-300"
            >
              View Founders Pass details
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/founders-pass"
              className="explorer-btn-gradient text-[11px] !py-2 !px-3 inline-flex items-center justify-center gap-1.5 no-underline"
            >
              Continue Founders Pass
              <ArrowRight size={14} aria-hidden />
            </Link>
            <Link
              to="/founders-pass"
              className="explorer-btn-tertiary text-[10px] text-center py-1.5 no-underline text-slate-500 hover:text-slate-300"
            >
              View program details
            </Link>
          </>
        )}
      </div>
    </motion.div>
  )
}

/** @deprecated Prefer granular panels from Dashboard layout */
export default function ExplorerAcquisitionView({ profile, onProfileRefresh }) {
  return (
    <div className="space-y-5">
      <ExplorerWalletPanel profile={profile} onProfileRefresh={onProfileRefresh} />
      <ExplorerIntelligenceAccessPanel />
      <ExplorerFoundingPanel profile={profile} onProfileRefresh={onProfileRefresh} />
    </div>
  )
}
