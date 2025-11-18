import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ethers } from 'ethers'
import { useWeb3 } from '../../contexts/Web3Context.jsx'
import { formatAddress, formatDate } from '../../utils/formatters.js'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import GovernanceABI from '@shared/abi/DAOGovernance.json'
import deployments from '@shared/deployments/sepolia.json'
import { CONTRACT_ADDRESSES } from '../../config/contracts'

const PROPOSAL_STATES = {
  0: { label: 'Pending', color: 'text-slate-400', bg: 'bg-slate-500/20', icon: Clock },
  1: { label: 'Active', color: 'text-safe', bg: 'bg-safe/20', icon: Loader2 },
  2: { label: 'Canceled', color: 'text-risk', bg: 'bg-risk/20', icon: XCircle },
  3: { label: 'Defeated', color: 'text-risk', bg: 'bg-risk/20', icon: XCircle },
  4: { label: 'Succeeded', color: 'text-neon-green', bg: 'bg-neon-green/20', icon: CheckCircle },
  5: { label: 'Queued', color: 'text-warning', bg: 'bg-warning/20', icon: Clock },
  6: { label: 'Expired', color: 'text-slate-500', bg: 'bg-slate-600/20', icon: Clock },
  7: { label: 'Executed', color: 'text-neon-green', bg: 'bg-neon-green/20', icon: CheckCircle },
}

export default function ProposalTimeline({ proposals = [] }) {
  const { account, signer } = useWeb3()
  const [votingPower, setVotingPower] = useState('0')
  const [voting, setVoting] = useState({})

  const GOVERNANCE_ADDRESS = CONTRACT_ADDRESSES.DAO_GOVERNANCE || deployments.DAOGovernance

  useEffect(() => {
    setVotingPower('0')
  }, [account])

  async function vote(proposalId, support) {
    if (!signer || !account) {
      toast.error("Please connect your wallet")
      return
    }

    if (!GOVERNANCE_ADDRESS) {
      toast.error("Governance contract address not configured")
      return
    }

    try {
      setVoting((prev) => ({ ...prev, [proposalId]: true }))
      const governance = new ethers.Contract(
        GOVERNANCE_ADDRESS,
        GovernanceABI?.abi || [],
        signer
      )
      
      const toastId = toast.loading("Submitting vote...")
      const tx = await governance.castVote(proposalId, support)
      await tx.wait()
      
      toast.success("✅ Vote submitted!", { id: toastId })
    } catch (err) {
      console.error("[ProposalTimeline] Vote error:", err)
      toast.error("Vote failed: " + (err.reason || err.message || "Unknown error"))
    } finally {
      setVoting((prev) => ({ ...prev, [proposalId]: false }))
    }
  }

  const getStateInfo = (state) => {
    return PROPOSAL_STATES[state] || PROPOSAL_STATES[0]
  }

  if (!Array.isArray(proposals) || proposals.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 font-mono">
        No proposals found
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading uppercase tracking-wider text-neon-cyan">
          Proposal Timeline
        </h2>
        <div className="text-sm text-slate-400 font-mono">
          Voting Power: <span className="text-safe font-bold">{votingPower} SST</span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-safe/30"></div>

        <div className="space-y-6">
          {proposals.map((proposal, index) => {
            const stateInfo = getStateInfo(proposal.state ?? 0)
            const StateIcon = stateInfo.icon

            return (
              <motion.div
                key={proposal.id ?? index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-20"
              >
                <div
                  className={`absolute left-6 w-4 h-4 rounded-full border-2 ${
                    stateInfo.bg
                  } border-${stateInfo.color.split('-')[1]}-500`}
                  style={{
                    boxShadow: `0 0 10px ${stateInfo.color.includes('safe') ? '#00f5ff' : stateInfo.color.includes('risk') ? '#ff2d55' : '#ffb800'}`,
                  }}
                >
                  <StateIcon className={`w-3 h-3 ${stateInfo.color} absolute top-0.5 left-0.5`} />
                </div>

                <motion.div
                  whileHover={{ scale: 1.02, x: 5 }}
                  className={`glass-card p-6 border-2 ${stateInfo.bg} border-${stateInfo.color.split('-')[1]}-500/50`}
                  style={{
                    boxShadow: `0 0 20px ${stateInfo.color.includes('safe') ? 'rgba(0, 245, 255, 0.3)' : stateInfo.color.includes('risk') ? 'rgba(255, 45, 85, 0.3)' : 'rgba(255, 184, 0, 0.3)'}`,
                  }}
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-heading text-neon-cyan mb-2">
                          Proposal #{proposal.id ?? index + 1}
                        </h3>
                        <p className="text-sm text-slate-400 font-mono">
                          {proposal.description || 'No description'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs rounded-full font-mono uppercase ${stateInfo.bg} ${stateInfo.color} border border-current`}>
                        {stateInfo.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-400 font-mono uppercase mb-1">Proposer</p>
                        <p className="text-sm text-safe font-mono">
                          {formatAddress(proposal.proposer ?? '0x0000000000000000000000000000000000000000')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-mono uppercase mb-1">Created</p>
                        <p className="text-sm text-white font-mono">
                          {proposal.timestamp ? formatDate(proposal.timestamp) : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-400 font-mono mb-2">
                        <span>Voting Progress</span>
                        <span>
                          For: {proposal.votes?.forVotes || '0'} | 
                          Against: {proposal.votes?.againstVotes || '0'}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-safe to-neon-green"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(
                              ((Number(proposal.votes?.forVotes || 0) /
                                (Number(proposal.votes?.forVotes || 0) + Number(proposal.votes?.againstVotes || 0) || 1)) * 100),
                              100
                            )}%`
                          }}
                          transition={{ duration: 1 }}
                          style={{
                            boxShadow: '0 0 10px rgba(0, 245, 255, 0.5)',
                          }}
                        />
                      </div>
                    </div>

                    {proposal.state === 1 && account && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => vote(proposal.id, 1)}
                          disabled={voting[proposal.id]}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {voting[proposal.id] ? "⏳ Voting..." : "👍 Vote For"}
                        </button>
                        <button
                          onClick={() => vote(proposal.id, 0)}
                          disabled={voting[proposal.id]}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {voting[proposal.id] ? "⏳ Voting..." : "👎 Vote Against"}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

