import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuthApi } from '@/hooks/useAuthApi'
import { useWeb3 } from '@/contexts/Web3Context.jsx'
import {
  logWalletVerify,
  mapWalletVerifyError,
  runWalletVerification,
  WALLET_VERIFY_PHASE_LABELS,
} from '@/lib/walletVerificationFlow'
import { clearExplorerWalletConsoleSkip } from '@/utils/dashboardPersonalization'

/**
 * Shared wallet verification for onboarding (Sign & verify + Founders Pass CTA).
 *
 * @param {{
 *   onVerified?: (wallet: object) => void | Promise<void>
 *   scrollToWalletSection?: () => void
 * }} opts
 */
export function useOnboardingWalletVerify({ onVerified, scrollToWalletSection } = {}) {
  const { api, baseUrl } = useAuthApi()
  const { account, chainId, isConnected, connectWallet, refreshWalletSession, isConnecting } = useWeb3()

  const [walletBusy, setWalletBusy] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [lastError, setLastError] = useState(null)

  const phaseLabel = WALLET_VERIFY_PHASE_LABELS[phase] || lastError || ''

  const handleWalletVerify = useCallback(async () => {
    if (walletBusy) {
      logWalletVerify('onboarding', 'click_ignored_busy')
      return
    }

    setLastError(null)

    if (!isConnected || !account) {
      logWalletVerify('onboarding', 'click_no_wallet', { isConnected, hasAccount: Boolean(account) })
      toast.error('Connect your wallet first')
      scrollToWalletSection?.()
      try {
        await connectWallet()
      } catch {
        /* connectWallet surfaces its own alert */
      }
      return
    }

    const refreshed = await refreshWalletSession()
    if (!refreshed.ok) {
      const reason =
        refreshed.reason === 'no_provider'
          ? 'Wallet provider not available'
          : refreshed.reason === 'no_accounts'
            ? 'Connect your wallet first'
            : 'Could not refresh wallet session — try reconnecting'
      setLastError(reason)
      toast.error(reason)
      scrollToWalletSection?.()
      return
    }

    setWalletBusy(true)
    try {
      const verifyJson = await runWalletVerification({
        source: 'onboarding',
        api,
        account: refreshed.account || account,
        chainId: refreshed.chainId ?? chainId,
        onPhase: setPhase,
      })

      toast.success('Wallet verified')
      clearExplorerWalletConsoleSkip()
      await onVerified?.(verifyJson.wallet)
    } catch (e) {
      logWalletVerify('onboarding', 'error', { message: e?.message, code: e?.code })
      const isNetwork =
        e?.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(String(e?.message || ''))
      const friendly = mapWalletVerifyError(e)
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
    account,
    connectWallet,
    refreshWalletSession,
    api,
    chainId,
    onVerified,
    scrollToWalletSection,
    baseUrl,
  ])

  const handleFoundersPassVerifyClick = useCallback(async () => {
    logWalletVerify('onboarding', 'founders_pass_cta_click', { isConnected, hasAccount: Boolean(account) })

    if (!isConnected || !account) {
      toast.error('Connect a wallet above to continue.')
      scrollToWalletSection?.()
      return
    }

    scrollToWalletSection?.()
    await handleWalletVerify()
  }, [isConnected, account, scrollToWalletSection, handleWalletVerify])

  const verifyDisabled = walletBusy || isConnecting
  let verifyDisabledReason = null
  if (isConnecting) verifyDisabledReason = 'Connecting wallet…'
  else if (walletBusy) verifyDisabledReason = phaseLabel || 'Verification in progress…'
  else if (!isConnected || !account) verifyDisabledReason = 'Connect your wallet above first'

  return {
    handleWalletVerify,
    handleFoundersPassVerifyClick,
    walletBusy,
    phase,
    phaseLabel,
    lastError,
    verifyDisabled,
    verifyDisabledReason,
  }
}
