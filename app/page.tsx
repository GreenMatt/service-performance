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
  calculateCriticalItems,
  calculateAverageResolutionTime,
  calculateOpenWIPValue,
  calculateLabourAndOtherCosts,
  calculatePartsCost,
  calculateAverageGrossMargin,
  calculateMonthToDateRevenue,
  getWorstAgeingBucket,
  calculateWeeklyTrend
} from '@/lib/kpi'
import { fetcher, SWR_KEYS } from '@/lib/fetcher'
import { Settings, Package, AlertTriangle } from 'lucide-react'
import { getSiteOptions } from '@/lib/sites'
import useSWRImmutable from 'swr/immutable'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MiniAgeingChart } from '@/components/mini-ageing-chart'
import { useKeepAlive } from '@/hooks/useKeepAlive'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const siteFromUrl = searchParams.get('site') || undefined
  const [filters, setFilters] = useState<ApiFilters>({
    // No default site in local to avoid mismatches with mock data (e.g., 'L-FBK')
    site: siteFromUrl ? [siteFromUrl] : undefined,
    horizon: parseInt(process.env.NEXT_PUBLIC_DEFAULT_HORIZON_DAYS || '30')
  })

  // Keep database connection alive to prevent Synapse timeouts
  useKeepAlive(4) // Keep alive every 4 minutes
  
  const selectedSite = filters.site?.[0]
  // Load sites from API; fallback to static list if unavailable
  const { data: sitesFromApi } = useSWRImmutable<string[]>(SWR_KEYS.sites(), fetcher)
  const siteOptions = (sitesFromApi && sitesFromApi.length > 0)
    ? sitesFromApi.map(name => ({ code: name, name }))
    : getSiteOptions()

  // Fetch data using SWR (only after site selected)
  const workOrdersKey = selectedSite ? SWR_KEYS.workOrders(filters) : null
  const { data: workOrders = [], error: woError, isLoading: woLoading } = useSWR<WorkOrder[]>(
    workOrdersKey,
    fetcher,
    {
      // Load once: no auto revalidation or retries
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: true,
      shouldRetryOnError: false,
      refreshInterval: 0,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes deduping
    }
  )

  // Fetch posted work orders for resolution time calculation (only Posted orders are truly completed)
  const completedFilters = { ...filters, status: ['Posted'] }
  const completedWorkOrdersKey = selectedSite ? SWR_KEYS.workOrders(completedFilters) : null
  const { data: completedWorkOrders = [], error: completedWoError, isLoading: completedWoLoading } = useSWR<WorkOrder[]>(
    completedWorkOrdersKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: true,
      shouldRetryOnError: false,
      refreshInterval: 0,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes deduping
    }
  )
  
  const snapshotKey = selectedSite ? SWR_KEYS.snapshot(filters) : null
  const { data: snapshot = [], error: snapError, isLoading: snapLoading } = useSWR<SnapshotRow[]>(
    snapshotKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: true,
      shouldRetryOnError: true,
      onErrorRetry: (_err, _key, _cfg, revalidate, { retryCount }) => {
        if (retryCount >= 1) return; // retry only once
        const delay = 2000;
        setTimeout(() => revalidate({ retryCount: retryCount + 1 }), delay);
      },
      refreshInterval: 0,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes deduping
    }
  )

  // SWR will automatically fetch when the key changes, no need to manually mutate

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
  // Combine open and completed work orders for all WIP calculations
  const allWorkOrdersForWip = [...workOrders, ...completedWorkOrders]
  const openWoKpi = calculateOpenWorkOrders(allWorkOrdersForWip)
  const ageingBuckets = calculateAgeingBuckets(allWorkOrdersForWip)
  const belowSafetyKpi = calculatePartsBelowSafety(snapshot)
  const criticalKpi = calculateCriticalItems(snapshot)
  const avgResolutionKpi = calculateAverageResolutionTime(completedWorkOrders)
  const wipValueKpi = calculateOpenWIPValue(allWorkOrdersForWip)
  const labourAndOtherKpi = calculateLabourAndOtherCosts(allWorkOrdersForWip)
  const partsCostKpi = calculatePartsCost(allWorkOrdersForWip)
  const grossMarginKpi = calculateAverageGrossMargin(completedWorkOrders)
  const mtdRevenueKpi = calculateMonthToDateRevenue(completedWorkOrders)
  const worstAgeing = getWorstAgeingBucket(ageingBuckets)
  const weeklyTrend = calculateWeeklyTrend(allWorkOrdersForWip)

  const isLoading = woLoading || snapLoading || completedWoLoading
  const hasError = Boolean(woError || snapError || completedWoError)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/5 to-muted/10">
      {/* Header */}
      <header className="border-b bg-background border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Service Performance Dashboard</h1>
              <p className="text-muted-foreground">Real-time monitoring and analytics</p>
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
                className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground"
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
              <ThemeToggle />
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

        {/* KPI Dashboard - Strategic Layout */}
        {selectedSite && (
        <div className="space-y-8">
          {/* First Row - 5 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
              title="Avg Resolution Time"
              hint="Average days from start to completion for completed work orders"
              data={avgResolutionKpi}
              color="text-indigo-600"
            />

            <KpiCard
              title="Open WIP Value"
              hint="Total cost of products and services on work in progress jobs"
              data={wipValueKpi}
              color="text-purple-600"
            />

            <KpiCard
              title="Labour and Other Costs"
              hint="Labour cost value in AUD with percentage of total WIP"
              data={labourAndOtherKpi}
              color="text-cyan-600"
            />

            <KpiCard
              title="Parts Cost"
              hint="Parts cost value in AUD with percentage of total WIP"
              data={partsCostKpi}
              color="text-emerald-600"
            />
          </div>

          {/* Second Row - 5 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <KpiCard
              title="Month-to-Date Revenue"
              hint="Revenue from work orders posted this month"
              data={mtdRevenueKpi}
              color="text-purple-600"
            />

            <KpiCard
              title="Average Gross Margin"
              hint="Average gross margin percentage for posted orders"
              data={grossMarginKpi}
              color="text-green-600"
            />

            <KpiCard
              title="Ageing (Worst)"
              hint="Largest age bucket with open work orders"
              data={{
                value: worstAgeing.count,
                caption: worstAgeing.label,
                customContent: (
                  <div className="pt-4 border-t border-muted/20">
                    <MiniAgeingChart buckets={ageingBuckets} />
                  </div>
                )
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
              title="Critical Items"
              hint="Shortage or below threshold that needs action"
              data={criticalKpi}
              color="text-red-600"
            />
          </div>
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
