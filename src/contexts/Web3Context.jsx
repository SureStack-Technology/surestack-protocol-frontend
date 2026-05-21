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
  const [hybridWsProvider, setHybridWsProvider] = useState(null)
  const [walletProvider, setWalletProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const getInjectedEthereum = useCallback(() => {
    try {
      if (typeof window === 'undefined') return null
      const eth = window.ethereum
      if (!eth) return null

      let providers
      try {
        providers = eth.providers
      } catch {
        return eth
      }

      if (Array.isArray(providers) && providers.length > 0) {
        const metamaskProvider = providers.find((provider) => provider?.isMetaMask)
        return metamaskProvider ?? providers[0]
      }

      return eth
    } catch (err) {
      console.warn('[Web3Context] injected provider detection failed:', err?.message || err)
      return null
    }
  }, [])

  const isMetaMaskInstalled = useCallback(() => Boolean(getInjectedEthereum()), [getInjectedEthereum])

  const connectWallet = useCallback(async () => {
    const ethereum = getInjectedEthereum()

    if (!ethereum) {
      alert('Please install MetaMask to use this app!')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      const selectedAccount = accounts?.[0]
      if (!selectedAccount) {
        throw new Error('No wallet account returned from provider')
      }

      let activeChainHex = await ethereum.request({ method: 'eth_chainId' })

      if (activeChainHex?.toLowerCase() !== NETWORK_CONFIG.chainIdHex.toLowerCase()) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: NETWORK_CONFIG.chainIdHex }],
          })
          activeChainHex = await ethereum.request({ method: 'eth_chainId' })
        } catch (switchError) {
          if (switchError?.code === 4902) {
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
            activeChainHex = await ethereum.request({ method: 'eth_chainId' })
          } else {
            throw switchError
          }
        }
      }

      const browserProvider = new ethers.BrowserProvider(ethereum, 'any')
      const browserSigner = await browserProvider.getSigner()
      const network = await browserProvider.getNetwork()
      const networkChainId = Number(network.chainId)

      setWalletProvider(browserProvider)
      setSigner(browserSigner)
      setAccount(selectedAccount)
      setIsConnected(true)
      setChainId(networkChainId || parseInt(activeChainHex, 16))
      setIsSyncing(true)

      setTimeout(() => {
        setIsSyncing(false)
      }, 0)

      console.log('🔍 [Web3Context] Wallet Connected:')
      console.log('  Account:', selectedAccount)
      console.log('  Chain ID:', networkChainId)
    } catch (error) {
      console.error('Error connecting wallet:', error)
      if (error?.code === 4001) {
        alert('Wallet connection was cancelled.')
      } else {
        alert(error?.message ? `Failed to connect wallet: ${error.message}` : 'Failed to connect wallet. Please try again.')
      }
      setIsConnected(false)
      setSigner(null)
      setWalletProvider(null)
      setAccount(null)
      setChainId(null)
    } finally {
      setIsConnecting(false)
    }
  }, [getInjectedEthereum])

  const disconnectWallet = useCallback(() => {
    setWalletProvider(null)
    setSigner(null)
    setAccount(null)
    setChainId(null)
    setIsConnected(false)
    setIsSyncing(false)
  }, [])

  /** Re-bind BrowserProvider + signer from injected wallet (fixes stale signer after auto-connect). */
  const refreshWalletSession = useCallback(async () => {
    const ethereum = getInjectedEthereum()
    if (!ethereum) {
      return { ok: false, reason: 'no_provider' }
    }
    try {
      const accounts = await ethereum.request({ method: 'eth_accounts' })
      if (!accounts?.length) {
        disconnectWallet()
        return { ok: false, reason: 'no_accounts' }
      }
      const browserProvider = new ethers.BrowserProvider(ethereum, 'any')
      const browserSigner = await browserProvider.getSigner()
      const network = await browserProvider.getNetwork()
      const selected = accounts[0]
      const networkChainId = Number(network.chainId)

      setWalletProvider(browserProvider)
      setSigner(browserSigner)
      setAccount(selected)
      setIsConnected(true)
      setChainId(networkChainId)
      setIsSyncing(false)

      return { ok: true, account: selected, chainId: networkChainId }
    } catch (error) {
      console.error('[Web3Context] refreshWalletSession failed', error)
      return { ok: false, reason: 'refresh_failed', message: error?.message }
    }
  }, [disconnectWallet, getInjectedEthereum])

  useEffect(() => {
    try {
      setHybridWsProvider(getHybridWebSocketProvider())
    } catch (err) {
      console.warn('[Web3Context] WebSocket provider unavailable:', err?.message || err)
      setHybridWsProvider(null)
    }
  }, [])

  useEffect(() => {
    const ethereum = getInjectedEthereum()
    if (!ethereum) {
      return
    }

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

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else {
        try {
          const browserProvider = new ethers.BrowserProvider(ethereum, 'any')
          const browserSigner = await browserProvider.getSigner()
          const network = await browserProvider.getNetwork()

          setAccount(accounts[0])
          setIsConnected(true)
          setWalletProvider(browserProvider)
          setSigner(browserSigner)
          setChainId(Number(network.chainId))
        } catch (error) {
          console.error('Error handling account change:', error)
        }
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
  }, [connectWallet, disconnectWallet, getInjectedEthereum, isMetaMaskInstalled])

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
    refreshWalletSession,
    isMetaMaskInstalled,
    getInjectedEthereum,
  }

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
}

