import {
  recommendationFromTrustBand,
  verdictFromTrustBand,
  verdictToneClass,
} from '@/utils/universalRiskScannerFormat.js'
import {
  buildTokenConcentrationIntelligenceRows,
  verdictSubtitleFromReport,
} from '@/utils/tokenConcentrationFormat.js'
import { buildConfidenceView } from '@/utils/scannerConfidenceFormat.js'

function isRegulatedStablecoinReport(report) {
  return Boolean(report?.regulatedStablecoin) || report?.archetypeId === 'usdc_solana' || report?.archetypeId === 'usdt_solana'
}

function formatMintAuthorityDisplay(report) {
  if (report.mintAuthority == null || report.mintAuthority === '') return 'Revoked / not set'
  if (isRegulatedStablecoinReport(report)) {
    return 'Issuer mint control active — typical for regulated stablecoins'
  }
  const s = String(report.mintAuthority)
  if (s.length > 12) return `Active (${s.slice(0, 4)}…${s.slice(-4)})`
  return `Active (${s})`
}

function formatFreezeAuthorityDisplay(report) {
  if (report.freezeAuthority == null || report.freezeAuthority === '') return 'Revoked / not set'
  if (isRegulatedStablecoinReport(report)) {
    return 'Issuer freeze control active — expected for regulated stablecoins'
  }
  const s = String(report.freezeAuthority)
  if (s.length > 12) return `Active (${s.slice(0, 4)}…${s.slice(-4)})`
  return `Active (${s})`
}

/**
 * @param {object} report — Solana scan API payload
 */
export function buildSolanaRiskScanView(report) {
  const addressType = report.addressType

  if (addressType === 'WALLET' || report.isScorable === false && addressType === 'WALLET') {
    return {
      chain: 'solana',
      verdict: 'SOLANA WALLET',
      verdictTone: 'prime-scanner-verdict--neutral',
      trustScore: null,
      recommendation: 'USE WALLET INTELLIGENCE',
      narrative: report.interpretationSummary,
      findings: report.findings || [],
      intelligence: [
        { label: 'Account type', value: 'Solana wallet account' },
        { label: 'Executable program', value: 'No executable program detected' },
        { label: 'Trust score', value: 'Not applicable' },
        { label: 'Activity', value: report.accountActivity || '—' },
        { label: 'Guidance', value: 'Review counterparties and signing context before transacting' },
      ],
    }
  }

  if (addressType === 'TOKEN_ACCOUNT') {
    return {
      chain: 'solana',
      verdict: 'TOKEN ACCOUNT',
      verdictTone: 'prime-scanner-verdict--neutral',
      trustScore: null,
      recommendation: 'SCAN TOKEN MINT',
      narrative: report.interpretationSummary,
      findings: report.findings || [],
      intelligence: [
        { label: 'Account type', value: 'SPL token account (holder)' },
        { label: 'Linked mint', value: report.linkedMint || 'Unknown' },
        { label: 'Trust score', value: 'Scan the mint address for token risk' },
      ],
    }
  }

  if (addressType === 'PROGRAM') {
    const verdict = verdictFromTrustBand(report.trustBand) || 'MODERATE RISK'
    return {
      chain: 'solana',
      verdict,
      verdictTone: verdictToneClass(verdict),
      trustScore: report.trustScore,
      confidence: buildConfidenceView(report),
      recommendation: recommendationFromTrustBand(report.trustBand, true),
      narrative: report.interpretationSummary,
      findings: report.findings || [],
      intelligence: [
        {
          label: 'Upgrade authority',
          value: report.upgradeable
            ? 'Upgradeable loader — authority may change program logic'
            : 'Non-upgradeable or standard loader surface',
        },
        {
          label: 'Executable program',
          value: report.executable ? 'Executable on-chain program' : 'Not executable',
        },
        { label: 'Program reputation', value: report.programReputation || '—' },
        { label: 'Deployment signals', value: report.deploymentSignals || '—' },
        {
          label: 'Behavioral heuristics',
          value:
            report.trustBand === 'TRUSTED'
              ? 'Normal production program activity'
              : 'Review program provenance before signing',
        },
        { label: 'Program type', value: report.archetypeLabel || 'Solana program' },
      ],
    }
  }

  if (addressType === 'SPL_TOKEN_MINT') {
    const verdict = verdictFromTrustBand(report.trustBand) || 'MODERATE RISK'
    const tokenIntel = buildTokenConcentrationIntelligenceRows(report)
    return {
      chain: 'solana',
      verdict,
      verdictTone: verdictToneClass(verdict),
      verdictSubtitle: verdictSubtitleFromReport(report),
      trustScore: report.trustScore,
      confidence: buildConfidenceView(report),
      recommendation: recommendationFromTrustBand(report.trustBand, true),
      narrative: report.interpretationSummary,
      findings: report.findings || [],
      intelligence: [
        { label: 'Mint authority', value: formatMintAuthorityDisplay(report) },
        { label: 'Freeze authority', value: formatFreezeAuthorityDisplay(report) },
        {
          label: 'Supply',
          value: report.supply != null ? String(report.supply) : 'Unavailable',
        },
        {
          label: 'Metadata',
          value: report.metadataPresent ? 'Metadata signals present' : 'Metadata not resolved on RPC',
        },
        ...tokenIntel,
        { label: 'Token type', value: report.archetypeLabel || 'SPL token mint' },
        {
          label: 'Behavioral heuristics',
          value: isRegulatedStablecoinReport(report)
            ? 'Issuer controls present — standard for regulated stablecoins; review custody and concentration'
            : report.tokenConcentration?.tradingBehavior ||
              (report.mintAuthority || report.freezeAuthority
                ? 'Privileged mint or freeze authorities require review'
                : 'Standard SPL mint surface — review holder concentration'),
        },
      ],
    }
  }

  return {
    chain: 'solana',
    verdict: 'UNKNOWN',
    verdictTone: 'prime-scanner-verdict--neutral',
    trustScore: null,
    recommendation: 'PROCEED WITH CAUTION',
    narrative: report.interpretationSummary || 'Unable to classify this Solana address.',
    findings: report.findings || [],
    intelligence: [{ label: 'Address type', value: 'Unknown Solana address' }],
  }
}

function formatHolderConcentration(v) {
  switch (v) {
    case 'CONCENTRATED':
      return 'Concentrated holder set'
    case 'DISPERSED':
      return 'Dispersed holder sample'
    case 'LOW_COUNT':
      return 'Low holder count in sample'
    case 'NOT_AVAILABLE':
      return 'Holder data unavailable'
    default:
      return 'Not classified'
  }
}
