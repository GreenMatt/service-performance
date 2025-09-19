import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { WorkOrder } from '@/lib/types'
import { getPriorityColor } from '@/lib/kpi'
import { motion } from 'framer-motion'

interface BarBySiteProps {
  workOrders: WorkOrder[]
  groupBy?: 'priority' | 'status'
  onBarClick?: (site: string, category: string) => void
  height?: number
}

export function BarBySite({ 
  workOrders, 
  groupBy = 'priority', 
  onBarClick, 
  height = 250 
}: BarBySiteProps) {
  // Group data by site and category
  const groupedData = workOrders.reduce((acc, wo) => {
    const site = wo.Site
    const category = groupBy === 'priority' ? wo.Priority : wo.Status
    
    if (!acc[site]) {
      acc[site] = {}
    }
    if (!acc[site][category]) {
      acc[site][category] = 0
    }
    acc[site][category]++
    
    return acc
  }, {} as Record<string, Record<string, number>>)

  // Convert to chart data format
  const sites = Object.keys(groupedData)
  const categories = new Set<string>()
  
  Object.values(groupedData).forEach(siteData => {
    Object.keys(siteData).forEach(category => categories.add(category))
  })

  const data = sites.map(site => {
    const siteData = { site }
    categories.forEach(category => {
      siteData[category] = groupedData[site][category] || 0
    })
    return siteData
  })

  const categoryArray = Array.from(categories)

  const getBarColor = (category: string) => {
    if (groupBy === 'priority') {
      return getPriorityColor(category)
    }
    // Status colors
    const statusColors = {
      'Open': '#ef4444',
      'InProgress': '#f59e0b',
      'WaitingParts': '#dc2626',
      'Scheduled': '#10b981',
      'Closed': '#6b7280',
      'Cancelled': '#6b7280'
    }
    return statusColors[category] || '#6b7280'
  }

  const handleBarClick = (data: any, category: string) => {
    if (onBarClick) {
      onBarClick(data.site, category)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
    >
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/3 via-transparent to-accent/3 rounded-lg pointer-events-none" />

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
        <CartesianGrid strokeDasharray="2 4" opacity={0.1} stroke="hsl(var(--muted-foreground))" />
        <XAxis
          dataKey="site"
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
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="bg-background border border-muted/20 rounded-xl p-4 max-w-xs"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <p className="font-bold text-foreground">Site: {label}</p>
                  </div>
                  <div className="space-y-2">
                    {payload.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-sm text-muted-foreground">{entry.dataKey}:</span>
                        </div>
                        <span className="font-bold text-foreground text-sm">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 h-0.5 bg-gradient-to-r from-primary/50 to-transparent rounded" />
                </motion.div>
              )
            }
            return null
          }}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '20px',
            fontSize: '12px',
            fontWeight: '500'
          }}
        />
        {categoryArray.map((category, index) => (
          <Bar
            key={category}
            dataKey={category}
            fill={getBarColor(category)}
            radius={[6, 6, 0, 0]}
            onClick={(data) => handleBarClick(data, category)}
            className={onBarClick ? "cursor-pointer" : ""}
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
              transition: 'all 0.2s ease'
            }}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
    </motion.div>
  )
}