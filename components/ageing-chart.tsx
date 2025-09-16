import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AgeingBucket } from '@/lib/types'
import { getAgeingBucketColor } from '@/lib/kpi'

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
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="label" 
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">
                    Count: <span className="font-medium text-foreground">{data.count}</span>
                  </p>
                </div>
              )
            }
            return null
          }}
        />
        <Bar 
          dataKey="count" 
          radius={[4, 4, 0, 0]}
          onClick={handleBarClick}
          className={onBucketClick ? "cursor-pointer" : ""}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}