import { getHybridProvider, getHybridWebSocketProvider, getProviderHealth } from '../rpc/providerManager'

export const getResilientProvider = () => getHybridProvider()

export const getRotatingProvider = () => getHybridProvider()

export const getActiveProviderInfo = () => {
  const health = getProviderHealth()
  const active = health.endpoints.find((endpoint) => endpoint.isActive)
  return {
    providerName: active?.name ?? 'Unknown',
    url: active?.url ?? 'n/a',
  }
}

export const getAlchemyWsProvider = () => getHybridWebSocketProvider()

export const getSimpleProvider = () => getHybridProvider()

