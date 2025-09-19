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
import { Download, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

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
                className="h-12 bg-gradient-to-r from-muted/60 via-muted/30 to-transparent rounded-xl animate-pulse"
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
                  placeholder="Search work orders..."
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
                  {`${table.getFilteredRowModel().rows.length.toLocaleString()} of ${data.length.toLocaleString()} work orders`}
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
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Status Filters */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { status: 'Unscheduled', color: 'bg-gray-500/10 text-gray-700 border-gray-200 hover:bg-gray-500/20' },
                { status: 'InProgress', color: 'bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500/20' },
                { status: 'Scheduled', color: 'bg-green-500/10 text-green-700 border-green-200 hover:bg-green-500/20' },
                { status: 'Completed', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20' },
                { status: 'Posted', color: 'bg-purple-500/10 text-purple-700 border-purple-200 hover:bg-purple-500/20' },
                { status: 'Canceled', color: 'bg-red-500/10 text-red-700 border-red-200 hover:bg-red-500/20' },
              ].map((item, index) => {
                const isActive = table.getColumn('Status')?.getFilterValue() === item.status
                return (
                  <motion.div
                    key={item.status}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const current = table.getColumn('Status')?.getFilterValue()
                        table.getColumn('Status')?.setFilterValue(current === item.status ? '' : item.status)
                      }}
                      className={cn(
                        'h-9 px-4 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md',
                        isActive
                          ? `${item.color} border-0`
                          : 'bg-background/60 border-muted/30 hover:border-muted hover:bg-background'
                      )}
                    >
                      {item.status}
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="ml-2 w-2 h-2 rounded-full bg-current"
                        />
                      )}
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Age Filters */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Age</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '0-2d', min: 0, max: 2, color: 'bg-green-500/10 text-green-700 border-green-200 hover:bg-green-500/20' },
                { label: '3-7d', min: 3, max: 7, color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200 hover:bg-yellow-500/20' },
                { label: '8-14d', min: 8, max: 14, color: 'bg-orange-500/10 text-orange-700 border-orange-200 hover:bg-orange-500/20' },
                { label: '15-30d', min: 15, max: 30, color: 'bg-red-500/10 text-red-700 border-red-200 hover:bg-red-500/20' },
                { label: '>30d', min: 31, color: 'bg-red-700/10 text-red-800 border-red-300 hover:bg-red-700/20' },
              ].map((bucket, index) => {
                const isActive = table.getColumn('AgeDays')?.getFilterValue() === bucket.label
                return (
                  <motion.div
                    key={bucket.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const col = table.getColumn('AgeDays')
                        const current = col?.getFilterValue()
                        col?.setFilterValue(current === bucket.label ? '' : bucket.label)
                      }}
                      className={cn(
                        'h-9 px-4 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md',
                        isActive
                          ? `${bucket.color} border-0`
                          : 'bg-background/60 border-muted/30 hover:border-muted hover:bg-background'
                      )}
                    >
                      {bucket.label}
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="ml-2 w-2 h-2 rounded-full bg-current"
                        />
                      )}
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>

      <div
        ref={tableContainerRef}
        className="relative overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted/30 hover:scrollbar-thumb-muted/50"
        style={{ height: '600px' }}
      >
        <table className="w-full">
          <thead className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-muted/20 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-4 text-left text-sm font-semibold text-foreground/80 bg-background/95 backdrop-blur-md transition-all duration-200',
                      header.column.getCanSort() && 'cursor-pointer hover:bg-muted/30 hover:text-foreground group',
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2 select-none">
                      {typeof header.column.columnDef.header === 'function'
                        ? header.column.columnDef.header(header.getContext())
                        : header.column.columnDef.header}
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
                      className="px-4 py-4 text-sm transition-all duration-200 group-hover:text-foreground"
                    >
                      {typeof cell.column.columnDef.cell === 'function'
                        ? cell.column.columnDef.cell(cell.getContext())
                        : cell.getValue()}
                    </motion.td>
                  ))}
                </motion.tr>
              )
            })}

            {virtualRows.length > 0 && (
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
                  <h3 className="text-xl font-semibold mb-2 text-foreground/60">No work orders found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
    </motion.div>
  )
}
