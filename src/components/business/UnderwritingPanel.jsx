import { useEffect, useState } from 'react'
import { useProposals } from "@shared/hooks"
import { useContracts } from '../../hooks/useContracts'
import { useSimulation } from '../../contexts/SimulationContext'
import { startDataSimulation, stopDataSimulation, getMockData } from '../../utils/dataSimulator'
import { formatNumber } from '../../utils/formatters'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { TrendingUp, FileText, DollarSign, AlertCircle } from 'lucide-react'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'

export default function UnderwritingPanel() {
  const { proposals: contractProposals, loading: proposalsLoading } = useProposals()
  const { daoGovernance, provider } = useContracts()
  const { simulationMode } = useSimulation()
  const [simulatedData, setSimulatedData] = useState(null)
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)

  const {
    loading: analyticsLoading,
    error: analyticsError,
    protocol,
    staking,
    governance,
  } = useProtocolAnalytics()

  const analytics = {
    totalCoverageUSD: protocol?.totalCoverageUSD ?? 0,
    totalPremiums: protocol?.totalPremiums ?? 0,
    totalStakedSST: staking?.totalStakedSST ?? 0,
    daoTreasurySST: staking?.daoTreasurySST ?? 0,
    quorumRequirement: governance?.quorumRequirement ?? 0,
    proposalThreshold: governance?.proposalThreshold ?? 0,
    totalVotingPower: governance?.totalVotingPower ?? 0,
  }

  const quorumSST = Number(analytics.quorumRequirement ?? 0) / 1e18
  const thresholdSST = Number(analytics.proposalThreshold ?? 0) / 1e18

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
    const processMetrics = async () => {
      if (simulationMode && simulatedData) {
        // Use simulated data directly
        const data = simulatedData.proposals.slice(0, 10).map(p => ({
          name: p.description.slice(0, 30) + (p.description.length > 30 ? '...' : ''),
          forVotes: Number(p.forVotes) / 1e18,
          againstVotes: Number(p.againstVotes) / 1e18,
          abstainVotes: Number(p.abstainVotes) / 1e18,
          totalVotes: (Number(p.forVotes) + Number(p.againstVotes) + Number(p.abstainVotes)) / 1e18,
          state: p.state,
          timestamp: new Date(p.timestamp).toLocaleDateString(),
        }))
        setMetrics(data)
        setLoading(false)
        return
      }

      if (!daoGovernance || !provider || proposalsLoading) {
        setLoading(false)
        return
      }

      try {
        console.log('📊 [UnderwritingPanel] Aggregating underwriting metrics...')
        setLoading(true)

        const data = await Promise.all(
          proposals.slice(0, 10).map(async (p) => {
            try {
              // Get proposal votes
              const proposalVotes = await daoGovernance.proposalVotes(p.id).catch(() => ({
                forVotes: 0n,
                againstVotes: 0n,
                abstainVotes: 0n,
              }))

              return {
                name: p.description.slice(0, 30) + (p.description.length > 30 ? '...' : ''),
                forVotes: Number(proposalVotes.forVotes || 0n) / 1e18,
                againstVotes: Number(proposalVotes.againstVotes || 0n) / 1e18,
                abstainVotes: Number(proposalVotes.abstainVotes || 0n) / 1e18,
                totalVotes: Number(proposalVotes.forVotes || 0n) / 1e18 + 
                           Number(proposalVotes.againstVotes || 0n) / 1e18 + 
                           Number(proposalVotes.abstainVotes || 0n) / 1e18,
                state: p.state,
                timestamp: new Date(p.timestamp).toLocaleDateString(),
              }
            } catch (err) {
              console.error('Error processing proposal:', err)
              return null
            }
          })
        )

        const validMetrics = data.filter(m => m !== null)
        setMetrics(validMetrics)
      } catch (err) {
        console.error('❌ [UnderwritingPanel] Error processing metrics:', err)
        setMetrics([])
      } finally {
        setLoading(false)
      }
    }

    if (proposals.length > 0) {
      processMetrics()
    } else {
      setLoading(false)
    }
  }, [proposals, daoGovernance, provider, proposalsLoading])

  const totalProposals = proposals.length
  const activeProposals = proposals.filter(p => p.state === 1).length
  const succeededProposals = proposals.filter(p => p.state === 4).length
  const executedProposals = proposals.filter(p => p.state === 7).length

  return (
    <div className="space-y-6 animate-fade-in min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient mb-2">Underwriting Metrics</h1>
        <p className="text-gray-400">Track DAO decisions impacting underwriting rates and payouts</p>
      </div>

      {analyticsError && (
        <div className="glass-card border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
          Live underwriting analytics are currently unavailable. Displaying governance data when possible.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Total Coverage</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? '…' : `$${formatNumber(analytics.totalCoverageUSD, 0)}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">USD capacity influenced by underwriting</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Total Staked</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? '…' : `${formatNumber(analytics.totalStakedSST, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Validator capital backing underwriting</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Governance Quorum</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? '…' : `${formatNumber(quorumSST, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Votes required for underwriting proposals</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Proposal Threshold</p>
          <p className="text-2xl font-heading text-white">
            {analyticsLoading ? '…' : `${formatNumber(thresholdSST, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Voting power needed to submit changes</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <FileText className="h-8 w-8 text-blue-400" />
            <span className="text-sm text-gray-400">Total Proposals</span>
          </div>
          <div className="text-2xl font-bold text-white">{totalProposals}</div>
          <p className="text-sm text-gray-400 mt-2">All proposals</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-green-400" />
            <span className="text-sm text-gray-400">Active Proposals</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{activeProposals}</div>
          <p className="text-sm text-gray-400 mt-2">Currently voting</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-yellow-400" />
            <span className="text-sm text-gray-400">Succeeded</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">{succeededProposals}</div>
          <p className="text-sm text-gray-400 mt-2">Passed voting</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="h-8 w-8 text-purple-400" />
            <span className="text-sm text-gray-400">Executed</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">{executedProposals}</div>
          <p className="text-sm text-gray-400 mt-2">Implemented</p>
        </div>
      </div>

      {/* Voting Trends Chart */}
      <div className="card-dark mt-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Voting Trends</h2>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-400">Loading metrics...</span>
            </div>
          ) : metrics.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Legend />
                <Line type="monotone" dataKey="forVotes" stroke="#34d399" strokeWidth={2} name="For Votes (SST)" />
                <Line type="monotone" dataKey="againstVotes" stroke="#f87171" strokeWidth={2} name="Against Votes (SST)" />
                <Line type="monotone" dataKey="abstainVotes" stroke="#a78bfa" strokeWidth={2} name="Abstain Votes (SST)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">No proposal data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Proposals Table */}
      {proposals.length > 0 && (
        <div className="card-dark mt-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Recent Proposals</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">State</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">For</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Against</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.slice(0, 5).map((proposal) => {
                    const stateLabels = {
                      0: 'Pending',
                      1: 'Active',
                      2: 'Canceled',
                      3: 'Defeated',
                      4: 'Succeeded',
                      5: 'Queued',
                      6: 'Expired',
                      7: 'Executed',
                    }
                    const stateColors = {
                      0: 'text-gray-400',
                      1: 'text-blue-400',
                      2: 'text-red-400',
                      3: 'text-red-500',
                      4: 'text-green-400',
                      5: 'text-yellow-400',
                      6: 'text-gray-500',
                      7: 'text-green-500',
                    }

                    return (
                      <tr key={proposal.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                        <td className="py-3 px-4 text-white">
                          {proposal.description.slice(0, 50)}
                          {proposal.description.length > 50 ? '...' : ''}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-medium ${stateColors[proposal.state] || 'text-gray-400'}`}>
                            {stateLabels[proposal.state] || 'Unknown'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-green-400">
                          {formatNumber(proposal.votes?.forVotes || '0', 2)} SST
                        </td>
                        <td className="py-3 px-4 text-right text-red-400">
                          {formatNumber(proposal.votes?.againstVotes || '0', 2)} SST
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400">
                          {new Date(proposal.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

