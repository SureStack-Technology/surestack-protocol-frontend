import { useState } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuditTrail } from '../hooks/useAuditTrail'
import { formatDate, formatAddress } from '../utils/formatters'
import { FileText, Activity, TrendingUp } from 'lucide-react'

export default function AuditTrail() {
  const { isConnected } = useWeb3()
  const [filter, setFilter] = useState('all')
  const { events, loading, error } = useAuditTrail(filter)

  const baseButton = 'px-4 py-2 rounded-lg font-subheading uppercase tracking-[0.24em] text-xs transition-all duration-300 border';
  const activeButton = 'bg-[rgba(0,255,240,0.18)] text-[#00fff0] border-[rgba(0,255,240,0.45)] shadow-[0_0_18px_rgba(0,255,240,0.35)]';
  const inactiveButton = 'bg-transparent text-slate-300 border-[rgba(0,255,240,0.12)] hover:bg-[rgba(0,255,240,0.08)] hover:text-[#00fff0]';

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true
    if (filter === 'PolicyManager') return e.contract === 'PolicyManager'
    if (filter === 'Consensus') return e.contract === 'Consensus'
    if (filter === 'RewardPool') return e.contract === 'RewardPool'
    return true
  })

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Please connect your wallet to view audit trail</p>
      </div>
    )
  }

  return (
    <div className="p-6 glass-panel holo-card space-y-6 text-slate-100">
      <div className="mb-6">
        <h1 className="text-3xl font-heading gradient-text mb-2">Audit Trail</h1>
        <p className="text-slate-400">Real-time on-chain event logs from all contracts</p>
      </div>

      <div className="glass-panel rounded-2xl p-4 card-hoverable">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`${baseButton} ${filter === 'all' ? activeButton : inactiveButton}`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            All Events
          </button>
          <button
            onClick={() => setFilter('PolicyManager')}
            className={`${baseButton} ${filter === 'PolicyManager' ? activeButton : inactiveButton}`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            PolicyManager
          </button>
          <button
            onClick={() => setFilter('Consensus')}
            className={`${baseButton} ${filter === 'Consensus' ? activeButton : inactiveButton}`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Consensus
          </button>
          <button
            onClick={() => setFilter('RewardPool')}
            className={`${baseButton} ${filter === 'RewardPool' ? activeButton : inactiveButton}`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            RewardPool
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/15 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-300 font-semibold">Error:</p>
          <p className="text-red-200 text-sm mt-1">{error}</p>
        </div>
      )}

      <div className="glass-panel rounded-2xl p-6 animate-fade-in space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgba(0,255,240,0.6)]"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No events found for this filter</p>
        ) : (
          filteredEvents.map((event, idx) => (
            <div
              key={`${event.txHash}-${idx}`}
              className="holo-card p-4 transition-all duration-300 card-hoverable border border-[rgba(0,255,240,0.25)]"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{event.icon || '📋'}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-[rgba(0,255,240,0.12)] text-[#00fff0] border border-[rgba(0,255,240,0.2)]">
                      {event.contract}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-[rgba(255,0,255,0.12)] text-[#ff80ff] border border-[rgba(255,0,255,0.2)]">
                      {event.event}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{formatDate(event.timestamp * 1000)}</span>
              </div>
              <div className="mt-3 space-y-2">
                {Object.entries(event.data || {}).map(([key, value]) => (
                  <p key={key} className="text-sm">
                    <span className="font-medium text-slate-400">{key}:</span>{' '}
                    <span className="text-slate-100">
                      {typeof value === 'string' && value.startsWith('0x')
                        ? formatAddress(value)
                        : String(value)}
                    </span>
                  </p>
                ))}
              </div>
              <a
                href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#00fff0] hover:text-[#7fffd4] hover:underline mt-3 inline-block"
              >
                View on Etherscan →
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

