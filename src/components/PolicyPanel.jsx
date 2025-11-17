import { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context.jsx'
import { useContracts } from '../hooks/useContracts.js'
import { usePolicies } from '../hooks/usePolicies.js'
import { formatEther, parseEther, formatNumber, formatDate } from '../utils/formatters.js'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import HolographicCard from './ui/HolographicCard.jsx'
import TokenIcon from './ui/TokenIcon.jsx'

console.log('[TRACE] Mounting PolicyPanel')

export default function PolicyPanel() {
  console.log('[TRACE] Rendering PolicyPanel')
  useEffect(() => {
    console.log('[TRACE] Rendered PolicyPanel')
  }, [])

  const { account, isConnected } = useWeb3()
  const { policyManager, sureStackToken } = useContracts()
  const { policies, loading, error: policiesError, createPolicy } = usePolicies()
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    coverageLimitUSD: '',
    coveragePercent: '50',
    duration: '30', // days
  })
  const [premium, setPremium] = useState(null)
  const [premiumPercent, setPremiumPercent] = useState(0)
  const [tokenBalance, setTokenBalance] = useState('0')
  const [simulatingClaim, setSimulatingClaim] = useState(false)
  const [claimPreview, setClaimPreview] = useState(null)

  const renderTokenAmount = (label) => (
    <span className="inline-flex items-center gap-2">
      <TokenIcon className="h-5 w-5" />
      <span>{label}</span>
    </span>
  )

  // Fetch token balance
  useEffect(() => {
    if (!isConnected || !sureStackToken || !account) return

    const fetchBalance = async () => {
      try {
        const balance = await sureStackToken.balanceOf(account)
        setTokenBalance(formatEther(balance))
      } catch (error) {
        console.error('Error fetching balance:', error)
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [isConnected, sureStackToken, account])

  // Live premium calculation
  useEffect(() => {
    const calculatePremium = async () => {
      if (!policyManager || !formData.coverageLimitUSD || !formData.coveragePercent) {
        setPremium(null)
        setPremiumPercent(0)
        return
      }

      try {
        const coverageLimit = parseFloat(formData.coverageLimitUSD) * 1e8
        const coveragePercent = parseInt(formData.coveragePercent)
        
        const premiumUSD = await policyManager.calculatePremiumUSD(
          BigInt(Math.floor(coverageLimit)),
          coveragePercent
        )
        
        const premiumInSST = formatEther((premiumUSD * BigInt(1e18)) / BigInt(1e8))
        setPremium(premiumInSST)
        
        // Calculate premium as % of coverage
        const coverageAmount = (parseFloat(formData.coverageLimitUSD) * coveragePercent) / 100
        const premiumPercentValue = (parseFloat(premiumInSST) / coverageAmount) * 100
        setPremiumPercent(premiumPercentValue)
      } catch (error) {
        console.error('Error calculating premium:', error)
        setPremium(null)
        setPremiumPercent(0)
      }
    }

    const timer = setTimeout(calculatePremium, 500)
    return () => clearTimeout(timer)
  }, [formData.coverageLimitUSD, formData.coveragePercent, policyManager])

  // Create policy
  const handleCreatePolicy = async (e) => {
    e.preventDefault()
    if (!createPolicy || !formData.coverageLimitUSD || !formData.coveragePercent) return

    try {
      setCreating(true)
      const coverageLimitUSD = parseFloat(formData.coverageLimitUSD)
      const coveragePercent = parseInt(formData.coveragePercent)

      await createPolicy(coverageLimitUSD, coveragePercent)

      setFormData({ coverageLimitUSD: '', coveragePercent: '50', duration: '30' })
      setPremium(null)
      setPremiumPercent(0)
    } catch (error) {
      console.error('Error creating policy:', error)
    } finally {
      setCreating(false)
    }
  }

  // Simulate claim
  const handleSimulateClaim = () => {
    if (!formData.coverageLimitUSD || !formData.coveragePercent || !premium) return

    setSimulatingClaim(true)
    const coverageAmount = (parseFloat(formData.coverageLimitUSD) * parseInt(formData.coveragePercent)) / 100
    const lossEventValue = coverageAmount * 0.2 // Simulate 20% loss
    const payoutAmount = Math.min(lossEventValue, coverageAmount)

    setClaimPreview({
      lossEventValue,
      payoutAmount,
      coverageAmount,
    })

    setTimeout(() => setSimulatingClaim(false), 1000)
  }

  if (!isConnected) {
    return (
      <div className="p-6 glass-panel holo-card space-y-6">
        <h1 className="text-3xl font-heading text-neon-cyan">Policy Control Panel</h1>
        <div className="glass-card p-6 border-warning">
          <p className="text-warning font-subheading">⚠️ Connect wallet to access policy creation</p>
        </div>
      </div>
    )
  }

  const riskScore = premiumPercent > 2 ? 70 : premiumPercent > 1 ? 40 : 20

  return (
    <div className="p-6 glass-panel holo-card space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-heading text-neon-cyan mb-2">Policy Control Panel</h1>
        <p className="text-slate-400 font-mono text-sm">Create and manage risk coverage policies</p>
      </div>

      {/* Create Policy Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 relative overflow-hidden"
        style={{
          borderColor: riskScore >= 70 ? 'rgba(255, 45, 85, 0.6)' : 'rgba(0, 245, 255, 0.4)',
        }}
      >
        <div className="relative z-10">
          <h2 className="text-2xl font-heading uppercase tracking-wider text-neon-cyan mb-6">
            Create New Policy
          </h2>
          
          <form onSubmit={handleCreatePolicy} className="space-y-4">
            {/* Coverage Limit Slider */}
            <div>
              <label className="block text-sm font-subheading text-slate-300 mb-2 uppercase tracking-wider">
                Coverage Limit (USD)
              </label>
              <input
                type="range"
                min="100"
                max="100000"
                step="100"
                value={formData.coverageLimitUSD || 1000}
                onChange={(e) => setFormData({ ...formData, coverageLimitUSD: e.target.value })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-safe"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>$100</span>
                <span className="text-neon-cyan font-mono font-bold">
                  ${formatNumber(formData.coverageLimitUSD || 1000)}
                </span>
                <span>$100K</span>
              </div>
              <input
                type="number"
                step="100"
                value={formData.coverageLimitUSD}
                onChange={(e) => setFormData({ ...formData, coverageLimitUSD: e.target.value })}
                className="input-field w-full mt-2 bg-void/50 border-safe/30 text-safe font-mono"
                placeholder="1000.00"
                required
              />
            </div>

            {/* Coverage Percent Slider */}
            <div>
              <label className="block text-sm font-subheading text-slate-300 mb-2 uppercase tracking-wider">
                Coverage Percentage
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={formData.coveragePercent}
                onChange={(e) => setFormData({ ...formData, coveragePercent: e.target.value })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-safe"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1%</span>
                <span className="text-neon-cyan font-mono font-bold">{formData.coveragePercent}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Premium Display */}
            {premium && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`glass-card p-4 border-2 ${
                  premiumPercent > 2 ? 'border-risk animate-pulse-risk' : 
                  premiumPercent > 1 ? 'border-warning' : 
                  'border-safe'
                }`}
                style={{
                  boxShadow: premiumPercent > 2 
                    ? '0 0 30px rgba(255, 45, 85, 0.5)' 
                    : '0 0 20px rgba(0, 245, 255, 0.3)',
                }}
              >
                <p className="text-xs text-slate-400 font-mono uppercase mb-2">Estimated Premium</p>
                <p className={`text-3xl font-heading font-bold ${
                  premiumPercent > 2 ? 'text-risk' : 
                  premiumPercent > 1 ? 'text-warning' : 
                  'text-safe'
                }`}>
                  {renderTokenAmount(`${formatNumber(premium)} SST`)}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {premiumPercent.toFixed(2)}% of coverage • Balance: {renderTokenAmount(`${formatNumber(tokenBalance)} SST`)}
                </p>
              </motion.div>
            )}

            {/* Simulate Claim Button */}
            {premium && (
              <button
                type="button"
                onClick={handleSimulateClaim}
                className="btn-cyber w-full"
              >
                {simulatingClaim ? 'Simulating...' : 'Simulate Claim'}
              </button>
            )}

            {/* Claim Preview */}
            {claimPreview && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 border-safe/50"
              >
                <p className="text-xs text-slate-400 font-mono uppercase mb-2">Claim Simulation</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Loss Event:</span>
                    <span className="text-risk font-mono">${formatNumber(claimPreview.lossEventValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payout Amount:</span>
                    <span className="text-safe font-mono font-bold">${formatNumber(claimPreview.payoutAmount)}</span>
                  </div>
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={creating || !premium}
              className="btn-cyber w-full py-3 text-lg font-heading disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating Policy...' : 'Create Policy'}
            </button>
          </form>
        </div>
      </motion.div>

      {/* User Policies List */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-heading uppercase tracking-wider text-neon-cyan mb-6">
          Your Policies
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-safe"></div>
          </div>
        ) : policies.length === 0 ? (
          <p className="text-slate-400 text-center py-8 font-mono">No policies found. Create your first policy above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-void/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-subheading text-slate-300 uppercase tracking-wider">Policy ID</th>
                  <th className="px-6 py-3 text-left text-xs font-subheading text-slate-300 uppercase tracking-wider">Coverage</th>
                  <th className="px-6 py-3 text-left text-xs font-subheading text-slate-300 uppercase tracking-wider">Claimable</th>
                  <th className="px-6 py-3 text-left text-xs font-subheading text-slate-300 uppercase tracking-wider">Premium</th>
                  <th className="px-6 py-3 text-left text-xs font-subheading text-slate-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-void/30 divide-y divide-slate-700">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-void/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-safe">#{policy.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      ${formatNumber(policy.coverageLimitUSD)} ({policy.coveragePercent}%)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neon-green font-bold">
                      ${formatNumber(policy.claimableAmount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                      {renderTokenAmount(`${formatNumber(policy.premiumPaidInSST)} SST`)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-mono ${
                        policy.active 
                          ? 'bg-neon-green/20 text-neon-green border border-neon-green/50' 
                          : 'bg-risk/20 text-risk border border-risk/50'
                      }`}>
                        {policy.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
