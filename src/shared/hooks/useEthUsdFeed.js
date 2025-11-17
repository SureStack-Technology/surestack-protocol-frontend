/**
 * useEthUsdFeed
 * Chainlink ETH/USD feed hook with guarded polling and optional websocket updates.
 */
import { useEffect, useState, useRef } from "react"
import { ethers } from "ethers"
import { getRotatingProvider, getActiveProviderInfo, getAlchemyWsProvider } from "@shared/utils/resilientProvider"
import { getProviderHealth } from "@/shared/rpc/providerManager"
import { fetchInitialHistory, appendLatestPrice } from "@shared/services/priceHistory"
import { putMany } from "@shared/utils/idb"
import aggregatorAbi from "@shared/abi/AggregatorV3Interface.json"
import { guard } from "@/diagnostics/hookGuard"

const FEED = import.meta.env.VITE_ETH_USD_FEED

const FALLBACK_STATE = {
  price: 0,
  updatedAt: null,
  history: [],
  rows: [],
  error: null,
}

export function useEthUsdFeed() {
  const [price, setPrice] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [history, setHistory] = useState([])
  const [warmup, setWarmup] = useState(true)
  const [source, setSource] = useState(null)
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [connectionState, setConnectionState] = useState("disconnected")
  const [contractError, setContractError] = useState(false)

  const timer = useRef(null)
  const mounted = useRef(true)
  const wsProviderRef = useRef(null)
  const lastUpdateTime = useRef(0)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef(null)
  const retries = useRef(0)

  const applyFallback = (reason) => {
    console.warn("[useEthUsdFeed] Falling back to cached data", reason)
    if (!mounted.current) return
    setPrice(0)
    setUpdatedAt(null)
    setHistory([])
    setRows([])
    setError("fallback")
  }

  const fetchLatestPrice = useRef(async () => {
    let attempt = 0
    const maxAttempts = 4

    while (attempt < maxAttempts) {
      try {
        const feedAddress = FEED
        if (!feedAddress || feedAddress.length < 42) {
          console.warn("[useEthUsdFeed] Skipping fetch due to missing feed address")
          setContractError(false)
          return
        }

        const provider = getRotatingProvider()
        const providerInfo = getActiveProviderInfo()
        setSource(providerInfo)

        const contract = new ethers.Contract(feedAddress, aggregatorAbi, provider)
        const [roundId, answer, , updatedAtRaw] = await contract.latestRoundData()
        const decimals = await contract.decimals()

        const nextPrice = Number(ethers.formatUnits(answer, decimals))
        const nextTimestamp = new Date(Number(updatedAtRaw) * 1000)

        if (!mounted.current) return

        setPrice(nextPrice)
        setUpdatedAt(nextTimestamp)
        setError(null)
        setContractError(false)

        setHistory((prev) => {
          appendLatestPrice(prev).then((updated) => {
            if (!mounted.current) return
            setHistory(updated)
            setRows(
              updated.slice(-60).map((item) => ({
                time: new Date(item.t).toLocaleTimeString(),
                price: item.p,
              }))
            )
            if (updated.length > 0) {
              setWarmup(false)
            }
          })
          return prev
        })

        document.dispatchEvent(new CustomEvent("oracle-pulse"))
        return
      } catch (err) {
        attempt += 1
        const backoff = (err?.code === -32005 || err?.code === 429) ? 500 * attempt : 250 * attempt
        console.warn(`[useEthUsdFeed] attempt ${attempt} failed; retrying in ${backoff}ms`, err)
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, backoff))
          continue
        }

        if (!mounted.current) return
        setHistory((prev) => {
          if (prev.length > 0) {
            const lastEntry = prev[prev.length - 1]
            setPrice(lastEntry.p)
            setUpdatedAt(new Date(lastEntry.t))
          } else {
            applyFallback(err)
          }
          return prev
        })
        setContractError(true)
        return
      }
    }
  })

  useEffect(() => {
    mounted.current = true

    const nowMinus = (timestamp) => Date.now() - timestamp

    function attemptReconnect() {
      if (!mounted.current) return
      if (retries.current >= 10) {
        console.error("[useEthUsdFeed] websocket retries exhausted; falling back to polling")
        setConnectionState("disconnected")
        setIsStreaming(false)
        if (!timer.current) {
          timer.current = setInterval(() => fetchLatestPrice.current(), 60_000)
        }
        return
      }
      retries.current += 1
      setTimeout(() => {
        if (!mounted.current) return
        connectWebSocket()
      }, 15000)
    }

    function connectWebSocket() {
      const wsInfo = getProviderHealth().ws
      try {
        wsProviderRef.current = getAlchemyWsProvider()
      } catch (err) {
        console.warn("[useEthUsdFeed] WebSocket provider unavailable", err)
        setConnectionState("disconnected")
        setIsStreaming(false)
        if (!timer.current) {
          timer.current = setInterval(() => fetchLatestPrice.current(), 60_000)
        }
        return
      }

      const provider = wsProviderRef.current
      const wsLabel = wsInfo?.url || "shared-ws"
      console.info("[useEthUsdFeed] using WebSocket provider", wsLabel)

      if (provider?._waitUntilReady) {
        provider._waitUntilReady().then(() => {
          if (!mounted.current) return
          setConnectionState("connected")
          setIsStreaming(true)
          retries.current = 0
          reconnectAttempts.current = 0
          setSource({ providerName: wsInfo?.name || "HybridWS", url: wsLabel })
        }).catch((err) => {
          if (!mounted.current) return
          console.warn("[useEthUsdFeed] WebSocket not ready", err)
          setConnectionState("reconnecting")
          attemptReconnect()
        })
      }

      provider?.on?.("connect", () => {
        if (!mounted.current) return
        setConnectionState("connected")
        setIsStreaming(true)
      })

      provider?.on?.("disconnect", (err) => {
        if (!mounted.current) return
        console.warn("[useEthUsdFeed] WebSocket disconnected", err)
        setIsStreaming(false)
        attemptReconnect()
      })

      const feedAddress = FEED
      provider.on("block", async (blockNumber) => {
        if (!mounted.current) return
        if (!feedAddress || feedAddress.length < 42) {
          return
        }

        if (nowMinus(lastUpdateTime.current) < 15000) {
          return
        }

        try {
          const contract = new ethers.Contract(feedAddress, aggregatorAbi, provider)
          const [roundId, answer, , updatedAtValue] = await contract.latestRoundData()
          const decimals = await contract.decimals()
          const nextPrice = Number(ethers.formatUnits(answer, decimals))
          const nextTimestamp = new Date(Number(updatedAtValue) * 1000)

          if (!mounted.current) return

          lastUpdateTime.current = Date.now()
          setPrice(nextPrice)
          setUpdatedAt(nextTimestamp)
          setError(null)

          setHistory((prev) => {
            const timestamp = Number(updatedAtValue) * 1000
            const lastItem = prev[prev.length - 1]

            if (!lastItem || lastItem.t < timestamp) {
              const updated = [...prev, { t: timestamp, p: nextPrice }].slice(-500)
              putMany("ethusd", [{ t: timestamp, p: nextPrice }], 500).then((pruned) => {
                if (!mounted.current) return
                setHistory(pruned)
                setRows(
                  pruned.slice(-60).map((item) => ({
                    time: new Date(item.t).toLocaleTimeString(),
                    price: item.p,
                  }))
                )
                if (pruned.length > 0) {
                  setWarmup(false)
                }
              })
              return updated
            }

            return prev
          })

          document.dispatchEvent(new CustomEvent("oracle-pulse"))
        } catch (err) {
          console.warn("[useEthUsdFeed] block listener failed", err)
        }
      })
    }

    const initialise = async () => {
      try {
        const { history: initialHistory, warmup: initialWarmup } = await fetchInitialHistory({
          minSamples: 60,
          maxLookbackRounds: 60,
        })

        if (!mounted.current) return

        setHistory(initialHistory)
        setWarmup(initialWarmup)

        if (initialHistory.length > 0) {
          const last = initialHistory[initialHistory.length - 1]
          setPrice(last.p)
          setUpdatedAt(new Date(last.t))
          setRows(
            initialHistory.slice(-60).map((entry) => ({
              time: new Date(entry.t).toLocaleTimeString(),
              price: entry.p,
            }))
          )
        }

        await fetchLatestPrice.current()
      } catch (err) {
        if (!mounted.current) return
        console.error("[useEthUsdFeed] initial load failed", err)
        applyFallback(err)
      }
    }

    initialise()
    connectWebSocket()

    console.info("[useEthUsdFeed] WebSocket guard active")

    return () => {
      mounted.current = false
      if (timer.current) clearInterval(timer.current)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsProviderRef.current?.destroy) {
        wsProviderRef.current.destroy()
      }
      wsProviderRef.current = null
    }
  }, [])

  useEffect(() => {
    console.debug("[useEthUsdFeed] state", {
      price,
      updatedAt,
      historyLength: history.length,
      error,
    })
  }, [price, updatedAt, history.length, error])

  const result = {
    price: price ?? FALLBACK_STATE.price,
    updatedAt: updatedAt ?? FALLBACK_STATE.updatedAt,
    history,
    warmup,
    source,
    rows,
    error,
    isStreaming,
    connectionState,
    contractError,
  }

  return guard("useEthUsdFeed", () => result, FALLBACK_STATE)
}
