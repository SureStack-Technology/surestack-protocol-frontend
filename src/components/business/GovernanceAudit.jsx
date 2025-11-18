import { useState, useEffect } from 'react'
import { useProposals, useGovernance } from "@shared/hooks"
import { useContracts } from '../../hooks/useContracts'
import { useSimulation } from '../../contexts/SimulationContext'
import { startDataSimulation, stopDataSimulation, getMockData } from '../../utils/dataSimulator'
import { formatNumber, formatEther } from '../../utils/formatters'
import { Shield, Clock, Target, Users, CheckCircle, XCircle } from 'lucide-react'

export default function GovernanceAudit() {
  const { proposals: contractProposals, loading: proposalsLoading } = useProposals()
  const { votingPower, proposalThreshold, quorum, loading: governanceLoading } = useGovernance()
  const { daoGovernance } = useContracts()
  const { simulationMode } = useSimulation()
  const [simulatedData, setSimulatedData] = useState(null)
  const [governanceParams, setGovernanceParams] = useState(null)

  // Use simulation data if in simulation mode, otherwise use contract data
  const proposals = simulationMode && simulatedData ? simulatedData.proposals : contractProposals

  // Start/stop simulation based on mode
  useEffect(() => {
    if (simulationMode) {
      startDataSimulation(setSimulatedData)
      return () => stopDataSimulation()
    } else {
      stopDataSimulation()
      setSimulatedData(null)
    }
  }, [simulationMode])

  useEffect(() => {
    const fetchParams = async () => {
      if (simulationMode && simulatedData) {
        // Use simulated governance params
        setGovernanceParams({
          votingDelay: simulatedData.governanceParams.votingDelay,
          votingPeriod: simulatedData.governanceParams.votingPeriod,
          proposalThreshold: formatEther(BigInt(simulatedData.governanceParams.proposalThreshold)),
          quorumDenominator: simulatedData.governanceParams.quorumDenominator,
        })
        return
      }

      if (!daoGovernance) return

      try {
        const params = {
          votingDelay: await daoGovernance.votingDelay().catch(() => 0),
          votingPeriod: await daoGovernance.votingPeriod().catch(() => 0),
          proposalThreshold: formatEther(await daoGovernance.proposalThreshold().catch(() => 0n)),
          quorumDenominator: await daoGovernance.quorumDenominator().catch(() => 0),
        }
        setGovernanceParams(params)
      } catch (err) {
        console.error('Error fetching governance params:', err)
      }
    }

    fetchParams()
  }, [daoGovernance, simulationMode, simulatedData])

  const executedProposals = proposals.filter(p => p.state === 7)
  const succeededProposals = proposals.filter(p => p.state === 4)
  const defeatedProposals = proposals.filter(p => p.state === 3)
  const activeProposals = proposals.filter(p => p.state === 1)

  return (
    <div className="space-y-6 animate-fade-in min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient mb-2">Governance Audit</h1>
        <p className="text-gray-400">Review executed proposals and verify DAO actions</p>
      </div>

      {/* Governance Parameters */}
      {governanceParams && (
        <div className="card-dark mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Governance Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-purple-400" />
                <span className="text-sm text-gray-400">Voting Delay</span>
              </div>
              <div className="text-2xl font-bold text-white">{governanceParams.votingDelay?.toString() || '0'}</div>
              <p className="text-xs text-gray-400 mt-1">blocks</p>
            </div>

            <div className="bg-indigo-500/10 rounded-lg p-4 border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-indigo-400" />
                <span className="text-sm text-gray-400">Voting Period</span>
              </div>
              <div className="text-2xl font-bold text-white">{governanceParams.votingPeriod?.toString() || '0'}</div>
              <p className="text-xs text-gray-400 mt-1">blocks</p>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-blue-400" />
                <span className="text-sm text-gray-400">Proposal Threshold</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {formatNumber(governanceParams.proposalThreshold || '0', 2)} SST
              </div>
            </div>

            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-green-400" />
                <span className="text-sm text-gray-400">Quorum Denominator</span>
              </div>
              <div className="text-2xl font-bold text-white">{governanceParams.quorumDenominator?.toString() || '0'}</div>
              <p className="text-xs text-gray-400 mt-1">basis points</p>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
            <span className="text-sm text-gray-400">Executed</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{executedProposals.length}</div>
          <p className="text-sm text-gray-400 mt-2">Proposals executed</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <Shield className="h-8 w-8 text-yellow-400" />
            <span className="text-sm text-gray-400">Succeeded</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">{succeededProposals.length}</div>
          <p className="text-sm text-gray-400 mt-2">Proposals passed</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <XCircle className="h-8 w-8 text-red-400" />
            <span className="text-sm text-gray-400">Defeated</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{defeatedProposals.length}</div>
          <p className="text-sm text-gray-400 mt-2">Proposals rejected</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-blue-400" />
            <span className="text-sm text-gray-400">Active</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{activeProposals.length}</div>
          <p className="text-sm text-gray-400 mt-2">Currently voting</p>
        </div>
      </div>

      {/* Executed Proposals */}
      <div className="card-dark">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Executed Proposals</h2>
          {proposalsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-400">Loading proposals...</span>
            </div>
          ) : executedProposals.length > 0 ? (
            <div className="space-y-4">
              {executedProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="border-b border-slate-700/50 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-lg font-medium text-white mb-1">
                        {proposal.description || 'No description'}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>ID: {proposal.id.slice(0, 10)}...</span>
                        <span>•</span>
                        <span>TX: {proposal.txHash?.slice(0, 10)}...</span>
                        <span>•</span>
                        <span>{new Date(proposal.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        Executed
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-3 text-sm">
                    <div>
                      <span className="text-gray-400">For: </span>
                      <span className="text-green-400 font-medium">
                        {formatNumber(proposal.votes?.forVotes || '0', 2)} SST
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Against: </span>
                      <span className="text-red-400 font-medium">
                        {formatNumber(proposal.votes?.againstVotes || '0', 2)} SST
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Abstain: </span>
                      <span className="text-gray-400 font-medium">
                        {formatNumber(proposal.votes?.abstainVotes || '0', 2)} SST
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-400">No executed proposals yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

