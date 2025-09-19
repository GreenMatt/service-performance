import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { KpiCardData } from "@/lib/types"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { formatCompactCurrency, formatCompactNumber } from "@/lib/format"

interface KpiCardProps {
  title: string
  data: KpiCardData
  onClick?: () => void
  className?: string
  color?: string
  hint?: string
}

export function KpiCard({ title, data, onClick, className, color = "text-primary", hint }: KpiCardProps) {
  const { value, delta, deltaType, caption, breakdown, customContent } = data

  // Determine if this card should use compact formatting
  const useCompactFormat = [
    'Open WIP Value',
    'Parts Cost',
    'Month-to-Date Revenue',
    'Labour and Other Costs'
  ].includes(title);

  // Format the display value
  const displayValue = useCompactFormat
    ? (title === 'Month-to-Date Revenue' || title === 'Open WIP Value' || title === 'Labour and Other Costs' || title === 'Parts Cost'
        ? formatCompactCurrency(value)
        : formatCompactNumber(value))
    : value.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{
        scale: 1.01,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      }}
      whileTap={{ scale: 0.99 }}
    >
      <Card
        className={cn(
          // Exact outline to match Dashboard Overview
          "relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 h-full flex flex-col",
          onClick && "cursor-pointer group",
          className
        )}
        onClick={onClick}
      >
        <CardContent className="relative p-6 flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-4 flex-1">
            {/* Title with icon - Fixed height to prevent alignment issues */}
            <div className="flex items-start gap-3 min-h-[3rem] h-12">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="opacity-20 group-hover:opacity-40 transition-opacity duration-300 flex-shrink-0 mt-0.5"
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </motion.div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider leading-tight" title={hint}>
                {title}
              </p>
            </div>

            {/* Value with enhanced styling */}
            <div className="flex items-baseline space-x-3">
              <motion.p
                className={cn("text-4xl font-semibold tracking-tight", color)}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                {displayValue}
              </motion.p>

              {/* Enhanced delta indicator */}
              {delta !== undefined && (
                <motion.div
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-full"
                  style={{
                    background: deltaType === 'increase'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : deltaType === 'decrease'
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(107, 114, 128, 0.1)'
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div
                    animate={{
                      y: deltaType === 'increase' ? [-1, 1, -1] :
                         deltaType === 'decrease' ? [1, -1, 1] : [0]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {deltaType === 'increase' ? (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : deltaType === 'decrease' ? (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </motion.div>
                  <span className={cn(
                    "text-sm font-bold",
                    deltaType === 'increase' ? "text-red-600" :
                    deltaType === 'decrease' ? "text-green-600" :
                    "text-muted-foreground"
                  )}>
                    {Math.abs(delta).toLocaleString()}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Caption with fade-in */}
            {caption && (
              <motion.p
                className="text-sm text-muted-foreground/80 font-medium"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {caption}
              </motion.p>
            )}
          </div>

          {/* Spacer to balance layout */}
          <div className="w-1 h-16 opacity-0" />
        </div>
        
        {/* Enhanced breakdown badges or custom content */}
        {customContent ? (
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.4 }}
          >
            {customContent}
          </motion.div>
        ) : null}

        {/* Enhanced breakdown badges */}
        {!customContent && breakdown && Object.keys(breakdown).length > 0 && (
          <motion.div
            className="mt-6 pt-4 border-t border-muted/20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.4 }}
          >
            <div className="flex flex-wrap gap-2">
              {Object.entries(breakdown).map(([key, count], index) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 1.1 + index * 0.1, type: "spring", stiffness: 200 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <Badge
                    variant="secondary"
                    className="text-xs px-3 py-1.5 bg-gradient-to-r from-muted/50 to-muted/30 border border-muted/20 shadow-sm hover:shadow-md transition-all duration-200 font-semibold"
                  >
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="ml-1 text-foreground font-bold">{Number(count).toLocaleString()}</span>
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
    </motion.div>
  )
}
