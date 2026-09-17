import { useEffect, useState } from 'react'

export interface Connection {
  configured: boolean
  images: boolean
  provider: string | null
}
export async function readConnection(signal?: AbortSignal): Promise<Connection> {
  try {
    const response = await fetch('/api/magic/status', { signal })
    const value = await response.json()
    return {
      configured: value.configured === true,
      images: value.images ?? value.configured === true,
      provider: value.provider || null,
    }
  } catch {
    return { configured: false, images: false, provider: null }
  }
}
export function useConnection() {
  const [connection, setConnection] = useState<Connection | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void readConnection(controller.signal).then((value) => {
      if (!controller.signal.aborted) setConnection(value)
    })
    return () => controller.abort()
  }, [])
  return connection
}
