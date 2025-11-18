import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../contexts/Web3Context'
import { useContracts } from './useContracts'
import { formatEther, parseEther } from '../utils/formatters'
import toast from 'react-hot-toast'

export const usePolicies = () => {
  const { account, isConnected, provider, signer } = useWeb3()
  const { policyManager, sureStackToken } = useContracts()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch user policies using event-based approach
  const getUserPolicies = useCallback(async (userAddress = null) => {
    const address = userAddress || account
    if (!isConnected || !policyManager || !address || !provider) {
      setPolicies([])
      return []
    }

    try {
      setLoading(true)
      setError(null)
      console.log('🔍 [usePolicies] Fetching policies for:', address)

      // Query PolicyCreated events filtered by owner
      const filter = policyManager.filters.PolicyCreated(address, null)
      const logs = await policyManager.queryFilter(filter, 0, 'latest')
      console.log('✅ [usePolicies] Found PolicyCreated events:', logs.length)

      if (logs.length === 0) {
        setPolicies([])
        console.log('✅ [usePolicies] No policies found')
        return []
      }

      // Parse events to get policy IDs and basic info
      const policyIds = []
      const eventDataMap = new Map()

      logs.forEach((log) => {
        try {
          const parsed = policyManager.interface.parseLog(log)
          if (parsed && parsed.name === 'PolicyCreated') {
            const policyId = parsed.args.policyId.toString()
            policyIds.push(policyId)
            eventDataMap.set(policyId, {
              id: policyId,
              owner: parsed.args.owner,
              coverageLimitUSD: Number(parsed.args.coverageLimit) / 1e8, // Convert from 1e8 precision
              coveragePercent: Number(parsed.args.coveragePercent),
              premiumUSD: Number(parsed.args.premiumUSD) / 1e8,
              premiumPaidInSST: formatEther(parsed.args.premiumPaidInSST),
              blockNumber: log.blockNumber,
            })
          }
        } catch (err) {
          console.warn('⚠️ [usePolicies] Error parsing event log:', err)
        }
      })

      console.log('✅ [usePolicies] Parsed policy IDs from events:', policyIds.length)

      // Fetch full policy details for each ID (to get active status, startTime, etc.)
      const policyData = await Promise.all(
        policyIds.map(async (id) => {
          try {
            const policy = await policyManager.policies(id)
            const eventData = eventDataMap.get(id)
            
            return {
              id: id.toString(),
              owner: policy.owner || eventData.owner,
              coverageLimitUSD: eventData.coverageLimitUSD,
              coveragePercent: eventData.coveragePercent,
              premiumUSD: eventData.premiumUSD,
              startTime: Number(policy.startTime),
              active: policy.active,
              premiumPaidInSST: eventData.premiumPaidInSST,
              // Calculate claimable amount (coverageLimitUSD * coveragePercent / 100)
              claimableAmount: eventData.coverageLimitUSD * (eventData.coveragePercent / 100),
            }
          } catch (err) {
            console.error(`❌ [usePolicies] Error fetching policy ${id}:`, err)
            // Fallback to event data only if contract call fails
            const eventData = eventDataMap.get(id)
            if (eventData) {
              return {
                ...eventData,
                startTime: 0,
                active: true, // Assume active if we can't fetch from contract
                claimableAmount: eventData.coverageLimitUSD * (eventData.coveragePercent / 100),
              }
            }
            return null
          }
        })
      )

      // Filter out null results
      const validPolicies = policyData.filter(p => p !== null)
      setPolicies(validPolicies)
      console.log('✅ [usePolicies] Loaded policies from events:', validPolicies.length)
      return validPolicies
    } catch (err) {
      console.error('❌ [usePolicies] Error fetching policies:', err)
      setError(err.message || 'Failed to fetch policies')
      setPolicies([])
      return []
    } finally {
      setLoading(false)
    }
  }, [isConnected, policyManager, account, provider])

  // Create a new policy
  const createPolicy = useCallback(async (coverageLimitUSD, coveragePercent) => {
    if (!isConnected || !policyManager || !sureStackToken || !account) {
      throw new Error('Please connect your wallet')
    }

    try {
      console.log('🔍 [usePolicies] Creating policy:', { coverageLimitUSD, coveragePercent })

      // Calculate premium first
      const coverageLimitWei = ethers.parseUnits(coverageLimitUSD.toString(), 8) // PolicyManager uses 1e8 precision
      const premiumUSD = await policyManager.calculatePremiumUSD(
        coverageLimitWei,
        coveragePercent
      )
      const premiumInSST = (premiumUSD * BigInt(1e18)) / BigInt(1e8) // Convert to SST (1e18)

      console.log('💰 [usePolicies] Premium calculated:', {
        premiumUSD: formatEther(premiumUSD),
        premiumInSST: formatEther(premiumInSST),
      })

      // Check token balance
      const balance = await sureStackToken.balanceOf(account)
      if (balance < premiumInSST) {
        throw new Error(`Insufficient SST balance. Need ${formatEther(premiumInSST)} SST, have ${formatEther(balance)} SST`)
      }

      // Check and approve token spending
      const allowance = await sureStackToken.allowance(account, policyManager.target || policyManager.address)
      if (allowance < premiumInSST) {
        toast.loading('Approving tokens...', { id: 'approve' })
        const approveTx = await sureStackToken.approve(policyManager.target || policyManager.address, premiumInSST)
        await approveTx.wait()
        toast.success('Tokens approved', { id: 'approve' })
      }

      // Create policy
      toast.loading('Creating policy...', { id: 'create-policy' })
      const tx = await policyManager.createPolicy(
        coverageLimitWei,
        coveragePercent,
        { gasLimit: 1_000_000 }
      )
      console.log('📝 [usePolicies] Transaction sent:', tx.hash)

      const receipt = await tx.wait()
      console.log('✅ [usePolicies] Policy created in block:', receipt.blockNumber)

      // Find PolicyCreated event
      const policyCreatedEvent = receipt.logs.find(
        log => {
          try {
            const parsed = policyManager.interface.parseLog(log)
            return parsed && parsed.name === 'PolicyCreated'
          } catch {
            return false
          }
        }
      )

      let policyId = null
      if (policyCreatedEvent) {
        const parsed = policyManager.interface.parseLog(policyCreatedEvent)
        policyId = parsed.args.policyId.toString()
        console.log('✅ [usePolicies] Policy ID:', policyId)
      }

      toast.success(`Policy created successfully! ID: ${policyId || 'N/A'}`, { id: 'create-policy' })

      // Refresh policies list
      await getUserPolicies()

      return { policyId, txHash: tx.hash }
    } catch (err) {
      console.error('❌ [usePolicies] Error creating policy:', err)
      toast.error(err.reason || err.message || 'Failed to create policy', { id: 'create-policy' })
      throw err
    }
  }, [isConnected, policyManager, sureStackToken, account, getUserPolicies])

  // Listen for PolicyCreated events (real-time updates)
  useEffect(() => {
    if (!policyManager || !provider || !account) return

    const filter = policyManager.filters.PolicyCreated(account)
    
    const handlePolicyCreated = async (owner, policyId, coverageLimit, coveragePercent, premiumUSD, premiumPaidInSST, event) => {
      console.log('🎉 [usePolicies] PolicyCreated event received:', {
        owner,
        policyId: policyId.toString(),
        coverageLimit: Number(coverageLimit) / 1e8,
        coveragePercent: Number(coveragePercent),
      })
      
      // Fetch full policy details for the new policy
      try {
        const policy = await policyManager.policies(policyId)
        const newPolicy = {
          id: policyId.toString(),
          owner: owner,
          coverageLimitUSD: Number(coverageLimit) / 1e8,
          coveragePercent: Number(coveragePercent),
          premiumUSD: Number(premiumUSD) / 1e8,
          startTime: Number(policy.startTime),
          active: policy.active,
          premiumPaidInSST: formatEther(premiumPaidInSST),
          claimableAmount: (Number(coverageLimit) / 1e8) * (Number(coveragePercent) / 100),
        }
        
        // Add to policies list if not already present
        setPolicies(prev => {
          const exists = prev.some(p => p.id === policyId.toString())
          if (exists) {
            // Update existing policy
            return prev.map(p => p.id === policyId.toString() ? newPolicy : p)
          } else {
            // Add new policy
            return [...prev, newPolicy]
          }
        })
        
        console.log('✅ [usePolicies] Policy added to list:', policyId.toString())
      } catch (err) {
        console.error('❌ [usePolicies] Error fetching new policy details:', err)
        // Fallback: refresh entire list
        getUserPolicies()
      }
    }

    policyManager.on(filter, handlePolicyCreated)

    return () => {
      policyManager.off(filter, handlePolicyCreated)
    }
  }, [policyManager, provider, account, getUserPolicies])

  // Auto-fetch policies when account changes
  useEffect(() => {
    if (isConnected && account && policyManager) {
      getUserPolicies()
    }
  }, [isConnected, account, policyManager, getUserPolicies])

  return {
    policies,
    loading,
    error,
    getUserPolicies,
    createPolicy,
  }
}

