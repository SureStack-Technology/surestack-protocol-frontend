import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { useWeb3 } from "../contexts/Web3Context.jsx"
import { toast } from "react-hot-toast"
import ProposalTimeline from "./governance/ProposalTimeline.jsx"
import ProposalForm from "./governance/ProposalForm.jsx"
import SSTTokenABI from "@shared/abi/SureStackToken.json"
import GovernanceABI from "@shared/abi/DAOGovernance.json"
import { CONTRACT_ADDRESSES } from "../config/contracts"
import { getSignerOrHybridProvider } from "@/shared/rpc/providerManager"
import { useProtocolAnalytics } from "@/hooks/useProtocolAnalytics"

console.log("[TRACE] Mounting GovernancePanel")

export default function GovernancePanel() {
  console.log("[TRACE] Rendering GovernancePanel")
  useEffect(() => {
    console.log("[TRACE] Rendered GovernancePanel")
  }, [])

  const { analytics } = useProtocolAnalytics()
  const governanceSnapshot = analytics?.governance ?? {}

  const { account, signer } = useWeb3()
  const [votingPower, setVotingPower] = useState(0)
  const [proposalThreshold, setProposalThreshold] = useState(0)
  const [loading, setLoading] = useState(false)

  const GOVERNANCE_ADDRESS =
    import.meta.env.VITE_DAO_GOVERNANCE_ADDRESS ||
    import.meta.env.VITE_GOVERNANCE_ADDRESS ||
    CONTRACT_ADDRESSES.DAO_GOVERNANCE

  const SST_TOKEN_ADDRESS =
    import.meta.env.VITE_SURE_STACK_TOKEN_ADDRESS ||
    import.meta.env.VITE_SST_TOKEN_ADDRESS ||
    CONTRACT_ADDRESSES.SURE_STACK_TOKEN

  useEffect(() => {
    if (!account) return
    fetchGovernanceStats()
    const interval = setInterval(fetchGovernanceStats, 30000)
    return () => clearInterval(interval)
  }, [account, signer])

  async function fetchGovernanceStats() {
    try {
      const provider = getSignerOrHybridProvider(signer)

      if (!GOVERNANCE_ADDRESS || !SST_TOKEN_ADDRESS) {
        console.warn("[GovernancePanel] Missing contract addresses")
        return
      }

      const governance = new ethers.Contract(
        GOVERNANCE_ADDRESS,
        GovernanceABI?.abi || [],
        provider
      )
      const sst = new ethers.Contract(
        SST_TOKEN_ADDRESS,
        SSTTokenABI?.abi || [],
        provider
      )

      const [votes, threshold] = await Promise.all([
        sst.getVotes(account).catch(() => 0n),
        governance.proposalThreshold().catch(() => 0n),
      ])

      setVotingPower(Number(ethers.formatEther(votes)))
      setProposalThreshold(Number(ethers.formatEther(threshold)))
    } catch (err) {
      console.warn("[GovernancePanel] Fetch failed:", err)
    }
  }

  async function delegateToSelf() {
    try {
      if (!signer || !account) {
        toast.error("Wallet not connected")
        return
      }

      if (!SST_TOKEN_ADDRESS) {
        toast.error("SST token address not configured")
        return
      }

      setLoading(true)
      const token = new ethers.Contract(
        SST_TOKEN_ADDRESS,
        SSTTokenABI?.abi || [],
        signer
      )

      const toastId = toast.loading("Delegating voting power...")
      const tx = await token.delegate(account)
      await tx.wait()
      
      toast.success("✅ Voting power delegated successfully!", { id: toastId })
      fetchGovernanceStats()
    } catch (err) {
      console.error("[GovernancePanel] Delegation error:", err)
      toast.error("Delegation failed: " + (err.reason || err.message || "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 glass-panel holo-card space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading text-neon-cyan uppercase tracking-wider">
          DAO Governance
        </h1>
        <div className="text-sm text-slate-400 font-mono">
          🟢 Snapshot Mode
        </div>
      </div>

      {account && (
        <div
          className="rounded-2xl p-4 mb-4 border border-safe"
          style={{
            background: 'rgba(6, 17, 34, 0.75)',
            boxShadow: '0 0 18px var(--glow-blue)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center">
            <div>
              <h3 className="text-lg font-semibold text-[var(--primary-cyan)] mb-1">🗳 DAO Governance</h3>
              <p className="text-sm text-[color:rgba(200,228,255,0.75)]">
                Your Voting Power: <span className="text-[var(--fg-text)]">{votingPower.toLocaleString()} SST</span>
              </p>
              <p className="text-sm text-[color:rgba(200,228,255,0.75)]">
                Required Threshold: <span className="text-[var(--fg-text)]">{proposalThreshold.toLocaleString()} SST</span>
              </p>
              {votingPower < proposalThreshold ? (
                <p className="text-yellow-400 text-xs mt-1">
                  ⚠️ You need {(proposalThreshold - votingPower).toLocaleString()} more SST to create a proposal.
                </p>
              ) : (
                <p className="text-green-400 text-xs mt-1">
                  ✅ You have enough SST to propose.
                </p>
              )}
            </div>

            {votingPower === 0 && (
              <button
                onClick={delegateToSelf}
                disabled={loading}
                className={`btn-brand px-3 py-1 rounded-xl mt-3 sm:mt-0 text-sm transition ${loading ? 'btn-brand-disabled' : ''}`}
              >
                {loading ? "⏳ Delegating..." : "🔑 Delegate Voting Power"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="glass-card p-4 border border-[var(--glass-border)] bg-[rgba(6,17,34,0.6)]">
        <p className="text-sm text-[color:rgba(200,228,255,0.75)]">
          Active Proposals: <span className="text-[var(--primary-cyan)]">{(governanceSnapshot.active ?? []).length}</span>
        </p>
        <p className="text-sm text-[color:rgba(200,228,255,0.75)]">
          Proposal Threshold: <span className="text-[var(--primary-cyan)]">{(governanceSnapshot.threshold ?? 0).toLocaleString()} SST</span>
        </p>
        <p className="text-sm text-[color:rgba(200,228,255,0.75)]">
          Quorum Requirement: <span className="text-[var(--primary-cyan)]">{(governanceSnapshot.quorum ?? 0).toLocaleString()} SST</span>
        </p>
      </div>

      <ProposalForm votingPower={votingPower} proposalThreshold={proposalThreshold} />

      <ProposalTimeline proposals={governanceSnapshot.active ?? []} />
    </div>
  )
}

