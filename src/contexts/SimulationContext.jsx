import { createContext, useContext, useState, useEffect } from 'react'
import { useWeb3 } from './Web3Context'

const SimulationContext = createContext()

export function SimulationProvider({ children }) {
  const { isConnected } = useWeb3()
  const [simulationMode, setSimulationMode] = useState(false)

  // Auto-disable simulation when wallet is connected (use real data)
  useEffect(() => {
    if (isConnected && simulationMode) {
      console.log('🔌 [SimulationContext] Wallet connected, disabling simulation mode')
      setSimulationMode(false)
    }
  }, [isConnected, simulationMode])

  const toggleSimulation = () => {
    const newMode = !simulationMode
    setSimulationMode(newMode)
    console.log(`🧪 [SimulationContext] Simulation mode: ${newMode ? 'ON' : 'OFF'}`)
  }

  return (
    <SimulationContext.Provider value={{ simulationMode, toggleSimulation }}>
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulation() {
  const context = useContext(SimulationContext)
  if (!context) {
    throw new Error('useSimulation must be used within SimulationProvider')
  }
  return context
}

















