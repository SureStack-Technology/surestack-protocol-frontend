import { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { usePolicies } from '../hooks/usePolicies'
import { useClaims } from '../hooks/useClaims'
import { formatNumber } from '../utils/formatters'
import toast from 'react-hot-toast'

console.log('[TRACE] Mounting ClaimPanel')

export default function ClaimPanel() {
  console.log('[TRACE] Rendering ClaimPanel')
  useEffect(() => {
    console.log('[TRACE] Rendered ClaimPanel')
  }, [])

  const { account, isConnected } = useWeb3()
  const { policies, loading: policiesLoading } = usePolicies()
  const { claims, loading: claimsLoading, processClaim } = useClaims()
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [lossEventValue, setLossEventValue] = useState('')
  const [processing, setProcessing] = useState(false)

  // Filter active policies
  const activePolicies = policies.filter(p => p.active)

  // Process claim
  const handleProcessClaim = async (e) => {
    e.preventDefault()
    if (!processClaim || !selectedPolicy || !lossEventValue) return

    try {
      setProcessing(true)
      const lossValueUSD = parseFloat(lossEventValue)
      
      await processClaim(selectedPolicy.id, lossValueUSD)

      // Reset form
      setSelectedPolicy(null)
      setLossEventValue('')
    } catch (error) {
      console.error('Error processing claim:', error)
      // Error toast is handled in useClaims hook
    } finally {
      setProcessing(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="p-6 glass-panel holo-card flex items-center justify-center h-64">
        <div className="glass-card px-6 py-5 border border-safe/25 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Wallet Disconnected</p>
          <p className="mt-2 text-neon-cyan text-lg font-heading">Connect to process claims</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 glass-panel holo-card space-y-7 text-slate-100">
      <div className="mb-6">
        <h1 className="text-4xl font-heading text-neon-cyan drop-shadow mb-2">Claim Panel</h1>
        <p className="text-slate-400">Process claims for your active coverage portfolios.</p>
      </div>

      {/* Process Claim Form */}
      <div className="glassmorphism p-6 border border-safe/20 animate-fade-in">
        <h2 className="text-2xl font-heading text-neon-green mb-6">Process Claim</h2>
        <form onSubmit={handleProcessClaim} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
              Select Policy
            </label>
            <select
              value={selectedPolicy?.id || ''}
              onChange={(e) => {
                const policy = activePolicies.find(p => p.id === e.target.value)
                setSelectedPolicy(policy || null)
              }}
              className="input-field w-full bg-void/60 border border-safe/25 text-white"
              required
              disabled={policiesLoading || activePolicies.length === 0}
            >
              <option value="">Select a policy...</option>
              {activePolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  Policy #{policy.id} - ${formatNumber(policy.coverageLimitUSD)} @ {policy.coveragePercent}%
                </option>
              ))}
            </select>
          </div>

          {selectedPolicy && (
            <div className="glass-card border border-blue-400/30 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Policy Details</p>
              <p className="text-sm font-medium text-white">
                Coverage Limit: ${formatNumber(selectedPolicy.coverageLimitUSD)}
              </p>
              <p className="text-sm font-medium text-white mt-1">
                Coverage Percentage: {selectedPolicy.coveragePercent}%
              </p>
              <p className="text-sm text-neon-green font-semibold mt-2 font-mono">
                Maximum Claimable: ${formatNumber(selectedPolicy.claimableAmount || 0)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
              Loss Event Value (USD)
            </label>
            <input
              type="number"
              step="0.01"
              value={lossEventValue}
              onChange={(e) => setLossEventValue(e.target.value)}
              className="input-field w-full bg-void/60 border border-safe/25 text-white"
              placeholder="1000.00"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Enter the USD value of the loss event
            </p>
          </div>

          <button
            type="submit"
            disabled={processing || !selectedPolicy || !lossEventValue || policiesLoading}
            className="btn-cyber-danger w-full py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing Claim...' : 'Process Claim'}
          </button>
        </form>
      </div>

      {/* Active Policies List */}
      <div className="glassmorphism p-6 border border-safe/20 animate-fade-in">
        <h2 className="text-2xl font-heading text-neon-cyan mb-6">Active Policies</h2>
        {policiesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-safe"></div>
          </div>
        ) : activePolicies.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No active policies found. Create a policy first.</p>
        ) : (
          <div className="space-y-3">
            {activePolicies.map((policy) => (
              <div
                key={policy.id}
                className="glass-card border border-safe/15 p-4 cursor-pointer transition-all hover:border-safe/35"
                onClick={() => setSelectedPolicy(policy)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-heading text-white">Policy #{policy.id}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coverage: ${formatNumber(policy.coverageLimitUSD)} @ {policy.coveragePercent}%
                    </p>
                    <p className="text-sm text-neon-green mt-2 font-mono">
                      Claimable: ${formatNumber(policy.claimableAmount || 0)}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs rounded-full bg-safe/15 text-safe border border-safe/30">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claim History */}
      {claims.length > 0 && (
        <div className="glassmorphism p-6 border border-safe/20 animate-fade-in">
          <h2 className="text-2xl font-heading text-neon-yellow mb-6">Claim History</h2>
          <div className="space-y-2">
            {claims.map((claim, idx) => (
              <div
                key={idx}
                className="glass-card border border-safe/15 p-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-heading text-white">Policy #{claim.policyId}</p>
                    <p className="text-sm text-neon-green mt-1">
                      Payout: {claim.payoutAmount} SST
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Loss Value: ${formatNumber(claim.lossEventValueUSD)}
                    </p>
                  </div>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${claim.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-safe hover:text-neon-cyan text-sm"
                  >
                    View Tx →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

