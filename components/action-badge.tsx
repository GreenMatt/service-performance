import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getActionBadgeColor } from "@/lib/kpi"

interface ActionBadgeProps {
  action: 'OK' | 'Expedite' | 'Transfer' | 'RaisePO' | 'Reallocate'
  className?: string
}

export function ActionBadge({ action, className }: ActionBadgeProps) {
  const getVariant = (action: string) => {
    switch (action) {
      case 'OK':
        return 'ok' as const
      case 'Expedite':
        return 'expedite' as const
      case 'Transfer':
        return 'transfer' as const
      case 'RaisePO':
        return 'raisePo' as const
      case 'Reallocate':
        return 'reallocate' as const
      default:
        return 'secondary' as const
    }
  }

  const getLabel = (action: string) => {
    switch (action) {
      case 'RaisePO':
        return 'Order/Transfer'
      default:
        return action
    }
  }

  return (
    <Badge 
      variant={getVariant(action)} 
      className={cn("font-medium", className)}
    >
      {getLabel(action)}
    </Badge>
  )
}
