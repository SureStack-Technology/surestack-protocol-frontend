import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import EnterpriseBadge from '@/components/ui/EnterpriseBadge.jsx'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'
import { formatNumber, formatDate } from '@/utils/formatters'
import { X, CheckCircle2, XCircle, TrendingUp, FileText, Clock, Copy } from 'lucide-react'

export default function BusinessClaimsPage() {
  const {
    loading,
    error,
    protocol,
    rewards,
  } = useProtocolAnalytics()

  const totals = {
    totalPolicies: protocol?.totalPolicies ?? 0,
    totalCoverageUSD: protocol?.totalCoverageUSD ?? 0,
    totalPremiums: protocol?.totalPremiums ?? 0,
    totalRewardsDistributed: rewards?.totalRewardsDistributed ?? 0,
  }

  const statusDisplayMap = {
    'Under Review': 'Under Review',
    Settled: 'Settled',
    Escalated: 'Escalated',
    'Awaiting Review': 'Awaiting Review',
  }

  const claimFeed = useMemo(
    () => [
      {
        id: 'CLM-2894',
        wallet: '0x8F3c...91B2',
        incidentType: 'Oracle Failure',
        timestamp: 1731043200,
        coverageTier: 'Premium',
        premiumPaid: '8,500 SST',
        requestedPayout: '65,000 SST',
        status: 'Under Review',
        timeline: [
          { label: 'Submitted', at: '2025-10-15 11:24 UTC' },
          { label: 'Under Review', at: '2025-10-15 12:40 UTC' },
        ],
        notes: [{ message: 'Initial log review complete. Chainlink outage confirmed.', at: '2025-10-15 13:10 UTC' }],
      },
      {
        id: 'CLM-2870',
        wallet: '0x12A4...CC09',
        incidentType: 'Custody Theft',
        timestamp: 1730785200,
        coverageTier: 'Advanced',
        premiumPaid: '4,200 SST',
        requestedPayout: '24,500 SST',
        status: 'Settled',
        timeline: [
          { label: 'Submitted', at: '2025-10-12 08:01 UTC' },
          { label: 'Under Review', at: '2025-10-12 09:45 UTC' },
          { label: 'Settled', at: '2025-10-12 15:32 UTC' },
        ],
        notes: [
          { message: 'Custodian confirmed incident. Coverage validated.', at: '2025-10-12 10:20 UTC' },
          { message: 'Settlement executed. Reinsurance desk notified.', at: '2025-10-12 15:45 UTC' },
        ],
      },
      {
        id: 'CLM-2802',
        wallet: '0xEA98...4431',
        incidentType: 'Smart Contract Exploit',
        timestamp: 1730176800,
        coverageTier: 'Basic',
        premiumPaid: '1,750 SST',
        requestedPayout: '12,000 SST',
        status: 'Escalated',
        timeline: [
          { label: 'Submitted', at: '2025-10-05 19:45 UTC' },
          { label: 'Under Review', at: '2025-10-05 21:10 UTC' },
          { label: 'Escalated', at: '2025-10-05 22:05 UTC' },
        ],
        notes: [{ message: 'Awaiting audit diff from security partner.', at: '2025-10-05 22:15 UTC' }],
      },
    ],
    []
  )

  const [selectedClaim, setSelectedClaim] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notes, setNotes] = useState(() =>
    claimFeed.reduce((acc, claim) => {
      acc[claim.id] = claim.notes || []
      return acc
    }, {})
  )
  const [draftNote, setDraftNote] = useState('')

  const openDrawerForClaim = (claim) => {
    setSelectedClaim(claim)
    setDrawerOpen(true)
    setDraftNote('')
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setSelectedClaim(null)
    setDraftNote('')
  }

  const handleAddNote = () => {
    if (!selectedClaim || !draftNote.trim()) return
    const newEntry = {
      message: draftNote.trim(),
      at: new Date().toISOString().replace('T', ' ').replace('Z', ' UTC'),
    }
    setNotes((prev) => ({
      ...prev,
      [selectedClaim.id]: [newEntry, ...(prev[selectedClaim.id] || [])],
    }))
    setDraftNote('')
  }

  const handleCopy = async (value, event) => {
    event?.stopPropagation?.()
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch (err) {
      console.error('Failed to copy claim ID:', err)
    }
  }

  const handleAction = (action) => {
    if (!selectedClaim) return
    console.log(`Action: ${action} for ${selectedClaim.id}`)
    closeDrawer()
  }

  const renderStatusBadge = (label) => {
    const styles = {
      'Awaiting Review': 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
      'Under Review': 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
      Escalated: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
      Settled: 'bg-green-500/15 text-green-300 border border-green-500/30',
    }
    return styles[label] || styles['Awaiting Review']
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="glass-card p-4 space-y-2"
      >
        <h1 className="text-3xl font-heading text-[var(--primary-cyan)] flex items-center">
          Enterprise Claims
          <EnterpriseBadge />
        </h1>
        <div className="w-20 h-1 bg-primary-cyan/40 rounded-full animate-pulse" />
        <p className="text-sm text-[color:rgba(200,228,255,0.7)]">
          Review high severity incidents, escalate underwriting actions, and coordinate reinsurance responses.
        </p>
      </motion.header>

      {error && (
        <div className="glass-card p-4 border border-amber-400/30 bg-amber-500/10 text-amber-100 text-sm">
          Claims analytics are currently unavailable. Displaying cached event data when possible.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Policies Under Management</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : totals.totalPolicies.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">Potential claim sources</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Coverage at Risk</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `$${formatNumber(totals.totalCoverageUSD, 0)}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">USD of active coverage</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Premium Buffer</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `${formatNumber(totals.totalPremiums, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Liquidity available for claims</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.7)] mb-1">Rewards Distributed</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '…' : `${formatNumber(totals.totalRewardsDistributed, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Validator incentives issued</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
        className="space-y-4"
      >
        {claimFeed.map((claim) => {
          const statusLabel = statusDisplayMap[claim.status] || statusDisplayMap['Awaiting Review']
          return (
          <motion.div
            key={claim.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => openDrawerForClaim(claim)}
            className="card-dark cursor-pointer hover:border-cyan-400/50 transition-colors"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-heading text-white">Claim #{claim.id}</h3>
                    <button
                      onClick={(event) => handleCopy(claim.id, event)}
                      title="Copy claim identifier"
                      className="flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {claim.incidentType} • {claim.coverageTier} Tier
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${renderStatusBadge(statusLabel)}`}>
                  {statusLabel.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-200">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-[0.24em] mb-1">Wallet / Address</p>
                  <p className="font-mono text-slate-100">{claim.wallet}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-[0.24em] mb-1">Premium Paid</p>
                  <p className="text-slate-100">{claim.premiumPaid}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-[0.24em] mb-1">Requested Payout</p>
                  <p className="text-emerald-300" title="Requested payout amount in SST">
                    {claim.requestedPayout}
                  </p>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatDate(claim.timestamp)}
                </span>
                <span className="flex items-center gap-2" title="Hover to view status transition summary">
                  <FileText className="h-4 w-4" />
                  Status timeline: {claim.timeline.map((step) => step.label).join(' → ')}
                </span>
              </div>
            </div>
          </motion.div>
        )})}
      </motion.div>

      {drawerOpen && selectedClaim && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={closeDrawer} />
          <aside className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0f1729] border-l border-white/10 z-50 flex flex-col">
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Claim</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-heading text-white">#{selectedClaim.id}</h2>
                  <button
                    onClick={(event) => handleCopy(selectedClaim.id, event)}
                    title="Copy claim identifier"
                    className="flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <section className="space-y-3">
                <h3 className="text-lg font-heading text-white">Claim Details</h3>
                <div className="grid grid-cols-1 gap-3 text-sm text-slate-200">
                  <Detail label="Wallet / Address" value={selectedClaim.wallet} mono />
                  <Detail label="Incident Type" value={selectedClaim.incidentType} />
                  <Detail label="Timestamp" value={formatDate(selectedClaim.timestamp)} />
                  <Detail label="Coverage Tier" value={selectedClaim.coverageTier} />
                  <Detail label="Premium Paid" value={selectedClaim.premiumPaid} />
                  <Detail label="Requested Payout" value={selectedClaim.requestedPayout} />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-heading text-white">Status Timeline</h3>
                <div className="space-y-2 text-sm text-slate-300">
                  {selectedClaim.timeline.map((step) => (
                    <div
                      key={step.label}
                      className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
                      title={`Status "${step.label}" recorded at ${step.at}`}
                    >
                      <span className="font-medium">{step.label}</span>
                      <span className="text-xs text-slate-400">{step.at}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-heading text-white">Actions</h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleAction('approve')}
                    className="btn-brand flex items-center gap-2 justify-center"
                    title="Approve and settle this claim"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve Claim
                  </button>
                  <button
                    onClick={() => handleAction('reject')}
                    className="btn-outline flex items-center gap-2 justify-center text-rose-300 border-rose-500/40 hover:bg-rose-500/10"
                    title="Reject claim and notify applicant"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Claim
                  </button>
                  <button
                    onClick={() => handleAction('escalate')}
                    className="flex items-center gap-2 justify-center bg-transparent border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 px-4 py-2 rounded-md text-sm transition-colors"
                    title="Escalate claim to underwriting committee"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Escalate to Underwriting
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-heading text-white">Underwriter Notes</h3>
                <textarea
                  value={draftNote}
                  onChange={(event) => setDraftNote(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-white/15 bg-white/5 text-sm text-white px-3 py-2 focus:outline-none focus:border-cyan-400"
                  placeholder="Add note for fellow underwriters…"
                  title="Share a quick update with underwriting team"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddNote}
                    className="btn-outline text-sm px-4 py-2"
                    title="Save note to this claim"
                  >
                    Save Note
                  </button>
                </div>
                <div className="space-y-3">
                  {(notes[selectedClaim.id] || []).map((note, idx) => (
                    <div key={`${note.at}-${idx}`} className="border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200">
                      <p>{note.message}</p>
                      <p className="text-xs text-slate-500 mt-1">{note.at}</p>
                    </div>
                  ))}
                  {(notes[selectedClaim.id] || []).length === 0 && (
                    <p className="text-xs text-slate-500">No notes yet. Add the first update above.</p>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </>
      )}
    </motion.section>
  )
}

function Detail({ label, value, mono = false }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p
        className={mono ? 'font-mono text-white break-all text-sm' : 'text-white text-sm'}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </p>
    </div>
  )
}

