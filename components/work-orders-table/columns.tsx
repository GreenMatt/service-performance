'use client'

import { ColumnDef } from '@tanstack/react-table'
import { WorkOrder } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ArrowUpDown } from 'lucide-react'

export const columns: ColumnDef<WorkOrder>[] = [
  {
    accessorKey: 'WorkOrderId',
    header: ({ column }) => (
      <Button title="Work Order number" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2 -ml-2">
        Work Order
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{row.getValue('WorkOrderId')}</span>
    ),
  },
  {
    accessorKey: 'Status',
    header: ({ column }) => (
      <Button title="Lifecycle state" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2 -ml-2">
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true
      return String(row.getValue(columnId)) === String(filterValue)
    },
  },
  {
    accessorKey: 'Priority',
    header: ({ column }) => (
      <Button title="Urgency level" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2 -ml-2">
        Priority
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'Site',
    header: ({ column }) => (
      <Button title="Site / branch" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2 -ml-2">
        Site
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'Technician',
    header: () => <span title="Assigned technician">Technician</span>,
    cell: ({ row }) => (
      <span className="text-sm">{row.getValue('Technician') || '-'}</span>
    ),
  },
  {
    accessorKey: 'CreatedDate',
    header: ({ column }) => (
      <Button title="Created date" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
        Created
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const iso = row.getValue('CreatedDate') as string
      return <span className="text-sm">{iso ? new Date(iso).toLocaleDateString() : '-'}</span>
    }
  },
  {
    accessorKey: 'StartDate',
    header: ({ column }) => (
      <Button title="When work actually started" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
        Started
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const iso = row.getValue('StartDate') as string | null
      return <span className="text-sm">{iso ? new Date(iso).toLocaleDateString() : '-'}</span>
    }
  },
  {
    accessorKey: 'AgeDays',
    header: ({ column }) => (
      <Button title="Age in days" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
        Age (d)
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const age = row.getValue('AgeDays') as number
      return <span className="text-sm font-medium">{typeof age === 'number' ? age.toLocaleString() : '-'}</span>
    },
    filterFn: (row, columnId, filterValue) => {
      const age = row.getValue<number>('AgeDays')
      switch (filterValue) {
        case '0-2d': return age <= 2
        case '3-7d': return age >= 3 && age <= 7
        case '8-14d': return age >= 8 && age <= 14
        case '15-30d': return age >= 15 && age <= 30
        case '>30d': return age >= 31
        default: return true
      }
    }
  },
  {
    accessorKey: 'PromisedDate',
    header: () => <span title="Promised/need-by date">Promised</span>,
    cell: ({ row }) => {
      const iso = row.getValue('PromisedDate') as string | null
      return <span className="text-sm">{iso ? new Date(iso).toLocaleDateString() : '-'}</span>
    }
  },
  {
    accessorKey: 'ClosedDate',
    header: () => <span title="Closed date">Closed</span>,
    cell: ({ row }) => {
      const iso = row.getValue('ClosedDate') as string | null
      return <span className="text-sm">{iso ? new Date(iso).toLocaleDateString() : '-'}</span>
    }
  },
]
