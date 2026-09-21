import { useEffect, useState } from 'react'
import { hasApiKey, isAIDisabled, setRequestLimit, subscribeKey } from './session'

export interface Connection {
  configured: boolean
  images: boolean
  provider: string | null
  byok?: boolean
}
export async function readConnection(signal?: AbortSignal): Promise<Connection> {
  try {
    const response = await fetch('/api/magic/status', {
      signal,
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('No AI server')
    const value = await response.json()
    setRequestLimit(value.maxRequestBytes)
    const ownKey = value.byok === true && hasApiKey()
    return {
      configured: !isAIDisabled() && (ownKey || value.configured === true),
      images: !isAIDisabled() && (ownKey || (value.images ?? value.configured === true)),
      provider: ownKey ? 'OpenAI' : value.provider || null,
      byok: value.byok === true,
    }
  } catch {
    return { configured: false, images: false, provider: null }
  }
}
export function useConnection() {
  const [connection, setConnection] = useState<Connection | null>(null)
  const [revision, refresh] = useState(0)
  useEffect(() => subscribeKey(() => refresh((r) => r + 1)), [])
  useEffect(() => {
    const controller = new AbortController()
    void readConnection(controller.signal).then((value) => {
      if (!controller.signal.aborted) setConnection(value)
    })
    return () => controller.abort()
  }, [revision])
  return connection
}
