import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import ExplorerIntelligenceBackdrop from '@/components/dashboard/ExplorerIntelligenceBackdrop.jsx'
import ExplorerReferenceBar from '@/components/dashboard/ExplorerReferenceBar.jsx'
import PrimeIntelligenceHero from '@/components/dashboard/prime/PrimeIntelligenceHero.jsx'
import PreInteractionIntelligenceTerminal from '@/components/dashboard/prime/PreInteractionIntelligenceTerminal.jsx'
import { ExplorerFoundingPanel } from '@/components/dashboard/ExplorerAcquisitionView.jsx'
import { usePrimeCommandCenter } from '@/hooks/usePrimeCommandCenter.js'
import { useUniversalRiskScanner } from '@/hooks/useUniversalRiskScanner.js'
import { useLunarCrushIntel } from '@/hooks/useLunarCrushIntel.js'
import { useBirdeyeIntel } from '@/hooks/useBirdeyeIntel.js'
import { hasIntelligenceProOrHigher } from '@/utils/dashboardPersonalization.js'
import { buildPrimeWalletSnapshot } from '@/components/dashboard/prime/primeWalletRiskSnapshot.js'
import { deriveScannerSignals } from '@/components/dashboard/prime/primeVerdictEngine.js'
import {
  computePrimeScannerScope,
  isScannerReportInScope,
} from '@/components/dashboard/prime/primeScannerScope.js'
import { buildUniversalRiskScanView } from '@/utils/universalRiskScannerFormat.js'
import { PRIME_INTELLIGENCE_DISCLAIMER } from '@/constants/complianceCopy.js'
import '@/styles/prime-command-center.css'

export default function PrimeCommandCenter({ profile, profileLoading, profileError, refetchProfile }) {
  const intel = usePrimeCommandCenter(profile)
  const scannerHook = useUniversalRiskScanner(intel.api)
  const lunar = useLunarCrushIntel({ profile })
  const birdeye = useBirdeyeIntel({ profile })
  const hasVerifiedWallet = Boolean(profile?.wallets?.some((w) => w.verifiedAt))
  const showRiskScanner = hasVerifiedWallet && hasIntelligenceProOrHigher(profile)

  const contractsUnderReview = intel.heroChips.find((c) => c.key === 'contracts')?.raw ?? 0
  const approvalsAtRisk = intel.heroChips.find((c) => c.key === 'approvals')?.raw ?? 0
  const approvalRows = intel.approvals?.rows || []

  const walletSnapshot = useMemo(
    () =>
      buildPrimeWalletSnapshot({
        score: intel.score,
        band: intel.band,
        hasWallet: intel.hasWallet,
        riskFromApi: intel.riskFromApi,
        assessmentPending: intel.assessmentPending,
        exposureProvenance: intel.riskData?.exposureIntelligence?.provenance,
      }),
    [
      intel.score,
      intel.band,
      intel.hasWallet,
      intel.riskFromApi,
      intel.assessmentPending,
      intel.riskData?.exposureIntelligence?.provenance,
    ],
  )

  const [scannerScope, setScannerScope] = useState(() =>
    computePrimeScannerScope({ query: '', modeId: 'default' }),
  )
  const handleScannerScopeChange = useCallback((nextScope) => {
    setScannerScope((prev) => {
      if (prev.scopeKey === nextScope.scopeKey) return prev
      return nextScope
    })
  }, [])

  const rawScannerReport = scannerHook.report
  const clearScanner = scannerHook.clearScan

  useEffect(() => {
    const scope = scannerScope
    if (!rawScannerReport) return

    if (!scope.allowScannerEvidence) {
      clearScanner()
      return
    }

    if (!isScannerReportInScope(rawScannerReport, scope)) {
      clearScanner()
    }
  }, [scannerScope, rawScannerReport, clearScanner])

  const scannerReport = useMemo(() => {
    const raw = scannerHook.report
    if (!raw || !isScannerReportInScope(raw, scannerScope)) return null
    return raw
  }, [scannerHook.report, scannerScope])

  const scannerView = useMemo(
    () =>
      scannerReport
        ? buildUniversalRiskScanView(scannerReport, 'contract', {
            approvalRows,
            scannedAddress: scannerReport.address,
          })
        : null,
    [scannerReport, approvalRows],
  )

  const scannerSignals = useMemo(
    () => deriveScannerSignals(scannerReport, scannerView),
    [scannerReport, scannerView],
  )

  const handleRunDeepScan = useCallback(
    async (address, chainId = 1) => {
      const addr = String(address || '').trim()
      if (!addr) return
      const inventoryMatches =
        showRiskScanner &&
        chainId !== 'solana' &&
        approvalRows?.length &&
        Number(intel.approvalInventory?.chainId ?? 1) === Number(chainId)
      await scannerHook.analyze({
        address: addr,
        chainId,
        approvalInventory: inventoryMatches ? intel.approvalInventory : null,
      })
    },
    [scannerHook, showRiskScanner, approvalRows, intel.approvalInventory],
  )

  return (
    <section className="prime-command-workspace relative z-0 pointer-events-auto pt-6 sm:pt-8 pb-20 sm:pb-24 min-h-screen text-white">
      <div className="relative mb-8 sm:mb-10 rounded-3xl border border-violet-500/20 overflow-hidden prime-command-hero-shell">
        <div className="absolute inset-0 z-0">
          <ExplorerIntelligenceBackdrop className="h-full w-full min-h-[280px]" />
        </div>
        <motion.div
          className="absolute inset-0 z-[1] bg-gradient-to-br from-violet-950/40 via-transparent to-indigo-950/30 pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 p-6 sm:p-8 md:p-10 space-y-8">
          <ExplorerReferenceBar profile={profile} variant="prime" macroSnapshot={intel.macroState} />

          <motion.div
            id="explorer-overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 scroll-mt-28"
          >
            <PrimeIntelligenceHero
              walletSnapshot={walletSnapshot}
              primeTrends={lunar.primeTrends}
              watchlist={birdeye.watchlist}
              contractsUnderReview={contractsUnderReview}
              hasWallet={intel.hasWallet}
            />

            <PreInteractionIntelligenceTerminal
              profile={profile}
              walletSnapshot={walletSnapshot}
              intel={{
                score: walletSnapshot.score,
                band: walletSnapshot.band,
                hasWallet: walletSnapshot.hasWallet,
                riskFromApi: walletSnapshot.riskFromApi,
                contractsUnderReview,
                approvalsAtRisk,
              }}
              primeTrends={lunar.primeTrends}
              watchlist={birdeye.watchlist}
              birdeyeAssets={birdeye.assets}
              aiBrief={intel.aiBrief}
              recommendedActions={intel.recommendedActions}
              intelligenceFeed={intel.intelligenceFeed}
              exposureHeatmap={intel.exposureHeatmap}
              exposureHeatmapSubtitle={intel.exposureHeatmapSubtitle}
              exposureHeatmapSources={intel.exposureHeatmapSources}
              heatmapStatus={intel.heatmapStatus}
              riskDrivers={intel.riskDrivers}
              showRiskScanner={showRiskScanner}
              scannerReport={scannerReport}
              scannerSignals={scannerSignals}
              scannerBusy={scannerHook.busy}
              scanError={scannerHook.error}
              approvalRows={approvalRows}
              onRunDeepScan={handleRunDeepScan}
              onClearScanner={scannerHook.clearScan}
              onScannerScopeChange={handleScannerScopeChange}
            />

            <p className="text-[11px] text-slate-500 max-w-3xl leading-relaxed border border-white/10 rounded-xl px-4 py-3 bg-black/25">
              {PRIME_INTELLIGENCE_DISCLAIMER}
            </p>
          </motion.div>
        </div>
      </div>

      <motion.div className="relative z-10 space-y-8 sm:space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="prime-glass prime-plan-compact p-4 sm:p-5 border border-emerald-500/20 prime-panel-hover"
          >
            <h2 className="text-sm font-heading font-semibold text-white">Prime Intelligence Active</h2>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-300">
              {[
                { short: 'Threat terminal', full: 'Adaptive multi-mode intelligence terminal' },
                { short: 'Investigation modules', full: 'Pre-scan threat investigation modules' },
                { short: 'Contract Analyzer', full: 'Sole deep contract scan module' },
                { short: 'Evidence layers', full: 'Wallet, narrative, behavior, timeline' },
              ].map((item) => (
                <li key={item.short} className="flex items-center gap-1.5" title={item.full}>
                  <span className="text-emerald-400 text-[10px]" aria-hidden>
                    ✓
                  </span>
                  {item.short}
                </li>
              ))}
            </ul>
            <Link
              to="/membership"
              className="explorer-btn-outline text-[11px] mt-3 inline-flex items-center gap-1 !py-1.5 !px-2.5 transition-colors hover:border-violet-400/40"
            >
              Manage Membership <ArrowUpRight size={12} />
            </Link>
          </motion.div>
          <ExplorerFoundingPanel profile={profile} onProfileRefresh={refetchProfile} compact />
        </div>
      </motion.div>
    </section>
  )
}
