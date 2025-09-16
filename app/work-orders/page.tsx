'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Filters } from '@/components/filters'
import { WorkOrder, ApiFilters } from '@/lib/types'
import { fetcher, SWR_KEYS } from '@/lib/fetcher'
import { WorkOrdersTable } from '@/components/work-orders-table'
import { SynapseStatus } from '@/components/synapse-status'

export default function WorkOrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const siteFromUrl = searchParams.get('site') || undefined
  const [filters, setFilters] = useState<ApiFilters>({
    site: siteFromUrl ? [siteFromUrl] : undefined,
    status: ['Unscheduled', 'InProgress', 'Scheduled']
  })

  const { data: workOrders = [], error, isLoading } = useSWR<WorkOrder[]>(
    SWR_KEYS.workOrders(filters),
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
    mutate(SWR_KEYS.workOrders(filters))
  }, [filters])

  // Keep URL in sync with selected site from filters
  useEffect(() => {
    const site = filters.site?.[0]
    const current = searchParams.get('site') || undefined
    if (site && site !== current) {
      const q = new URLSearchParams(Array.from(searchParams.entries()))
      q.set('site', site)
      router.replace(`/work-orders?${q.toString()}`, { scroll: false })
    }
  }, [filters.site, router, searchParams])

  // Site options from data (may be UNKNOWN if column not available)
  const siteOptions = Array.from(new Set(workOrders.map(w => w.Site).filter(Boolean))).sort()

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-red-200 rounded-lg p-6">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Error Loading Work Orders</h1>
            <p className="text-gray-600">Unable to fetch work orders. Check API connection.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
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
                <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
                <p className="text-gray-600">Open orders, statuses, and ageing</p>
              </div>
            </div>
            <SynapseStatus />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{workOrders.length.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Work Orders</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{workOrders.filter(w => ['Unscheduled','InProgress','Scheduled'].includes(w.Status)).length.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{workOrders.filter(w => ['Completed','Posted','Canceled'].includes(w.Status)).length.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Completed/Posted/Canceled</div>
            </CardContent>
          </Card>
        </div>

        <Filters
          filters={filters}
          onFiltersChange={setFilters}
          sites={siteOptions}
          statuses={['Unscheduled','Scheduled','InProgress','Completed','Posted','Canceled']}
          priorities={['Critical','High','Normal','Low']}
        />

        <WorkOrdersTable data={workOrders} isLoading={isLoading} />
      </div>
    </div>
  )
}
