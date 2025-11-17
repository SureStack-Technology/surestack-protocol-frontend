import { useState } from 'react'
import { ethers } from 'ethers'
import { useProposals, useGovernance } from "@shared/hooks"
import { useWeb3 } from '../../contexts/Web3Context.jsx'
import { formatNumber, formatEther } from '../../utils/formatters.js'
import { Plus, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import deployments from '@shared/deployments/sepolia.json'
import PolicyManagerABI from '@shared/abi/PolicyManager.json'
import GovernanceABI from '@shared/abi/DAOGovernance.json'
import ConsensusStakingV2ABI from '@shared/abi/ConsensusAndStaking.json'
import { CONTRACT_ADDRESSES } from '../../config/contracts'

export default function ProposalForm({ votingPower: propVotingPower, proposalThreshold: propThreshold }) {
  const { account, isConnected } = useWeb3()
  const { createProposal, loading } = useProposals()
  const governanceHook = useGovernance()
  // Use props if provided, otherwise fall back to hook
  const votingPower = propVotingPower !== undefined ? propVotingPower : governanceHook.votingPower
  const proposalThreshold = propThreshold !== undefined ? propThreshold : governanceHook.proposalThreshold
  const [isExpanded, setIsExpanded] = useState(false)
  const [proposalType, setProposalType] = useState("custom")
  const [param, setParam] = useState("")
  const [formData, setFormData] = useState({
    description: '',
    targets: '',
    values: '',
    calldatas: '',
  })
  const [errors, setErrors] = useState({})

  const POLICY_MANAGER_ADDRESS = CONTRACT_ADDRESSES.POLICY_MANAGER || deployments.PolicyManager
  const CONSENSUS_STAKING_V2_ADDRESS = CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2 || deployments.ConsensusAndStakingV2
  const GOVERNANCE_ADDRESS = CONTRACT_ADDRESSES.DAO_GOVERNANCE || deployments.DAOGovernance

  function getProposalTemplate() {
    try {
      switch (proposalType) {
        case "premium":
          // Note: PolicyManager may not have setPremiumRate - this is a template
          // Users should verify the actual function name in their contract
          if (!POLICY_MANAGER_ADDRESS || !PolicyManagerABI?.abi) {
            throw new Error("PolicyManager ABI not available")
          }
          const policyInterface = new ethers.Interface(PolicyManagerABI.abi)
          // Try to encode - if function doesn't exist, will throw error
          // User should use "custom" mode if function doesn't exist
          try {
            return {
              target: POLICY_MANAGER_ADDRESS,
              value: 0,
              calldata: policyInterface.encodeFunctionData("setPremiumRate", [Number(param)])
            }
          } catch (encodeErr) {
            console.warn("[ProposalForm] setPremiumRate not found, use custom mode")
            throw new Error("setPremiumRate function not found in PolicyManager. Use Custom mode.")
          }
        case "reward":
          if (!CONSENSUS_STAKING_V2_ADDRESS || !ConsensusStakingV2ABI?.abi) {
            throw new Error("ConsensusStakingV2 ABI not available")
          }
          const stakingInterface = new ethers.Interface(ConsensusStakingV2ABI.abi)
          return {
            target: CONSENSUS_STAKING_V2_ADDRESS,
            value: 0,
            calldata: stakingInterface.encodeFunctionData("setRewardPerRound", [ethers.parseEther(param)])
          }
        default:
          return { target: "", value: 0, calldata: "0x" }
      }
    } catch (err) {
      console.error("[ProposalForm] Template error:", err)
      return { target: "", value: 0, calldata: "0x" }
    }
  }

  const hasEnoughPower = () => {
    if (!votingPower || !proposalThreshold) return false
    return Number(votingPower) >= Number(proposalThreshold)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.targets.trim()) {
      newErrors.targets = 'Target addresses are required (comma-separated)'
    } else {
      const targets = formData.targets.split(',').map(t => t.trim())
      const invalidTargets = targets.filter(t => !/^0x[a-fA-F0-9]{40}$/.test(t))
      if (invalidTargets.length > 0) {
        newErrors.targets = `Invalid addresses: ${invalidTargets.join(', ')}`
      }
    }

    if (!formData.values.trim()) {
      newErrors.values = 'Values are required (comma-separated, in wei)'
    } else {
      const values = formData.values.split(',').map(v => v.trim())
      const invalidValues = values.filter(v => isNaN(v) || v < 0)
      if (invalidValues.length > 0) {
        newErrors.values = 'All values must be valid non-negative numbers'
      }
    }

    if (!formData.calldatas.trim()) {
      newErrors.calldatas = 'Calldatas are required (comma-separated hex strings)'
    } else {
      const calldatas = formData.calldatas.split(',').map(c => c.trim())
      const invalidCalldatas = calldatas.filter(c => !/^0x[a-fA-F0-9]*$/.test(c))
      if (invalidCalldatas.length > 0) {
        newErrors.calldatas = 'All calldatas must be valid hex strings (0x...)'
      }
    }

    // Check array lengths match
    const targetsCount = formData.targets.split(',').length
    const valuesCount = formData.values.split(',').length
    const calldatasCount = formData.calldatas.split(',').length

    if (targetsCount !== valuesCount || targetsCount !== calldatasCount) {
      newErrors.general = 'Targets, values, and calldatas must have the same number of items'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isConnected || !account) {
      toast.error('Please connect your wallet')
      return
    }

    if (!hasEnoughPower()) {
      toast.error(`You need at least ${formatNumber(proposalThreshold)} SST to create a proposal`)
      return
    }

    try {
      let targets, values, calldatas, description

      if (proposalType === "custom") {
        // Use custom form validation
        if (!validateForm()) {
          toast.error('Please fix the form errors')
          return
        }
        targets = formData.targets.split(',').map(t => t.trim())
        values = formData.values.split(',').map(v => BigInt(v.trim()))
        calldatas = formData.calldatas.split(',').map(c => c.trim())
        description = formData.description
      } else {
        // Use template
        if (!formData.description.trim()) {
          toast.error('Description is required')
          return
        }
        if (!param.trim()) {
          toast.error('Please enter a value for this proposal type')
          return
        }
        const template = getProposalTemplate()
        if (!template.target) {
          toast.error('Failed to generate proposal template')
          return
        }
        targets = [template.target]
        values = [template.value]
        calldatas = [template.calldata]
        description = formData.description || `Proposal: ${proposalType.toUpperCase()} ${param}`
      }

      // Create proposal
      const result = await createProposal(targets, values, calldatas, description)

      if (result) {
        // Reset form
        setFormData({
          description: '',
          targets: '',
          values: '',
          calldatas: '',
        })
        setProposalType("custom")
        setParam("")
        setIsExpanded(false)
        toast.success(`Proposal created! ID: ${result.proposalId || 'N/A'}`)
      }
    } catch (err) {
      console.error('Error creating proposal:', err)
      toast.error(err.reason || err.message || 'Failed to create proposal')
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isConnected) {
    return (
      <div className="card-dark animate-fade-in">
        <div className="flex items-center justify-center py-8">
          <AlertCircle className="h-6 w-6 text-yellow-500 mr-2" />
          <span className="text-gray-400">Please connect your wallet to create a proposal</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card-dark animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gradient">Create Proposal</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {isExpanded ? 'Collapse' : 'New Proposal'}
        </button>
      </div>

      {/* Voting Power Check */}
      <div className={`mb-4 p-4 rounded-lg border ${
        hasEnoughPower()
          ? 'bg-green-500/10 border-green-500/20'
          : 'bg-yellow-500/10 border-yellow-500/20'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400 mb-1">Your Voting Power</div>
            <div className="text-lg font-semibold text-white">
              {formatNumber(votingPower, 2)} SST
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1">Required Threshold</div>
            <div className="text-lg font-semibold text-white">
              {formatNumber(proposalThreshold, 2)} SST
            </div>
          </div>
        </div>
        {!hasEnoughPower() && (
          <div className="mt-2 text-sm text-yellow-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            You need more SST tokens to create a proposal
          </div>
        )}
        {hasEnoughPower() && (
          <div className="mt-2 text-sm text-green-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            You have enough voting power to create a proposal
          </div>
        )}
      </div>

      {/* Form */}
      {isExpanded && (
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          {errors.general && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Proposal Type
            </label>
            <select
              value={proposalType}
              onChange={(e) => setProposalType(e.target.value)}
            className="input-brand bg-transparent text-[var(--fg-text)] px-3 py-2 rounded-lg w-full mb-2"
            >
              <option value="custom">🧩 Custom (Advanced)</option>
              <option value="premium">💰 Adjust Premium Rate</option>
              <option value="reward">🎯 Adjust Validator Reward</option>
            </select>
          </div>

          {proposalType !== "custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {proposalType === "premium" ? "New Premium Rate (%)" : "New Reward per Round (SST)"}
              </label>
              <input
                type="text"
                placeholder={proposalType === "premium" ? "Enter percentage (e.g., 2.5)" : "Enter amount in SST (e.g., 100)"}
                value={param}
                onChange={(e) => setParam(e.target.value)}
              className="input-brand bg-transparent text-[var(--fg-text)] px-3 py-2 rounded-lg w-full mb-3"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe your proposal..."
              rows={4}
              className={`input-field ${errors.description ? 'border-red-500' : ''}`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description}</p>
            )}
          </div>

          {proposalType === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Addresses * (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.targets}
                  onChange={(e) => handleChange('targets', e.target.value)}
                  placeholder="0x1234..., 0x5678..."
                  className={`input-field font-mono text-sm ${errors.targets ? 'border-red-500' : ''}`}
                />
                {errors.targets && (
                  <p className="mt-1 text-sm text-red-400">{errors.targets}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Contract addresses to call (comma-separated)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Values * (comma-separated, in wei)
                </label>
                <input
                  type="text"
                  value={formData.values}
                  onChange={(e) => handleChange('values', e.target.value)}
                  placeholder="0, 0, 0"
                  className={`input-field font-mono text-sm ${errors.values ? 'border-red-500' : ''}`}
                />
                {errors.values && (
                  <p className="mt-1 text-sm text-red-400">{errors.values}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  ETH values to send with each call (usually 0)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Calldatas * (comma-separated hex strings)
                </label>
                <textarea
                  value={formData.calldatas}
                  onChange={(e) => handleChange('calldatas', e.target.value)}
                  placeholder="0x..., 0x..."
                  rows={3}
                  className={`input-field font-mono text-xs ${errors.calldatas ? 'border-red-500' : ''}`}
                />
                {errors.calldatas && (
                  <p className="mt-1 text-sm text-red-400">{errors.calldatas}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Function call data for each target (comma-separated)
                </p>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 transition ${
                loading || !hasEnoughPower()
                  ? "bg-neutral-700 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600"
              }`}
              disabled={loading || !hasEnoughPower()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : !hasEnoughPower() ? (
                "Insufficient Voting Power"
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Proposal
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

