import { useMemo, useState, useCallback, useEffect } from 'react'
import { Loader2, Radar, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { SOLANA_CHAIN_ID, useUniversalRiskScanner } from '@/hooks/useUniversalRiskScanner.js'
import { buildUniversalRiskScanView } from '@/utils/universalRiskScannerFormat.js'
import WalletExposurePanel from '@/components/dashboard/prime/WalletExposurePanel.jsx'
import {
  computeClientWalletExposure,
  resolveWalletExposurePanelStatus,
} from '@/utils/walletExposureClient.js'
import { markLocalAlchemyBackoff } from '@/utils/approvalInventoryLocalCache.js'

const EVM_CHAINS = [
  { id: 1, label: 'Ethereum' },
  { id: 8453, label: 'Base' },
  { id: 42161, label: 'Arbitrum' },
  { id: 10, label: 'Optimism' },
  { id: 137, label: 'Polygon' },
]

const CHAINS = [...EVM_CHAINS, { id: SOLANA_CHAIN_ID, label: 'Solana' }]

const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3'
const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

const EVM_SCAN_MODES = [
  { id: 'contract', label: 'Contract Address' },
  { id: 'token', label: 'Token Address' },
  { id: 'spender', label: 'Wallet / Spender' },
  { id: 'protocol', label: 'Protocol URL', disabled: true, hint: 'Coming soon' },
]

const SOLANA_SCAN_MODES = [
  { id: 'token', label: 'Token Mint' },
  { id: 'contract', label: 'Program' },
  { id: 'spender', label: 'Wallet / Account' },
]

const EVM_ZERO_EXAMPLES = [
  'Check a new token before buying',
  'Analyze a spender before approving',
  'Review a contract before interacting',
]

const SOLANA_ZERO_EXAMPLES = [
  'Check an SPL token mint before swapping',
  'Analyze a Solana program before signing',
  'Review a wallet address before sending funds',
]

/**
 * Prime Universal Risk Scanner — EVM contract intel + Solana risk paths.
 */
export default function UniversalRiskScanner({
  api,
  scanner: scannerProp,
  lastInteractedAddress = null,
  walletAddress = null,
  walletCacheKey = null,
  approvalInventory = null,
  showWalletExposure = false,
  prefillAddress = null,
}) {
  const internalScanner = useUniversalRiskScanner(api)
  const { report, busy, error, analyze, clearScan } = scannerProp ?? internalScanner
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState(1)
  const [scanMode, setScanMode] = useState('contract')
  const [instantExposure, setInstantExposure] = useState(null)

  useEffect(() => {
    const addr = String(prefillAddress || '').trim()
    if (!addr) return
    setAddress(addr)
    if (chainId !== SOLANA_CHAIN_ID && /^0x[a-fA-F0-9]{40}$/i.test(addr)) {
      setScanMode('contract')
    }
  }, [prefillAddress, chainId])

  const isSolana = chainId === SOLANA_CHAIN_ID

  const scanModes = isSolana ? SOLANA_SCAN_MODES : EVM_SCAN_MODES
  const zeroExamples = isSolana ? SOLANA_ZERO_EXAMPLES : EVM_ZERO_EXAMPLES

  const handleChainChange = (value) => {
    setInstantExposure(null)
    clearScan()
    if (value === SOLANA_CHAIN_ID) {
      setChainId(SOLANA_CHAIN_ID)
      setScanMode('token')
    } else {
      setChainId(Number(value))
      setScanMode('contract')
    }
  }

  const runAnalyze = useCallback(
    async (addrOverride) => {
      const addr = (addrOverride || address).trim()
      if (!addr) {
        toast.error('Paste an address to analyze')
        return
      }
      if (addrOverride) setAddress(addr)

      const inventoryMatchesScan =
        showWalletExposure &&
        !isSolana &&
        approvalInventory?.rows?.length &&
        Number(approvalInventory.chainId ?? 1) === Number(chainId)

      const inventoryForScan = inventoryMatchesScan ? approvalInventory : null

      if (inventoryMatchesScan) {
        const instant = computeClientWalletExposure(approvalInventory.rows, addr)
        setInstantExposure({
          ...instant,
          inventoryStale: Boolean(approvalInventory.inventoryStale),
          rateLimited: Boolean(approvalInventory.rateLimited),
        })
      } else {
        setInstantExposure(null)
      }

      const { ok, error: scanError, body } = await analyze({
        address: addr,
        chainId,
        approvalInventory: inventoryForScan,
      })
      if (body?.walletExposure?.status === 'rate_limited') {
        const cacheId = walletCacheKey || walletAddress?.toLowerCase()
        if (cacheId) markLocalAlchemyBackoff(cacheId, chainId)
      }
      if (ok) toast.success('Risk scan complete')
      else toast.error(scanError || 'Risk scan could not complete. Please try again.')
    },
    [
      address,
      analyze,
      approvalInventory,
      chainId,
      isSolana,
      showWalletExposure,
      walletAddress,
      walletCacheKey,
    ],
  )

  const view = report
    ? buildUniversalRiskScanView(report, scanMode, {
        approvalRows: isSolana ? [] : approvalInventory?.rows || [],
        scannedAddress: address.trim(),
      })
    : null

  const quickActions = useMemo(() => {
    if (isSolana) {
      return [{ id: 'usdc', label: 'Analyze Solana USDC mint', address: SOLANA_USDC_MINT }]
    }
    return [
      { id: 'uniswap', label: 'Analyze Uniswap Router', address: UNISWAP_V3_ROUTER },
      { id: 'permit2', label: 'Analyze Permit2', address: PERMIT2 },
      lastInteractedAddress
        ? { id: 'recent', label: 'Analyze recent interaction target', address: lastInteractedAddress }
        : null,
      walletAddress && !lastInteractedAddress
        ? { id: 'wallet', label: 'Analyze connected wallet', address: walletAddress }
        : null,
    ].filter(Boolean)
  }, [isSolana, lastInteractedAddress, walletAddress])

  const inputPlaceholder = isSolana
    ? 'Paste Solana token mint, program, or wallet address'
    : 'Paste contract, token, wallet, or spender address'

  return (
    <div className="prime-risk-scanner explorer-card-premium border border-violet-500/25 rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-violet-300/90">
            Prime · Pre-Interaction Intelligence
          </p>
          <h3 className="text-lg font-heading text-white mt-1">Universal Risk Scanner</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Analyze any token, contract, spender, or protocol before signing or approving. Intelligence only — SureStack
            never moves funds or revokes approvals.
          </p>
        </div>
        <Radar className="text-violet-300 shrink-0" size={22} aria-hidden />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Scan target type">
        {scanModes.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={m.disabled || busy}
            title={m.hint}
            onClick={() => !m.disabled && setScanMode(m.id)}
            className={`prime-scanner-mode-chip ${scanMode === m.id ? 'prime-scanner-mode-chip--active' : ''} ${
              m.disabled ? 'prime-scanner-mode-chip--disabled' : ''
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-3">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={inputPlaceholder}
          className="prime-contract-input rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white font-mono w-full"
        />
        <select
          value={String(chainId)}
          onChange={(e) => handleChainChange(e.target.value)}
          className="prime-contract-select rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-slate-200"
        >
          {CHAINS.map((c) => (
            <option key={String(c.id)} value={String(c.id)}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => runAnalyze()}
          className="explorer-btn-gradient text-sm !py-2.5 !px-5 inline-flex items-center gap-2"
        >
          {busy ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Shield size={16} aria-hidden />}
          Analyze Risk
        </button>
      </div>

      {quickActions.length ? (
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

      {error && !report ? <p className="text-xs text-rose-300">{error}</p> : null}

      {!report && !busy ? (
        <div className="prime-scanner-zero border border-dashed border-violet-500/25 rounded-xl p-6 text-center space-y-4">
          <p className="text-sm font-heading text-slate-200">Know the risk before you sign.</p>
          <ul className="text-xs text-slate-500 space-y-2 max-w-md mx-auto">
            {zeroExamples.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {view ? (
        <div className="space-y-5 border-t border-white/10 pt-5">
          <div className={`prime-scanner-verdict ${view.verdictTone}`}>
            <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-slate-400 mb-2">Risk verdict</p>
            <p className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">{view.verdict}</p>
            {view.verdictSubtitle ? (
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-400 mt-2 max-w-xl">
                {view.verdictSubtitle}
              </p>
            ) : null}
            {view.trustScore != null ? (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-slate-300 font-mono tabular-nums">
                  Trust Score: <span className="text-white font-semibold">{view.trustScore}</span> / 100
                </p>
                {view.confidence?.band ? (
                  <p className="text-sm text-slate-400 font-mono tabular-nums">
                    Confidence:{' '}
                    <span className="text-slate-200 font-semibold">{view.confidence.band}</span>
                  </p>
                ) : null}
                {view.confidence?.helperText ? (
                  <p className="text-xs text-slate-500 leading-relaxed max-w-lg">{view.confidence.helperText}</p>
                ) : null}
              </div>
            ) : null}
            <p className="prime-scanner-recommendation mt-3">{view.recommendation}</p>
          </div>

          {showWalletExposure && !isSolana ? (
            <WalletExposurePanel
              walletExposure={report?.walletExposure ?? instantExposure}
              exposureStatus={resolveWalletExposurePanelStatus(
                approvalInventory,
                report?.walletExposure ?? instantExposure,
                busy,
                chainId,
              )}
              hasWallet={Boolean(walletAddress)}
            />
          ) : null}

          {view.narrative ? (
            <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-violet-500/40 pl-3">{view.narrative}</p>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {view.intelligence.map((row) => (
              <div key={row.label} className="prime-scanner-intel-row rounded-lg border border-white/10 bg-slate-950/50 p-3">
                <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500">{row.label}</p>
                <p className="text-[12px] text-slate-200 font-medium mt-1 leading-snug">{row.value}</p>
              </div>
            ))}
          </div>

          {view.findings?.length ? (
            <ul className="space-y-2 border-t border-white/[0.06] pt-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Key findings</p>
              {view.findings.slice(0, 5).map((f) => (
                <li key={f.code} className="text-xs text-slate-400 flex gap-2">
                  <span className="text-violet-400 shrink-0 font-mono text-[10px]">{f.severity}</span>
                  <span>
                    <strong className="text-slate-200">{f.title}</strong> — {f.detail}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
