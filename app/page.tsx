'use client'

import { useEffect, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/kpi-card'
import { LastUpdated } from '@/components/last-updated'
import { SynapseStatus } from '@/components/synapse-status'
import { WorkOrder, SnapshotRow, ApiFilters } from '@/lib/types'
import { 
  calculateOpenWorkOrders, 
  calculateAgeingBuckets, 
  calculatePartsBelowSafety, 
  calculateBelowSafetyNoSupply,
  getWorstAgeingBucket,
  calculateWeeklyTrend
} from '@/lib/kpi'
import { fetcher, SWR_KEYS } from '@/lib/fetcher'
import { Settings, Package, AlertTriangle } from 'lucide-react'
import { getSiteOptions } from '@/lib/sites'
import useSWRImmutable from 'swr/immutable'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const siteFromUrl = searchParams.get('site') || undefined
  const [filters, setFilters] = useState<ApiFilters>({
    // No default site in local to avoid mismatches with mock data (e.g., 'L-FBK')
    site: siteFromUrl ? [siteFromUrl] : undefined,
    horizon: parseInt(process.env.NEXT_PUBLIC_DEFAULT_HORIZON_DAYS || '30')
  })
  
  const selectedSite = filters.site?.[0]
  // Load sites from API; fallback to static list if unavailable
  const { data: sitesFromApi } = useSWRImmutable<string[]>(SWR_KEYS.sites(), fetcher)
  const siteOptions = (sitesFromApi && sitesFromApi.length > 0)
    ? sitesFromApi.map(name => ({ code: name, name }))
    : getSiteOptions()

  // Fetch data using SWR (only after site selected)
  const { data: workOrders = [], error: woError, isLoading: woLoading } = useSWR<WorkOrder[]>(
    selectedSite ? SWR_KEYS.workOrders(filters) : null,
    fetcher,
    {
      // Load once: no auto revalidation or retries
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: true,
      revalidateOnMount: true,
      shouldRetryOnError: false,
      refreshInterval: 0,
      dedupingInterval: 10 * 60 * 1000, // 10 minutes
    }
  )
  
  const { data: snapshot = [], error: snapError, isLoading: snapLoading } = useSWR<SnapshotRow[]>(
    selectedSite ? SWR_KEYS.snapshot(filters) : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: false,
      revalidateIfStale: true,
      revalidateOnMount: true,
      shouldRetryOnError: true,
      onErrorRetry: (_err, _key, _cfg, revalidate, { retryCount }) => {
        if (retryCount >= 2) return; // retry up to 2 times
        const delay = 1500 * (retryCount + 1);
        setTimeout(() => revalidate({ retryCount: retryCount + 1 }), delay);
      },
      refreshInterval: 0,
      dedupingInterval: 10 * 60 * 1000,
    }
  )

  // Ensure a fetch happens once on mount and when filters change
  useEffect(() => {
    if (selectedSite) {
      mutate(SWR_KEYS.workOrders(filters))
      mutate(SWR_KEYS.snapshot(filters))
    }
  }, [selectedSite])

  // Keep URL in sync with selected site and persist to localStorage
  useEffect(() => {
    const site = filters.site?.[0]
    const current = searchParams.get('site') || undefined
    if (site && site !== current) {
      const q = new URLSearchParams(Array.from(searchParams.entries()))
      q.set('site', site)
      router.replace(`/?${q.toString()}`, { scroll: false })
      try { localStorage.setItem('selectedSite', site) } catch {}
    }
    if (!site && !current) {
      // Restore from localStorage if present
      try {
        const saved = localStorage.getItem('selectedSite') || undefined
        if (saved) setFilters(f => ({ ...f, site: [saved] }))
      } catch {}
    }
  }, [filters.site, router, searchParams])

  // Calculate KPIs
  const openWoKpi = calculateOpenWorkOrders(workOrders)
  const ageingBuckets = calculateAgeingBuckets(workOrders)
  const belowSafetyKpi = calculatePartsBelowSafety(snapshot)
  const noSupplyKpi = calculateBelowSafetyNoSupply(snapshot)
  const worstAgeing = getWorstAgeingBucket(ageingBuckets)
  const weeklyTrend = calculateWeeklyTrend(workOrders)

  const isLoading = woLoading || snapLoading
  const hasError = Boolean(woError || snapError)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Performance Dashboard</h1>
              <p className="text-gray-600">Real-time monitoring and analytics</p>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex gap-2">
                <Link href="/">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
                <Link href={selectedSite ? `/work-orders?site=${encodeURIComponent(selectedSite)}` : '/work-orders'}>
                  <Button variant="ghost" size="sm">Work Orders</Button>
                </Link>
                <Link href={selectedSite ? `/snapshot?site=${encodeURIComponent(selectedSite)}` : '/snapshot'}>
                  <Button variant="ghost" size="sm">Current Position</Button>
                </Link>
              </nav>
              {/* Single-site selector */}
              <select
                className="border rounded px-2 py-1 text-sm"
                value={selectedSite || ''}
                onChange={(e) => {
                  const v = e.target.value || undefined
                  setFilters(f => ({ ...f, site: v ? [v] : undefined }))
                }}
              >
                <option value="">Select site…</option>
                {siteOptions.map(opt => (
                  <option key={opt.code} value={opt.name}>{opt.name}</option>
                ))}
              </select>
              <SynapseStatus />
              <LastUpdated />
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {hasError && (
          <div className="bg-white border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700">
              Some data failed to load. Showing available results.
            </p>
          </div>
        )}
        {/* Gate until site is selected */}
        {!selectedSite && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-gray-600">
              Please select a site to load dashboard data.
            </CardContent>
          </Card>
        )}

        {/* KPI Strip */}
        {selectedSite && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Open Work Orders"
            hint="Open backlog drift this week = opens − closes in last 7 days"
            data={{
              ...openWoKpi,
              delta: weeklyTrend.netChange,
              deltaType: weeklyTrend.trendDirection === 'up' ? 'increase' : 
                        weeklyTrend.trendDirection === 'down' ? 'decrease' : undefined
            }}
            color="text-blue-600"
          />
          
          <KpiCard
            title="Ageing (Worst)"
            hint="Largest age bucket with open work orders"
            data={{
              value: worstAgeing.count,
              caption: worstAgeing.label,
              breakdown: ageingBuckets.reduce((acc, bucket) => {
                if (bucket.count > 0) acc[bucket.label] = bucket.count
                return acc
              }, {} as Record<string, number>)
            }}
            color="text-amber-600"
          />
          
          <KpiCard
            title="Parts Below Safety"
            hint="OnHand below safety (or min) threshold"
            data={belowSafetyKpi}
            color="text-orange-600"
          />
          
          <KpiCard
            title="Need Immediate Action"
            hint="Below safety with no inbound in the horizon"
            data={noSupplyKpi}
            color="text-red-600"
          />
        </div>
        )}

        {/* Loading State */}
        {selectedSite && isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                  Loading Charts...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Loading Data...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Summary Cards */}
        {selectedSite && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Package className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                <h3 className="font-medium">Work Orders</h3>
                <p className="text-sm text-gray-600">Explore and manage work orders</p>
                <div className="mt-2 text-2xl font-bold text-blue-600">
                  {openWoKpi.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-orange-600" />
                <h3 className="font-medium">Parts Below Safety</h3>
                <p className="text-sm text-gray-600">Items requiring attention</p>
                <div className="mt-2 text-2xl font-bold text-orange-600">
                  {belowSafetyKpi.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Link href="/snapshot">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-red-600" />
                  <h3 className="font-medium">Critical Actions</h3>
                  <p className="text-sm text-gray-600">Items needing immediate action</p>
                  <div className="mt-2 text-2xl font-bold text-red-600">
                    {noSupplyKpi.value.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Data Summary */}
        {selectedSite && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{workOrders.length.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Work Orders</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{snapshot.length.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Items Monitored</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {snapshot.filter(s => s.Action !== 'OK').length.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Action Required</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {workOrders.filter(wo => wo.Status === 'InProgress').length.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
