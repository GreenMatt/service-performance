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
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

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
      <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-background via-background to-muted/20">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 bg-gradient-to-r from-muted via-muted/60 to-transparent rounded-lg w-48 animate-pulse"></div>
              <div className="h-4 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent rounded w-32 animate-pulse"></div>
            </div>
            <div className="h-10 bg-gradient-to-r from-muted via-muted/60 to-transparent rounded-lg w-32 animate-pulse"></div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className="h-14 bg-gradient-to-r from-muted/60 via-muted/30 to-transparent rounded-xl animate-pulse"
                style={{
                  background: `linear-gradient(90deg,
                    hsl(var(--muted) / ${0.6 - i * 0.05}) 0%,
                    hsl(var(--muted) / ${0.3 - i * 0.03}) 50%,
                    transparent 100%)`
                }}
              />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="w-full overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-background via-background to-muted/10 backdrop-blur-xl">
        {/* Table Controls */}
        <div className="p-6 border-b border-muted/20 bg-gradient-to-r from-background/80 to-muted/5 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              <Input
                placeholder="Search items..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 w-80 h-12 bg-background/60 border-muted/30 backdrop-blur-sm hover:border-muted focus:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
              />
              {globalFilter && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-3 top-3"
                >
                  <button
                    onClick={() => setGlobalFilter('')}
                    className="h-4 w-4 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-xs transition-colors"
                  >
                    ×
                  </button>
                </motion.div>
              )}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Badge variant="secondary" className="px-4 py-2 bg-primary/10 text-primary border-primary/20 shadow-sm">
                {`${table.getFilteredRowModel().rows.length.toLocaleString()} of ${data.length.toLocaleString()} items`}
              </Badge>
            </motion.div>
          </div>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="h-10 px-4 bg-background/60 hover:bg-background border-muted/30 hover:border-muted hover:shadow-md transition-all duration-200 backdrop-blur-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </motion.div>
        </div>

        {/* Quick Filters */}
        <motion.div
          className="flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {[
            {
              label: 'Action Required',
              active: table.getColumn('Action')?.getFilterValue() === 'not-ok',
              onClick: () => {
                const current = table.getColumn('Action')?.getFilterValue()
                table.getColumn('Action')?.setFilterValue(current === 'not-ok' ? '' : 'not-ok')
              },
              color: 'bg-red-500/10 text-red-700 border-red-200 hover:bg-red-500/20'
            },
            {
              label: 'With Gap',
              active: !!table.getColumn('Gap')?.getFilterValue(),
              onClick: () => {
                const hasFilter = table.getColumn('Gap')?.getFilterValue()
                table.getColumn('Gap')?.setFilterValue(hasFilter ? undefined : (value: number) => value > 0)
              },
              color: 'bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/20'
            },
            {
              label: 'Below Safety',
              active: !!table.getColumn('OnHand')?.getFilterValue(),
              onClick: () => {
                const hasFilter = table.getColumn('OnHand')?.getFilterValue()
                if (hasFilter) {
                  table.getColumn('OnHand')?.setFilterValue(undefined)
                } else {
                  table.setColumnFilters(prev => [...prev, { id: 'OnHand', value: 'below-safety' }])
                }
              },
              color: 'bg-orange-500/10 text-orange-700 border-orange-200 hover:bg-orange-500/20'
            }
          ].map((filter, index) => (
            <motion.div
              key={filter.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant={filter.active ? 'default' : 'outline'}
                size="sm"
                onClick={filter.onClick}
                className={cn(
                  'h-9 px-4 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md',
                  filter.active
                    ? `${filter.color} border-0`
                    : 'bg-background/60 border-muted/30 hover:border-muted hover:bg-background'
                )}
              >
                {filter.label}
                {filter.active && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="ml-2 w-2 h-2 rounded-full bg-current"
                  />
                )}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Table Container */}
      <div
        ref={tableContainerRef}
        className="relative overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted/30 hover:scrollbar-thumb-muted/50"
        style={{ height: enableVirtualization ? '600px' : 'auto' }}
      >
        <table className="w-full">
          <thead className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-muted/20 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-4 py-4 text-left text-sm font-semibold text-foreground/80 bg-background/95 backdrop-blur-md transition-all duration-200",
                      header.column.getCanSort() && "cursor-pointer hover:bg-muted/30 hover:text-foreground group",
                      header.column.getIsPinned() && "sticky z-50 bg-background/95 backdrop-blur-md shadow-lg"
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
                      <div className="flex items-center gap-2 select-none">
                        {typeof header.column.columnDef.header === 'function'
                          ? header.column.columnDef.header(header.getContext())
                          : header.column.columnDef.header
                        }
                        {header.column.getCanSort() && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {header.column.getIsSorted() === 'desc' ? (
                              <ArrowDown className="h-3 w-3 text-primary" />
                            ) : header.column.getIsSorted() === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-primary" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </div>
                        )}
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
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-b border-muted/10 hover:bg-gradient-to-r hover:from-muted/20 hover:to-transparent transition-all duration-300 group cursor-pointer"
                  whileHover={{ scale: 1.001 }}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <motion.td
                      key={cell.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: cellIndex * 0.02, duration: 0.2 }}
                      className={cn(
                        "px-4 py-4 text-sm transition-all duration-200 group-hover:text-foreground",
                        cell.column.getIsPinned() && "sticky z-10 bg-background/95 backdrop-blur-md shadow-lg group-hover:bg-muted/10"
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
                    </motion.td>
                  ))}
                  
                  {/* Expanded Row Detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        key={`${row.id}-detail`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <td colSpan={columns.length} className="p-0 bg-gradient-to-r from-muted/5 to-transparent">
                          <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: 0.1, duration: 0.2 }}
                          >
                            <RowDetail row={row.original} />
                          </motion.div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </motion.tr>
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
        <AnimatePresence>
          {rows.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
              className="p-16 text-center"
            >
              <div className="text-muted-foreground space-y-4">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <Filter className="h-16 w-16 mx-auto opacity-30" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-xl font-semibold mb-2 text-foreground/60">No items found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-between p-6 border-t border-muted/20 bg-gradient-to-r from-background/80 to-muted/5 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="text-sm text-muted-foreground font-medium"
        >
          Showing <span className="text-foreground font-semibold">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to{' '}
          <span className="text-foreground font-semibold">
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
          </span>{' '}
          of <span className="text-foreground font-semibold">{table.getFilteredRowModel().rows.length.toLocaleString()}</span> items
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-2"
        >
          {[
            { icon: ChevronsLeft, onClick: () => table.setPageIndex(0), disabled: !table.getCanPreviousPage() },
            { icon: ChevronLeft, onClick: () => table.previousPage(), disabled: !table.getCanPreviousPage() },
          ].map((btn, index) => (
            <motion.div key={index} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={btn.onClick}
                disabled={btn.disabled}
                className="h-9 w-9 p-0 bg-background/60 border-muted/30 hover:border-muted hover:bg-background hover:shadow-md transition-all duration-200 backdrop-blur-sm disabled:opacity-30"
              >
                <btn.icon className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}

          <div className="flex items-center gap-2 text-sm mx-4 px-4 py-2 bg-primary/5 border border-primary/10 rounded-lg backdrop-blur-sm">
            <span className="text-muted-foreground">Page</span>
            <span className="font-bold text-primary text-base">{table.getState().pagination.pageIndex + 1}</span>
            <span className="text-muted-foreground">of</span>
            <span className="font-semibold">{table.getPageCount()}</span>
          </div>

          {[
            { icon: ChevronRight, onClick: () => table.nextPage(), disabled: !table.getCanNextPage() },
            { icon: ChevronsRight, onClick: () => table.setPageIndex(table.getPageCount() - 1), disabled: !table.getCanNextPage() },
          ].map((btn, index) => (
            <motion.div key={index + 2} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={btn.onClick}
                disabled={btn.disabled}
                className="h-9 w-9 p-0 bg-background/60 border-muted/30 hover:border-muted hover:bg-background hover:shadow-md transition-all duration-200 backdrop-blur-sm disabled:opacity-30"
              >
                <btn.icon className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </Card>
    </motion.div>
  )
}
