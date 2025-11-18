import { useEffect, useState, useRef } from "react"
import { ethers } from "ethers"
import governorAbi from "../abi/Governor.json"

export function useGovernanceSync() {
  const [proposals, setProposals] = useState([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const pollRef = useRef(null)

  const DAO = import.meta.env.VITE_DAO_GOVERNANCE_ADDRESS
  const RPC_HTTP = import.meta.env.VITE_SEPOLIA_RPC

  // Convert HTTP RPC to WebSocket (Infura/Alchemy pattern)
  const RPC_WS = RPC_HTTP?.replace("https://", "wss://")?.replace("http://", "ws://")

  // Fetch proposals via HTTP polling using events
  async function pollProposals() {
    if (!DAO || !RPC_HTTP) {
      setError("DAO address or RPC not configured")
      return
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_HTTP)
      const contract = new ethers.Contract(DAO, governorAbi, provider)

      // Query ProposalCreated events to get all proposals
      const filter = contract.filters.ProposalCreated()
      const events = await contract.queryFilter(filter, 0, 'latest')

      const all = []
      for (const event of events) {
        const proposalId = event.args.proposalId.toString()
        try {
          const [forVotes, againstVotes] = await contract.proposalVotes(proposalId)
          const snapshot = await contract.proposalSnapshot(proposalId).catch(() => 0)
          const deadline = await contract.proposalDeadline(proposalId).catch(() => 0)
          const proposer = await contract.proposalProposer(proposalId).catch(() => event.args.proposer)
          const state = await contract.state(proposalId).catch(() => 0)

          all.push({
            id: proposalId,
            proposer: proposer || event.args.proposer,
            startBlock: Number(snapshot),
            endBlock: Number(deadline),
            forVotes: Number(forVotes),
            againstVotes: Number(againstVotes),
            executed: Number(state) === 5, // Executed state
          })
        } catch (e) {
          console.warn(`[GovernanceSync] Failed to fetch proposal ${proposalId}:`, e)
        }
      }

      setProposals(all.reverse())
      setError(null)
    } catch (e) {
      console.warn("[GovernanceSync] Poll error", e)
      setError(e.message)
    }
  }

  // Live event listener via WebSocket Provider
  async function initWebSocket() {
    if (!RPC_WS || !DAO) {
      console.warn("[GovernanceSync] WebSocket not available, using polling only")
      return
    }

    try {
      const provider = new ethers.WebSocketProvider(RPC_WS)
      const contract = new ethers.Contract(DAO, governorAbi, provider)

      wsRef.current = provider

      provider.on("error", e => { 
        console.error("[WS] Error", e)
        setConnected(false)
      })

      provider.on("close", () => { 
        console.warn("[WS] Closed")
        setConnected(false)
      })

      provider.on("open", () => { 
        setConnected(true)
      })

      contract.on("ProposalCreated", (...args) => {
        console.log("🧾 ProposalCreated", args)
        pollProposals()
      })

      contract.on("VoteCast", (...args) => {
        console.log("🗳 VoteCast", args)
        pollProposals()
      })

      contract.on("ProposalExecuted", (...args) => {
        console.log("✅ ProposalExecuted", args)
        pollProposals()
      })
    } catch (e) {
      console.error("[GovernanceSync] WS init failed", e)
      setError(e.message)
    }
  }

  useEffect(() => {
    pollProposals()
    initWebSocket()
    pollRef.current = setInterval(pollProposals, 60000) // 1 min fallback poll

    return () => {
      if (wsRef.current?.destroy) wsRef.current.destroy()
      clearInterval(pollRef.current)
    }
  }, [])

  return { proposals, connected, error }
}

















