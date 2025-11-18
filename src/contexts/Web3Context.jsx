import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../config/contracts'
import { getHybridProvider, getHybridWebSocketProvider } from '@/shared/rpc/providerManager'

const Web3Context = createContext(null)

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider')
  }
  return context
}

export const Web3Provider = ({ children }) => {
  const hybridProvider = useMemo(() => getHybridProvider(), [])
  const hybridWsProvider = useMemo(() => getHybridWebSocketProvider(), [])
  const [walletProvider, setWalletProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const isMetaMaskInstalled = () => typeof window !== 'undefined' && window.ethereum

  const connectWallet = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      alert('Please install MetaMask to use this app!')
      return
    }

    setIsConnecting(true)
    try {
      const ethereum = window.ethereum
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      setAccount(accounts[0] ?? null)
      setIsConnected(true)

      const browserProvider = new ethers.BrowserProvider(ethereum, 'any')
      const browserSigner = await browserProvider.getSigner()
      const network = await browserProvider.getNetwork()
      const networkChainId = Number(network.chainId)

      if (networkChainId !== NETWORK_CONFIG.chainIdDec) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: NETWORK_CONFIG.chainIdHex }],
          })
        } catch (switchError) {
          if (switchError.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: NETWORK_CONFIG.chainIdHex,
                  chainName: NETWORK_CONFIG.chainName,
                  nativeCurrency: NETWORK_CONFIG.nativeCurrency,
                  rpcUrls: [NETWORK_CONFIG.rpcUrl],
                  blockExplorerUrls: [NETWORK_CONFIG.explorer],
                },
              ],
            })
          }
        }
      }

      setWalletProvider(browserProvider)
      setSigner(browserSigner)
      setChainId(networkChainId)
      setIsSyncing(true)

      setTimeout(() => {
        setIsSyncing(false)
      }, 0)

      console.log('🔍 [Web3Context] Wallet Connected:')
      console.log('  Account:', accounts[0])
      console.log('  Chain ID:', networkChainId)
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet. Please try again.')
      setIsConnected(false)
      setSigner(null)
      setWalletProvider(null)
      setAccount(null)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setWalletProvider(null)
    setSigner(null)
    setAccount(null)
    setChainId(null)
    setIsConnected(false)
    setIsSyncing(false)
  }, [])

  useEffect(() => {
    if (!isMetaMaskInstalled()) {
      return
    }

    const ethereum = window.ethereum

    const checkConnection = async () => {
      try {
        const accounts = await ethereum.request({ method: 'eth_accounts' })
        if (accounts.length === 0) {
          return
        }

        const browserProvider = new ethers.BrowserProvider(ethereum, 'any')
        const browserSigner = await browserProvider.getSigner()
        const network = await browserProvider.getNetwork()

        setAccount(accounts[0])
        setIsConnected(true)
        setWalletProvider(browserProvider)
        setSigner(browserSigner)
        setChainId(Number(network.chainId))
        setIsSyncing(false)

        console.log('🔍 [Web3Context] Auto-connected:')
        console.log('  Account:', accounts[0])
        console.log('  Chain ID:', Number(network.chainId))
      } catch (error) {
        console.error('Error checking connection:', error)
      }
    }

    checkConnection()

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else {
        connectWallet()
      }
    }

    const handleChainChanged = () => {
      window.location.reload()
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [connectWallet, disconnectWallet])

  const value = {
    provider: hybridProvider,
    readProvider: hybridProvider,
    wsProvider: hybridWsProvider,
    walletProvider,
    signer,
    account,
    chainId,
    isConnected,
    isConnecting,
    isSyncing,
    connectWallet,
    disconnectWallet,
    isMetaMaskInstalled,
  }

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
}

