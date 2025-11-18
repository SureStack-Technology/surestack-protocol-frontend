import { useState, useEffect, useCallback } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { useContracts } from './useContracts'
import { queryRecentEvents, withTimestamps } from '../utils/events'
import { formatEther, formatNumber, formatDate, formatAddress } from '../utils/formatters'

export const useAuditTrail = (filter = 'all') => {
  const { isConnected, provider } = useWeb3()
  const { policyManager, consensusStakingV2, rewardPool, daoGovernance } = useContracts()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch all events
  const fetchEvents = useCallback(async () => {
    if (!isConnected || !provider) {
      setEvents([])
      return []
    }

    try {
      setLoading(true)
      setError(null)
      console.log('🔍 [useAuditTrail] Fetching events with filter:', filter)

      const allEvents = []

      // PolicyManager Events
      if (policyManager && (filter === 'all' || filter === 'PolicyManager')) {
        try {
          const policyCreatedFilter = policyManager.filters.PolicyCreated()
          const claimProcessedFilter = policyManager.filters.ClaimProcessed()
          const paramsUpdatedFilter = policyManager.filters.ParametersUpdated()

          const [created, processed, updated] = await Promise.all([
            queryRecentEvents(policyManager, policyCreatedFilter, provider, 100000),
            queryRecentEvents(policyManager, claimProcessedFilter, provider, 100000),
            queryRecentEvents(policyManager, paramsUpdatedFilter, provider, 100000),
          ])

          const [enrichedCreated, enrichedProcessed, enrichedUpdated] = await Promise.all([
            withTimestamps(provider, created),
            withTimestamps(provider, processed),
            withTimestamps(provider, updated),
          ])

          enrichedCreated.forEach((e) => {
            try {
              const parsed = policyManager.interface.parseLog(e)
              allEvents.push({
                contract: 'PolicyManager',
                event: 'PolicyCreated',
                icon: '📋',
                timestamp: e.__timestamp,
                txHash: e.transactionHash,
                blockNumber: e.blockNumber,
                data: {
                  owner: formatAddress(parsed.args.owner),
                  policyId: parsed.args.policyId.toString(),
                  coverageLimit: formatNumber(Number(parsed.args.coverageLimit) / 1e8),
                  coveragePercent: Number(parsed.args.coveragePercent),
                  premiumUSD: formatNumber(Number(parsed.args.premiumUSD) / 1e8),
                  premiumPaidInSST: formatEther(parsed.args.premiumPaidInSST),
                },
              })
            } catch (err) {
              console.warn('Error parsing PolicyCreated event:', err)
            }
          })

          enrichedProcessed.forEach((e) => {
            try {
              const parsed = policyManager.interface.parseLog(e)
              allEvents.push({
                contract: 'PolicyManager',
                event: 'ClaimProcessed',
                icon: '💰',
                timestamp: e.__timestamp,
                txHash: e.transactionHash,
                blockNumber: e.blockNumber,
                data: {
                  policyId: parsed.args.policyId.toString(),
                  payoutAmount: formatEther(parsed.args.payoutAmount),
                  oracleRoundId: parsed.args.oracleRoundId.toString(),
                  lossEventValueUSD: formatNumber(Number(parsed.args.lossEventValueUSD) / 1e8),
                },
              })
            } catch (err) {
              console.warn('Error parsing ClaimProcessed event:', err)
            }
          })

          enrichedUpdated.forEach((e) => {
            try {
              const parsed = policyManager.interface.parseLog(e)
              allEvents.push({
                contract: 'PolicyManager',
                event: 'ParametersUpdated',
                icon: '⚙️',
                timestamp: e.__timestamp,
                txHash: e.transactionHash,
                blockNumber: e.blockNumber,
                data: {
                  paramName: parsed.args.paramName,
                  newValue: parsed.args.newValue.toString(),
                  executor: formatAddress(parsed.args.executor),
                },
              })
            } catch (err) {
              console.warn('Error parsing ParametersUpdated event:', err)
            }
          })
        } catch (err) {
          console.error('Error fetching PolicyManager events:', err)
        }
      }

      // ConsensusAndStakingV2 Events
      if (consensusStakingV2 && (filter === 'all' || filter === 'Consensus')) {
        try {
          const stakedFilter = consensusStakingV2.filters.Staked()
          const roundSettledFilter = consensusStakingV2.filters.RoundSettled()
          const rewardIssuedFilter = consensusStakingV2.filters.RewardIssued()
          const validatorSlashedFilter = consensusStakingV2.filters.ValidatorSlashed()

          const [staked, settled, rewards, slashed] = await Promise.all([
            queryRecentEvents(consensusStakingV2, stakedFilter, provider, 100000),
            queryRecentEvents(consensusStakingV2, roundSettledFilter, provider, 100000),
            queryRecentEvents(consensusStakingV2, rewardIssuedFilter, provider, 100000),
            queryRecentEvents(consensusStakingV2, validatorSlashedFilter, provider, 100000),
          ])

          const [enrichedStaked, enrichedSettled, enrichedRewards, enrichedSlashed] = await Promise.all([
            withTimestamps(provider, staked),
            withTimestamps(provider, settled),
            withTimestamps(provider, rewards),
            withTimestamps(provider, slashed),
          ])

          enrichedStaked.forEach((e) => {
            try {
              const parsed = consensusStakingV2.interface.parseLog(e)
              allEvents.push({
                contract: 'Consensus',
                event: 'Staked',
                icon: '🔒',
                timestamp: e.__timestamp,
                txHash: e.transactionHash,
                blockNumber: e.blockNumber,
                data: {
                  validator: formatAddress(parsed.args.validator),
                  amount: formatEther(parsed.args.amount),
                  totalStaked: formatEther(parsed.args.totalStaked),
                },
              })
            } catch (err) {
              console.warn('Error parsing Staked event:', err)
            }
          })

          enrichedSettled.forEach((e) => {
            try {
              const parsed = consensusStakingV2.interface.parseLog(e)
              allEvents.push({
                contract: 'Consensus',
                event: 'RoundSettled',
                icon: '✅',
                timestamp: e.__timestamp,
                txHash: e.transactionHash,
                blockNumber: e.blockNumber,
                data: {
                  roundId: parsed.args.roundId.toString(),
                  consensusScore: Number(parsed.args.consensusScore),
                  totalRewardsPaid: formatEther(parsed.args.totalRewardsPaid),
                  totalSlashed: formatEther(parsed.args.totalSlashed),
                },
              })
            } catch (err) {
              console.warn('Error parsing RoundSettled event:', err)
            }
          })

          enrichedRewards.forEach((e) => {
            try {
              const parsed = consensusStakingV2.interface.parseLog(e)
              allEvents.push({
                contract: 'Consensus',
                event: 'RewardIssued',
                icon: '🎁',
                timestamp: e.__timestamp,
                txHash: e.transactionHash,
                blockNumber: e.blockNumber,
                data: {
                  validator: formatAddress(parsed.args.validator),
                  roundId: parsed.args.roundId.toString(),
                  rewardAmount: formatEther(parsed.args.rewardAmount),
                },
              })
            } catch (err) {
              console.warn('Error parsing RewardIssued event:', err)
            }
          })

          enrichedSlashed.forEach((e) => {
            try {
              const parsed = consensusStakingV2.interface.parseLog(e)
              allEvents.push({
                contract: 'Consensus',
                event: 'ValidatorSlashed',
                icon: '⚡',
                timestamp: e.__timestamp,
                txHash: e.transactionHash,
                blockNumber: e.blockNumber,
                data: {
                  validator: formatAddress(parsed.args.validator),
                  roundId: parsed.args.roundId.toString(),
                  slashedAmount: formatEther(parsed.args.slashedAmount),
                },
              })
            } catch (err) {
              console.warn('Error parsing ValidatorSlashed event:', err)
            }
          })
        } catch (err) {
          console.error('Error fetching Consensus events:', err)
        }
      }

      // RewardPoolAndSlasher Events
      if (rewardPool && (filter === 'all' || filter === 'RewardPool')) {
        try {
          const rewardDistributedFilter = rewardPool.filters.RewardDistributed?.() || rewardPool.filters.RewardIssued?.()
          const claimDistributedFilter = rewardPool.filters.ClaimDistributed?.()
          const penaltyAppliedFilter = rewardPool.filters.PenaltyApplied?.()

          const filters = []
          if (rewardDistributedFilter) filters.push(rewardDistributedFilter)
          if (claimDistributedFilter) filters.push(claimDistributedFilter)
          if (penaltyAppliedFilter) filters.push(penaltyAppliedFilter)

          const eventArrays = await Promise.all(
            filters.map(filter => queryRecentEvents(rewardPool, filter, provider, 100000))
          )

          const enrichedArrays = await Promise.all(
            eventArrays.map(events => withTimestamps(provider, events))
          )

          enrichedArrays.forEach((enrichedEvents, index) => {
            enrichedEvents.forEach((e) => {
              try {
                const parsed = rewardPool.interface.parseLog(e)
                const eventName = parsed.name
                let icon = '💸'
                if (eventName.includes('Claim')) icon = '💰'
                if (eventName.includes('Penalty')) icon = '⚡'

                allEvents.push({
                  contract: 'RewardPool',
                  event: eventName,
                  icon,
                  timestamp: e.__timestamp,
                  txHash: e.transactionHash,
                  blockNumber: e.blockNumber,
                  data: Object.fromEntries(
                    Object.entries(parsed.args).map(([key, value]) => [
                      key,
                      typeof value === 'bigint' ? formatEther(value) : value.toString(),
                    ])
                  ),
                })
              } catch (err) {
                console.warn(`Error parsing ${filters[index]?.name || 'RewardPool'} event:`, err)
              }
            })
          })
        } catch (err) {
          console.error('Error fetching RewardPool events:', err)
        }
      }

      // Sort by timestamp (newest first)
      const sortedEvents = allEvents.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      setEvents(sortedEvents)
      console.log('✅ [useAuditTrail] Events loaded:', sortedEvents.length)
      return sortedEvents
    } catch (err) {
      console.error('❌ [useAuditTrail] Error fetching events:', err)
      setError(err.message || 'Failed to fetch audit trail')
      setEvents([])
      return []
    } finally {
      setLoading(false)
    }
  }, [isConnected, provider, policyManager, consensusStakingV2, rewardPool, daoGovernance, filter])

  // Auto-fetch events
  useEffect(() => {
    if (isConnected && provider) {
      fetchEvents()
      // Refresh every 30 seconds
      const interval = setInterval(fetchEvents, 30000)
      return () => clearInterval(interval)
    }
  }, [isConnected, provider, fetchEvents])

  return {
    events,
    loading,
    error,
    fetchEvents,
  }
}

