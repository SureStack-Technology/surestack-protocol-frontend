import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../contexts/Web3Context'
import { useContracts } from './useContracts'
import { CONTRACT_ADDRESSES } from '../config/contracts'
import { queryRecentEvents } from '../utils/events'

export const useValidatorLeaderboard = () => {
  const { provider } = useWeb3()
  const { consensusStakingV2 } = useContracts()
  const [validators, setValidators] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!provider || !consensusStakingV2) return

    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Query Staked events to get all validator addresses
        const filter = consensusStakingV2.filters.Staked()
        const events = await queryRecentEvents(consensusStakingV2, filter, provider, 100000) // Look back 100k blocks
        
        // Get unique validator addresses from events
        const validatorAddresses = [...new Set(events.map(e => e.args?.validator || e.args?.[0]).filter(Boolean))]
        
        if (validatorAddresses.length === 0) {
          setValidators([])
          setLoading(false)
          return
        }

        // Fetch profiles for all validators
        const profiles = await Promise.all(
          validatorAddresses.map(async (addr) => {
            try {
              const profile = await consensusStakingV2.validatorProfiles(addr)
              
              // Profile struct: (stakedAmount, accuracyScore, totalRewards, isActive, unstakeLockoutEnd, pendingUnstake)
              return {
                address: addr,
                staked: Number(ethers.formatUnits(profile.stakedAmount || 0n, 18)),
                accuracy: Number(profile.accuracyScore || 0) / 100, // Convert from basis points (10000 = 100%)
                rewards: Number(ethers.formatUnits(profile.totalRewards || 0n, 18)),
                active: profile.isActive || false,
                pendingUnstake: Number(ethers.formatUnits(profile.pendingUnstake || 0n, 18)),
              }
            } catch (err) {
              console.warn(`Error fetching profile for ${addr}:`, err)
              return null
            }
          })
        )

        // Filter out null results and inactive validators (optional - you can include inactive too)
        const validProfiles = profiles.filter(v => v !== null && v.staked > 0)
        
        // Rank by staked amount, then by accuracy
        const ranked = validProfiles.sort((a, b) => {
          if (b.staked === a.staked) {
            return b.accuracy - a.accuracy
          }
          return b.staked - a.staked
        })

        setValidators(ranked)
      } catch (err) {
        console.warn('⚠️ Leaderboard fetch failed:', err)
        setValidators([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 15000) // Refresh every 15 seconds
    return () => clearInterval(interval)
  }, [provider, consensusStakingV2])

  return { validators, loading }
}

