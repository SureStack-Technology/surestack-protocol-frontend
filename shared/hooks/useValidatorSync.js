import { useEffect, useState, useRef } from "react"
import { ethers } from "ethers"
import ConsensusAndStakingV2ABI from "../abi/ConsensusAndStaking.json"

// ✅ Safe ABI validation
const stakingAbi =
  ConsensusAndStakingV2ABI?.abi && Array.isArray(ConsensusAndStakingV2ABI.abi)
    ? ConsensusAndStakingV2ABI.abi
    : (() => {
        console.error(
          "[useValidatorSync] Invalid ABI detected. Check shared/abi/ConsensusAndStaking.json"
        );
        return [];
      })();

const CONSENSUS_STAKING_V2_ADDRESS =
  import.meta.env.VITE_CONSENSUS_STAKING_V2_ADDRESS;

export function useValidatorSync() {
  const [validators, setValidators] = useState([])
  const [stats, setStats] = useState({ totalStaked: 0, active: 0, avgAccuracy: 0 })
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  const wsRef = useRef(null)
  const pollRef = useRef(null)

  const CONSENSUS = CONSENSUS_STAKING_V2_ADDRESS
  const RPC_HTTP = import.meta.env.VITE_SEPOLIA_RPC
  const RPC_WS = RPC_HTTP ? RPC_HTTP.replace("https://", "wss://") : null

  // Poll function: fallback and baseline load
  async function pollValidators() {
    if (!CONSENSUS || !RPC_HTTP) {
      setError("Missing environment variables")
      return
    }

    if (!stakingAbi.length) {
      setError("Invalid ABI for ConsensusAndStakingV2")
      return
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_HTTP)
      const contract = new ethers.Contract(CONSENSUS, stakingAbi, provider)
      
      console.log(
        "[useValidatorSync] Connected to ConsensusAndStakingV2:",
        CONSENSUS
      );
      
      // Try to get validator count - may not exist in all contract versions
      let count = 0
      try {
        count = Number(await contract.validatorCount?.() ?? 0)
      } catch (e) {
        // Fallback: try to get validators by querying events or using a different method
        console.warn("[ValidatorSync] validatorCount not available, using alternative method")
        // For now, we'll use a reasonable default or query events
        count = 0
      }

      const all = []
      let totalStake = 0
      let totalAccuracy = 0
      let active = 0

      // If we have a count, iterate through validators
      if (count > 0) {
        for (let i = 1; i <= count; i++) {
          try {
            const v = await contract.validators(i)
            const stake = Number(ethers.formatUnits(v.stakedAmount ?? 0, 18))
            const acc = Number(v.accuracy ?? 0)
            totalStake += stake
            totalAccuracy += acc
            if (v.isActive) active++

            all.push({
              id: i,
              address: v.wallet || v.address || `0x${i.toString(16).padStart(40, '0')}`,
              staked: stake,
              rewards: Number(ethers.formatUnits(v.rewards ?? 0, 18)),
              accuracy: acc,
              isActive: v.isActive,
            })
          } catch (e) {
            console.warn(`[ValidatorSync] Error fetching validator ${i}:`, e)
          }
        }
      } else {
        // Alternative: query ValidatorStaked events to get validator addresses
        try {
          const filter = contract.filters.ValidatorStaked()
          const events = await contract.queryFilter(filter, -10000) // Last 10k blocks
          const uniqueAddresses = new Set()
          
          for (const event of events) {
            if (event.args && event.args.validator) {
              uniqueAddresses.add(event.args.validator)
            }
          }

          // Fetch validator profiles for each unique address
          for (const address of Array.from(uniqueAddresses).slice(0, 50)) { // Limit to 50
            try {
              const profile = await contract.validatorProfiles(address)
              const stake = Number(ethers.formatUnits(profile.stakedAmount ?? 0, 18))
              const acc = Number(profile.accuracyScore ?? 0) / 100 // Convert from basis points
              totalStake += stake
              totalAccuracy += acc
              if (profile.isActive) active++

              all.push({
                id: all.length + 1,
                address: address,
                staked: stake,
                rewards: Number(ethers.formatUnits(profile.totalRewards ?? 0, 18)),
                accuracy: acc,
                isActive: profile.isActive,
              })
            } catch (e) {
              console.warn(`[ValidatorSync] Error fetching profile for ${address}:`, e)
            }
          }
        } catch (e) {
          console.warn("[ValidatorSync] Event query fallback failed:", e)
        }
      }

      const avgAccuracy = all.length ? (totalAccuracy / all.length).toFixed(2) : 0
      setStats({ totalStaked: totalStake, active, avgAccuracy })
      setValidators(all)
      setError(null)
    } catch (e) {
      console.warn("[ValidatorSync] Poll error", e)
      setError(e.message)
    }
  }

  // WebSocket streaming for live events
  async function initWebSocket() {
    if (!CONSENSUS || !RPC_WS) {
      console.warn("[ValidatorSync] WebSocket not available, using polling only")
      return
    }

    try {
      const provider = new ethers.WebSocketProvider(RPC_WS)
      const contract = new ethers.Contract(CONSENSUS, stakingAbi, provider)
      wsRef.current = provider

      provider.on("open", () => {
        setConnected(true)
        console.log("[ValidatorSync] WebSocket connected")
      })

      provider.on("close", () => {
        setConnected(false)
        console.log("[ValidatorSync] WebSocket closed")
      })

      provider.on("error", (e) => {
        console.error("[ValidatorSync] WS error", e)
        setConnected(false)
      })

      const update = async () => {
        await pollValidators()
      }

      // Listen for validator events
      contract.on("ValidatorStaked", update)
      contract.on("ValidatorUnstaked", update)
      contract.on("RewardDistributed", update)
      contract.on("AccuracyUpdated", update)

      // Initial poll
      await pollValidators()
    } catch (e) {
      console.error("[ValidatorSync] WebSocket init failed", e)
      setError(e.message)
      // Fallback to polling only
      setConnected(false)
    }
  }

  useEffect(() => {
    pollValidators()
    initWebSocket()
    pollRef.current = setInterval(pollValidators, 45000) // 45s fallback polling

    return () => {
      if (wsRef.current?.destroy) {
        wsRef.current.destroy()
      }
      if (wsRef.current?.removeAllListeners) {
        wsRef.current.removeAllListeners()
      }
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [])

  return { validators, stats, connected, error }
}



