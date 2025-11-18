import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { TrendingUp, FileText, DollarSign, AlertCircle } from 'lucide-react'
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics'
import { formatNumber } from '../../utils/formatters'

const fallbackVotingTrends = [
  { name: 'Liquidity Backstop', forVotes: 12000, againstVotes: 3000, abstainVotes: 800 },
  { name: 'Validator Expansion', forVotes: 15000, againstVotes: 2000, abstainVotes: 600 },
  { name: 'Treasury Allocation', forVotes: 11000, againstVotes: 2500, abstainVotes: 500 },
]

export default function UnderwritingPanel() {
  const { loading, error, protocol, staking, governance } = useProtocolAnalytics()

  const totalCoverageUSD = protocol?.totalCoverageUSD ?? 0
  const totalStakedSST = staking?.totalStakedSST ?? 0
  const quorumRequirement = governance?.quorum ?? governance?.quorumRequirement ?? 0
  const proposalThreshold = governance?.threshold ?? governance?.proposalThreshold ?? 0
  const totalProposals = governance?.proposalCount ?? 0
  const activeProposals = governance?.active?.length ?? 0
  const succeededProposals = governance?.succeeded ?? governance?.succeededCount ?? 0
  const executedProposals = governance?.executed ?? governance?.executedCount ?? 0

  const votingTrends = useMemo(() => {
    if (Array.isArray(governance?.votingTrends) && governance.votingTrends.length > 0) {
      return governance.votingTrends.map((trend, index) => ({
        name: trend.name ?? `Proposal ${index + 1}`,
        forVotes: Number(trend.forVotes ?? 0),
        againstVotes: Number(trend.againstVotes ?? 0),
        abstainVotes: Number(trend.abstainVotes ?? 0),
      }))
    }

    if (Array.isArray(governance?.active) && governance.active.length > 0) {
      return governance.active.map((proposal, index) => ({
        name: proposal.title ?? `Active Proposal ${index + 1}`,
        forVotes: Number(proposal.forVotes ?? 0),
        againstVotes: Number(proposal.againstVotes ?? 0),
        abstainVotes: Number(proposal.abstainVotes ?? 0),
      }))
    }

    return fallbackVotingTrends
  }, [governance])

  const recentProposals = useMemo(() => {
    if (Array.isArray(governance?.recent) && governance.recent.length > 0) {
      return governance.recent
    }

    if (Array.isArray(governance?.active) && governance.active.length > 0) {
      return governance.active
    }

    return []
  }, [governance])

  return (
    <div className="space-y-6 animate-fade-in min-h-screen bg-background text-foreground p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient mb-2">Underwriting Metrics</h1>
        <p className="text-gray-400">Track DAO throughput and liquidity buffers that secure underwriting decisions.</p>
      </div>

      {error && (
        <div className="glass-card border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
          Live underwriting analytics are currently unavailable. Displaying the latest cached analytics snapshot.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Total Coverage</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '...' : `$${formatNumber(totalCoverageUSD, 0)}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">USD insured via active underwriting</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Total Staked</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '...' : `${formatNumber(totalStakedSST, 2)} SST`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Validator capital backing risk pools</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Governance Quorum</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '...' : `${formatNumber(quorumRequirement, 0)} votes`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Minimum votes required for proposals</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-[color:rgba(200,228,255,0.72)] mb-1">Proposal Threshold</p>
          <p className="text-2xl font-heading text-white">
            {loading ? '...' : `${formatNumber(proposalThreshold, 0)} votes`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Voting power to submit underwriting updates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <FileText className="h-8 w-8 text-blue-400" />
            <span className="text-sm text-gray-400">Total Proposals</span>
          </div>
          <div className="text-2xl font-bold text-white">{totalProposals}</div>
          <p className="text-sm text-gray-400 mt-2">Aggregated underwriting proposals</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-green-400" />
            <span className="text-sm text-gray-400">Active Proposals</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{activeProposals}</div>
          <p className="text-sm text-gray-400 mt-2">Currently in the voting window</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-yellow-400" />
            <span className="text-sm text-gray-400">Succeeded</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">{succeededProposals}</div>
          <p className="text-sm text-gray-400 mt-2">Passed the quorum threshold</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="h-8 w-8 text-purple-400" />
            <span className="text-sm text-gray-400">Executed</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">{executedProposals}</div>
          <p className="text-sm text-gray-400 mt-2">Implemented to adjust coverage</p>
        </div>
      </div>

      <div className="card-dark mt-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Voting Trends</h2>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-400">Loading analytics...</span>
            </div>
          ) : votingTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={votingTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Legend />
                <Line type="monotone" dataKey="forVotes" stroke="#34d399" strokeWidth={2} name="For Votes" />
                <Line type="monotone" dataKey="againstVotes" stroke="#f87171" strokeWidth={2} name="Against Votes" />
                <Line type="monotone" dataKey="abstainVotes" stroke="#a78bfa" strokeWidth={2} name="Abstain Votes" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">No voting trend data available yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card-dark mt-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Recent Proposals</h2>
          {recentProposals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Title</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">For</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Against</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Abstain</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProposals.slice(0, 5).map((proposal, index) => (
                    <tr key={proposal.id ?? index} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-white">
                        {proposal.title ?? proposal.description ?? `Proposal ${index + 1}`}
                      </td>
                      <td className="py-3 px-4 text-right text-green-400">
                        {formatNumber(proposal.forVotes ?? 0, 2)}
                      </td>
                      <td className="py-3 px-4 text-right text-red-400">
                        {formatNumber(proposal.againstVotes ?? 0, 2)}
                      </td>
                      <td className="py-3 px-4 text-right text-purple-400">
                        {formatNumber(proposal.abstainVotes ?? 0, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No proposals available in the current analytics snapshot.</p>
          )}
        </div>
      </div>
    </div>
  )
}

