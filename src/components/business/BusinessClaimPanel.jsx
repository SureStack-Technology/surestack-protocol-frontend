import { useState, useEffect, useMemo } from 'react'
import { useWeb3 } from '../../contexts/Web3Context'
import { useContracts } from '../../hooks/useContracts'
import { useClaims } from '../../hooks/useClaims'
import { usePolicies } from '../../hooks/usePolicies'
import { formatNumber, formatDate } from '../../utils/formatters'
import { Shield, CheckCircle, XCircle, Clock, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function BusinessClaimPanel() {
  const { account, isConnected, provider } = useWeb3()
  const { policyManager, rewardPool } = useContracts()
  const { claims, loading: claimsLoading, fetchClaimHistory } = useClaims()
  const { policies } = usePolicies()
  const [processing, setProcessing] = useState(false)
  const [filter, setFilter] = useState('all') // all, processed, recent
  const [reviewedClaims, setReviewedClaims] = useState(new Set()) // Track reviewed claims

  // Enrich claims with display fields
  const enrichedClaims = useMemo(() => {
    return claims.map((claim, index) => {
      // Generate display ID from policyId + txHash
      const displayId = claim.txHash 
        ? `${claim.policyId}-${claim.txHash.slice(0, 8)}`
        : `${claim.policyId}-${index}`
      
      // Derive display-only status (all claims are processed since they come from ClaimProcessed events)
      const displayStatus = 'processed' // All claims are processed
      
      // Use payoutAmount instead of claimAmount
      const payoutAmount = claim.payoutAmount || '0'
      
      return {
        ...claim,
        id: displayId,
        displayId,
        status: displayStatus,
        payoutAmount,
        isReviewed: reviewedClaims.has(displayId),
      }
    })
  }, [claims, reviewedClaims])

  // Filter claims based on status
  const filteredClaims = useMemo(() => {
    return enrichedClaims.filter(claim => {
      if (filter === 'all') return true
      if (filter === 'processed') return claim.status === 'processed'
      if (filter === 'recent') {
        // Show claims from last 7 days
        const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 60 * 60
        return claim.timestamp && claim.timestamp >= sevenDaysAgo
      }
      return true
    })
  }, [enrichedClaims, filter])

  // Mark claim as reviewed (display-only action for audit trail)
  const handleMarkReviewed = async (claimId) => {
    try {
      setProcessing(true)
      setReviewedClaims(prev => new Set([...prev, claimId]))
      toast.success(`Claim #${claimId} marked as reviewed`)
    } catch (error) {
      console.error('Error marking claim as reviewed:', error)
      toast.error('Failed to mark claim as reviewed')
    } finally {
      setProcessing(false)
    }
  }

  // Refresh claims list
  const handleRefreshClaims = async () => {
    if (!policyManager || !provider || !account) {
      toast.error('Contracts not loaded')
      return
    }

    try {
      setProcessing(true)
      toast.loading('Refreshing claims...', { id: 'refresh-claims' })
      await fetchClaimHistory()
      toast.success('Claims refreshed', { id: 'refresh-claims' })
    } catch (error) {
      console.error('Error refreshing claims:', error)
      toast.error('Failed to refresh claims', { id: 'refresh-claims' })
    } finally {
      setProcessing(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Please connect your wallet to manage claims</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Claim Management</h1>
          <p className="text-gray-400">Review and audit processed insurance claims</p>
        </div>
        <button
          onClick={handleRefreshClaims}
          disabled={processing || claimsLoading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              <span>Refresh Claims</span>
            </>
          )}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-700">
        {['all', 'processed', 'recent'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 capitalize ${
              filter === filterType
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {filterType} ({filterType === 'all' ? enrichedClaims.length : filteredClaims.length})
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
            <span className="text-sm text-gray-400">Processed</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {enrichedClaims.filter(c => c.status === 'processed').length}
          </div>
          <p className="text-sm text-gray-400 mt-2">All processed claims</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <Shield className="h-8 w-8 text-purple-400" />
            <span className="text-sm text-gray-400">Total Claims</span>
          </div>
          <div className="text-2xl font-bold text-white">{enrichedClaims.length}</div>
          <p className="text-sm text-gray-400 mt-2">All time</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <Clock className="h-8 w-8 text-yellow-400" />
            <span className="text-sm text-gray-400">Recent (7d)</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {enrichedClaims.filter(c => {
              const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 60 * 60
              return c.timestamp && c.timestamp >= sevenDaysAgo
            }).length}
          </div>
          <p className="text-sm text-gray-400 mt-2">Last 7 days</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="h-8 w-8 text-blue-400" />
            <span className="text-sm text-gray-400">Reviewed</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {enrichedClaims.filter(c => c.isReviewed).length}
          </div>
          <p className="text-sm text-gray-400 mt-2">Marked as reviewed</p>
        </div>
      </div>

      {/* Claims List */}
      {claimsLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-3 text-gray-400">Loading claims...</span>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="card-dark">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No claims found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim, index) => {
            const policy = policies.find(p => p.id === claim.policyId)
            const isReviewed = claim.isReviewed

            return (
              <motion.div
                key={claim.displayId || claim.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card-dark ${
                  isReviewed ? 'border-2 border-blue-500/50' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          Claim #{claim.displayId || claim.id || 'N/A'}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            claim.status === 'processed'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}
                        >
                          {claim.status?.toUpperCase() || 'PROCESSED'}
                        </span>
                        {isReviewed && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            REVIEWED
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Policy ID</p>
                          <p className="text-lg font-medium text-white">
                            #{claim.policyId || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Loss Event Value</p>
                          <p className="text-lg font-medium text-red-400">
                            ${formatNumber(parseFloat(claim.lossEventValueUSD || 0), 2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Payout Amount</p>
                          <p className="text-lg font-medium text-green-400">
                            {formatNumber(parseFloat(claim.payoutAmount || 0), 2)} SST
                          </p>
                        </div>
                      </div>
                      {policy && (
                        <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                          <p className="text-sm text-gray-400 mb-1">Policy Details</p>
                          <p className="text-sm text-white">
                            Coverage: ${formatNumber(policy.coverageLimitUSD || 0, 2)} @{' '}
                            {policy.coveragePercent || 0}%
                          </p>
                        </div>
                      )}
                      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                        {claim.timestamp && (
                          <span>Processed: {formatDate(claim.timestamp)}</span>
                        )}
                        {claim.oracleRoundId && (
                          <span>Oracle Round: #{claim.oracleRoundId}</span>
                        )}
                        {claim.txHash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${claim.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <span>View Transaction</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    {!isReviewed && (
                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => handleMarkReviewed(claim.displayId || claim.id)}
                          disabled={processing}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              <span>Mark Reviewed</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

