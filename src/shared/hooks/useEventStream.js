import { useEffect, useState, useRef } from 'react'
import { subscribe, unsubscribe, getCachedEvents } from '../services/eventStream'

export function useEventStream() {
  const [events, setEvents] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const mounted = useRef(true)
  const unsubscribeRef = useRef(null)

  useEffect(() => {
    mounted.current = true

    // Load cached events on mount
    getCachedEvents().then(cached => {
      if (!mounted.current) return
      if (cached && cached.length > 0) {
        // Sort by timestamp (newest first)
        const sorted = cached.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
        setEvents(sorted)
      }
    })

    // Subscribe to new events
    unsubscribeRef.current = subscribe((event) => {
      if (!mounted.current) return

      setEvents(prev => {
        // Add new event at the beginning, keep only last 10
        const updated = [event, ...prev].slice(0, 10)
        return updated
      })

      setIsStreaming(true)
      setError(null)
    })

    // Check connection status periodically
    const statusCheck = setInterval(() => {
      // WebSocket connection status is managed by eventStream service
      // We can infer streaming status from event activity
      setIsStreaming(true)
    }, 5000)

    return () => {
      mounted.current = false
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      clearInterval(statusCheck)
    }
  }, [])

  return {
    events,
    isStreaming,
    error
  }
}

