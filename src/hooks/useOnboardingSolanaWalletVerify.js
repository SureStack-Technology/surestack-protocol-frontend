import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuthApi } from '@/hooks/useAuthApi'
import { useSolanaWallet } from '@/contexts/SolanaWalletContext.jsx'
import {
  mapSolanaWalletVerifyError,
  runSolanaWalletVerification,
  SOLANA_VERIFY_PHASE_LABELS,
} from '@/lib/solanaWalletVerificationFlow'
import { clearExplorerWalletConsoleSkip } from '@/utils/dashboardPersonalization'
import { DEFAULT_SOLANA_WALLET_CHAIN } from '@/constants/walletTypes.js'

/**
 * Solana (Phantom) wallet verification for onboarding.
 *
 * @param {{
 *   onVerified?: (wallet: object) => void | Promise<void>
 *   scrollToWalletSection?: () => void
 * }} opts
 */
export function useOnboardingSolanaWalletVerify({ onVerified, scrollToWalletSection } = {}) {
  const { api, baseUrl } = useAuthApi()
  const { publicKey, isConnected, isConnecting, connectPhantom, syncFromProvider } = useSolanaWallet()

  const [walletBusy, setWalletBusy] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [lastError, setLastError] = useState(null)

  const phaseLabel = SOLANA_VERIFY_PHASE_LABELS[phase] || lastError || ''

  const handleSolanaVerify = useCallback(async () => {
    if (walletBusy) return

    setLastError(null)

    if (!isConnected || !publicKey) {
      toast.error('Connect Phantom first')
      scrollToWalletSection?.()
      try {
        await connectPhantom()
      } catch (e) {
        toast.error(mapSolanaWalletVerifyError(e))
      }
      return
    }

    const refreshed = await syncFromProvider()
    const activeKey = refreshed.publicKey || publicKey
    if (!activeKey) {
      const reason = 'Connect Phantom first'
      setLastError(reason)
      toast.error(reason)
      return
    }

    setWalletBusy(true)
    try {
      const verifyJson = await runSolanaWalletVerification({
        source: 'onboarding',
        api,
        walletAddress: activeKey,
        walletChain: DEFAULT_SOLANA_WALLET_CHAIN,
        onPhase: setPhase,
      })

      toast.success('Solana wallet verified')
      clearExplorerWalletConsoleSkip()
      await onVerified?.(verifyJson.wallet)
    } catch (e) {
      const isNetwork =
        e?.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(String(e?.message || ''))
      const friendly = mapSolanaWalletVerifyError(e)
      setPhase('error')
      setLastError(friendly)
      if (isNetwork) {
        toast.error(
          `Cannot reach the API (${baseUrl || 'same-origin /api'}). Run the backend on port 5001 (npm run backend:dev) or set VITE_BACKEND_URL in .env.local.`,
        )
      } else {
        toast.error(friendly)
      }
    } finally {
      setWalletBusy(false)
      setPhase((p) => (p === 'success' ? 'success' : 'idle'))
    }
  }, [
    walletBusy,
    isConnected,
    publicKey,
    connectPhantom,
    syncFromProvider,
    api,
    onVerified,
    scrollToWalletSection,
    baseUrl,
  ])

  const verifyDisabled = walletBusy || isConnecting
  let verifyDisabledReason = null
  if (isConnecting) verifyDisabledReason = 'Connecting Phantom…'
  else if (walletBusy) verifyDisabledReason = phaseLabel || 'Verification in progress…'
  else if (!isConnected || !publicKey) verifyDisabledReason = 'Connect Phantom above first'

  return {
    handleSolanaVerify,
    walletBusy,
    phase,
    phaseLabel,
    lastError,
    verifyDisabled,
    verifyDisabledReason,
    publicKey,
    isConnected,
    isConnecting,
    connectPhantom,
  }
}
