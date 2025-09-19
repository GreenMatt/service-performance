'use client'

import { ColumnDef } from '@tanstack/react-table'
import { SnapshotRow } from '@/lib/types'
import { ActionBadge } from '@/components/action-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCoverDays } from '@/lib/kpi'
import { formatDate } from '@/lib/date'
import { ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react'

export const columns: ColumnDef<SnapshotRow>[] = [
  {
    id: 'expand',
    header: '',
    size: 28,
    minSize: 28,
    enableResizing: false,
    cell: ({ row }) => {
      const hasDetails = (row.original.InboundQty || 0) > 0 || (row.original.DemandQty || 0) > 0
      if (!hasDetails) return <span className="inline-block w-4" />
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => row.toggleExpanded()}
          className="h-6 w-6 p-0"
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'ItemId',
    size: 110,
    minSize: 90,
    header: ({ column }) => (
      <div
        title="Part or item identifier"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="cursor-pointer select-none font-semibold text-xs hover:text-foreground transition-colors"
      >
        Item ID
      </div>
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm font-medium">
        {row.getValue('ItemId')}
      </div>
    ),
    enablePinning: true,
  },
  {
    accessorKey: 'Site',
    size: 60,
    minSize: 50,
    header: ({ column }) => (
      <div
        title="Site code"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="cursor-pointer select-none font-semibold text-xs hover:text-foreground transition-colors"
      >
        Site
      </div>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono">
        {row.getValue('Site')}
      </Badge>
    ),
    enablePinning: true,
  },
  {
    accessorKey: 'Warehouse',
    size: 60,
    minSize: 50,
    header: () => <span title="Warehouse/location ID" className="text-xs">WH</span>,
    cell: ({ row }) => {
      const warehouse = row.getValue('Warehouse') as string
      return warehouse ? (
        <Badge variant="secondary" className="font-mono text-xs">
          {warehouse}
        </Badge>
      ) : '-'
    },
  },
  {
    accessorKey: 'OnHand',
    size: 60,
    minSize: 50,
    header: ({ column }) => (
      <div
        title="Physical stock on hand"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="cursor-pointer select-none font-semibold text-xs text-left hover:text-foreground transition-colors"
      >
        OnHand
      </div>
    ),
    cell: ({ row }) => {
      const onHandRaw = row.getValue('OnHand') as number | null | undefined
      const safetyRaw = row.getValue('SafetyStock') as number | null | undefined
      const onHand = typeof onHandRaw === 'number' ? onHandRaw : 0
      const safety = typeof safetyRaw === 'number' ? safetyRaw : Number.POSITIVE_INFINITY
      const isBelowSafety = typeof onHandRaw === 'number' && typeof safetyRaw === 'number' && onHand < safety

      return (
        <div className={`text-left font-medium ${isBelowSafety ? 'text-red-600' : ''}`}>
          {typeof onHandRaw === 'number' ? onHand.toLocaleString() : '-'}
        </div>
      )
    },
    // Support a special filter value 'below-safety' using Available if present (matches view logic)
    filterFn: (row, columnId, filterValue) => {
      if (filterValue === 'below-safety') {
        const availRaw = row.getValue('Available') as number | null | undefined
        const onHandRaw = row.getValue('OnHand') as number | null | undefined
        const safetyRaw = row.getValue('SafetyStock') as number | null | undefined
        const minRaw = row.getValue('MinOnHand') as number | null | undefined
        const threshold = (typeof safetyRaw === 'number' && safetyRaw !== 0)
          ? safetyRaw
          : (typeof minRaw === 'number' && minRaw !== 0 ? minRaw : 0)
        const basis = (typeof availRaw === 'number') ? availRaw : (typeof onHandRaw === 'number' ? onHandRaw : 0)
        return basis < threshold
      }
      return true
    },
  },
  {
    accessorKey: 'Available',
    size: 60,
    minSize: 50,
    header: ({ column }) => (
      <div
        title="Available = OnHand − Reserved"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="cursor-pointer select-none font-semibold text-xs text-left hover:text-foreground transition-colors"
      >
        Avail
      </div>
    ),
    cell: ({ row }) => {
      const availRaw = row.getValue('Available') as number | null | undefined
      const avail = typeof availRaw === 'number' ? availRaw : 0
      return (
        <div className={`text-left font-medium ${avail < 0 ? 'text-red-600' : ''}`}>
          {typeof availRaw === 'number' ? avail.toLocaleString() : '-'}
        </div>
      )
    },
  },
  {
    accessorKey: 'SafetyStock',
    size: 50,
    minSize: 45,
    header: ({ column }) => (
      <div
        title="Safety stock threshold"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="cursor-pointer select-none font-semibold text-xs text-left hover:text-foreground transition-colors"
      >
        SS
      </div>
    ),
    cell: ({ row }) => {
      const safety = row.getValue('SafetyStock') as number | null | undefined
      return (
        <div className="text-left text-muted-foreground">
          {typeof safety === 'number' ? safety.toLocaleString() : '-'}
        </div>
      )
    },
  },
  {
    accessorKey: 'MinOnHand',
    size: 45,
    minSize: 40,
    header: ({ column }) => (
      <div
        title="Minimum on hand (reorder point)"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="cursor-pointer select-none font-semibold text-xs text-left hover:text-foreground transition-colors"
      >
        Min
      </div>
    ),
    cell: ({ row }) => {
      const minOnHand = row.getValue('MinOnHand') as number | null | undefined
      return (
        <div className="text-left text-muted-foreground">
          {typeof minOnHand === 'number' ? minOnHand.toLocaleString() : '-'}
        </div>
      )
    },
  },
  {
    accessorKey: 'InboundQty',
    size: 60,
    minSize: 50,
    header: ({ column }) => (
      <div
        title="Inbound quantity due within the planning horizon"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="cursor-pointer select-none font-semibold text-xs text-left hover:text-foreground transition-colors"
      >
        Inb
      </div>
    ),
    cell: ({ row }) => {
      const inboundRaw = row.getValue('InboundQty') as number | null | undefined
      const inbound = typeof inboundRaw === 'number' ? inboundRaw : 0
      return (
        <div className={`text-left font-medium ${inbound > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
          {inbound > 0 ? inbound.toLocaleString() : '-'}
        </div>
      )
    },
  },
  {
    accessorKey: 'NextETA',
    size: 70,
    minSize: 60,
    header: () => <span title="Earliest inbound ETA within horizon" className="text-xs">ETA</span>,
    cell: ({ row }) => {
      const eta = row.getValue('NextETA') as string | null
      if (!eta) return <div className="text-xs text-muted-foreground">-</div>

      const d = new Date(eta)
      const today = new Date()
      // Normalize to local date (00:00)
      const dayMs = 1000 * 60 * 60 * 24
      const norm = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
      const diffDays = Math.round((norm(d) - norm(today)) / dayMs)

      const base =
        diffDays < 0 ? `${Math.abs(diffDays)}d overdue` :
        diffDays === 0 ? 'Today' :
        diffDays === 1 ? 'Tomorrow' :
        diffDays < 7 ? `${diffDays}d` :
        diffDays < 30 ? `${Math.ceil(diffDays/7)}w` : `${Math.ceil(diffDays/30)}m`

      const cls = diffDays < 0 ? 'text-red-600' : diffDays === 0 ? 'text-amber-600' : 'text-muted-foreground'

      return (
        <div className={`text-xs font-semibold ${cls}`} title={formatDate(eta)}>
          {base}
        </div>
      )
    },
  },
  {
    accessorKey: 'DemandQty',
    size: 60,
    minSize: 50,
    header: ({ column }) => (
      <div
        title="Total demand quantity"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="cursor-pointer select-none font-semibold text-xs text-left hover:text-foreground transition-colors"
      >
        Dem
      </div>
    ),
    cell: ({ row }) => {
      const demandRaw = row.getValue('DemandQty') as number | null | undefined
      const demand = typeof demandRaw === 'number' ? demandRaw : 0
      return (
        <div className={`text-left font-medium ${demand > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
          {demand > 0 ? demand.toLocaleString() : '-'}
        </div>
      )
    },
  },
  {
    accessorKey: 'Gap',
    size: 50,
    minSize: 45,
    header: ({ column }) => (
      <div
        title="Shortfall = Demand − (OnHand + Inbound)"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="cursor-pointer select-none font-semibold text-xs text-left hover:text-foreground transition-colors"
      >
        Gap
      </div>
    ),
    cell: ({ row }) => {
      const gapRaw = row.getValue('Gap') as number | null | undefined
      const gap = typeof gapRaw === 'number' ? gapRaw : 0
      return (
        <div className={`text-left font-medium ${
          gap > 0 ? 'text-red-600' : 
          gap < 0 ? 'text-green-600' : 
          'text-muted-foreground'
        }`}>
          {typeof gapRaw === 'number' && gap !== 0 ? gap.toLocaleString() : '-'}
        </div>
      )
    },
    // Allow passing a predicate function as filter value
    filterFn: (row, columnId, filterValue) => {
      const v = row.getValue<number>(columnId)
      if (typeof filterValue === 'function') {
        try { return !!filterValue(v) } catch { return true }
      }
      if (filterValue === 'positive') return v > 0
      return true
    },
  },
  {
    accessorKey: 'CoverDays',
    size: 60,
    minSize: 50,
    header: ({ column }) => (
      <div
        title="(OnHand + Inbound) ÷ Avg Daily Demand"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="cursor-pointer select-none font-semibold text-xs text-left hover:text-foreground transition-colors"
      >
        Days
      </div>
    ),
    cell: ({ row }) => {
      const coverDays = row.getValue('CoverDays') as number | undefined
      const formatted = formatCoverDays(coverDays)
      
      return (
        <div className={`text-left font-medium ${
          !coverDays || coverDays === 0 ? 'text-red-600' :
          coverDays < 7 ? 'text-amber-600' :
          coverDays < 30 ? 'text-green-600' :
          'text-muted-foreground'
        }`}>
          {formatted}
        </div>
      )
    },
  },
  {
    accessorKey: 'Action',
    size: 80,
    minSize: 70,
    header: () => <span title="Planner action suggestion" className="font-semibold text-xs">Action</span>,
    cell: ({ row }) => {
      const action = row.getValue('Action') as SnapshotRow['Action']
      return <ActionBadge action={action} />
    },
    enableSorting: true,
    // Support special filter values: 'not-ok', 'critical', or specific action label
    filterFn: (row, columnId, filterValue) => {
      const action = row.getValue<string>(columnId)
      if (!filterValue) return true
      if (filterValue === 'not-ok') return action !== 'OK'
      if (filterValue === 'critical') {
        // Critical = Gap > 0 AND (InboundQty === 0 OR NextETA > 7 days)
        const rowData = row.original as SnapshotRow
        const hasGap = rowData.Gap > 0
        const noInbound = rowData.InboundQty === 0
        const lateInbound = rowData.NextETA ?
          (new Date(rowData.NextETA).getTime() - Date.now()) > (7 * 24 * 60 * 60 * 1000) :
          true // treat null ETA as late
        return hasGap && (noInbound || lateInbound)
      }
      return String(action).toLowerCase().includes(String(filterValue).toLowerCase())
    },
    sortingFn: (rowA, rowB) => {
      const actionPriority = {
        'Expedite': 4,
        'RaisePO': 3,
        'Transfer': 2,
        'Reallocate': 1,
        'OK': 0
      }
      const a = actionPriority[rowA.getValue('Action') as keyof typeof actionPriority] || 0
      const b = actionPriority[rowB.getValue('Action') as keyof typeof actionPriority] || 0
      return a - b
    },
  },
]
