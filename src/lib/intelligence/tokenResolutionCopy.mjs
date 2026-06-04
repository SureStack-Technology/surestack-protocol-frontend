/**
 * @typedef {{ resolved: boolean, autoSelected?: boolean, address?: string, status?: string }} TokenResolution
 */

import {
  ASSET_INTEL_STATES,
  assetIntelligenceUiCopy,
  resolveAssetIntelligenceState,
} from './assetIntelligenceState.mjs'
import { isMintDetectedOnly, isTokenIdentified } from './tokenResolutionState.mjs'

function isTokenAutoResolved(tokenResolution) {
  return Boolean(tokenResolution?.resolved && tokenResolution?.autoSelected)
}

function hasTokenContractProof(tokenResolution, confirmedTokenContract) {
  return isTokenAutoResolved(tokenResolution) || Boolean(confirmedTokenContract?.address)
}

/** Main body when token is identified pre-scan. */
export const PRELIMINARY_INTEL_BODY =
  'Prime has identified this asset and generated a preliminary intelligence profile using registry, category, and available indexed data. Run Intelligence Scan to validate the contract, liquidity, and trust evidence.'

/** Provider limitation — for coverage sections only, not hero scan card. */
export const PROVIDER_COVERAGE_PRELIMINARY_NOTE =
  'Preliminary intelligence generated from registry, category, and indexed market context. Live narrative and behavior feeds may enhance this result after provider activation.'

/** Token Risk Intelligence mode lead when contract is resolved pre-scan. */
export const TOKEN_RISK_INTEL_PRESCAN_LEAD =
  'Preliminary token intelligence generated from resolved contract identity and category context. Run scanner-backed validation for contract trust, liquidity, and security evidence.'

const ETHEREUM_CHAIN_LINE_PRESCAN =
  'Ethereum contract resolved — Run Contract Analyzer for source verification, admin controls, proxy status, liquidity, and security signals.'

const ETHEREUM_CHAIN_LINE_SCANNED =
  'Ethereum contract scanned — Contract Analyzer evidence available for source verification, admin controls, proxy status, liquidity, and security signals.'

const SOLANA_CHAIN_LINE_PRESCAN =
  'Solana mint resolved — Run Solana Token Scan for authority status, holder concentration, liquidity, and routing evidence.'

const SOLANA_CHAIN_LINE_SCANNED =
  'Solana mint scanned — authority status, holder concentration, liquidity, and routing evidence available.'

const OPTIMISM_CHAIN_LINE_PRESCAN =
  'Optimism contract resolved — Run Contract Analyzer for source verification, admin controls, proxy status, liquidity, and security signals.'

export const UNRESOLVED_ASSET_TITLE = 'Asset could not be identified'
export const UNRESOLVED_ASSET_COPY = 'Enter a valid token symbol or contract address.'

/**
 * @param {object} [report]
 * @param {object} [confirmedTokenContract]
 */
export function isTokenContractResolved(report, confirmedTokenContract = null) {
  if (!report) return false
  if (report.isSolanaToken || report.analysisModeId === 'solana_token') {
    return Boolean(report.solanaMintResolved || report.solanaMintAddress)
  }
  if (hasTokenContractProof(report.tokenResolution, confirmedTokenContract)) return true
  if (report.resolvedContractAddress) return true
  if (report.tokenResolution?.address && report.tokenResolution?.resolved) return true
  if (report.tokenResolution?.status === 'resolved' && report.tokenResolution?.address) return true
  if (
    report.targetClassification?.address &&
    (report.targetClassification?.recommendedModule === 'token' || report.modeId === 'token')
  ) {
    return true
  }
  return false
}

function chainLineForReport(report, hasScan) {
  const chain = String(report?.chainId || report?.tokenResolution?.chainSlug || 'ethereum').toLowerCase()
  if (chain === 'solana') return hasScan ? SOLANA_CHAIN_LINE_SCANNED : SOLANA_CHAIN_LINE_PRESCAN
  if (chain === 'optimism') return OPTIMISM_CHAIN_LINE_PRESCAN
  return hasScan ? ETHEREUM_CHAIN_LINE_SCANNED : ETHEREUM_CHAIN_LINE_PRESCAN
}

/**
 * @param {object} params
 * @returns {{ title: string, subtitle?: string, copy: string, chainLine?: string }}
 */
export function buildTokenResolutionBanner({
  report = null,
  confirmedTokenContract = null,
  hasScan = false,
  isSolana = false,
  solanaMintResolved = false,
  scannerReport = null,
} = {}) {
  const intelState = resolveAssetIntelligenceState({
    report: {
      ...report,
      isSolanaToken: isSolana || report?.isSolanaToken,
      solanaMintResolved: solanaMintResolved || report?.solanaMintResolved,
    },
    scannerReport,
  })
  const ui = assetIntelligenceUiCopy(intelState)

  if (intelState === ASSET_INTEL_STATES.UNKNOWN_ASSET) {
    const unresolved =
      report?.tokenResolution?.status === 'unresolved' &&
      !String(report?.query || '').trim()
    if (unresolved) {
      return {
        title: UNRESOLVED_ASSET_TITLE,
        copy: UNRESOLVED_ASSET_COPY,
      }
    }
    return {
      title: ui.title,
      subtitle: ui.subtitle,
      copy: ui.body,
    }
  }

  if (intelState === ASSET_INTEL_STATES.MINT_DETECTED) {
    return {
      title: ui.title,
      subtitle: ui.subtitle,
      copy: ui.body,
      chainLine: isSolana ? SOLANA_CHAIN_LINE_PRESCAN : chainLineForReport(report, hasScan),
    }
  }

  if (isSolana) {
    if (hasScan) {
      return {
        title: ui.title,
        subtitle: ui.subtitle,
        copy: ui.body,
        chainLine: SOLANA_CHAIN_LINE_SCANNED,
      }
    }
    if (isTokenIdentified(report, confirmedTokenContract) || solanaMintResolved) {
      return {
        title: ui.title,
        subtitle: ui.subtitle,
        copy: ui.body,
        chainLine: SOLANA_CHAIN_LINE_PRESCAN,
      }
    }
    if (isMintDetectedOnly(report)) {
      return {
        title: ui.title,
        subtitle: ui.subtitle,
        copy: ui.body,
        chainLine: SOLANA_CHAIN_LINE_PRESCAN,
      }
    }
    return {
      title: UNRESOLVED_ASSET_TITLE,
      copy: UNRESOLVED_ASSET_COPY,
    }
  }

  const resolved = isTokenContractResolved(report, confirmedTokenContract)
  const tokenResolution = report?.tokenResolution

  if (resolved && isTokenIdentified(report, confirmedTokenContract)) {
    return {
      title: ui.title,
      subtitle: hasScan ? ui.subtitle : ui.subtitle,
      copy: hasScan ? ui.body : ui.body || PRELIMINARY_INTEL_BODY,
      chainLine: chainLineForReport(report, hasScan),
    }
  }

  if (resolved && isMintDetectedOnly(report)) {
    return {
      title: ui.title,
      subtitle: ui.subtitle,
      copy: ui.body,
      chainLine: chainLineForReport(report, hasScan),
    }
  }

  if (tokenResolution?.confirmationRequired && tokenResolution?.candidates?.length) {
    return {
      title: tokenResolution.bannerTitle || 'Candidate contract found',
      copy: tokenResolution.message || 'Confirm this is the token you want to scan.',
    }
  }

  if (tokenResolution?.manualOnly) {
    return {
      title: tokenResolution.bannerTitle || 'Manual contract required',
      copy: tokenResolution.message || 'Paste the exact contract address before scanning.',
    }
  }

  return {
    title: UNRESOLVED_ASSET_TITLE,
    copy: UNRESOLVED_ASSET_COPY,
  }
}

/**
 * @param {object} target
 * @param {{ title: string, subtitle?: string, copy: string, chainLine?: string }} banner
 */
export function applyTokenResolutionBanner(target, banner) {
  if (!target || !banner) return
  target.mintProofTitle = banner.title
  target.contractProofSubtitle = banner.subtitle || null
  target.contractProofNote = banner.copy
  target.contractProofChainLine = banner.chainLine || null
}

export function buildTokenResolvedVerdictLead({ hasScan = false, isSolana = false } = {}) {
  if (hasScan) {
    if (isSolana) {
      return 'Solana mint scanned — liquidity, holder concentration, and authority evidence available.'
    }
    return 'Token contract scanned — trust proof is scanner-backed via Contract Intelligence Engine.'
  }
  if (isSolana) {
    return TOKEN_RISK_INTEL_PRESCAN_LEAD
  }
  return TOKEN_RISK_INTEL_PRESCAN_LEAD
}

export function tokenRegistryResolvedMessage() {
  return 'Token identified and contract resolved.'
}

export function tokenRegistryScanPrompt() {
  return 'Run Intelligence Scan for scanner-backed contract, liquidity, and trust analysis.'
}

export { isTokenAutoResolved, hasTokenContractProof }
