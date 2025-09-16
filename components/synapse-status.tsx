'use client'

import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

type Health = {
  status: 'up' | 'degraded' | 'down' | 'mock'
  latencyMs: number | null
  server: string | null
  database: string | null
  snapshotView: string
  snapshotViewOk: boolean | null
  timestamp: string
  error?: string
}

function dotColor(status: Health['status']) {
  switch (status) {
    case 'up': return 'bg-green-500'
    case 'degraded': return 'bg-amber-500'
    case 'down': return 'bg-red-500'
    case 'mock': return 'bg-blue-500'
    default: return 'bg-gray-400'
  }
}

export function SynapseStatus() {
  const { data } = useSWR<Health>('/api/health', fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  })

  const status = data?.status || 'down'
  const title = data
    ? `Synapse: ${status.toUpperCase()}\n` +
      (data.latencyMs != null ? `Latency: ${data.latencyMs} ms\n` : '') +
      (data.database ? `DB: ${data.database}\n` : '') +
      (data.snapshotView ? `View: ${data.snapshotView}${data.snapshotViewOk === false ? ' (binding error)' : ''}` : '') +
      (data.error ? `\nError: ${data.error}` : '')
    : 'Synapse: checking...'

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" title={title}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor(status)}`} />
      <span>Synapse</span>
    </div>
  )
}

