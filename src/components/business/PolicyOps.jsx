import { useMemo, useState, useEffect } from 'react'
import { usePolicyManager } from "@shared/hooks/usePolicyManager"
import { can, Roles } from '@shared/utils/rbac'
import { useSimulation } from '../../contexts/SimulationContext'
import { startDataSimulation, stopDataSimulation } from '../../utils/dataSimulator'
import mockData from '../../../data/mock-data.json'
import { formatNumber } from '../../utils/formatters'
import { Shield, TrendingUp, DollarSign, Edit, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PolicyOps() {
  const { simulationMode } = useSimulation()
  const role = Roles.BUSINESS_ADMIN // TODO: map from wallet/backend later
  const { policies: contractPolicies, loading: contractLoading, updatePremium } = usePolicyManager()
  const [simulatedData, setSimulatedData] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Use simulation data if in simulation mode, otherwise use contract data
  const policies = simulationMode && simulatedData 
    ? simulatedData.riskPools.map((pool, i) => ({
        id: pool.id || i.toString(),
        name: pool.name,
        totalStaked: pool.totalStaked,
        rewards: pool.rewards,
        validators: pool.validators,
        premiumRateBps: parseFloat(pool.avgPremium) * 100, // Convert % to basis points
      }))
    : contractPolicies

  const loading = simulationMode ? false : contractLoading

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

  const canEdit = useMemo(() => can('policy:update', role), [role])
  const canView = useMemo(() => can('policy:view', role), [role])

  const handleUpdatePremium = async (poolId, currentRate, newRate) => {
    if (!canEdit) {
      toast.error('You do not have permission to update premiums')
      return
    }

    try {
      setIsUpdating(true)
      await updatePremium(poolId, newRate)
      toast.success(`Premium rate updated to ${(newRate / 100).toFixed(2)}%`)
    } catch (err) {
      console.error('Error updating premium:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!canView) {
    return (
      <div className="space-y-6 animate-fade-in min-h-screen bg-background text-foreground p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-400">You do not have permission to view policies</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient mb-2">Policy Operations</h1>
        <p className="text-gray-400">Manage insurance policies and premium rates</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <Shield className="h-8 w-8 text-blue-400" />
            <span className="text-sm text-gray-400">Total Policies</span>
          </div>
          <div className="text-2xl font-bold text-white">{policies.length}</div>
          <p className="text-sm text-gray-400 mt-2">Active policies</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-green-400" />
            <span className="text-sm text-gray-400">Total Coverage</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            ${formatNumber(
              policies.reduce((sum, p) => sum + (p.totalStaked || 0) / 1e18, 0),
              2
            )}
          </div>
          <p className="text-sm text-gray-400 mt-2">Total coverage value</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-yellow-400" />
            <span className="text-sm text-gray-400">Avg Premium</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {policies.length > 0
              ? (policies.reduce((sum, p) => sum + (p.premiumRateBps || 0), 0) / policies.length / 100).toFixed(2)
              : '0.00'}%
          </div>
          <p className="text-sm text-gray-400 mt-2">Average premium rate</p>
        </div>
      </div>

      {/* Policy List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-3 text-gray-400">Loading policies...</span>
        </div>
      ) : policies.length === 0 ? (
        <div className="card-dark">
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No policy data available</p>
            {simulationMode && (
              <p className="text-sm text-gray-500 mt-2">Enable simulation mode to see mock data</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {policies.map((policy, i) => {
            const currentRate = policy.premiumRateBps || 0
            const newRate = currentRate + 50 // Increase by 0.5%

            return (
              <div key={policy.id || i} className="card-dark">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{policy.name || `Policy ${i + 1}`}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Coverage Size</p>
                          <p className="text-lg font-medium text-green-400">
                            ${formatNumber((policy.totalStaked || 0) / 1e18, 2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Premium Rate</p>
                          <p className="text-lg font-medium text-yellow-400">
                            {(currentRate / 100).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Active Validators</p>
                          <p className="text-lg font-medium text-purple-400">
                            {policy.validators || policy.activeValidators || 0}
                          </p>
                        </div>
                      </div>
                      {policy.rewards && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-400 mb-1">Total Rewards</p>
                          <p className="text-lg font-medium text-blue-400">
                            {formatNumber((policy.rewards || 0) / 1e18, 2)} SST
                          </p>
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => handleUpdatePremium(policy.id || i, currentRate, newRate)}
                          disabled={isUpdating}
                          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUpdating ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <Edit className="h-4 w-4" />
                              <span>Adjust Premium</span>
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 text-center">
                          → {(newRate / 100).toFixed(2)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* RBAC Info */}
      {!canEdit && (
        <div className="card-dark mt-6">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-400">
              <strong>Current Role:</strong> {role} — You have view-only access. Contact an administrator to update premiums.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

