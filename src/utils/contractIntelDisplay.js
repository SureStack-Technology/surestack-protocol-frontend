export function formatHoneypotLabel(value) {
  const v = String(value || '')
  const map = {
    UNDETERMINED: 'No honeypot classification detected',
    NOT_APPLICABLE: 'Not applicable',
    LOW: 'No malicious token signals detected',
    HIGH: 'Malicious token signal detected',
  }
  return map[v] || 'Classification unavailable'
}

export function formatOwnershipLabel(value) {
  const v = String(value || '')
  const map = {
    NOT_DISCLOSED: 'Administrative ownership not externally disclosed',
    NOT_APPLICABLE: 'Not applicable',
    CONCENTRATED: 'Concentrated holder set',
    DISPERSED: 'Dispersed holder base',
  }
  return map[v] || 'Ownership classification unavailable'
}

export function formatProxyLabel(upgradeable) {
  return upgradeable
    ? 'Upgradeable proxy architecture detected'
    : 'Non-upgradeable contract surface'
}
