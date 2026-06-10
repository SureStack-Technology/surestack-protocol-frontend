import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const SolanaWalletContext = createContext(null)

function getPhantomProvider() {
  if (typeof window === 'undefined') return null
  return window.solana?.isPhantom ? window.solana : null
}

export function SolanaWalletProvider({ children }) {
  const [publicKey, setPublicKey] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const isPhantomAvailable = useMemo(() => Boolean(getPhantomProvider()), [])

  const syncFromProvider = useCallback(async () => {
    const provider = getPhantomProvider()
    if (!provider) {
      setPublicKey(null)
      return { ok: false, reason: 'no_provider' }
    }
    try {
      if (provider.isConnected && provider.publicKey) {
        setPublicKey(provider.publicKey.toString())
        return { ok: true, publicKey: provider.publicKey.toString() }
      }
      const resp = await provider.connect({ onlyIfTrusted: true })
      const key = resp?.publicKey?.toString?.() || provider.publicKey?.toString?.()
      if (key) {
        setPublicKey(key)
        return { ok: true, publicKey: key }
      }
    } catch {
      /* not previously connected */
    }
    setPublicKey(null)
    return { ok: false, reason: 'not_connected' }
  }, [])

  useEffect(() => {
    syncFromProvider()
    const provider = getPhantomProvider()
    if (!provider?.on) return undefined

    const onConnect = () => {
      const key = provider.publicKey?.toString?.()
      if (key) setPublicKey(key)
    }
    const onDisconnect = () => setPublicKey(null)
    const onAccountChanged = (key) => {
      setPublicKey(key?.toString?.() || null)
    }

    provider.on('connect', onConnect)
    provider.on('disconnect', onDisconnect)
    provider.on('accountChanged', onAccountChanged)

    return () => {
      provider.removeListener?.('connect', onConnect)
      provider.removeListener?.('disconnect', onDisconnect)
      provider.removeListener?.('accountChanged', onAccountChanged)
    }
  }, [syncFromProvider])

  const connectPhantom = useCallback(async () => {
    const provider = getPhantomProvider()
    if (!provider) {
      throw new Error('Phantom wallet not detected. Install Phantom to connect a Solana wallet.')
    }
    setIsConnecting(true)
    try {
      const resp = await provider.connect()
      const key = resp?.publicKey?.toString?.() || provider.publicKey?.toString?.()
      if (!key) throw new Error('Phantom did not return a public key')
      setPublicKey(key)
      return key
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnectPhantom = useCallback(async () => {
    const provider = getPhantomProvider()
    try {
      await provider?.disconnect?.()
    } catch {
      /* ignore */
    }
    setPublicKey(null)
  }, [])

  const value = useMemo(
    () => ({
      publicKey,
      isConnected: Boolean(publicKey),
      isConnecting,
      isPhantomAvailable,
      connectPhantom,
      disconnectPhantom,
      syncFromProvider,
    }),
    [publicKey, isConnecting, isPhantomAvailable, connectPhantom, disconnectPhantom, syncFromProvider],
  )

  return <SolanaWalletContext.Provider value={value}>{children}</SolanaWalletContext.Provider>
}

export function useSolanaWallet() {
  const ctx = useContext(SolanaWalletContext)
  if (!ctx) {
    throw new Error('useSolanaWallet must be used within SolanaWalletProvider')
  }
  return ctx
}
