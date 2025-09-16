import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export async function GET(_req: NextRequest) {
  const started = Date.now()
  const server = process.env.SYNAPSE_SERVER || null
  const database = process.env.SYNAPSE_DATABASE || null
  const schema = process.env.SNAPSHOT_SCHEMA || 'bm'
  const view = process.env.SNAPSHOT_VIEW || `${schema}.vw_ServiceInventorySnapshot_AU`

  // Mock mode short-circuit
  if (process.env.USE_MOCK_DATA === 'true') {
    return NextResponse.json({
      status: 'mock',
      latencyMs: 0,
      server,
      database,
      snapshotView: view,
      snapshotViewOk: null,
      timestamp: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  let latencyMs: number | null = null
  let snapshotViewOk: boolean | null = null
  let status: 'up' | 'degraded' | 'down' = 'up'
  let error: string | undefined

  try {
    // Lightweight DB ping
    await executeQuery('SELECT TOP (1) 1 AS ok')
    latencyMs = Date.now() - started

    // Check snapshot view binding
    try {
      await executeQuery(`SELECT TOP (1) 1 AS ok FROM ${view}`)
      snapshotViewOk = true
    } catch (e: any) {
      snapshotViewOk = false
      error = e?.message || String(e)
    }

    // Determine status
    if (snapshotViewOk === false || (latencyMs !== null && latencyMs > 1000)) {
      status = 'degraded'
    }
  } catch (e: any) {
    status = 'down'
    error = e?.message || String(e)
  }

  return NextResponse.json({
    status,
    latencyMs,
    server,
    database,
    snapshotView: view,
    snapshotViewOk,
    timestamp: new Date().toISOString(),
    error,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    }
  })
}

