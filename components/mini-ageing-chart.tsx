'use client'

import { motion } from 'framer-motion'
import { AgeingBucket } from '@/lib/types'
import { getAgeingBucketColor } from '@/lib/kpi'

interface MiniAgeingChartProps {
  buckets: AgeingBucket[]
}

export function MiniAgeingChart({ buckets }: MiniAgeingChartProps) {
  const maxCount = Math.max(...buckets.map(b => b.count))
  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0)

  if (maxCount === 0) {
    return (
      <div className="flex items-center justify-center py-3 text-muted-foreground text-sm">
        No ageing data available
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Compact horizontal progress bars */}
      <div className="space-y-1.5">
        {buckets.map((bucket, index) => {
          if (bucket.count === 0) return null

          const percentage = (bucket.count / totalCount) * 100
          const color = getAgeingBucketColor(index)

          return (
            <motion.div
              key={bucket.label}
              className="flex items-center gap-2 group"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.25 }}
            >
              {/* Compact label */}
              <div className="w-10 text-xs font-medium text-muted-foreground text-right">
                {bucket.label}
              </div>

              {/* Thinner progress bar */}
              <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{
                    delay: index * 0.08 + 0.15,
                    duration: 0.4,
                    ease: "easeOut"
                  }}
                />
              </div>

              {/* Compact count */}
              <motion.div
                className="w-6 text-xs font-semibold text-right"
                style={{ color }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08 + 0.25 }}
              >
                {bucket.count}
              </motion.div>
            </motion.div>
          )
        })}
      </div>

      {/* Compact summary */}
      <motion.div
        className="flex justify-between items-center pt-1.5 border-t border-muted/15"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-xs font-bold text-foreground">{totalCount}</span>
      </motion.div>
    </div>
  )
}