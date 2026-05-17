import { useCallback, useState } from 'react'
import { formatPrimeIntelUserMessage, messageFromCaughtError } from '@/utils/primeApiErrors.js'

async function readJson(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/**
 * Contract Intelligence Engine — `/api/prime/contracts/*`
 * @param {(path: string, opts?: object) => Promise<Response>} api — authenticated client from useAuthApi()
 */
export function useContractIntelligence(api) {
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const analyze = useCallback(
    async ({ address, chainId = 1, relatedAddresses = [], approvalInventory = null }) => {
      if (!api) {
        const msg = 'Session verification required. Refresh your Prime workspace and try again.'
        setError(msg)
        return { ok: false, error: msg }
      }
      setBusy(true)
      setError(null)
      try {
        const body = { address, chainId, relatedAddresses }
        if (approvalInventory?.rows?.length) {
          body.approvalInventory = {
            rows: approvalInventory.rows,
            fetchedAt: approvalInventory.fetchedAt,
            chainId: approvalInventory.chainId ?? chainId,
          }
        }
        const r = await api('/api/prime/contracts/analyze', {
          method: 'POST',
          body,
        })
        const j = await readJson(r)
        if (!r.ok) {
          const msg = formatPrimeIntelUserMessage(j?.error, r.status, j?.message)
          throw new Error(msg)
        }
        setReport(j)
        return { ok: true, body: j, report: j }
      } catch (e) {
        const msg = messageFromCaughtError(e)
        setError(msg)
        return { ok: false, error: msg }
      } finally {
        setBusy(false)
      }
    },
    [api],
  )

  const loadCached = useCallback(
    async (address, chainId = 1) => {
      if (!api) {
        const msg = 'Session verification required. Refresh your Prime workspace and try again.'
        setError(msg)
        return { ok: false, error: msg }
      }
      setBusy(true)
      setError(null)
      try {
        const r = await api(
          `/api/prime/contracts/${encodeURIComponent(address)}?chainId=${encodeURIComponent(String(chainId))}`,
        )
        const j = await readJson(r)
        if (!r.ok) {
          const msg = formatPrimeIntelUserMessage(j?.error, r.status, j?.message)
          throw new Error(msg)
        }
        setReport(j)
        return { ok: true, body: j }
      } catch (e) {
        const msg = messageFromCaughtError(e)
        setError(msg)
        return { ok: false, error: msg }
      } finally {
        setBusy(false)
      }
    },
    [api],
  )

  return { report, busy, error, analyze, loadCached, setReport }
}
