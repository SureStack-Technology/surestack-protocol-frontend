import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../contexts/Web3Context'
import { useContracts } from './useContracts'
import { CONTRACT_ADDRESSES } from '../config/contracts'
import deployments from '@shared/deployments/sepolia.json'
import ConsensusStakingV2ABI from '@shared/abi/ConsensusAndStaking.json'
import SureStackTokenABI from '@shared/abi/SureStackToken.json'
import toast from 'react-hot-toast'

export const useStaking = () => {
  const { provider, signer, account, isConnected } = useWeb3()
  const { consensusStakingV2, sureStackToken } = useContracts()
  
  const [staked, setStaked] = useState('0')
  const [pendingUnstake, setPendingUnstake] = useState('0')
  const [totalRewards, setTotalRewards] = useState('0')
  const [accuracyScore, setAccuracyScore] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [unstakeLockoutEnd, setUnstakeLockoutEnd] = useState(0)
  const [minStake, setMinStake] = useState('0')
  const [tokenBalance, setTokenBalance] = useState('0')
  const [allowance, setAllowance] = useState('0')
  const [loading, setLoading] = useState(false)

  // Fetch validator profile and parameters
  useEffect(() => {
    if (!isConnected || !account || !consensusStakingV2) return

    const fetchProfile = async () => {
      try {
        // Fetch validator profile
        const profile = await consensusStakingV2.validatorProfiles(account)
        
        // Profile struct: (stakedAmount, accuracyScore, totalRewards, isActive, unstakeLockoutEnd, pendingUnstake)
        setStaked(ethers.formatUnits(profile.stakedAmount || 0n, 18))
        setPendingUnstake(ethers.formatUnits(profile.pendingUnstake || 0n, 18))
        setTotalRewards(ethers.formatUnits(profile.totalRewards || 0n, 18))
        setAccuracyScore(Number(profile.accuracyScore || 0) / 100) // Convert from basis points (10000 = 100%)
        setIsActive(profile.isActive || false)
        setUnstakeLockoutEnd(Number(profile.unstakeLockoutEnd || 0))

        // Fetch minimum stake
        const minStakeAmount = await consensusStakingV2.minStakeAmount()
        setMinStake(ethers.formatUnits(minStakeAmount, 18))

        // Fetch token balance and allowance
        if (sureStackToken) {
          const balance = await sureStackToken.balanceOf(account)
          setTokenBalance(ethers.formatUnits(balance, 18))
          
          const allowed = await sureStackToken.allowance(account, CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2)
          setAllowance(ethers.formatUnits(allowed, 18))
        }
      } catch (error) {
        console.error('Error fetching validator profile:', error)
      }
    }

    fetchProfile()
    const interval = setInterval(fetchProfile, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [isConnected, account, consensusStakingV2, sureStackToken])

  const stake = async (amount) => {
    if (!consensusStakingV2 || !sureStackToken || !account) {
      toast.error('Please connect your wallet')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      setLoading(true)
      const amountWei = ethers.parseUnits(amount, 18)
      
      // Check if approval is needed
      const currentAllowance = await sureStackToken.allowance(account, CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2)
      if (currentAllowance < amountWei) {
        toast.loading('Approving tokens...', { id: 'approve' })
        const approveTx = await sureStackToken.approve(CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2, amountWei)
        await approveTx.wait()
        toast.success('Tokens approved', { id: 'approve' })
      }

      toast.loading('Staking tokens...', { id: 'stake' })
      const tx = await consensusStakingV2.stake(amountWei)
      await tx.wait()
      toast.success(`Successfully staked ${amount} SST!`, { id: 'stake' })
      
      // Refresh profile
      const profile = await consensusStakingV2.validatorProfiles(account)
      setStaked(ethers.formatUnits(profile.stakedAmount || 0n, 18))
      setIsActive(profile.isActive || false)
    } catch (error) {
      console.error('Error staking:', error)
      toast.error(error.reason || error.message || 'Failed to stake tokens', { id: 'stake' })
    } finally {
      setLoading(false)
    }
  }

  const requestUnstake = async (amount) => {
    if (!consensusStakingV2 || !account) {
      toast.error('Please connect your wallet')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      setLoading(true)
      const amountWei = ethers.parseUnits(amount, 18)
      
      toast.loading('Requesting unstake...', { id: 'unstake' })
      const tx = await consensusStakingV2.requestUnstake(amountWei)
      await tx.wait()
      toast.success(`Unstake requested. Cooling period started.`, { id: 'unstake' })
      
      // Refresh profile
      const profile = await consensusStakingV2.validatorProfiles(account)
      setStaked(ethers.formatUnits(profile.stakedAmount || 0n, 18))
      setPendingUnstake(ethers.formatUnits(profile.pendingUnstake || 0n, 18))
      setUnstakeLockoutEnd(Number(profile.unstakeLockoutEnd || 0))
    } catch (error) {
      console.error('Error requesting unstake:', error)
      toast.error(error.reason || error.message || 'Failed to request unstake', { id: 'unstake' })
    } finally {
      setLoading(false)
    }
  }

  const withdrawUnstakedFunds = async () => {
    if (!consensusStakingV2 || !account) {
      toast.error('Please connect your wallet')
      return
    }

    try {
      setLoading(true)
      toast.loading('Withdrawing unstaked funds...', { id: 'withdraw' })
      const tx = await consensusStakingV2.withdrawUnstakedFunds()
      await tx.wait()
      toast.success('Unstaked funds withdrawn successfully!', { id: 'withdraw' })
      
      // Refresh profile
      const profile = await consensusStakingV2.validatorProfiles(account)
      setPendingUnstake(ethers.formatUnits(profile.pendingUnstake || 0n, 18))
      setUnstakeLockoutEnd(Number(profile.unstakeLockoutEnd || 0))
    } catch (error) {
      console.error('Error withdrawing unstaked funds:', error)
      toast.error(error.reason || error.message || 'Failed to withdraw unstaked funds', { id: 'withdraw' })
    } finally {
      setLoading(false)
    }
  }

  // Check if cooling period has expired
  const canWithdraw = () => {
    if (unstakeLockoutEnd === 0) return false
    return Date.now() / 1000 > unstakeLockoutEnd
  }

  // Calculate time remaining in cooling period
  const coolingPeriodRemaining = () => {
    if (unstakeLockoutEnd === 0) return 0
    const remaining = unstakeLockoutEnd - Date.now() / 1000
    return remaining > 0 ? remaining : 0
  }

  return {
    staked,
    pendingUnstake,
    totalRewards,
    accuracyScore,
    isActive,
    unstakeLockoutEnd,
    minStake,
    tokenBalance,
    allowance,
    loading,
    stake,
    requestUnstake,
    withdrawUnstakedFunds,
    canWithdraw: canWithdraw(),
    coolingPeriodRemaining: coolingPeriodRemaining(),
  }
}

