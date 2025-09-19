'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { SnapshotTable } from '@/components/snapshot-table'
import { Filters } from '@/components/filters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SnapshotRow, ApiFilters } from '@/lib/types'
import { fetcher, SWR_KEYS } from '@/lib/fetcher'
import { calculateSnapshotSummary } from '@/lib/kpi'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { SynapseStatus } from '@/components/synapse-status'
import { ThemeToggle } from '@/components/theme-toggle'

export default function SnapshotPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const siteFromUrl = searchParams.get('site') || undefined
  const [filters, setFilters] = useState<ApiFilters>({
    site: siteFromUrl ? [siteFromUrl] : undefined,
    horizon: parseInt(process.env.NEXT_PUBLIC_DEFAULT_HORIZON_DAYS || '30')
  })

  const { data: snapshot = [], error, isLoading } = useSWR<SnapshotRow[]>(
    SWR_KEYS.snapshot(filters), 
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: true,
      revalidateOnMount: true,
      shouldRetryOnError: false,
      refreshInterval: 0,
      dedupingInterval: 10 * 60 * 1000,
    }
  )

  useEffect(() => {
    mutate(SWR_KEYS.snapshot(filters))
  }, [filters])

  // Keep URL in sync with selected site
  useEffect(() => {
    const site = filters.site?.[0]
    const current = searchParams.get('site') || undefined
    if (site && site !== current) {
      const q = new URLSearchParams(Array.from(searchParams.entries()))
      q.set('site', site)
      router.replace(`/snapshot?${q.toString()}`, { scroll: false })
    }
  }, [filters.site, router, searchParams])

  // Build site options dynamically from data to ensure valid choices
  const siteOptions = Array.from(new Set(snapshot.map((s) => s.Site))).sort()

  const summary = calculateSnapshotSummary(snapshot)

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card border border-destructive/20 rounded-lg p-6">
            <h1 className="text-xl font-semibold text-destructive mb-2">Error Loading Snapshot</h1>
            <p className="text-muted-foreground">
              Unable to fetch snapshot data. Please check the API connection.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={filters.site?.[0] ? `/?site=${encodeURIComponent(filters.site[0] as string)}` : '/'}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Current Position Snapshot</h1>
                <p className="text-muted-foreground">Supply vs demand analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <SynapseStatus />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{summary.totalItems.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{summary.criticalItems.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Action Required</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.averageCoverDays}</div>
              <div className="text-sm text-muted-foreground">Avg Cover Days</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {(summary.actionBreakdown['OK'] || 0).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Items OK</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Filters
          filters={filters}
          onFiltersChange={setFilters}
          sites={siteOptions}
        />

        {/* Snapshot Table */}
        <SnapshotTable 
          data={snapshot} 
          isLoading={isLoading}
          enableVirtualization={true}
          pageSize={50}
        />
      </div>
    </div>
  )
}
