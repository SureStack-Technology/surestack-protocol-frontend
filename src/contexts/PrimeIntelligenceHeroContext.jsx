import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/** @typedef {{ volatility: number, riskScore: number, riskBand: string | null, assetLabel: string | null, active: boolean } | null} HeroMetrics */

const PrimeIntelligenceHeroContext = createContext(null)

const FALLBACK_HERO_METRICS = {
  volatility: 0,
  riskScore: 0,
  riskBand: 'UNKNOWN',
  assetLabel: null,
  active: false,
}

const FALLBACK_HERO_CONTEXT = {
  heroMetrics: FALLBACK_HERO_METRICS,
  setHeroMetrics: () => {},
  clearHeroMetrics: () => {},
}

let warnedMissingHeroProvider = false

export function PrimeIntelligenceHeroProvider({ children }) {
  const [heroMetrics, setHeroMetricsState] = useState(/** @type {HeroMetrics} */ (null))

  const setHeroMetrics = useCallback((metrics) => {
    setHeroMetricsState(metrics?.active ? metrics : null)
  }, [])

  const clearHeroMetrics = useCallback(() => {
    setHeroMetricsState(null)
  }, [])

  const value = useMemo(
    () => ({ heroMetrics, setHeroMetrics, clearHeroMetrics }),
    [heroMetrics, setHeroMetrics, clearHeroMetrics],
  )

  return <PrimeIntelligenceHeroContext.Provider value={value}>{children}</PrimeIntelligenceHeroContext.Provider>
}

export function usePrimeIntelligenceHero() {
  const ctx = useContext(PrimeIntelligenceHeroContext)
  if (!ctx) {
    if (!warnedMissingHeroProvider) {
      warnedMissingHeroProvider = true
      console.warn(
        '[PrimeIntelligenceHero] usePrimeIntelligenceHero called outside PrimeIntelligenceHeroProvider — using safe defaults.',
      )
    }
    return FALLBACK_HERO_CONTEXT
  }
  return ctx
}
