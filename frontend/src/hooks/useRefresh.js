import { useState, useEffect, useCallback } from 'react'
import { DEV_API_URL } from '../constants'

export function useRefresh() {
  const [isDevMode, setIsDevMode] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastStatus, setLastStatus] = useState(null)

  // Silently probe for local dev API on mount
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000)

    fetch(`${DEV_API_URL}/status`, { signal: controller.signal })
      .then((res) => {
        if (res.ok) {
          setIsDevMode(true)
          return res.json()
        }
      })
      .then((data) => {
        if (data) setLastStatus(data)
      })
      .catch(() => {
        // Silently fail — we're in production or API isn't running
        setIsDevMode(false)
      })
      .finally(() => clearTimeout(timer))

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [])

  const triggerRefresh = useCallback(async () => {
    if (!isDevMode || isRefreshing) return

    setIsRefreshing(true)
    try {
      const res = await fetch(`${DEV_API_URL}/refresh`, { method: 'POST' })
      if (res.ok) {
        // Poll for completion
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`${DEV_API_URL}/status`)
            const data = await statusRes.json()
            setLastStatus(data)
            if (!data.refresh_in_progress) {
              clearInterval(pollInterval)
              setIsRefreshing(false)
              // Reload page to pick up new data
              window.location.reload()
            }
          } catch {
            clearInterval(pollInterval)
            setIsRefreshing(false)
          }
        }, 2000)
      }
    } catch {
      setIsRefreshing(false)
    }
  }, [isDevMode, isRefreshing])

  return { isDevMode, isRefreshing, lastStatus, triggerRefresh }
}
