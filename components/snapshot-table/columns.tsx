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
    size: 36,
    minSize: 32,
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
    size: 160,
    minSize: 120,
    header: ({ column }) => (
      <Button
        variant="ghost"
        title="Part or item identifier"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-8 px-2 -ml-2"
      >
        Item ID
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
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
    size: 90,
    minSize: 80,
    header: ({ column }) => (
      <Button
        variant="ghost"
        title="Site code"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-8 px-2 -ml-2"
      >
        Site
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
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
    size: 100,
    minSize: 80,
    header: () => <span title="Warehouse/location ID">Warehouse</span>,
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
    size: 90,
    minSize: 80,
    header: ({ column }) => (
      <Button
        variant="ghost"
        title="Physical stock on hand"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-8 px-2 -ml-2"
      >
        On Hand
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const onHandRaw = row.getValue('OnHand') as number | null | undefined
      const safetyRaw = row.getValue('SafetyStock') as number | null | undefined
      const onHand = typeof onHandRaw === 'number' ? onHandRaw : 0
      const safety = typeof safetyRaw === 'number' ? safetyRaw : Number.POSITIVE_INFINITY
      const isBelowSafety = typeof onHandRaw === 'number' && typeof safetyRaw === 'number' && onHand < safety

      return (
        <div className={`text-right font-medium ${isBelowSafety ? 'text-red-600' : ''}`}>
          {typeof onHandRaw === 'number' ? onHand.toLocaleString() : '-'}
        </div>
      )
    },
    // Support a special filter value 'below-safety'
    filterFn: (row, columnId, filterValue) => {
      if (filterValue === 'below-safety') {
        const onHandRaw = row.getValue('OnHand') as number | null | undefined
        const safetyRaw = row.getValue('SafetyStock') as number | null | undefined
        if (typeof onHandRaw !== 'number' || typeof safetyRaw !== 'number') return false
        return onHandRaw < safetyRaw
      }
      return true
    },
  },
  {
    accessorKey: 'SafetyStock',
    size: 80,
    minSize: 70,
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          title="Safety stock threshold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Safety
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const safety = row.getValue('SafetyStock') as number | null | undefined
      return (
        <div className="text-right text-muted-foreground">
          {typeof safety === 'number' ? safety.toLocaleString() : '-'}
        </div>
      )
    },
  },
  {
    accessorKey: 'MinOnHand',
    size: 70,
    minSize: 60,
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          title="Minimum on hand (reorder point)"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Min
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const minOnHand = row.getValue('MinOnHand') as number | null | undefined
      return (
        <div className="text-right text-muted-foreground">
          {typeof minOnHand === 'number' ? minOnHand.toLocaleString() : '-'}
        </div>
      )
    },
  },
  {
    accessorKey: 'InboundQty',
    size: 90,
    minSize: 80,
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          title="Inbound quantity due within the planning horizon"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Inbound
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const inboundRaw = row.getValue('InboundQty') as number | null | undefined
      const inbound = typeof inboundRaw === 'number' ? inboundRaw : 0
      return (
        <div className={`text-right font-medium ${inbound > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
          {inbound > 0 ? inbound.toLocaleString() : '-'}
        </div>
      )
    },
  },
  {
    accessorKey: 'NextETA',
    size: 110,
    minSize: 100,
    header: () => <span title="Earliest inbound ETA within horizon">Next ETA</span>,
    cell: ({ row }) => {
      const eta = row.getValue('NextETA') as string | null
      return (
        <div className="text-sm">
          {eta ? formatDate(eta) : '-'}
        </div>
      )
    },
  },
  {
    accessorKey: 'DemandQty',
    size: 90,
    minSize: 80,
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          title="Total demand quantity"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Demand
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const demandRaw = row.getValue('DemandQty') as number | null | undefined
      const demand = typeof demandRaw === 'number' ? demandRaw : 0
      return (
        <div className={`text-right font-medium ${demand > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
          {demand > 0 ? demand.toLocaleString() : '-'}
        </div>
      )
    },
  },
  {
    accessorKey: 'Gap',
    size: 80,
    minSize: 70,
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          title="Shortfall = Demand − (OnHand + Inbound)"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Gap
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const gapRaw = row.getValue('Gap') as number | null | undefined
      const gap = typeof gapRaw === 'number' ? gapRaw : 0
      return (
        <div className={`text-right font-medium ${
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
    size: 100,
    minSize: 90,
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          title="(OnHand + Inbound) ÷ Avg Daily Demand"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Cover Days
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const coverDays = row.getValue('CoverDays') as number | undefined
      const formatted = formatCoverDays(coverDays)
      
      return (
        <div className={`text-right font-medium ${
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
    size: 110,
    minSize: 90,
    header: () => <span title="Planner action suggestion">Action</span>,
    cell: ({ row }) => {
      const action = row.getValue('Action') as SnapshotRow['Action']
      return <ActionBadge action={action} />
    },
    enableSorting: true,
    // Support special filter values: 'not-ok' or specific action label
    filterFn: (row, columnId, filterValue) => {
      const action = row.getValue<string>(columnId)
      if (!filterValue) return true
      if (filterValue === 'not-ok') return action !== 'OK'
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
