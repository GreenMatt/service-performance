import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AgeingBucket } from '@/lib/types'
import { getAgeingBucketColor } from '@/lib/kpi'
import { motion } from 'framer-motion'

interface AgeingChartProps {
  buckets: AgeingBucket[]
  onBucketClick?: (bucket: AgeingBucket) => void
  height?: number
}

export function AgeingChart({ buckets, onBucketClick, height = 200 }: AgeingChartProps) {
  const data = buckets.map((bucket, index) => ({
    ...bucket,
    index,
    color: getAgeingBucketColor(index)
  }))

  const handleBarClick = (entry: any) => {
    if (onBucketClick) {
      const bucket = buckets[entry.index]
      onBucketClick(bucket)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
    >
      {/* Gradient overlay for premium look */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-lg pointer-events-none" />

      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="hsl(var(--muted-foreground))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          className="text-muted-foreground"
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="bg-background border border-muted/20 rounded-xl p-4"
                >
                  <p className="font-semibold text-foreground mb-1">{label}</p>
                  <p className="text-sm text-muted-foreground">
                    Count: <span className="font-bold text-foreground text-lg ml-1">{data.count}</span>
                  </p>
                  <div className="mt-2 h-0.5 bg-gradient-to-r from-primary/50 to-transparent rounded" />
                </motion.div>
              )
            }
            return null
          }}
        />
        <Bar
          dataKey="count"
          radius={[8, 8, 0, 0]}
          onClick={handleBarClick}
          className={onBucketClick ? "cursor-pointer" : ""}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              style={{
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </motion.div>
  )
}