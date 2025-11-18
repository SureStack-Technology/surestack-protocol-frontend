import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

const policyCategories = [
  {
    id: 'market-volatility',
    title: 'Market Volatility Protection',
    description: 'Offset volatility-driven losses across institutional portfolios.',
  },
  {
    id: 'theft',
    title: 'Theft Protection',
    description: 'Safeguard exchange, custodian, and operational wallets from compromise.',
  },
  {
    id: 'hacks-scams',
    title: 'Hacks & Scams Protection',
    description: 'Mitigate losses from protocol exploits, phishing, and malicious approvals.',
  },
  {
    id: 'global-shock',
    title: 'Global Shock Protection',
    description: 'Shield against macro regime shifts, systemic failures, and cascading depegs.',
  },
]

const coverageRates = [
  {
    id: 'basic',
    label: 'Basic',
    coveragePercent: 25,
    description: 'Entry coverage for smaller SME desks ramping into SureStack programs.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    coveragePercent: 50,
    description: 'Balanced protection for treasuries with moderate leverage exposure.',
  },
  {
    id: 'premium',
    label: 'Premium',
    coveragePercent: 80,
    description: 'High-assurance coverage for mission critical and regulated operators.',
  },
]

const minimumPortfolio = 50000

export default function BusinessPoliciesPage() {
  const [step, setStep] = useState(1)
  const [portfolioValue, setPortfolioValue] = useState('50000')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedCoverage, setSelectedCoverage] = useState(null)
  const [error, setError] = useState('')

  const summary = useMemo(() => {
    if (!selectedCategory || !selectedCoverage) return null
    return {
      category: policyCategories.find((c) => c.id === selectedCategory),
      coverage: coverageRates.find((c) => c.id === selectedCoverage),
    }
  }, [selectedCategory, selectedCoverage])

  const resetFlow = () => {
    setStep(1)
    setSelectedCategory(null)
    setSelectedCoverage(null)
    setError('')
  }

  const portfolioNumber = Number(portfolioValue) || 0
  const showPortfolioWarning = portfolioNumber < minimumPortfolio

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <header className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full uppercase tracking-[0.35em] bg-white/10 border border-white/15 text-white/60">
            SME Policy Builder
          </span>
          <h1 className="text-3xl md:text-4xl font-heading text-[var(--primary-cyan)]">SME Policy Builder</h1>
        </div>
        <p className="text-sm text-white/70 max-w-3xl">
          Configure SureStack insurance for SME and enterprise desks in two guided steps.
          Categories describe the dominant risk vector, while coverage levels calibrate capital allocation.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-xs uppercase tracking-[0.3em] text-white/50">
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
          {showPortfolioWarning && (
            <span className="text-xs text-amber-300 bg-amber-400/10 border border-amber-500/40 px-3 py-1 rounded-md">
              Minimum portfolio requirement for SME insurance is $50,000 USD.
            </span>
          )}
        </div>
      {error && (
        <div className="glass-card border border-rose-500/50 bg-rose-500/10 text-rose-100 px-4 py-3 text-sm">
          {error}
        </div>
      )}
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
          <span className={`px-3 py-1 rounded-full border ${step === 1 ? 'border-cyan-400 text-cyan-200' : 'border-transparent bg-white/10'}`}>
            Step 1 — Category
          </span>
          <span className={`px-3 py-1 rounded-full border ${step === 2 ? 'border-cyan-400 text-cyan-200' : 'border-transparent bg-white/10'}`}>
            Step 2 — Coverage Rate
          </span>
          {step > 1 && (
            <button onClick={resetFlow} className="btn-outline text-xs ml-auto">
              Reset
            </button>
          )}
        </div>
      </header>

      {step === 1 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policyCategories.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id)
                const value = Number(portfolioValue) || 0
                if (value < minimumPortfolio) {
                  setError("Minimum portfolio requirement for SME insurance is $50,000 USD.")
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
          <div className="glass-card p-6 rounded-xl border border-cyan-300/30">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-2">Selected Category</p>
            <h2 className="text-2xl font-heading text-white">
              {policyCategories.find((c) => c.id === selectedCategory)?.title}
            </h2>
            <p className="text-sm text-white/70 mt-2 max-w-2xl">
              Select a coverage band aligned with the portfolio&apos;s drawdown tolerance and operational heartbeat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coverageRates.map((option) => (
              <button
                type="button"
                key={option.id}
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
              <h3 className="text-xl font-heading text-white">Proposal Snapshot</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/80">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/50">Category</p>
                  <p>{summary.category.title}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/50">Coverage Rate</p>
                  <p>{summary.coverage.label} — {summary.coverage.coveragePercent}%</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/50">Portfolio</p>
                  <p>${portfolioNumber.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="btn-brand">Generate SME Policy Packet</button>
                <button className="btn-outline" onClick={resetFlow}>
                  Adjust Selections
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </motion.section>
  )
}

