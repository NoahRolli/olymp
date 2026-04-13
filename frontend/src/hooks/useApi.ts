import { useState, useEffect } from 'react'

const API_BASE = '/api'

export function useApi<T>(endpoint: string, interval = 5000) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function fetchData() {
      try {
        const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (active) {
          setData(json)
          setError(null)
          setLoading(false)
        }
      } catch (e: any) {
        if (active) {
          setError(e.message)
          setLoading(false)
        }
      }
    }

    fetchData()
    const timer = setInterval(fetchData, interval)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [endpoint, interval])

  return { data, error, loading }
}