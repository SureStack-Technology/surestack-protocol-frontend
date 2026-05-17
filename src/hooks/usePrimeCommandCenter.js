import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthApi } from '@/hooks/useAuthApi.js'
import { useWalletRiskIndex } from '@/hooks/useWalletRiskIndex.js'
import { usePrimeWalletIntel } from '@/hooks/usePrimeWalletIntel.js'
import { useExplorerMacroMarket } from '@/hooks/useExplorerMacroMarket.js'
import { classifyMacroMarketPulse } from '@/utils/macroMarketPulse.js'
import {
  isApprovalsRateLimitedResponse,
  isLocalAlchemyBackoff,
  markLocalAlchemyBackoff,
  readLocalApprovalCache,
  writeLocalApprovalCache,
} from '@/utils/approvalInventoryLocalCache.js'
import { mapApprovalsResponseStatus } from '@/utils/approvalInventoryStatus.js'

const PRIME_APPROVAL_CHAIN_ID = 1
import {
  analysisCertaintyLevel,
  buildContextualFallbackFeed,
  buildWalletExposureHeatmap,
  computeExposureTrendLabel,
  exposureSeverityFromBand,
  formatHeroChipDisplay,
  formatMachineRiskDriver,
  formatMarketBiasLabel,
  isRedundantFeedEvent,
  macroRegimeActionDetail,
  mergeProvenance,
  resolveProvenance,
} from '@/utils/primeIntelligenceFormat.js'

function verifiedWalletKeyFromProfile(profile) {
  const w = profile?.wallets?.find((x) => x.verifiedAt)
  if (!w?.address || !w.verifiedAt) return null
  return `${String(w.address).toLowerCase()}-${new Date(w.verifiedAt).toISOString()}`
}

function mockScoreSeries(current = 66) {
  const base = Number(current) || 66
  return [base - 11, base - 8, base - 5, base - 3, base - 1, base].map((n) =>
    Math.max(12, Math.min(92, Math.round(n))),
  )
}

function inferFeedSeverity(label, code) {
  const s = `${label} ${code}`.toUpperCase()
  if (/HIGH|UNLIMITED|CRITICAL|STRESS/i.test(s)) return 'HIGH'
  if (/MEDIUM|ELEVATED|CLUSTER|EXPOSURE|CONCENTRATED/i.test(s)) return 'MEDIUM'
  return 'LOW'
}

/**
 * Aggregates Prime dashboard intelligence from existing APIs with labeled fallbacks.
 */
export function usePrimeCommandCenter(profile) {
  const { api } = useAuthApi()
  const walletKey = useMemo(() => verifiedWalletKeyFromProfile(profile), [profile])
  const hasWallet = Boolean(walletKey)

  const { data: riskData, loading: riskLoading, refetch: refetchRisk } = useWalletRiskIndex(api, walletKey)
  const primeIntel = usePrimeWalletIntel(api, walletKey)
  const { data: macroData, loading: macroLoading, error: macroError } = useExplorerMacroMarket()

  const [approvals, setApprovals] = useState(null)
  const [approvalInventoryFetchedAt, setApprovalInventoryFetchedAt] = useState(null)
  const [approvalInventoryStatus, setApprovalInventoryStatus] = useState('idle')
  const [threatItems, setThreatItems] = useState(null)
  const [analystPack, setAnalystPack] = useState(null)
  const [intelLoading, setIntelLoading] = useState(false)

  const applyApprovalsResponse = useCallback(
    (apRes, background, chainId = PRIME_APPROVAL_CHAIN_ID) => {
      const mapped = mapApprovalsResponseStatus(apRes.body, apRes.status)

      if (apRes.ok && Array.isArray(apRes.body?.rows)) {
        const body = { ...apRes.body, chainId: apRes.body.chainId ?? chainId }
        setApprovals(body)
        setApprovalInventoryFetchedAt(Date.now())
        setApprovalInventoryStatus(mapped === 'rate_limited' ? 'loaded' : mapped)
        writeLocalApprovalCache(walletKey, body, chainId)
        return
      }
      if (isApprovalsRateLimitedResponse(apRes.body, apRes.status)) {
        markLocalAlchemyBackoff(walletKey, chainId)
        const cached = readLocalApprovalCache(walletKey, chainId)
        if (cached?.body?.rows?.length) {
          setApprovals({
            ...cached.body,
            chainId: cached.body.chainId ?? chainId,
            inventoryStale: true,
            rateLimited: true,
          })
          setApprovalInventoryFetchedAt(cached.savedAt)
          setApprovalInventoryStatus('loaded')
          return
        }
        if (!background || !approvals?.rows?.length) {
          setApprovalInventoryStatus('rate_limited')
        }
        return
      }
      if (mapped === 'provider_missing' || mapped === 'auth_error' || mapped === 'rpc_error') {
        if (!background || !approvals?.rows?.length) {
          setApprovalInventoryStatus(mapped)
        }
        return
      }
      if (!background || !approvals?.rows?.length) {
        setApprovalInventoryStatus('rpc_error')
      }
    },
    [walletKey, approvals?.rows?.length],
  )

  const fetchApprovalInventory = useCallback(
    async (background = false) => {
      if (!walletKey) return
      if (isLocalAlchemyBackoff(walletKey)) {
        const cached = readLocalApprovalCache(walletKey)
        if (cached?.body?.rows?.length) {
          setApprovals({
            ...cached.body,
            inventoryStale: true,
            rateLimited: true,
          })
          setApprovalInventoryFetchedAt(cached.savedAt)
          setApprovalInventoryStatus('loaded')
          return
        }
        if (!background) setApprovalInventoryStatus('rate_limited')
        return
      }
      if (!background) setApprovalInventoryStatus('loading')
      try {
        const apRes = await primeIntel.fetchApprovals(PRIME_APPROVAL_CHAIN_ID)
        applyApprovalsResponse(apRes, background, PRIME_APPROVAL_CHAIN_ID)
      } catch {
        if (!background || !approvals?.rows?.length) {
          setApprovalInventoryStatus('error')
        }
      }
    },
    [walletKey, primeIntel, applyApprovalsResponse, approvals?.rows?.length],
  )

  const loadIntelBundle = useCallback(async () => {
    if (!walletKey) return
    setIntelLoading(true)
    try {
      const [apRes, thRes] = await Promise.all([
        primeIntel.fetchApprovals(PRIME_APPROVAL_CHAIN_ID),
        primeIntel.fetchThreatFeed(),
      ])
      applyApprovalsResponse(apRes, false, PRIME_APPROVAL_CHAIN_ID)
      if (thRes.ok) setThreatItems(thRes.body?.items || [])
    } finally {
      setIntelLoading(false)
    }
  }, [walletKey, primeIntel, applyApprovalsResponse])

  useEffect(() => {
    if (!walletKey) return
    const cached = readLocalApprovalCache(walletKey, PRIME_APPROVAL_CHAIN_ID)
    if (cached?.body?.rows?.length) {
      setApprovals({
        ...cached.body,
        chainId: cached.body.chainId ?? PRIME_APPROVAL_CHAIN_ID,
        inventoryStale: cached.stale,
        rateLimited: isLocalAlchemyBackoff(walletKey, PRIME_APPROVAL_CHAIN_ID),
      })
      setApprovalInventoryFetchedAt(cached.savedAt)
      setApprovalInventoryStatus('loaded')
    }
  }, [walletKey])

  useEffect(() => {
    loadIntelBundle()
  }, [loadIntelBundle])

  useEffect(() => {
    if (!walletKey) return undefined
    const timer = setInterval(() => {
      if (isLocalAlchemyBackoff(walletKey, PRIME_APPROVAL_CHAIN_ID)) return
      if (
        approvalInventoryFetchedAt &&
        Date.now() - approvalInventoryFetchedAt > 90_000
      ) {
        fetchApprovalInventory(true)
      }
    }, 20_000)
    return () => clearInterval(timer)
  }, [walletKey, approvalInventoryFetchedAt, fetchApprovalInventory])

  const approvalInventory = useMemo(
    () => ({
      rows: approvals?.rows || [],
      chainId: approvals?.chainId ?? PRIME_APPROVAL_CHAIN_ID,
      fetchedAt: approvalInventoryFetchedAt,
      status: approvalInventoryStatus,
      inventoryStale: Boolean(approvals?.inventoryStale),
      rateLimited: Boolean(approvals?.rateLimited),
    }),
    [approvals, approvalInventoryFetchedAt, approvalInventoryStatus],
  )

  const macroState = useMemo(() => {
    const fallbackHeadline = 'Volatility Compression'
    if (!macroData || macroError) {
      return {
        headline: fallbackHeadline,
        biasLabel: formatMarketBiasLabel(fallbackHeadline),
        confidence: 68,
        provenance: 'DEMO_MODE',
        subtext: 'AI-classified macro positioning model',
        hasLiveMacro: false,
      }
    }
    const sig = classifyMacroMarketPulse(
      macroData.btc?.change24h,
      macroData.eth?.change24h,
      macroData.xrp?.change24h,
      macroData.total?.change24h,
    )
    const spread = Math.abs(Number(macroData.btc?.change24h || 0) - Number(macroData.eth?.change24h || 0))
    const confidence = Math.round(Math.max(55, Math.min(94, 78 - spread * 2)))
    const provenance = macroData.cached || macroData.stale
      ? 'ESTIMATED'
      : 'LATEST_SNAPSHOT'
    return {
      headline: sig.headline,
      biasLabel: formatMarketBiasLabel(sig.headline),
      confidence,
      provenance,
      subtext: 'AI-classified macro positioning model',
      hasLiveMacro: true,
    }
  }, [macroData, macroError])

  const riskFromApi = Boolean(riskData?.success)
  const score = riskFromApi ? Number(riskData.score) : hasWallet ? 66 : 66
  const band = riskData?.band || 'MODERATE'
  const exposureSeverity = exposureSeverityFromBand(band)

  const timelineFromApi = Boolean(
    Array.isArray(primeIntel.timeline?.series) && primeIntel.timeline.series.length >= 2,
  )

  const scoreDelta = useMemo(() => {
    const series = primeIntel.timeline?.series
    if (timelineFromApi) {
      const last = series[series.length - 1]
      const prev =
        last.previousScore != null
          ? Number(last.previousScore)
          : series.length > 1
            ? Number(series[series.length - 2].score)
            : Number(last.score)
      return Math.round(Number(last.score) - prev)
    }
    if (riskFromApi) return 0
    return 0
  }, [primeIntel.timeline?.series, timelineFromApi, riskFromApi])

  const approvalsFromApi = Boolean(approvals?.rows?.length)
  const approvalsAtRisk = useMemo(() => {
    if (approvals?.stats?.unlimitedUnknown != null) return approvals.stats.unlimitedUnknown
    const rows = approvals?.rows || []
    const risky = rows.filter((r) => r.unlimited || r.riskLevel === 'HIGH' || r.riskLevel === 'ELEVATED')
    return risky.length
  }, [approvals])

  const activityAnomalies = useMemo(() => {
    const items = threatItems || []
    if (items.length) return items.length
    const feed = primeIntel.timeline?.feed || []
    if (feed.length) return Math.min(5, feed.length)
    return 0
  }, [threatItems, primeIntel.timeline?.feed])

  const contractsUnderReview = useMemo(() => {
    const findings = riskData?.findings || []
    const contractish = findings.filter((f) =>
      /contract|approval|proxy|spender/i.test(`${f.code} ${f.title}`),
    )
    return contractish.length
  }, [riskData?.findings])

  const riskDrivers = useMemo(() => {
    const fromApi = (riskData?.findings || [])
      .filter((f) => f?.title)
      .slice(0, 4)
      .map((f) => ({
        title: formatMachineRiskDriver(f.title),
        severity: f.severity === 'WATCH' ? 'LOW' : f.severity || 'MEDIUM',
        fromApi: true,
      }))
    if (fromApi.length) return fromApi
    if (!hasWallet) {
      return [
        { title: 'Connect wallet for live risk drivers', severity: 'LOW', fromApi: false },
      ]
    }
    return [
      { title: 'Approval surface exceeds healthy threshold', severity: 'HIGH', fromApi: false },
      { title: 'Contract interaction clustering detected', severity: 'MEDIUM', fromApi: false },
      { title: 'Volatility sensitivity elevated', severity: 'MEDIUM', fromApi: false },
    ]
  }, [riskData?.findings, hasWallet])

  const aiBrief = useMemo(() => {
    const fromAnalyst = Boolean(analystPack?.analyst?.narrative)
    const fromRisk = Boolean(riskData?.summary && !fromAnalyst)
    const narrative =
      analystPack?.analyst?.narrative ||
      riskData?.summary ||
      (hasWallet
        ? 'Wallet concentration remains elevated due to clustered approvals and high interaction density.'
        : 'Connect and verify a wallet to generate a personalized intelligence brief.')

    const recommendation =
      analystPack?.analyst?.keyFindings?.[0]?.detail ||
      (hasWallet
        ? 'Review approval exposure on recently interacted contracts before additional signing.'
        : 'Verify your wallet to unlock model-generated briefs.')

    const riskPosture =
      band === 'HIGH' || band === 'ELEVATED'
        ? 'Elevated exposure'
        : band === 'MODERATE'
          ? 'Moderate exposure'
          : 'Contained exposure'

    const dataStatus = resolveProvenance({
      hasWallet,
      hasApiData: fromAnalyst || fromRisk,
      isFreshSnapshot: fromAnalyst,
      isModelGenerated: fromAnalyst || (fromRisk && riskFromApi),
      isCachedOrDerived: fromRisk && !fromAnalyst,
    })

    const certainty = analysisCertaintyLevel({ band, fromAnalyst, fromRisk })

    return {
      headline: "Today's AI Intelligence Brief",
      summary: narrative,
      recommendation,
      riskPosture,
      dataStatus,
      certainty,
      fromApi: fromAnalyst || fromRisk,
    }
  }, [analystPack, riskData?.summary, band, hasWallet, riskFromApi])

  const intelligenceFeed = useMemo(() => {
    const events = []
    const now = Date.now()
    let hasSnapshot = false
    const seen = new Set()

    const pushEvent = (ev) => {
      const summary = String(ev.summary || '').trim()
      if (!summary || isRedundantFeedEvent(summary)) return
      const key = summary.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      events.push(ev)
    }

    for (const a of primeIntel.alerts || []) {
      hasSnapshot = true
      pushEvent({
        id: `alert-${a.id}`,
        summary: a.title || 'Threat alert',
        severity: inferFeedSeverity(a.title, a.severity),
        at: a.createdAt,
        ts: new Date(a.createdAt).getTime(),
        source: 'alert',
      })
    }

    for (const item of threatItems || []) {
      hasSnapshot = true
      pushEvent({
        id: `threat-${item.code}-${item.title}`,
        summary: item.title || item.code,
        severity: item.severity || inferFeedSeverity(item.title, item.code),
        at: item.observedAt || new Date(now - 3600000).toISOString(),
        ts: new Date(item.observedAt || now - 3600000).getTime(),
        source: 'finding',
      })
    }

    for (const row of (primeIntel.timeline?.feed || []).slice(-6)) {
      for (const ev of row.events || []) {
        const summary = ev.detail ? `${ev.label}: ${ev.detail}` : ev.label
        if (isRedundantFeedEvent(summary)) continue
        pushEvent({
          id: `feed-${ev.label}-${row.at}-${summary.slice(0, 24)}`,
          summary,
          severity: inferFeedSeverity(ev.label, ''),
          at: row.at,
          ts: new Date(row.at).getTime(),
          source: 'timeline',
        })
      }
    }

    const sectionStatus = resolveProvenance({
      hasWallet,
      hasApiData: hasSnapshot,
      isFreshSnapshot: hasSnapshot && Boolean(threatItems?.length || primeIntel.alerts?.length),
      isModelGenerated: hasWallet && !hasSnapshot,
      isCachedOrDerived: hasSnapshot && !threatItems?.length,
    })

    if (!events.length) {
      const mocked = buildContextualFallbackFeed(macroState.headline, hasWallet)
      return {
        items: mocked,
        sectionStatus: hasWallet ? 'MODEL_GENERATED' : 'DEMO_MODE',
        hasInferred: false,
      }
    }

    const hasInferred = events.some((e) => e.source === 'timeline')
    return {
      items: events.sort((a, b) => b.ts - a.ts).slice(0, 8),
      sectionStatus: hasSnapshot
        ? hasInferred
          ? 'ESTIMATED'
          : 'LATEST_SNAPSHOT'
        : 'MODEL_GENERATED',
      hasInferred,
    }
  }, [
    primeIntel.alerts,
    threatItems,
    primeIntel.timeline?.feed,
    macroState.headline,
    hasWallet,
  ])

  const recommendedActions = useMemo(() => {
    const actions = []
    const rows = approvals?.rows || []
    const unlimited = rows.find((r) => r.unlimited)

    if (unlimited || approvalsAtRisk > 0) {
      actions.push({
        id: 'revoke',
        title: 'Review unlimited token approvals',
        detail: unlimited
          ? `Unlimited allowance to ${String(unlimited.spender).slice(0, 8)}… — revoke or cap exposure.`
          : 'High-risk allowances detected on verified wallet surfaces.',
        priority: 'HIGH',
      })
    }

    if (contractsUnderReview > 0) {
      actions.push({
        id: 'contract',
        title: 'Analyze recently interacted contracts',
        detail: 'Run Contract Trust Engine on flagged spenders from your approval inventory.',
        priority: 'MEDIUM',
      })
    }

    if (score >= 65) {
      actions.push({
        id: 'concentration',
        title: 'Reduce concentration in high-volatility exposure',
        detail: 'Rebalance asset concentration relative to signing activity.',
        priority: score >= 75 ? 'HIGH' : 'MEDIUM',
      })
    }

    actions.push({
      id: 'macro',
      title: `Monitor ${macroState.biasLabel.toLowerCase()}`,
      detail: macroRegimeActionDetail(macroState.headline),
      priority: 'LOW',
    })

    return actions.slice(0, 4)
  }, [approvals?.rows, approvalsAtRisk, contractsUnderReview, score, macroState])

  const scoreSeries = useMemo(() => {
    const series = primeIntel.timeline?.series
    if (timelineFromApi) {
      return {
        points: series.map((p) => Number(p.score)).filter((n) => Number.isFinite(n)),
        status: 'LATEST_SNAPSHOT',
      }
    }
    if (hasWallet && riskFromApi) {
      return { points: mockScoreSeries(score), status: 'MODEL_GENERATED' }
    }
    return { points: mockScoreSeries(score), status: 'DEMO_MODE' }
  }, [primeIntel.timeline?.series, timelineFromApi, score, hasWallet, riskFromApi])

  const exposureTrend = useMemo(
    () => computeExposureTrendLabel(scoreSeries.points, scoreDelta, band),
    [scoreSeries.points, scoreDelta, band],
  )

  const exposureHeatmap = useMemo(
    () =>
      buildWalletExposureHeatmap({
        findings: riskData?.findings || [],
        approvals,
        band,
        score,
      }),
    [riskData?.findings, approvals, band, score],
  )

  const heatmapStatus = resolveProvenance({
    hasWallet,
    hasApiData: riskFromApi,
    isFreshSnapshot: riskFromApi,
    isModelGenerated: hasWallet && !riskFromApi,
  })

  const walletRiskStatus = resolveProvenance({
    hasWallet,
    hasApiData: riskFromApi,
    isFreshSnapshot: riskFromApi,
  })

  const heroChips = useMemo(() => {
    const chipDefs = [
      {
        key: 'score',
        label: 'Wallet Risk Score',
        raw: score,
        status: resolveProvenance({
          hasWallet,
          hasApiData: riskFromApi,
          isFreshSnapshot: riskFromApi,
        }),
        tone:
          band === 'HIGH' || band === 'ELEVATED'
            ? 'rose'
            : band === 'MODERATE'
              ? 'amber'
              : band === 'LOW'
                ? 'emerald'
                : 'indigo',
      },
      {
        key: 'delta',
        label: '24h Risk Delta',
        raw: scoreDelta,
        status: resolveProvenance({
          hasWallet,
          hasApiData: timelineFromApi || riskFromApi,
          isFreshSnapshot: timelineFromApi,
          isModelGenerated: riskFromApi && !timelineFromApi,
          isCachedOrDerived: !timelineFromApi && riskFromApi,
        }),
        tone: scoreDelta === 0 ? 'indigo' : scoreDelta > 0 ? 'rose' : 'emerald',
      },
      {
        key: 'approvals',
        label: 'Approval Exposure',
        raw: approvalsAtRisk,
        status: resolveProvenance({
          hasWallet,
          hasApiData: approvalsFromApi || hasWallet,
          isFreshSnapshot: approvalsFromApi,
          isModelGenerated: hasWallet && !approvalsFromApi,
        }),
        tone: approvalsAtRisk === 0 ? 'emerald' : 'amber',
      },
      {
        key: 'activity',
        label: 'Activity Anomalies',
        raw: activityAnomalies,
        status: resolveProvenance({
          hasWallet,
          hasApiData: Boolean(threatItems?.length || primeIntel.timeline?.feed?.length),
          isFreshSnapshot: Boolean(threatItems?.length),
          isCachedOrDerived: Boolean(primeIntel.timeline?.feed?.length && !threatItems?.length),
          isModelGenerated: hasWallet && !threatItems?.length && !primeIntel.timeline?.feed?.length,
        }),
        tone: activityAnomalies === 0 ? 'emerald' : 'rose',
      },
      {
        key: 'contracts',
        label: 'Contract Watch',
        raw: contractsUnderReview,
        status: resolveProvenance({
          hasWallet,
          hasApiData: riskFromApi,
          isFreshSnapshot: riskFromApi && contractsUnderReview >= 0,
          isModelGenerated: hasWallet && !riskFromApi,
        }),
        tone: contractsUnderReview === 0 ? 'emerald' : 'amber',
      },
    ]

    return chipDefs.map((c) => {
      const display = formatHeroChipDisplay(c.key, c.raw, c.key === 'score' ? band : undefined)
      return { ...c, value: display.primary, subtext: display.sub }
    })
  }, [
    score,
    band,
    riskFromApi,
    hasWallet,
    scoreDelta,
    timelineFromApi,
    approvalsAtRisk,
    approvalsFromApi,
    activityAnomalies,
    threatItems,
    contractsUnderReview,
    primeIntel.timeline?.feed,
  ])

  const heroProvenance = useMemo(
    () => mergeProvenance(...heroChips.map((c) => c.status)),
    [heroChips],
  )

  const runFreshAnalysis = useCallback(async () => {
    const { ok, body } = await primeIntel.runAnalyst()
    if (ok) {
      setAnalystPack(body)
      await refetchRisk()
      primeIntel.refetchTimeline(30)
      await loadIntelBundle()
    }
    return { ok, body }
  }, [primeIntel, refetchRisk, loadIntelBundle])

  const operationalAdvisory = useMemo(() => {
    const top = riskDrivers[0]
    if (top?.severity === 'HIGH') {
      return {
        headline: 'Prioritize approval hygiene now',
        action:
          'Revoke or cap unlimited allowances on inactive spenders. Defer discretionary signing until Contract Trust Engine validates new targets.',
      }
    }
    return {
      headline: 'Maintain disciplined signing posture',
      action:
        'Batch discretionary transactions behind a secondary review. Refresh Intelligence Brief after material wallet activity.',
    }
  }, [riskDrivers])

  const riskLastRefresh = riskData?.updatedAt ? new Date(riskData.updatedAt) : null

  const lastInteractedContract = useMemo(() => {
    const row = approvals?.rows?.[0]
    return row?.spender || row?.token || null
  }, [approvals?.rows])

  const deltaDisplay =
    scoreDelta === 0 ? 'UNCHANGED' : `${scoreDelta >= 0 ? '+' : ''}${scoreDelta}`

  return {
    walletKey,
    hasWallet,
    loading: riskLoading || primeIntel.timelineLoading || intelLoading || macroLoading,
    score,
    band,
    exposureSeverity,
    scoreDelta,
    deltaDisplay,
    riskDrivers,
    heroChips,
    heroProvenance,
    aiBrief,
    intelligenceFeed,
    recommendedActions,
    scoreSeries,
    exposureTrend,
    exposureHeatmap,
    heatmapStatus,
    macroState,
    walletRiskStatus,
    operationalAdvisory,
    runFreshAnalysis,
    primeIntel,
    refetchRisk,
    riskData,
    riskLastRefresh,
    riskFromApi,
    lastInteractedContract,
    approvals,
    approvalInventory,
    api,
    isAuthReady: Boolean(walletKey),
  }
}
