/**
 * Prime terminal scanner scope — prevents stale contract intel across target changes.
 */

export function normalizeEthAddress(input) {
  const s = String(input || '').trim()
  return /^0x[a-fA-F0-9]{40}$/i.test(s) ? s.toLowerCase() : null
}

/**
 * @param {object} p
 * @param {string} p.query
 * @param {string} p.modeId — active or report mode
 * @param {object | null} [p.confirmedTokenContract]
 * @param {object | null} [p.tokenResolution]
 * @param {string | null} [p.protocolActiveScanAddress] — set only after user scans from protocol profile
 */
export function computePrimeScannerScope({
  query,
  modeId,
  confirmedTokenContract = null,
  tokenResolution = null,
  protocolActiveScanAddress = null,
}) {
  const q = String(query || '').trim()
  const qKey = q.toLowerCase()

  if (modeId === 'wallet') {
    return {
      allowScannerEvidence: false,
      activeContractAddress: null,
      scopeKey: `wallet:${qKey}`,
    }
  }

  if (modeId === 'protocol') {
    const protoAddr = normalizeEthAddress(protocolActiveScanAddress)
    return {
      allowScannerEvidence: Boolean(protoAddr),
      activeContractAddress: protoAddr,
      scopeKey: `protocol:${qKey}:${protoAddr || 'none'}`,
    }
  }

  if (modeId === 'token') {
    const registryAddr =
      tokenResolution?.autoSelected && tokenResolution?.address
        ? normalizeEthAddress(tokenResolution.address)
        : null
    const confirmedAddr = normalizeEthAddress(confirmedTokenContract?.address)
    const addr = confirmedAddr || registryAddr
    return {
      allowScannerEvidence: Boolean(addr),
      activeContractAddress: addr,
      scopeKey: `token:${q.toUpperCase()}:${addr || 'pending'}`,
    }
  }

  if (modeId === 'contract') {
    const addr = normalizeEthAddress(q)
    return {
      allowScannerEvidence: Boolean(addr),
      activeContractAddress: addr,
      scopeKey: `contract:${addr || qKey}`,
    }
  }

  if (modeId === 'approval') {
    const addr = normalizeEthAddress(q) || extractEthAddressFromText(q)
    return {
      allowScannerEvidence: Boolean(addr),
      activeContractAddress: addr,
      scopeKey: `approval:${addr || qKey}`,
    }
  }

  return {
    allowScannerEvidence: false,
    activeContractAddress: null,
    scopeKey: `${modeId || 'default'}:${qKey}`,
  }
}

function extractEthAddressFromText(text) {
  const m = String(text || '').match(/0x[a-fA-F0-9]{40}/)
  return m ? m[0].toLowerCase() : null
}

/**
 * @param {object | null} report
 * @param {object} scope
 */
export function isScannerReportInScope(report, scope) {
  if (!report || !scope?.allowScannerEvidence || !scope.activeContractAddress) return false
  const reportAddr = normalizeEthAddress(report.address)
  return reportAddr === scope.activeContractAddress
}
