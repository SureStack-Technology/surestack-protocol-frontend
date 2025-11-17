import { useState, useEffect } from 'react'
import { useWeb3 } from '@contexts/Web3Context'
import { useContracts } from '@/hooks/useContracts'
import { useBusinessRole } from '@shared/hooks/useBusinessRole'
import { useGovernance, useProposals } from "@shared/hooks"
import { formatEther, formatNumber } from '../../utils/formatters'
import { AlertCircle } from 'lucide-react'
import ProposalForm from '@components/governance/ProposalForm'
import ProposalList from '@components/governance/ProposalList'
import GovernanceHistory from '@components/governance/GovernanceHistory'

export default function BusinessGovernancePanel() {
  console.log('✅ [BusinessGovernancePanel] Component mounted')
  
  const { isConnected } = useWeb3()
  const { role, isAdmin, hasAnyRole } = useBusinessRole()
  const { daoGovernance, policyManager, consensusStakingV2, oracleReader, oracleReaderV2 } = useContracts()
  
  let votingPower, proposalThreshold, quorum, governanceLoading
  try {
    const governance = useGovernance()
    votingPower = governance.votingPower
    proposalThreshold = governance.proposalThreshold
    quorum = governance.quorum
    governanceLoading = governance.loading
    console.log('✅ [BusinessGovernancePanel] useGovernance hook loaded')
  } catch (err) {
    console.error('❌ [BusinessGovernancePanel] Error loading useGovernance:', err)
    votingPower = '0'
    proposalThreshold = '0'
    quorum = '0'
    governanceLoading = false
  }
  
  let proposals = []
  try {
    const proposalsData = useProposals()
    proposals = proposalsData.proposals || []
    console.log('✅ [BusinessGovernancePanel] useProposals hook loaded, proposals:', proposals.length)
  } catch (err) {
    console.error('❌ [BusinessGovernancePanel] Error loading useProposals:', err)
    proposals = []
  }

  const oracleContract = oracleReader || oracleReaderV2
  const [governanceParams, setGovernanceParams] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('proposals')

  useEffect(() => {
    console.log('🔍 [BusinessGovernancePanel] useEffect triggered, isConnected:', isConnected)
    if (!isConnected) {
      console.log('⚠️ [BusinessGovernancePanel] Wallet not connected')
      return
    }

    const fetchParams = async () => {
      try {
        console.log('🔍 [BusinessGovernancePanel] Fetching governance parameters...')
        setLoading(true)
        const params = {}

        if (daoGovernance) {
          try {
            params.votingDelay = await daoGovernance.votingDelay()
            params.votingPeriod = await daoGovernance.votingPeriod()
            params.proposalThreshold = formatEther(await daoGovernance.proposalThreshold())
            params.quorumDenominator = await daoGovernance.quorumDenominator()
          } catch (error) {
            console.error('Error fetching DAO params:', error)
          }
        }

        setGovernanceParams(params)
        console.log('✅ [BusinessGovernancePanel] Governance parameters fetched:', params)
      } catch (error) {
        console.error('❌ [BusinessGovernancePanel] Error fetching governance parameters:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchParams()
    const interval = setInterval(fetchParams, 60000)
    return () => clearInterval(interval)
  }, [isConnected, daoGovernance])

  if (!isConnected) {
    return (
      <div className="space-y-6 animate-fade-in min-h-screen bg-background text-foreground p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Please connect your wallet to view governance</p>
        </div>
      </div>
    )
  }

  if (loading || governanceLoading) {
    return (
      <div className="space-y-6 animate-fade-in min-h-screen bg-background text-foreground p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-400">Loading governance data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient mb-2">Business Governance</h1>
        <p className="text-gray-400">DAO governance for business partners and insurance providers</p>
      </div>

      {/* Governance Stats */}
      {votingPower && proposalThreshold && (
        <div className="card-dark mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
              <div className="text-sm text-gray-400 mb-1">Your Voting Power</div>
              <div className="text-2xl font-bold text-purple-400">
                {formatNumber(votingPower, 2)} SST
              </div>
            </div>
            <div className="bg-indigo-500/10 rounded-lg p-4 border border-indigo-500/20">
              <div className="text-sm text-gray-400 mb-1">Proposal Threshold</div>
              <div className="text-2xl font-bold text-indigo-400">
                {formatNumber(proposalThreshold, 2)} SST
              </div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
              <div className="text-sm text-gray-400 mb-1">Quorum Required</div>
              <div className="text-2xl font-bold text-green-400">
                {formatNumber(quorum, 2)} SST
              </div>
            </div>
            {proposals && (
              <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
                <div className="text-sm text-gray-400 mb-1">Active Proposals</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {proposals.filter(p => p.state === 1).length}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('proposals')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'proposals'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Proposals
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          History
        </button>
      </div>

      {/* Create Proposal Form */}
      {activeTab === 'proposals' && (
        <>
          {/* Only show ProposalForm for Admin and Underwriter roles */}
          {(isAdmin || hasAnyRole(['Underwriter', 'DAO Member'])) ? (
            <ProposalForm />
          ) : (
            <div className="card-dark mb-6 p-6">
              <div className="flex items-center gap-3 text-yellow-400">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">
                  You need Admin, Underwriter, or DAO Member role to create proposals. 
                  Current role: <span className="font-semibold">{role}</span>
                </p>
              </div>
            </div>
          )}
          <ProposalList />
        </>
      )}

      {/* Governance History */}
      {activeTab === 'history' && <GovernanceHistory />}
    </div>
  )
}

