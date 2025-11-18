import React, { useState } from 'react'
import { useValidatorLeaderboard } from '../hooks/useValidatorLeaderboard'
import { formatAddress } from '../utils/formatters'
import { Trophy, TrendingUp, Award, Users } from 'lucide-react'

export default function ValidatorLeaderboard() {
  const [error, setError] = useState(null)

  let validators = []
  let loading = false

  try {
    const leaderboardData = useValidatorLeaderboard()
    validators = leaderboardData?.validators || []
    loading = leaderboardData?.loading || false
    console.log('✅ Leaderboard data fetched', { count: validators.length })
  } catch (err) {
    console.error('❌ Error in useValidatorLeaderboard:', err)
    setError(`Failed to load leaderboard: ${err.message}`)
  }

  // Ensure validators is always an array
  const safeValidators = Array.isArray(validators) ? validators : []

  // Get top 3 for special highlighting
  const topThree = safeValidators.slice(0, 3)
  const rest = safeValidators.slice(3)

  if (loading) {
    return (
      <div className="glassmorphism rounded-2xl p-8 text-white animate-fade-in">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="opacity-70">Loading validator data…</p>
        </div>
      </div>
    )
  }

  if (!Array.isArray(validators)) {
    return (
      <div className="glassmorphism rounded-2xl p-8 text-white animate-fade-in">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="opacity-70">Loading validator data…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glassmorphism rounded-2xl p-6 text-white animate-fade-in">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glassmorphism rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gradient-primary flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Validator Leaderboard
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users className="w-4 h-4" />
            <span>{safeValidators.length} Validators</span>
          </div>
        </div>

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {topThree.map((v, i) => {
            const rank = i + 1
            const medals = ['🥇', '🥈', '🥉']
            const heights = ['h-24', 'h-20', 'h-16']
            const colors = [
              'from-yellow-400 to-amber-500',
              'from-gray-300 to-gray-400',
              'from-orange-400 to-orange-500',
            ]

            return (
              <div
                key={v.address}
                className={`flex flex-col items-center p-4 rounded-xl bg-gradient-to-br ${colors[i]} text-white shadow-lg transform transition-all duration-300 hover:scale-105`}
              >
                <div className="text-3xl mb-2">{medals[i]}</div>
                <div className="text-xs font-semibold mb-1">Rank #{rank}</div>
                <div className="text-xs font-mono mb-2 truncate w-full text-center">
                  {formatAddress(v.address)}
                </div>
                <div className="text-sm font-bold">{v.staked.toLocaleString(undefined, { maximumFractionDigits: 0 })} SST</div>
                <div className="text-xs opacity-90">{v.accuracy.toFixed(2)}% accuracy</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-gray-400 border-b border-white/10">
              <th className="py-3 px-2">Rank</th>
              <th className="py-3 px-2">Address</th>
              <th className="py-3 px-2 text-right">Staked (SST)</th>
              <th className="py-3 px-2 text-right">Accuracy (%)</th>
              <th className="py-3 px-2 text-right">Rewards (SST)</th>
              <th className="py-3 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {safeValidators.map((v, i) => {
              const rank = i + 1
              const isTopThree = rank <= 3

              return (
                <tr
                  key={v.address || i}
                  className={`border-b border-white/5 hover:bg-white/5 transition-all ${
                    isTopThree ? 'bg-white/5' : ''
                  }`}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {rank <= 3 && <Trophy className="w-4 h-4 text-yellow-400" />}
                      <span className="font-semibold">{rank}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {v.address ? (
                        <>
                          <span className="font-mono text-xs truncate max-w-[140px]">
                            {formatAddress(v.address)}
                          </span>
                          <a
                            href={`https://sepolia.etherscan.io/address/${v.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-semibold">
                    {v.staked ? v.staked.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span>{v.accuracy ? v.accuracy.toFixed(2) : '0.00'}%</span>
                      {v.accuracy >= 90 && (
                        <Award className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-green-400">
                    {v.rewards ? v.rewards.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        v.active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {v.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              )
            })}
            {safeValidators.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-8 opacity-60">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No validators registered yet.</p>
                  <p className="text-xs mt-1">Validators will appear here once they stake tokens</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {safeValidators.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Total Staked</p>
            <p className="text-lg font-semibold text-white">
              {safeValidators.reduce((sum, v) => sum + (v.staked || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} SST
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Avg Accuracy</p>
            <p className="text-lg font-semibold text-white">
              {safeValidators.length > 0
                ? (safeValidators.reduce((sum, v) => sum + (v.accuracy || 0), 0) / safeValidators.length).toFixed(2)
                : '0.00'}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Total Rewards</p>
            <p className="text-lg font-semibold text-green-400">
              {safeValidators.reduce((sum, v) => sum + (v.rewards || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} SST
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

