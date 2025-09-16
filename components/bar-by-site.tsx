import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { WorkOrder } from '@/lib/types'
import { getPriorityColor } from '@/lib/kpi'

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
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="site" 
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
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-medium mb-2">Site: {label}</p>
                  {payload.map((entry, index) => (
                    <p key={index} className="text-sm">
                      <span 
                        className="inline-block w-3 h-3 rounded mr-2" 
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.dataKey}: <span className="font-medium">{entry.value}</span>
                    </p>
                  ))}
                </div>
              )
            }
            return null
          }}
        />
        <Legend />
        {categoryArray.map((category) => (
          <Bar
            key={category}
            dataKey={category}
            fill={getBarColor(category)}
            radius={[2, 2, 0, 0]}
            onClick={(data) => handleBarClick(data, category)}
            className={onBarClick ? "cursor-pointer" : ""}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}