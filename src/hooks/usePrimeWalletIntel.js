import { useCallback, useEffect, useMemo, useState } from 'react'

async function readJson(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/**
 * Authenticated Prime Intelligence bundle (wallet verified).
 * @param {(path: string, options?: RequestInit) => Promise<Response>} api
 * @param {string | null} walletKey
 */
export function usePrimeWalletIntel(api, walletKey) {
  const [timeline, setTimeline] = useState(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineErr, setTimelineErr] = useState(null)

  const [alerts, setAlerts] = useState(null)
  const [alertsLoading, setAlertsLoading] = useState(false)

  const [scenarioCatalog, setScenarioCatalog] = useState(null)

  const loadTimeline = useCallback(
    async (days = 30) => {
      if (!walletKey) return
      setTimelineLoading(true)
      setTimelineErr(null)
      try {
        const r = await api(`/api/prime/timeline?days=${encodeURIComponent(String(days))}`)
        const j = await readJson(r)
        if (!r.ok) throw new Error(j?.error || `timeline_${r.status}`)
        setTimeline(j)
      } catch (e) {
        setTimeline(null)
        setTimelineErr(e?.message || 'timeline_failed')
      } finally {
        setTimelineLoading(false)
      }
    },
    [api, walletKey],
  )

  const loadAlerts = useCallback(async () => {
    if (!walletKey) return
    setAlertsLoading(true)
    try {
      const r = await api('/api/prime/alerts')
      const j = await readJson(r)
      if (!r.ok) throw new Error(j?.error || `alerts_${r.status}`)
      setAlerts(j?.alerts || [])
    } catch {
      setAlerts([])
    } finally {
      setAlertsLoading(false)
    }
  }, [api, walletKey])

  const loadScenarios = useCallback(async () => {
    if (!walletKey) return
    try {
      const r = await api('/api/prime/simulator/scenarios')
      const j = await readJson(r)
      if (!r.ok) throw new Error(j?.error || `scenarios_${r.status}`)
      setScenarioCatalog(j?.scenarios || [])
    } catch {
      setScenarioCatalog([])
    }
  }, [api, walletKey])

  useEffect(() => {
    if (!walletKey) {
      setTimeline(null)
      setAlerts(null)
      setScenarioCatalog(null)
      return
    }
    loadTimeline(30)
    loadAlerts()
    loadScenarios()
  }, [walletKey, loadTimeline, loadAlerts, loadScenarios])

  const runAnalyst = useCallback(async () => {
    const r = await api('/api/prime/analyst/run', { method: 'POST' })
    const j = await readJson(r)
    return { ok: r.ok, status: r.status, body: j }
  }, [api])

  const runSimulator = useCallback(
    async (scenarioId) => {
      const r = await api('/api/prime/simulator/run', {
        method: 'POST',
        body: JSON.stringify({ scenarioId }),
      })
      const j = await readJson(r)
      return { ok: r.ok, status: r.status, body: j }
    },
    [api],
  )

  const fetchApprovals = useCallback(
    async (chainId = 1) => {
      const r = await api(
        `/api/prime/approvals/inventory?chainId=${encodeURIComponent(String(chainId))}`,
      )
      const j = await readJson(r)
      return { ok: r.ok, status: r.status, body: j }
    },
    [api],
  )

  const fetchThreatFeed = useCallback(async () => {
    const r = await api('/api/prime/findings/threat-feed')
    const j = await readJson(r)
    return { ok: r.ok, body: j }
  }, [api])

  const unreadAlertCount = useMemo(() => {
    if (!Array.isArray(alerts)) return 0
    return alerts.filter((a) => !a.read).length
  }, [alerts])

  return {
    timeline,
    timelineLoading,
    timelineErr,
    refetchTimeline: loadTimeline,
    alerts,
    alertsLoading,
    refetchAlerts: loadAlerts,
    unreadAlertCount,
    scenarioCatalog,
    refetchScenarios: loadScenarios,
    runAnalyst,
    runSimulator,
    fetchApprovals,
    fetchThreatFeed,
  }
}
