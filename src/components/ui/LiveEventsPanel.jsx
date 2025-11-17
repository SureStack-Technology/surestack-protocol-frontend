import { useEffect, useRef } from 'react'
import { useEventStream } from '@shared/hooks/useEventStream'
import { ethers } from 'ethers'

const EVENT_COLORS = {
  ClaimProcessed: 'text-green-400 bg-green-500/10 border-green-500/30',
  PolicyCreated: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  Staked: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  RewardDistributed: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  ProposalCreated: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  VoteCast: 'text-[var(--primary-cyan)] bg-[color:var(--surface-cyan-soft)] border-[var(--glass-border)]',
}

const EVENT_ICONS = {
  ClaimProcessed: '🟢',
  PolicyCreated: '🔵',
  Staked: '🟣',
  RewardDistributed: '🟠',
  ProposalCreated: '🟡',
  VoteCast: '🔷',
}

export default function LiveEventsPanel() {
  const { events, isStreaming } = useEventStream()
  const scrollRef = useRef(null)
  const prevEventsLength = useRef(0)

  // Auto-scroll to top when new event arrives
  useEffect(() => {
    if (events.length > prevEventsLength.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0
      // Add pulse animation
      const panel = scrollRef.current.closest('.live-events-panel')
      if (panel) {
        panel.classList.add('pulse')
        setTimeout(() => panel.classList.remove('pulse'), 500)
      }
    }
    prevEventsLength.current = events.length
  }, [events.length])

  const formatValue = (value, type) => {
    if (!value || value === '0') {
      if (type === 'ProposalCreated' || type === 'VoteCast') {
        return '—'
      }
      return '0 SST'
    }
    
    try {
      const formatted = ethers.formatUnits(value, 18)
      const num = parseFloat(formatted)
      if (num < 0.01) {
        return '< 0.01 SST'
      }
      return `${num.toFixed(2)} SST`
    } catch {
      return `${value} SST`
    }
  }

  const formatAddress = (addr) => {
    if (!addr || addr === '0x0000000000000000000000000000000000000000') {
      return '—'
    }
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) {
      return 'Just now'
    } else if (diff < 3600000) {
      const mins = Math.floor(diff / 60000)
      return `${mins}m ago`
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="live-events-panel rounded-2xl p-6 bg-gradient-to-br from-slate-900/80 to-indigo-900/30 border border-indigo-500/30 backdrop-blur-lg shadow-lg text-white transition-all duration-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-indigo-300 drop-shadow flex items-center gap-2">
          <span className="text-red-500 animate-pulse">🔴</span>
          Live Events
        </h3>
        {isStreaming && (
          <div className="text-xs text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Streaming
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="flex items-center justify-center h-[350px] text-slate-400">
          <div className="text-center">
            <div className="text-4xl mb-2">⚪</div>
            <div>Waiting for events…</div>
          </div>
        </div>
      ) : (
        <div 
          ref={scrollRef}
          className="overflow-y-auto h-[350px] space-y-2 pr-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(99, 102, 241, 0.5) transparent' }}
        >
          {events.map((event, idx) => {
            const colorClass = EVENT_COLORS[event.type] || 'text-slate-400 bg-slate-500/10 border-slate-500/30'
            const icon = EVENT_ICONS[event.type] || '⚪'
            
            return (
              <div
                key={`${event.txHash}-${idx}`}
                className={`rounded-lg p-3 border ${colorClass} transition-all duration-300 hover:scale-[1.02]`}
                style={{
                  animation: idx === 0 ? 'fadeIn 0.5s ease-in' : 'none'
                }}
              >
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>{icon}</span>
                    <span className="font-semibold truncate">{event.type}</span>
                  </div>
                  <div className="text-right truncate">
                    {formatValue(event.value, event.type)}
                  </div>
                  <div className="text-right truncate font-mono">
                    {formatAddress(event.from)}
                  </div>
                  <div className="text-right text-slate-400">
                    {formatTime(event.timestamp)}
                  </div>
                </div>
                {event.policyId && (
                  <div className="text-xs text-slate-400 mt-1">
                    Policy/Proposal #{event.policyId}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .live-events-panel.pulse {
          box-shadow: 0 0 25px rgba(99, 102, 241, 0.7);
        }
      `}</style>
    </div>
  )
}

