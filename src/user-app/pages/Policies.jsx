import { useMemo, useState } from 'react'
import { useNavigate } from "react-router-dom"
import { motion } from 'framer-motion'

const isTestMode = true // Toggle via configuration in production
const minPortfolio = isTestMode ? 5000 : 10000

const policyCategories = [
  {
    id: 'market-volatility',
    title: 'Market Volatility Protection',
    description: 'Stabilises portfolio losses during rapid price swings, liquidation cascades, or unexpected market reversals.',
  },
  {
    id: 'theft',
    title: 'Theft Protection',
    description: 'Covers unauthorized withdrawals, compromised custody wallets, and operational security failures.',
  },
  {
    id: 'hacks-scams',
    title: 'Hacks & Scams Protection',
    description: 'Protects against phishing, malicious approvals, wallet drains, and protocol-level exploits.',
  },
  {
    id: 'global-shock',
    title: 'Global Shock Protection',
    description: 'Shield against extreme macro events, systemic failures, exchange outages, and coordinated market manipulation.',
  },
]

const coverageRates = [
  {
    id: 'basic',
    label: 'Basic',
    coveragePercent: 25,
    description: 'Entry level resilience for smaller portfolios that need essential recovery.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    coveragePercent: 50,
    description: 'Balanced option for active users seeking meaningful compensation.',
  },
  {
    id: 'premium',
    label: 'Premium',
    coveragePercent: 80,
    description: 'Highest coverage level for users requiring near-total protection.',
  },
]

export default function UserPoliciesPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [portfolioValue, setPortfolioValue] = useState('7500')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedCoverage, setSelectedCoverage] = useState(null)
  const [error, setError] = useState('')

  const resetFlow = () => {
    setStep(1)
    setSelectedCategory(null)
    setSelectedCoverage(null)
    setError('')
  }

  const summary = useMemo(() => {
    if (!selectedCategory || !selectedCoverage) return null
    return {
      category: policyCategories.find((c) => c.id === selectedCategory),
      coverage: coverageRates.find((c) => c.id === selectedCoverage),
    }
  }, [selectedCategory, selectedCoverage])

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-10 text-[color:rgba(200,228,255,0.88)]"
    >
      <header className="glass-card p-8 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-heading text-[var(--primary-cyan)] uppercase tracking-[0.28em]">
              Retail Policies
            </h1>
            <p className="text-sm text-[color:rgba(200,228,255,0.68)] max-w-3xl mt-3">
              Build your SureStack coverage in two quick steps. Choose the incident category you need to
              protect against, then pick the coverage rate that matches your comfort level.
            </p>
          </div>
          {step > 1 && (
            <button onClick={resetFlow} className="btn-outline text-sm">
              Start over
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-[color:rgba(200,228,255,0.6)]">
          <span className={`px-3 py-1 rounded-full border ${step === 1 ? 'border-cyan-400 text-cyan-200' : 'border-transparent bg-white/10'}`}>
            Step 1 — Select Category
          </span>
          <span className={`px-3 py-1 rounded-full border ${step === 2 ? 'border-cyan-400 text-cyan-200' : 'border-transparent bg-white/10'}`}>
            Step 2 — Select Coverage Rate
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
          <label className="uppercase tracking-[0.3em] text-white/50">
            Portfolio Value (USD)
          </label>
          <input
            type="number"
            min="0"
            value={portfolioValue}
            onChange={(event) => {
              setPortfolioValue(event.target.value)
              if (error) setError('')
            }}
            className="input-field w-40 bg-white/5 border border-white/20 text-white text-sm"
          />
        </div>
        <p className="text-xs text-yellow-500 mt-1">
          🔥 Limited-time offer: Minimum only $5,000 USD.
        </p>
        {error && (
          <div className="glass-card border border-rose-500/50 bg-rose-500/10 text-rose-100 px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </header>

      {step === 1 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policyCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setSelectedCategory(category.id)
                const portfolioNumeric = Number(portfolioValue) || 0
                if (portfolioNumeric < minPortfolio) {
                  setError(`Minimum portfolio requirement is $${minPortfolio.toLocaleString()} USD.`)
                  return
                }
                setStep(2)
                setError('')
              }}
              className={`glass-panel p-6 text-left rounded-xl transition border ${
                selectedCategory === category.id ? 'border-cyan-400 shadow-[0_0_24px_rgba(0,255,240,0.2)]' : 'border-white/10 hover:border-cyan-300/60'
              }`}
            >
              <h2 className="text-2xl font-heading text-white mb-2">{category.title}</h2>
              <p className="text-sm text-white/70 leading-relaxed">{category.description}</p>
            </button>
          ))}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <button
            type="button"
            onClick={() => (window.location.href = '/policies')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3"
          >
            ← Back to Retail Policies
          </button>
          <div className="glass-card p-6 rounded-xl border border-cyan-300/30">
            <p className="text-xs uppercase tracking-[0.28em] text-white/60 mb-2">Selected Category</p>
            <h2 className="text-2xl font-heading text-white">
              {policyCategories.find((c) => c.id === selectedCategory)?.title}
            </h2>
            <p className="text-sm text-white/70 mt-2 max-w-2xl">
              Tailor the coverage level to your needs. You can revisit categories at any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coverageRates.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedCoverage(option.id)}
                className={`glass-panel p-6 rounded-xl transition border flex flex-col gap-3 text-left ${
                  selectedCoverage === option.id
                    ? 'border-cyan-400 shadow-[0_0_24px_rgba(0,255,240,0.2)]'
                    : 'border-white/10 hover:border-cyan-300/60'
                }`}
              >
                <h3 className="text-xl font-heading text-white flex items-center justify-between">
                  {option.label}
                  <span className="text-cyan-300 text-sm">{option.coveragePercent}%</span>
                </h3>
                <p className="text-sm text-white/70 flex-1">{option.description}</p>
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Coverage Band
                </span>
              </button>
            ))}
          </div>

          {summary && (
            <div className="glass-card p-6 rounded-xl border border-white/15 space-y-4">
              <h3 className="text-xl font-heading text-white">Coverage Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/80">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/50">Category</p>
                  <p>{summary.category.title}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/50">Coverage Rate</p>
                  <p>{summary.coverage.label} — {summary.coverage.coveragePercent}%</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="btn-cyber">Initiate Coverage Request</button>
                <button className="btn-outline" onClick={resetFlow}>
                  Choose Different Options
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="glass-card p-6 space-y-2">
        <h3 className="text-xl font-heading text-white">Adjustments</h3>
        <p className="text-[color:rgba(200,228,255,0.8)] text-sm">
          Adjustments activate only during high volatility to stabilise payouts. They automatically return to zero when markets normalise.
        </p>
      </section>
    </motion.section>
  )
}
