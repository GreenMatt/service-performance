import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { KpiCardData } from "@/lib/types"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface KpiCardProps {
  title: string
  data: KpiCardData
  onClick?: () => void
  className?: string
  color?: string
  hint?: string
}

export function KpiCard({ title, data, onClick, className, color = "text-primary", hint }: KpiCardProps) {
  const { value, delta, deltaType, caption, breakdown } = data

  return (
    <Card 
      className={cn(
        "dashboard-card transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground" title={hint}>{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className={cn("text-3xl font-bold tracking-tight", color)}>
                {value.toLocaleString()}
              </p>
              {delta !== undefined && (
                <div className="flex items-center space-x-1">
                  {deltaType === 'increase' ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : deltaType === 'decrease' ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    deltaType === 'increase' ? "text-red-500" :
                    deltaType === 'decrease' ? "text-green-500" :
                    "text-muted-foreground"
                  )}>
                    {Math.abs(delta).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            {caption && (
              <p className="text-sm text-muted-foreground">{caption}</p>
            )}
          </div>
        </div>
        
        {breakdown && Object.keys(breakdown).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {Object.entries(breakdown).map(([key, count]) => (
              <Badge key={key} variant="secondary" className="text-xs">
                {key}: {Number(count).toLocaleString()}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
