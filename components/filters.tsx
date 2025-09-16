import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Filter, X } from 'lucide-react'
import { ApiFilters } from '@/lib/types'

interface FiltersProps {
  filters: ApiFilters
  onFiltersChange: (filters: ApiFilters) => void
  sites?: string[]
  statuses?: string[]
  priorities?: string[]
  className?: string
}

export function Filters({ 
  filters, 
  onFiltersChange, 
  sites = [process.env.NEXT_PUBLIC_DEFAULT_SITE || 'L-QLD'],
  statuses = ['Unscheduled', 'Scheduled', 'InProgress', 'Completed', 'Posted', 'Canceled'],
  priorities = ['Critical', 'High', 'Normal', 'Low'],
  className 
}: FiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const updateFilter = (key: keyof ApiFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = (key: keyof ApiFilters, value: string) => {
    const currentValues = (filters[key] as string[]) || []
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    
    updateFilter(key, newValues.length > 0 ? newValues : undefined)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.site?.length) count++
    if (filters.status?.length) count++
    if (filters.priority) count++
    if (filters.from) count++
    if (filters.to) count++
    if (filters.onlyExceptions) count++
    return count
  }

  const activeCount = getActiveFilterCount()

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>
        )}
      </div>

      {showFilters && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Site Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Sites</label>
                <div className="flex flex-wrap gap-1">
                  {sites.map(site => (
                    <Badge
                      key={site}
                      variant={filters.site?.includes(site) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter('site', site)}
                    >
                      {site}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <div className="flex flex-wrap gap-1">
                  {statuses.map(status => (
                    <Badge
                      key={status}
                      variant={filters.status?.includes(status) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleArrayFilter('status', status)}
                    >
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <div className="flex flex-wrap gap-1">
                  {priorities.map(priority => (
                    <Badge
                      key={priority}
                      variant={filters.priority === priority ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => updateFilter('priority', 
                        filters.priority === priority ? undefined : priority
                      )}
                    >
                      {priority}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.from ? filters.from.split('T')[0] : ''}
                    onChange={(e) => updateFilter('from', e.target.value ? `${e.target.value}T00:00:00Z` : undefined)}
                    className="w-full text-xs p-2 border rounded"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={filters.to ? filters.to.split('T')[0] : ''}
                    onChange={(e) => updateFilter('to', e.target.value ? `${e.target.value}T23:59:59Z` : undefined)}
                    className="w-full text-xs p-2 border rounded"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>

            {/* Special Filters */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlyExceptions || false}
                  onChange={(e) => updateFilter('onlyExceptions', e.target.checked || undefined)}
                />
                <span className="text-sm">Only show exceptions</span>
              </label>

              {filters.horizon !== undefined && (
                <div className="flex items-center gap-2">
                  <label className="text-sm">Horizon (days):</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={filters.horizon}
                    onChange={(e) => updateFilter('horizon', parseInt(e.target.value) || 30)}
                    className="w-20 text-sm p-1 border rounded"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {activeCount > 0 && !showFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.site?.map(site => (
            <Badge key={site} variant="secondary" className="gap-1">
              Site: {site}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => toggleArrayFilter('site', site)}
              />
            </Badge>
          ))}
          {filters.status?.map(status => (
            <Badge key={status} variant="secondary" className="gap-1">
              {status}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => toggleArrayFilter('status', status)}
              />
            </Badge>
          ))}
          {filters.priority && (
            <Badge variant="secondary" className="gap-1">
              {filters.priority}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('priority', undefined)}
              />
            </Badge>
          )}
          {filters.onlyExceptions && (
            <Badge variant="secondary" className="gap-1">
              Exceptions only
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('onlyExceptions', undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
