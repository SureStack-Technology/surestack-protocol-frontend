import {
  DEFAULT_SHOWCASE_SCENARIO_ID,
  getLunarCrushScenarioById,
  isLiveLunarCrushStatus,
} from '@/data/lunarCrushScenarioShowcase.js'
import { buildContractAnalyzerSummary } from '@/components/dashboard/prime/primeContractAnalyzerFields.js'
import { walletRiskBandLabel } from '@/hooks/useWalletRiskIndex.js'
import { LAYER_ACTION_TYPES, LAYER_BUTTON_LABELS } from '@/components/dashboard/prime/primeIntelligenceLayerActions.js'

const VIEW_AFTER_SCAN = 'Launch via button or enter a target above'
const CONTRACT_CHECK_CHIPS = ['Source', 'Proxy', 'Ownership', 'Approvals', 'Honeypot']

function firstSentence(text, maxLen = 120) {
  const raw = String(text || '').trim()
  if (!raw) return ''
  const sentence = raw.split(/(?<=[.!?])\s+/)[0] || raw
  return sentence.length > maxLen ? `${sentence.slice(0, maxLen - 1)}…` : sentence
}

function pickLeadAsset(assets) {
  if (!Array.isArray(assets) || !assets.length) return null
  return assets.find((a) => a.status === 'live') || assets[0]
}

function fieldValue(summary, label, fallback) {
  const row = summary?.fields?.find((f) => f.label === label)
  if (row?.pending || !row?.value) return fallback
  const v = String(row.value)
  return v.length > 48 ? `${v.slice(0, 48)}…` : v
}

function isContractAddress(query) {
  const q = String(query || '').trim()
  return /^0x[a-fA-F0-9]{40}$/.test(q) || (q.startsWith('0x') && q.length >= 42)
}

function shortenAddress(addr) {
  const a = String(addr || '')
  if (a.length < 14) return a
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

/**
 * @typedef {'row' | 'prose' | 'headline' | 'chips'} StoryKind
 * @typedef {{ kind?: StoryKind, label: string, value: string }} StoryLine
 */

/** @returns {{ status: string, statusTone: string, statusNote?: string, story: StoryLine[], footerHint: string }} */
export function buildNarrativeLayer(primeTrends) {
  const live = isLiveLunarCrushStatus(primeTrends?.status)

  if (live && primeTrends) {
    const trending =
      (primeTrends.trendingAssets || [])
        .slice(0, 3)
        .map((a) => a.symbol)
        .filter(Boolean)
        .join(' · ') || 'Majors in focus'

    const signal = primeTrends.anomalySignals?.[0]?.label || 'Monitoring social anomalies'
    const narrative = firstSentence(primeTrends.summary) || 'Live narrative feed synthesizing market mood and anomalies.'

    return {
      status: 'Live',
      statusTone: 'live',
      story: [
        { kind: 'headline', label: 'Feed', value: 'LunarCrush live narrative intelligence' },
        { kind: 'prose', label: 'Narrative', value: narrative },
        { kind: 'row', label: 'Trending', value: trending },
        { kind: 'row', label: 'Signal', value: String(signal).slice(0, 72) },
        {
          kind: 'row',
          label: 'Action',
          value: 'Cross-check behavior and contract trust before sizing exposure',
        },
      ],
      footerHint: VIEW_AFTER_SCAN,
      actionType: LAYER_ACTION_TYPES.NARRATIVE,
      buttonLabel: LAYER_BUTTON_LABELS.narrative,
    }
  }

  const scenario = getLunarCrushScenarioById(DEFAULT_SHOWCASE_SCENARIO_ID)
  const trending =
    (scenario?.trendingAssets || [])
      .slice(0, 3)
      .map((a) => a.symbol)
      .join(' · ') || '—'
  const signal = scenario?.anomalySignals?.[0]?.label || 'Scenario baseline signal'
  const action = scenario?.recommendedActions?.[0] || 'Review narrative risk before new approvals'
  const narrative =
    firstSentence(scenario?.intelligenceBrief) ||
    firstSentence(scenario?.riskInterpretation) ||
    'Scenario intelligence active for pre-scan orientation.'

  return {
    status: 'Scenario Active',
    statusTone: 'scenario',
    statusNote: 'Live provider activation pending.',
    story: [
      { kind: 'headline', label: 'Current scenario', value: scenario?.title || scenario?.label || 'Showcase' },
      { kind: 'prose', label: 'Narrative', value: narrative },
      { kind: 'row', label: 'Trending', value: trending },
      { kind: 'row', label: 'Signal', value: signal },
      { kind: 'row', label: 'Action', value: action },
    ],
    footerHint: VIEW_AFTER_SCAN,
    actionType: LAYER_ACTION_TYPES.NARRATIVE,
    buttonLabel: LAYER_BUTTON_LABELS.narrative,
  }
}

/** @returns {{ status: string, statusTone: string, statusNote?: string, story: StoryLine[], footerHint: string }} */
export function buildBehaviorLayer(watchlist, assets = []) {
  const live = watchlist?.status === 'live'
  const lead = pickLeadAsset(assets)

  if (live && lead) {
    const topAsset = lead.watchlistSymbol || lead.symbol || 'Watchlist'
    return {
      status: 'Live',
      statusTone: 'live',
      story: [
        { kind: 'row', label: 'Top asset', value: `${topAsset} · ${lead.chain || 'on-chain'}` },
        { kind: 'row', label: 'Whale behavior', value: lead.whaleActivity || 'Balanced footprint' },
        {
          kind: 'row',
          label: 'Liquidity concentration',
          value: lead.liquidityHealth || lead.holderConcentration || 'Indexed',
        },
        {
          kind: 'row',
          label: 'Smart money movement',
          value: lead.smartMoneySignal ? String(lead.smartMoneySignal).slice(0, 64) : 'Heuristics active',
        },
        {
          kind: 'row',
          label: 'Action',
          value: 'Confirm holder concentration before discretionary exposure',
        },
      ],
      footerHint: VIEW_AFTER_SCAN,
      actionType: LAYER_ACTION_TYPES.BEHAVIOR,
      buttonLabel: LAYER_BUTTON_LABELS.behavior,
    }
  }

  return {
    status: 'Provider Ready',
    statusTone: 'ready',
    statusNote: 'Birdeye activation pending.',
    story: [
      { kind: 'headline', label: 'Provider state', value: 'Behavior Engine Ready' },
      {
        kind: 'prose',
        label: 'Will unlock',
        value: 'Whale behavior, liquidity concentration, and smart-money movement on major assets.',
      },
      {
        kind: 'row',
        label: 'Action',
        value: 'Behavior intelligence expands when live provider feeds are enabled.',
      },
    ],
    footerHint: VIEW_AFTER_SCAN,
    actionType: LAYER_ACTION_TYPES.BEHAVIOR,
    buttonLabel: LAYER_BUTTON_LABELS.behavior,
  }
}

/** @returns {{ status: string, statusTone: string, statusNote?: string, story: StoryLine[], footerHint: string }} */
export function buildContractTrustLayer({
  showRiskScanner,
  scannerReport,
  approvalRows,
  approvalsAtRisk,
  query,
  analysisModeId,
}) {
  const summary = buildContractAnalyzerSummary(scannerReport, scannerReport?.address, approvalRows)
  const contractTarget = analysisModeId === 'contract' && isContractAddress(query)

  if (summary.hasScan) {
    return {
      status: 'Scan complete',
      statusTone: 'live',
      story: [
        { kind: 'row', label: 'Scanner state', value: 'Deep scan complete' },
        { kind: 'chips', label: 'Checks', chips: CONTRACT_CHECK_CHIPS },
        {
          kind: 'row',
          label: 'Surface',
          value: `Approvals ${fieldValue(summary, 'Approval risk', '—')} · Honeypot ${fieldValue(summary, 'Honeypot', '—')}`,
        },
        { kind: 'row', label: 'Action', value: 'Review Contract Trust evidence before interacting' },
      ],
      footerHint: VIEW_AFTER_SCAN,
      actionType: LAYER_ACTION_TYPES.CONTRACT,
      buttonLabel: LAYER_BUTTON_LABELS.contract,
    }
  }

  const story = [
    {
      kind: 'headline',
      label: 'Scanner state',
      value: showRiskScanner ? 'Ready' : 'Verify wallet to unlock',
    },
    { kind: 'chips', label: 'Checks', chips: CONTRACT_CHECK_CHIPS },
    {
      kind: 'row',
      label: 'Action',
      value: showRiskScanner ? 'Run Deep Contract Scan' : 'Link verified wallet first',
    },
  ]

  if (contractTarget) {
    story.splice(2, 0, {
      kind: 'row',
      label: 'Target',
      value: `Contract detected · ${shortenAddress(query)}`,
    })
  } else if (approvalsAtRisk > 0) {
    story.splice(2, 0, {
      kind: 'row',
      label: 'Approval surface',
      value: `${approvalsAtRisk} elevated spender(s) on verified wallet`,
    })
  }

  return {
    status: showRiskScanner ? 'Scanner Ready' : 'Verify wallet',
    statusTone: showRiskScanner ? 'ready' : 'pending',
    story,
    footerHint: VIEW_AFTER_SCAN,
    actionType: LAYER_ACTION_TYPES.CONTRACT,
    buttonLabel: LAYER_BUTTON_LABELS.contract,
  }
}

/** @returns {{ status: string, statusTone: string, statusNote?: string, story: StoryLine[], footerHint: string }} */
export function buildWalletExposureLayer(walletSnapshot, intel, riskDrivers = []) {
  const hasWallet = Boolean(walletSnapshot?.hasWallet)
  if (walletSnapshot?.assessmentPending || walletSnapshot?.band === 'PENDING') {
    return {
      status: 'Pending',
      statusTone: 'pending',
      story: [
        { kind: 'headline', label: 'Wallet index', value: 'Risk Assessment Pending' },
        { kind: 'row', label: 'Data coverage', value: 'Insufficient Data' },
        {
          kind: 'row',
          label: 'Action',
          value: 'Refresh wallet intelligence after provider data is available',
        },
      ],
      footerHint: VIEW_AFTER_SCAN,
      actionType: LAYER_ACTION_TYPES.WALLET,
      buttonLabel: LAYER_BUTTON_LABELS.wallet,
    }
  }

  const bandLabel = walletSnapshot?.band ? walletRiskBandLabel(walletSnapshot.band) : null
  const score = walletSnapshot?.score

  const topDriver = riskDrivers?.find((d) => d?.title)?.title
  let driver = topDriver || 'Connect wallet for live drivers'
  if (hasWallet && !topDriver) {
    const contracts = intel?.contractsUnderReview ?? 0
    const approvals = intel?.approvalsAtRisk ?? 0
    if (approvals > 0 && contracts > 0) driver = 'Approvals + contract interaction clustering'
    else if (approvals > 0) driver = 'Elevated approval surface'
    else if (contracts > 0) driver = 'Contract trust signals under review'
    else if (walletSnapshot?.riskFromApi) driver = 'Concentration + volatility sensitivity'
    else driver = 'Establishing wallet risk baseline'
  }

  let action = 'Link and verify wallet for exposure map'
  if (hasWallet) {
    const atRisk = intel?.approvalsAtRisk ?? 0
    action =
      atRisk > 0
        ? 'Review active spenders before new approvals'
        : 'Review active spenders before approving new contracts.'
  }

  const indexLine =
    score != null && bandLabel
      ? `${score}/100 · ${bandLabel.toLowerCase()}`
      : walletSnapshot?.compact || 'Awaiting snapshot'

  return {
    status: hasWallet && walletSnapshot?.riskFromApi ? 'Live' : hasWallet ? 'Linked' : 'Pending',
    statusTone: hasWallet ? 'live' : 'pending',
    story: [
      { kind: 'headline', label: 'Wallet index', value: indexLine },
      { kind: 'row', label: 'Driver', value: driver },
      { kind: 'row', label: 'Action', value: action },
    ],
    footerHint: VIEW_AFTER_SCAN,
    actionType: LAYER_ACTION_TYPES.WALLET,
    buttonLabel: LAYER_BUTTON_LABELS.wallet,
  }
}
