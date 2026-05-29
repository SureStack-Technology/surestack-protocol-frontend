import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../contexts/Web3Context'
import { useContracts } from './useContracts'
import { formatEther } from '../utils/formatters'
import toast from 'react-hot-toast'

export const useClaims = () => {
  const { account, isConnected, provider } = useWeb3()
  const { policyManager } = useContracts()
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Process a claim
  const processClaim = useCallback(async (policyId, lossEventValueUSD) => {
    if (!isConnected || !policyManager || !account) {
      throw new Error('Please connect your wallet')
    }

    try {
      console.log('🔍 [useClaims] Processing claim:', { policyId, lossEventValueUSD })

      // Scale USD value to 8 decimals for contract compatibility
      // PolicyManager uses 1e8 precision for USD values
      const scaledLoss = BigInt(Math.floor(Number(lossEventValueUSD) * 1e8))
      console.log(`🔢 [useClaims] Scaled loss value: ${scaledLoss.toString()} (${lossEventValueUSD} USD × 1e8)`)

      toast.loading('Processing incident support request…', { id: 'process-claim' })
      const tx = await policyManager.processClaim(
        policyId,
        scaledLoss,
        { gasLimit: 1_000_000 }
      )
      console.log('📝 [useClaims] Transaction sent:', tx.hash)

      const receipt = await tx.wait()
      console.log('✅ [useClaims] Claim processed in block:', receipt.blockNumber)

      // Find ClaimProcessed event
      const claimProcessedEvent = receipt.logs.find(
        log => {
          try {
            const parsed = policyManager.interface.parseLog(log)
            return parsed && parsed.name === 'ClaimProcessed'
          } catch {
            return false
          }
        }
      )

      let payoutAmount = null
      if (claimProcessedEvent) {
        const parsed = policyManager.interface.parseLog(claimProcessedEvent)
        payoutAmount = formatEther(parsed.args.payoutAmount)
        console.log('✅ [useClaims] Payout amount:', payoutAmount)
      }

      toast.success(
        `Incident support recorded. Member assistance transfer: ${payoutAmount || 'N/A'} SST`,
        { id: 'process-claim' }
      )

      // Refresh claims history
      await fetchClaimHistory()

      return { txHash: tx.hash, payoutAmount }
    } catch (err) {
      console.error('❌ [useClaims] Error processing claim:', err)
      toast.error(err.reason || err.message || 'Could not complete incident support request', { id: 'process-claim' })
      throw err
    }
  }, [isConnected, policyManager, account])

  // Fetch claim history for connected wallet
  const fetchClaimHistory = useCallback(async () => {
    if (!isConnected || !policyManager || !provider || !account) {
      setClaims([])
      return []
    }

    try {
      setLoading(true)
      setError(null)
      console.log('🔍 [useClaims] Fetching claim history for:', account)

      // Query ClaimProcessed events
      const filter = policyManager.filters.ClaimProcessed()
      const events = await policyManager.queryFilter(filter, 0, 'latest')

      // Filter events for policies owned by the user
      const userPolicies = await policyManager.userPolicies(account)
      const userPolicyIds = new Set(userPolicies.map(id => id.toString()))

      const claimEvents = events
        .filter(event => {
          try {
            const parsed = policyManager.interface.parseLog(event)
            return parsed && userPolicyIds.has(parsed.args.policyId.toString())
          } catch {
            return false
          }
        })
        .map(event => {
          try {
            const parsed = policyManager.interface.parseLog(event)
            return {
              policyId: parsed.args.policyId.toString(),
              payoutAmount: formatEther(parsed.args.payoutAmount),
              oracleRoundId: parsed.args.oracleRoundId.toString(),
              lossEventValueUSD: formatEther(parsed.args.lossEventValueUSD),
              txHash: event.transactionHash,
              blockNumber: event.blockNumber,
              timestamp: null, // Will be enriched later
            }
          } catch {
            return null
          }
        })
        .filter(claim => claim !== null)

      // Enrich with timestamps
      const enrichedClaims = await Promise.all(
        claimEvents.map(async (claim) => {
          try {
            const block = await provider.getBlock(claim.blockNumber)
            return {
              ...claim,
              timestamp: Number(block.timestamp),
            }
          } catch {
            return claim
          }
        })
      )

      setClaims(enrichedClaims.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)))
      console.log('✅ [useClaims] Claims loaded:', enrichedClaims.length)
      return enrichedClaims
    } catch (err) {
      console.error('❌ [useClaims] Error fetching claim history:', err)
      setError(err.message || 'Could not load incident support history')
      setClaims([])
      return []
    } finally {
      setLoading(false)
    }
  }, [isConnected, policyManager, provider, account])

  // Listen for ClaimProcessed events
  useEffect(() => {
    if (!policyManager || !provider || !account) return

    const filter = policyManager.filters.ClaimProcessed()
    
    const handleClaimProcessed = (policyId, payoutAmount, oracleRoundId, lossEventValueUSD, event) => {
      console.log('🎉 [useClaims] ClaimProcessed event:', {
        policyId: policyId.toString(),
        payoutAmount: formatEther(payoutAmount),
      })
      // Refresh claims history
      fetchClaimHistory()
    }

    policyManager.on(filter, handleClaimProcessed)

    return () => {
      policyManager.off(filter, handleClaimProcessed)
    }
  }, [policyManager, provider, account, fetchClaimHistory])

  // Auto-fetch claims when account changes
  useEffect(() => {
    if (isConnected && account && policyManager) {
      fetchClaimHistory()
    }
  }, [isConnected, account, policyManager, fetchClaimHistory])

  return {
    claims,
    loading,
    error,
    processClaim,
    fetchClaimHistory,
  }
}

