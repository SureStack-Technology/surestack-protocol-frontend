import React, { useState, useEffect } from 'react'

const tiers = [
  {
    id: 0,
    name: 'Tier 0 – Community',
    min: 1000,
    multiplier: 1.0,
    color: 'from-[var(--primary-blue)] to-[var(--primary-cyan)]',
    icon: '👥',
    description: 'Entry-level validator tier'
  },
  {
    id: 1,
    name: 'Tier 1 – Regular',
    min: 10000,
    multiplier: 1.2,
    color: 'from-[var(--primary-magenta)] to-[var(--primary-cyan)]',
    icon: '⭐',
    description: 'Enhanced rewards for committed validators'
  },
  {
    id: 2,
    name: 'Tier 2 – Institutional',
    min: 50000,
    multiplier: 1.5,
    color: 'from-yellow-400 to-orange-500',
    icon: '🏆',
    description: 'Maximum rewards for institutional validators'
  },
]

export default function ValidatorTierCards({ currentStake = 0 }) {
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log('✅ ValidatorTierCards mounted')
  }, [])

  let currentStakeNum = 0
  try {
    currentStakeNum = typeof currentStake === 'string' ? parseFloat(currentStake) : (currentStake || 0)
    if (isNaN(currentStakeNum)) currentStakeNum = 0
  } catch (err) {
    console.error('❌ Error parsing currentStake:', err)
    setError('Invalid stake amount')
    currentStakeNum = 0
  }

  if (error) {
    return (
      <div className="glassmorphism rounded-2xl p-6 text-white animate-fade-in mb-6">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glassmorphism rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 animate-fade-in mb-6">
      <h2 className="text-2xl font-semibold mb-6 text-gradient-primary">🎯 Validator Tiers</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const active = currentStakeNum >= tier.min
          const progress = Math.min((currentStakeNum / tier.min) * 100, 100)

          return (
            <div
              key={tier.id}
              className={`p-6 rounded-2xl bg-gradient-to-br ${tier.color} shadow-lg text-white transform transition-all duration-300 hover:scale-105 ${
                active ? 'ring-4 ring-[color:rgba(0,234,240,0.45)]' : 'opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{tier.icon}</span>
                {active && (
                  <span className="px-3 py-1 rounded-full bg-white/30 text-sm font-medium animate-pulse">
                    Active
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-semibold mb-2">{tier.name}</h3>
              
              <p className="text-sm opacity-90 mb-2">{tier.description}</p>
              
              <div className="mb-3">
                <p className="text-sm opacity-80 mb-1">Min Stake: {tier.min.toLocaleString()} SST</p>
                <p className="text-sm opacity-80 mb-2">Reward Multiplier: ×{tier.multiplier}</p>
                
                {/* Always show progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1 opacity-90">
                    <span>Progress to {tier.name}</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-[rgba(255,255,255,0.18)] rounded-full overflow-hidden">
                    <div
                      className="h-2 transition-all duration-700"
                      style={{
                        width: `${Math.min(100, progress)}%`,
                        background: 'linear-gradient(90deg, var(--primary-blue), var(--primary-cyan))',
                      }}
                    />
                  </div>
                  {!active && currentStakeNum > 0 && (
                    <p className="text-xs mt-1 opacity-80">
                      Need {(tier.min - currentStakeNum).toLocaleString(undefined, { maximumFractionDigits: 0 })} more SST
                    </p>
                  )}
                </div>
              </div>

              {!active && (
                <span className="px-3 py-1 rounded-full bg-black/30 text-sm font-medium">
                  Locked
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

