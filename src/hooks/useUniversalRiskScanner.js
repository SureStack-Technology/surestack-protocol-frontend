import { useCallback, useState } from 'react'
import { useContractIntelligence } from '@/hooks/useContractIntelligence.js'
import { formatPrimeIntelUserMessage, messageFromCaughtError } from '@/utils/primeApiErrors.js'

export const SOLANA_CHAIN_ID = 'solana'

async function readJson(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

function formatSolanaError(j, status) {
  if (j?.error === 'invalid_solana_address' || j?.message?.includes('Invalid Solana')) {
    return 'Invalid Solana address format.'
  }
  if (j?.error === 'all_providers_failed') {
    return (
      j?.message ||
      'Limited market intelligence — no data returned from public sources for this mint.'
    )
  }
  if (j?.error === 'solana_rpc_unavailable') {
    return 'Limited market intelligence — on-chain RPC unavailable. Retry or check SOLANA_RPC_URL.'
  }
  return formatPrimeIntelUserMessage(j?.error, status, j?.message)
}

/**
 * Routes Universal Risk Scanner to EVM contract intel or Solana scanner.
 * @param {(path: string, opts?: object) => Promise<Response>} api
 */
export function useUniversalRiskScanner(api) {
  const evm = useContractIntelligence(api)
  const [solanaReport, setSolanaReport] = useState(null)
  const [solanaBusy, setSolanaBusy] = useState(false)
  const [solanaError, setSolanaError] = useState(null)

  const analyzeSolana = useCallback(
    async (address) => {
      if (!api) {
        const msg = 'Session verification required. Refresh your Prime workspace and try again.'
        setSolanaError(msg)
        return { ok: false, error: msg }
      }
      setSolanaBusy(true)
      setSolanaError(null)
      try {
        const r = await api('/api/prime/solana/analyze', {
          method: 'POST',
          body: { address },
        })
        const j = await readJson(r)
        if (!r.ok) {
          const msg = formatSolanaError(j, r.status)
          throw new Error(msg)
        }
        if (j?.success === false) {
          throw new Error(j.message || 'Solana risk scan could not complete.')
        }
        setSolanaReport(j)
        return { ok: true, body: j }
      } catch (e) {
        const msg = messageFromCaughtError(e)
        setSolanaError(msg)
        return { ok: false, error: msg }
      } finally {
        setSolanaBusy(false)
      }
    },
    [api],
  )

  const analyze = useCallback(
    async ({ address, chainId = 1, relatedAddresses = [], approvalInventory = null }) => {
      if (chainId === SOLANA_CHAIN_ID) {
        setSolanaReport(null)
        evm.setReport(null)
        return analyzeSolana(address)
      }
      setSolanaReport(null)
      setSolanaError(null)
      const result = await evm.analyze({ address, chainId, relatedAddresses, approvalInventory })
      return { ...result, body: result.body ?? evm.report }
    },
    [analyzeSolana, evm],
  )

  const loadCached = useCallback(
    async (address, chainId = 1) => {
      if (chainId === SOLANA_CHAIN_ID) {
        setSolanaError('Cached Solana scans are not available yet — run Analyze Risk.')
        return { ok: false, error: 'Cached Solana scans are not available yet.' }
      }
      return evm.loadCached(address, chainId)
    },
    [evm],
  )

  const clearScan = useCallback(() => {
    setSolanaReport(null)
    setSolanaError(null)
    evm.setReport(null)
  }, [evm])

  return {
    report: solanaReport ?? evm.report,
    busy: solanaBusy || evm.busy,
    error: solanaError ?? evm.error,
    analyze,
    loadCached,
    clearScan,
    setReport: (r) => {
      if (r?.chain === 'solana') {
        setSolanaReport(r)
        evm.setReport(null)
      } else {
        setSolanaReport(null)
        evm.setReport(r)
      }
    },
  }
}
