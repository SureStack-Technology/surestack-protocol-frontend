import { useMemo } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../contexts/Web3Context'
import { CONTRACT_ADDRESSES } from '../config/contracts'
import { log } from '../diagnostics/logger'
import { getHybridProvider } from '@/shared/rpc/providerManager'

import deployments from '@shared/deployments/sepolia.json'
import OracleReaderABI from '@shared/abi/OracleReader.json'
import PolicyManagerABI from '@shared/abi/PolicyManager.json'
import RewardPoolABI from '@shared/abi/RewardPool.json'
import ConsensusStakingV2ABI from '@shared/abi/ConsensusAndStaking.json'
import DAOGovernanceABI from '@shared/abi/DAOGovernance.json'
import SureStackTokenABI from '@shared/abi/SureStackToken.json'

export const useContracts = () => {
  const { provider: readProvider, signer, isConnected } = useWeb3()

  const contracts = useMemo(() => {
    try {
      const baseProvider = readProvider

      const candidates = [
        ['OracleReader', OracleReaderABI],
        ['PolicyManager', PolicyManagerABI],
        ['RewardPoolAndSlasher', RewardPoolABI],
        ['ConsensusAndStakingV2', ConsensusStakingV2ABI],
        ['DAOGovernance', DAOGovernanceABI],
        ['SureStackToken', SureStackTokenABI],
      ]

      for (const [name, abi] of candidates) {
        if (!abi) {
          log('Contract.Init.Error', { message: `ABI missing for ${name}` })
          throw new Error(`ABI missing for ${name}`)
        }
        const abiArray = abi.abi || abi
        if (!Array.isArray(abiArray)) {
          log('Contract.Init.Error', { message: `ABI shape invalid for ${name}: expected array at .abi or root` })
          throw new Error(`ABI shape invalid for ${name}: expected array at .abi or root`)
        }
      }

      if (!baseProvider) {
        log('Contract.Init.Skip', { reason: 'Hybrid provider unavailable' })
        return {
          oracleReader: null,
          policyManager: null,
          rewardPool: null,
          consensusStakingV2: null,
          daoGovernance: null,
          sureStackToken: null,
        }
      }

      const mk = (name, address, abiObj, withSigner = true) => {
        if (!address || address === '0x0000000000000000000000000000000000000000') {
          log('Contract.Init.Skip', { name, reason: 'Missing or zero address', address })
          return null
        }

        try {
          if (!address || !abiObj) {
            throw new Error(`Missing data for ${name}: address=${address}, abi=${!!abiObj}`)
          }

          const abi = abiObj.abi || abiObj
          if (!Array.isArray(abi) || abi.length === 0) {
            throw new Error(`Invalid ABI for ${name}: expected non-empty array`)
          }

          const contractProvider = withSigner && signer ? signer : baseProvider
          const instance = new ethers.Contract(address, abi, contractProvider)

          log('Contract.Init', { name, address, fnCount: abi.length })
          console.log(`[SureStack] Contract.Init ${name} at ${address}`)

          return instance
        } catch (err) {
          log('Contract.Init.Error', {
            name,
            address,
            message: err?.message,
            stack: err?.stack,
          })
          console.error(`[SureStack] Contract.Init.Error ${name}:`, err?.message || err)
          return null
        }
      }

      const rewardPoolAddress = CONTRACT_ADDRESSES.REWARD_POOL || deployments.RewardPool
      const consensusAddress = CONTRACT_ADDRESSES.CONSENSUS_STAKING_V2 || deployments.ConsensusAndStakingV2
      const daoAddress = CONTRACT_ADDRESSES.DAO_GOVERNANCE || deployments.DAOGovernance

      const initializedContracts = {
        oracleReader: mk('OracleReader', CONTRACT_ADDRESSES.ORACLE_READER || deployments.OracleReaderV2, OracleReaderABI, false),
        oracleReaderV2: mk('OracleReaderV2', CONTRACT_ADDRESSES.ORACLE_READER_V2 || deployments.OracleReaderV2, OracleReaderABI, false),
        policyManager: mk('PolicyManager', CONTRACT_ADDRESSES.POLICY_MANAGER || deployments.PolicyManager, PolicyManagerABI, false),
        rewardPool: mk('RewardPoolAndSlasher', rewardPoolAddress, RewardPoolABI, false),
        consensusStakingV2: mk('ConsensusAndStakingV2', consensusAddress, ConsensusStakingV2ABI, isConnected),
        daoGovernance: mk('DAOGovernance', daoAddress, DAOGovernanceABI, isConnected),
        sureStackToken: mk('SureStackToken', CONTRACT_ADDRESSES.SURE_STACK_TOKEN || deployments.SureStackToken, SureStackTokenABI, isConnected),
      }

      return initializedContracts
    } catch (e) {
      log('Contract.Init.Error', { message: e?.message, stack: e?.stack })
      console.error('[SureStack] useContracts hook error:', e)
      return {
        oracleReader: null,
        policyManager: null,
        rewardPool: null,
        consensusStakingV2: null,
        daoGovernance: null,
        sureStackToken: null,
      }
    }
  }, [readProvider, signer, isConnected])

  return contracts
}

export function getTokenContract() {
  try {
    const provider = getHybridProvider()
    const tokenAddress = import.meta.env.VITE_SURE_STACK_TOKEN_ADDRESS || deployments.SureStackToken
    const abi = ['function balanceOf(address) view returns (uint256)']

    return new ethers.Contract(tokenAddress, abi, provider)
  } catch (err) {
    console.error('[SureStack] getTokenContract error:', err)
    return null
  }
}
