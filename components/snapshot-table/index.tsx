'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  ColumnFiltersState,
  SortingState,
  ExpandedState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SnapshotRow } from '@/lib/types'
import { columns } from './columns'
import { RowDetail } from './row-detail'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Download,
  Search,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SnapshotTableProps {
  data: SnapshotRow[]
  isLoading?: boolean
  enableVirtualization?: boolean
  pageSize?: number
}

export function SnapshotTable({ 
  data, 
  isLoading = false, 
  enableVirtualization = true,
  pageSize = 50 
}: SnapshotTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'Action', desc: true } // Sort by action priority by default
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [globalFilter, setGlobalFilter] = useState('')

  const hasExpandableRows = useMemo(() => (
    data.some(r => (r.InboundQty || 0) > 0 || (r.DemandQty || 0) > 0)
  ), [data])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      expanded,
      globalFilter,
      columnVisibility: { expand: hasExpandableRows },
    },
    initialState: {
      pagination: {
        pageSize,
      },
      columnPinning: {
        left: ['ItemId']
      }
    },
    getSubRows: () => undefined, // We handle expansion manually
  })

  const tableContainerRef = useRef<HTMLDivElement>(null)

  const { rows } = table.getRowModel()
  
  // Virtualization setup
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60, // Base row height
    overscan: 10,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0
  const paddingBottom = virtualRows.length > 0 
    ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0) 
    : 0

  // CSV Export function
  const exportToCSV = () => {
    const headers = ['ItemId', 'Site', 'Warehouse', 'OnHand', 'SafetyStock', 'MinOnHand', 
                    'InboundQty', 'NextETA', 'DemandQty', 'Gap', 'CoverDays', 'Action']
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.ItemId,
        row.Site,
        row.Warehouse || '',
        row.OnHand,
        row.SafetyStock,
        row.MinOnHand || '',
        row.InboundQty,
        row.NextETA || '',
        row.DemandQty,
        row.Gap,
        row.CoverDays || '',
        row.Action
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `snapshot-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
            <div className="h-8 bg-muted rounded w-32 animate-pulse"></div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      {/* Table Controls */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
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
          <Button
            variant={table.getColumn('Action')?.getFilterValue() === 'not-ok' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              const current = table.getColumn('Action')?.getFilterValue()
              table.getColumn('Action')?.setFilterValue(current === 'not-ok' ? '' : 'not-ok')
            }}
          >
            Action Required
          </Button>
          <Button
            variant={table.getColumn('Gap')?.getFilterValue() ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              const hasFilter = table.getColumn('Gap')?.getFilterValue()
              table.getColumn('Gap')?.setFilterValue(hasFilter ? undefined : (value: number) => value > 0)
            }}
          >
            With Gap
          </Button>
          <Button
            variant={table.getColumn('OnHand')?.getFilterValue() ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              const hasFilter = table.getColumn('OnHand')?.getFilterValue()
              // Filter for items below safety stock
              if (hasFilter) {
                table.getColumn('OnHand')?.setFilterValue(undefined)
              } else {
                table.setColumnFilters(prev => [...prev, { id: 'OnHand', value: 'below-safety' }])
              }
            }}
          >
            Below Safety
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div 
        ref={tableContainerRef}
        className="relative overflow-auto"
        style={{ height: enableVirtualization ? '600px' : 'auto' }}
      >
        <table className="w-full">
          <thead className="sticky top-0 z-30 bg-background border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-2 py-3 text-left text-sm font-medium text-muted-foreground bg-background",
                      header.column.getCanSort() && "cursor-pointer hover:bg-muted/50",
                      header.column.getIsPinned() && "sticky z-50 bg-background"
                    )}
                    style={{
                      left: header.column.getIsPinned() === 'left' 
                        ? `${header.getStart()}px` 
                        : undefined,
                      width: header.getSize(),
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-2">
                        {typeof header.column.columnDef.header === 'function'
                          ? header.column.columnDef.header(header.getContext())
                          : header.column.columnDef.header
                        }
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          
          <tbody>
            {enableVirtualization && (
              <tr>
                <td colSpan={columns.length} style={{ height: paddingTop }} />
              </tr>
            )}
            
            {(enableVirtualization ? virtualRows : rows).map((virtualRow) => {
              const row = enableVirtualization ? rows[virtualRow.index] : virtualRow
              const isExpanded = row.getIsExpanded()
              
              return (
                <tr key={row.id} className="border-b hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                    className={cn(
                        "px-2 py-3 text-sm",
                        cell.column.getIsPinned() && "sticky z-10 bg-background"
                      )}
                      style={{
                        left: cell.column.getIsPinned() === 'left' 
                          ? `${cell.column.getStart()}px` 
                          : undefined,
                        width: cell.column.getSize(),
                      }}
                    >
                      {typeof cell.column.columnDef.cell === 'function'
                        ? cell.column.columnDef.cell(cell.getContext())
                        : cell.getValue()
                      }
                    </td>
                  ))}
                  
                  {/* Expanded Row Detail */}
                  {isExpanded && (
                    <tr key={`${row.id}-detail`}>
                      <td colSpan={columns.length} className="p-0">
                        <RowDetail row={row.original} />
                      </td>
                    </tr>
                  )}
                </tr>
              )
            })}
            
            {enableVirtualization && (
              <tr>
                <td colSpan={columns.length} style={{ height: paddingBottom }} />
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Empty State */}
        {rows.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No items found</h3>
              <p>Try adjusting your filters or search terms</p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length.toLocaleString()} items
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1 text-sm">
            <span>Page</span>
            <strong>{table.getState().pagination.pageIndex + 1}</strong>
            <span>of {table.getPageCount()}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
