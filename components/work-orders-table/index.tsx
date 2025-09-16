'use client'

import { useMemo, useRef, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnFiltersState,
  SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { WorkOrder } from '@/lib/types'
import { columns } from './columns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Download, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkOrdersTableProps {
  data: WorkOrder[]
  isLoading?: boolean
}

export function WorkOrdersTable({ data, isLoading = false }: WorkOrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'CreatedDate', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, columnFilters, globalFilter },
    initialState: {
      pagination: { pageSize: 50 },
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true
      const q = String(filterValue).toLowerCase()
      const wo = row.original
      return (
        (wo.WorkOrderId || '').toLowerCase().includes(q) ||
        (wo.Technician || '').toLowerCase().includes(q) ||
        (wo.Site || '').toLowerCase().includes(q)
      )
    },
  })

  const tableContainerRef = useRef<HTMLDivElement>(null)
  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 56,
    overscan: 10,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0
  const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0) : 0

  const exportToCSV = () => {
    const headers = ['WorkOrderId','Status','Priority','ServiceType','Site','Technician','CreatedDate','PromisedDate','ClosedDate','AgeDays']
    const csv = [
      headers.join(','),
      ...data.map(w => [
        w.WorkOrderId,
        w.Status,
        w.Priority,
        w.ServiceType,
        w.Site || '',
        w.Technician || '',
        w.CreatedDate,
        w.PromisedDate || '',
        w.ClosedDate || '',
        w.AgeDays
      ].map(f => `"${f ?? ''}"`).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = `work-orders-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-muted rounded w-48 animate-pulse" />
            <div className="h-8 bg-muted rounded w-32 animate-pulse" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search work orders..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Badge variant="secondary">
              {`${table.getFilteredRowModel().rows.length.toLocaleString()} of ${data.length.toLocaleString()} items`}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {['Unscheduled','InProgress','Scheduled','Completed','Posted','Canceled'].map(st => (
            <Button
              key={st}
              variant={table.getColumn('Status')?.getFilterValue() === st ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                const current = table.getColumn('Status')?.getFilterValue()
                table.getColumn('Status')?.setFilterValue(current === st ? '' : st)
              }}
            >
              {st}
            </Button>
          ))}

          {/* Ageing buckets */}
          {[
            { label: '0-2d', min: 0, max: 2 },
            { label: '3-7d', min: 3, max: 7 },
            { label: '8-14d', min: 8, max: 14 },
            { label: '15-30d', min: 15, max: 30 },
            { label: '>30d', min: 31 },
          ].map(b => (
            <Button
              key={b.label}
              variant={table.getColumn('AgeDays')?.getFilterValue() === b.label ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                const col = table.getColumn('AgeDays')
                const current = col?.getFilterValue()
                col?.setFilterValue(current === b.label ? '' : b.label)
              }}
            >
              {b.label}
            </Button>
          ))}
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className="relative overflow-auto"
        style={{ height: '600px' }}
      >
        <table className="w-full">
          <thead className="sticky top-0 z-30 bg-background border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-2 py-3 text-left text-sm font-medium text-muted-foreground bg-background',
                      header.column.getCanSort() && 'cursor-pointer hover:bg-muted/50',
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {typeof header.column.columnDef.header === 'function'
                      ? header.column.columnDef.header(header.getContext())
                      : header.column.columnDef.header}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {virtualRows.length > 0 && (
              <tr>
                <td colSpan={columns.length} style={{ height: paddingTop }} />
              </tr>
            )}

            {(virtualRows.length > 0 ? virtualRows : rows).map((vRow) => {
              const row = virtualRows.length > 0 ? rows[vRow.index] : vRow
              return (
                <tr key={row.id} className="border-b hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-3 text-sm">
                      {typeof cell.column.columnDef.cell === 'function'
                        ? cell.column.columnDef.cell(cell.getContext())
                        : cell.getValue()}
                    </td>
                  ))}
                </tr>
              )
            })}

            {virtualRows.length > 0 && (
              <tr>
                <td colSpan={columns.length} style={{ height: paddingBottom }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
