import { useEffect, useState } from 'react'
import { useContracts } from '@/hooks/useContracts'

const INITIAL_STATE = {
  price: null,
  decimals: 8,
  roundId: 0,
  updatedAt: 0,
  volatility: 0,
  isValid: false,
  error: null,
}

const FALLBACK_STATE = {
  price: 3200,
  decimals: 8,
  roundId: 0,
  updatedAt: Math.floor(Date.now() / 1000),
  volatility: 0,
  isValid: false,
  error: null,
}

export function useChainlinkOracle() {
  const { oracleReaderV2 } = useContracts()
  const [state, setState] = useState(INITIAL_STATE)

  useEffect(() => {
    let active = true

    async function fetchData() {
      try {
        console.log('[TRACE] OracleReader → start')

        if (!oracleReaderV2) {
          console.warn('[FAILSAFE] OracleReader contract missing → fallback')
          if (active) {
            setState({ ...FALLBACK_STATE, error: 'no-contract' })
          }
          return
        }

        const latest = await oracleReaderV2.getLatestPrice().catch(() => null)

        if (!latest) {
          console.warn('[FAILSAFE] Oracle latest price failed → fallback')
          if (active) {
            setState({ ...FALLBACK_STATE, error: 'no-latest' })
          }
          return
        }

        let volatility = 0
        try {
          const rawVol = await oracleReaderV2.getVolatilityFactor(0)
          volatility = Number(rawVol) / 1e8 * 100
        } catch {
          console.warn('[FAILSAFE] Volatility unavailable → using 0')
          volatility = 0
        }

        const decimals = Number(latest[1] ?? 8)
        const rawPrice = Number(latest[0] ?? 0)
        const price =
          Number.isFinite(decimals) && decimals > 0
            ? rawPrice / 10 ** decimals
            : rawPrice

        const resolvedState = {
          price,
          decimals,
          roundId: Number(latest[2] ?? 0),
          updatedAt: Number(latest[3] ?? 0),
          volatility,
          isValid: true,
          error: null,
        }

        if (active) {
          setState(resolvedState)
        }
      } catch (err) {
        console.warn('[FAILSAFE] OracleReader crashed:', err)
        if (active) {
          setState({ ...FALLBACK_STATE, error: 'crash' })
        }
      }
    }

    fetchData()

    return () => {
      active = false
    }
  }, [oracleReaderV2])

  return state
}




