import { useEffect, useState, useRef } from "react"
import { ethers } from "ethers"
import { getRotatingProvider, getActiveProviderInfo } from "../utils/resilientProvider"
import { fetchInitialHistory, appendLatestPrice } from "../services/priceHistory"
import { putMany } from "../utils/idb"
import aggregatorAbi from "../abi/AggregatorV3Interface.json"

const FEED = import.meta.env.VITE_CHAINLINK_ETHUSD || '0x694AA1769357215DE4FAC081bf1f309aDC325306'
const WS_URL = import.meta.env.VITE_ALCHEMY_WS

function logWS(reason) {
  console.warn("[Stream][Diag] WS disabled:", reason, { WS_URL })
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
  const timer = useRef(null)
  const mounted = useRef(true)
  const wsProvider = useRef(null)
  const lastUpdateTime = useRef(0)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef(null)
  const maxReconnectAttempts = 5
  const initialBlockFetched = useRef(false)
  const retries = useRef(0)
  const maxRetries = 10

  const fetchLatestPrice = useRef(async () => {
    let attempt = 0
    const maxAttempts = 4

    while (attempt < maxAttempts) {
      try {
        const provider = getRotatingProvider()
        
        if (!mounted.current) return
        
        // when updating price/source
        const info = getActiveProviderInfo()
        setSource(info)
        
        const agg = new ethers.Contract(FEED, aggregatorAbi, provider)
        const [roundId, answer, , updatedAt, answeredInRound] = await agg.latestRoundData()
        const decimals = await agg.decimals()

        const p = Number(ethers.formatUnits(answer, decimals))
        const ts = new Date(Number(updatedAt) * 1000)

        if (!mounted.current) return
        
        setPrice(p)
        setUpdatedAt(ts)
        setError(null)

        // Append to history (async update)
        setHistory(prevHistory => {
          appendLatestPrice(prevHistory).then(updated => {
            if (!mounted.current) return
            setHistory(updated)
            // Update rows for chart
            setRows(updated.slice(-60).map(item => ({
              time: new Date(item.t).toLocaleTimeString(),
              price: item.p
            })))
          })
          return prevHistory
        })

        document.dispatchEvent(new CustomEvent("oracle-pulse"))
        return
      } catch (e) {
        attempt++
        const isRate = `${e}`.includes("Too Many Requests") || (e?.code === -32005) || (e?.code === 429)
        const backoff = isRate ? 500 * attempt : 250 * attempt
        console.warn(`[OracleFeed] attempt ${attempt} failed; retrying in ${backoff}ms`, e)
        
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, backoff))
        } else {
          if (!mounted.current) return
          
          // Use cached history for UI if network fails
          setHistory(prevHistory => {
            if (prevHistory.length > 0) {
              const lastItem = prevHistory[prevHistory.length - 1]
              setPrice(lastItem.p)
              setUpdatedAt(new Date(lastItem.t))
              console.warn('[OracleFeed] Using cached data due to network failure')
            } else {
              setError("All RPCs failed")
            }
            return prevHistory
          })
          console.error("[useEthUsdFeed] All attempts failed", e)
        }
      }
    }
  })

  useEffect(() => {
    mounted.current = true

    // Initial load with history
    const init = async () => {
      try {
        const { history: initialHistory, warmup: initialWarmup } = await fetchInitialHistory({
          minSamples: 60,
          maxLookbackRounds: 60
        })
        
        if (!mounted.current) return
        
        setHistory(initialHistory)
        setWarmup(initialWarmup)
        
        if (initialHistory.length > 0) {
          const lastItem = initialHistory[initialHistory.length - 1]
          setPrice(lastItem.p)
          setUpdatedAt(new Date(lastItem.t))
          
          setRows(initialHistory.slice(-60).map(item => ({
            time: new Date(item.t).toLocaleTimeString(),
            price: item.p
          })))
        }
        
        // Fetch latest
        await fetchLatestPrice.current()
      } catch (err) {
        if (!mounted.current) return
        console.error('[useEthUsdFeed] Initial load error:', err)
        setError(err.message)
      }
    }

    init()

    // Reconnect function
    const reconnectWebSocket = () => {
      if (!mounted.current) return
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.warn("[Stream] Max reconnect attempts reached, falling back to polling")
        setConnectionState("disconnected")
        setIsStreaming(false)
        // Fallback to polling
        if (!timer.current) {
          timer.current = setInterval(() => {
            fetchLatestPrice.current()
          }, 30_000)
        }
        return
      }

      reconnectAttempts.current++
      setConnectionState("reconnecting")
      console.log(`[Stream] Reconnecting in 15 s… (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`)

      reconnectTimer.current = setTimeout(() => {
        if (!mounted.current) return
        connectWebSocket()
      }, 15000)
    }

    // 🩹 Retry logic: 10 attempts, 15s interval
    function attemptReconnect() {
      if (!mounted.current) return
      if (retries.current >= maxRetries) {
        console.error("[Stream][Retry] Max retries reached — staying in polling mode.")
        setConnectionState("disconnected")
        setIsStreaming(false)
        // Fallback to polling
        if (!timer.current) {
          timer.current = setInterval(() => {
            fetchLatestPrice.current()
          }, 30_000)
        }
        return
      }
      retries.current++
      console.log(`[Stream][Retry] Attempt ${retries.current}/${maxRetries} — reconnecting in 15s...`)
      setTimeout(() => {
        if (!mounted.current) return
        connectWebSocket()
      }, 15000)
    }

    // WebSocket connection function
    const connectWebSocket = () => {
      if (!WS_URL) {
        logWS("VITE_ALCHEMY_WS not set")
        setConnectionState("disconnected")
        setIsStreaming(false)
        // Fallback to polling
        if (!timer.current) {
          timer.current = setInterval(() => {
            fetchLatestPrice.current()
          }, 30_000)
        }
        return
      }

      try {
        console.info("[Stream] Attempting WebSocket connect →", WS_URL)
        wsProvider.current = new ethers.WebSocketProvider(WS_URL)

        // ✅ v6-compatible events with await + auto-label
        if (wsProvider.current._waitUntilReady) {
          wsProvider.current._waitUntilReady().then(() => {
            if (!mounted.current) return
            console.info("[Stream] Connected to WebSocket ✅ (ready)")
            retries.current = 0 // Reset retries on successful connection
            reconnectAttempts.current = 0
            setConnectionState("connected")
            setIsStreaming(true)
            setSource({
              providerName: "Alchemy",
              url: WS_URL?.startsWith("wss") ? WS_URL : "Unknown"
            })
            console.info("[Stream][UI] Switched to Alchemy Live Stream")
          }).catch(err => {
            if (!mounted.current) return
            console.warn("[Stream][Diag] Provider not ready:", err)
            setConnectionState("reconnecting")
            attemptReconnect()
          })
        } else {
          // Fallback if _waitUntilReady not available
          console.warn("[Stream][Diag] _waitUntilReady not available, using event listeners")
        }

        // Listen for lifecycle events
        wsProvider.current.on("connect", () => {
          if (!mounted.current) return
          // Check if we're reconnecting (state might be "reconnecting" or "disconnected")
          setConnectionState(prev => {
            if (prev !== "connected") {
              console.info("[Stream] WS reconnect successful")
              retries.current = 0
              reconnectAttempts.current = 0
              setIsStreaming(true)
              setSource({ providerName: "Alchemy", url: WS_URL })
              return "connected"
            }
            return prev
          })
        })

        wsProvider.current.on("disconnect", (err) => {
          if (!mounted.current) return
          setConnectionState(prev => {
            if (prev === "reconnecting") return prev
            console.warn("[Stream] WebSocket disconnected:", err?.code || err)
            setIsStreaming(false)
            attemptReconnect()
            return "reconnecting"
          })
        })

        // Subscribe to block events for price updates
        wsProvider.current.on("block", async (blockNumber) => {
          if (!mounted.current) return
          
          if (!initialBlockFetched.current) {
            console.info("[Stream] Initial block:", blockNumber)
            initialBlockFetched.current = true
            // 🧩 Promote live state once we confirm first block
            setConnectionState(prev => {
              if (prev !== "connected") {
                console.info("[Stream] First block received — promoting to live mode")
                setIsStreaming(true)
                setSource({ providerName: "Alchemy", url: WS_URL })
                return "connected"
              }
              return prev
            })
          }
          
          // Debounce: only update if >= 15s since last update
          const now = Date.now()
          if (now - lastUpdateTime.current < 15000) {
            return
          }
          
          try {
            const contract = new ethers.Contract(FEED, aggregatorAbi, wsProvider.current)
            const [roundId, answer, , updatedAt] = await contract.latestRoundData()
            const decimals = await contract.decimals()
            
            const p = Number(ethers.formatUnits(answer, decimals))
            const ts = new Date(Number(updatedAt) * 1000)
            
            if (!mounted.current) return
            
            lastUpdateTime.current = now
            setPrice(p)
            setUpdatedAt(ts)
            setError(null)
            
            console.log(`[Stream] Live price update: $${p.toFixed(2)} (block ${blockNumber})`)
            
            // Append to history
            setHistory(prevHistory => {
              const timestamp = Number(updatedAt) * 1000
              const lastItem = prevHistory[prevHistory.length - 1]
              
              // Only append if new timestamp
              if (!lastItem || lastItem.t < timestamp) {
                const updated = [...prevHistory, { t: timestamp, p }].slice(-500)
                
                // Persist to IndexedDB
                putMany('ethusd', [{ t: timestamp, p }], 500).then(pruned => {
                  if (!mounted.current) return
                  setHistory(pruned)
                  setRows(pruned.slice(-60).map(item => ({
                    time: new Date(item.t).toLocaleTimeString(),
                    price: item.p
                  })))
                })
                
                return updated
              }
              return prevHistory
            })
            
            document.dispatchEvent(new CustomEvent("oracle-pulse"))
          } catch (err) {
            console.warn("[Stream] Error fetching price on block:", err)
            // Don't disconnect on single error, just log it
          }
        })
      } catch (err) {
        console.error("[Stream][Error] Failed to create WebSocketProvider:", err)
        setConnectionState("disconnected")
        setIsStreaming(false)
        // Fallback to polling
        if (!timer.current) {
          timer.current = setInterval(() => {
            fetchLatestPrice.current()
          }, 30_000)
        }
      }
    }

    // Try WebSocket streaming first
    connectWebSocket()
    
    return () => {
      mounted.current = false
      if (timer.current) clearInterval(timer.current)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsProvider.current) {
        wsProvider.current.destroy()
        wsProvider.current = null
      }
    }
  }, [])

  return { price, updatedAt, history, warmup, source, rows, error, isStreaming, connectionState }
}
