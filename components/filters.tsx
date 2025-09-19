import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Filter, X, Sparkles } from 'lucide-react'
import { ApiFilters } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <div className="flex items-center justify-between mb-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-3 h-12 px-6 bg-background border border-muted/20 hover:border-muted transition-all duration-200"
          >
            <motion.div
              animate={{ rotate: showFilters ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Filter className="h-4 w-4" />
            </motion.div>
            <span className="font-medium">Filters</span>
            <AnimatePresence>
              {activeCount > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <Badge variant="secondary" className="ml-1 h-6 px-2 text-xs bg-primary/10 text-primary border-primary/20">
                    {activeCount}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>

        <AnimatePresence>
          {activeCount > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-10 px-4 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
              >
                <X className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="mb-6"
          >
            <Card className="border border-muted/20 bg-background overflow-hidden">
              {/* Top highlight */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

              <CardContent className="p-8">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
              {/* Site Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <label className="text-sm font-semibold text-foreground">Sites</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sites.map((site, index) => (
                    <motion.div
                      key={site}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Badge
                        variant={filters.site?.includes(site) ? "default" : "outline"}
                        className={`cursor-pointer transition-all duration-200 ${filters.site?.includes(site)
                          ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                          : 'bg-background/60 border-muted/30 hover:border-muted hover:bg-background'
                        }`}
                        onClick={() => toggleArrayFilter('site', site)}
                      >
                        {site}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Status Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <label className="text-sm font-semibold text-foreground">Status</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((status, index) => {
                    const isActive = filters.status?.includes(status)
                    return (
                      <motion.div
                        key={status}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge
                          variant={isActive ? "default" : "outline"}
                          className={`cursor-pointer text-xs transition-all duration-200 ${isActive
                            ? 'bg-blue-500/10 text-blue-700 border-blue-200 shadow-sm'
                            : 'bg-background/60 border-muted/30 hover:border-muted hover:bg-background'
                          }`}
                          onClick={() => toggleArrayFilter('status', status)}
                        >
                          {status}
                        </Badge>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Priority Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <label className="text-sm font-semibold text-foreground">Priority</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {priorities.map((priority, index) => {
                    const isActive = filters.priority === priority
                    const colors = {
                      'Critical': 'bg-red-500/10 text-red-700 border-red-200',
                      'High': 'bg-orange-500/10 text-orange-700 border-orange-200',
                      'Normal': 'bg-green-500/10 text-green-700 border-green-200',
                      'Low': 'bg-gray-500/10 text-gray-700 border-gray-200'
                    }
                    return (
                      <motion.div
                        key={priority}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge
                          variant={isActive ? "default" : "outline"}
                          className={`cursor-pointer transition-all duration-200 ${isActive
                            ? colors[priority] + ' shadow-sm'
                            : 'bg-background/60 border-muted/30 hover:border-muted hover:bg-background'
                          }`}
                          onClick={() => updateFilter('priority',
                            filters.priority === priority ? undefined : priority
                          )}
                        >
                          {priority}
                        </Badge>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Date Range Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <label className="text-sm font-semibold text-foreground">Date Range</label>
                </div>
                <div className="space-y-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <input
                      type="date"
                      value={filters.from ? filters.from.split('T')[0] : ''}
                      onChange={(e) => updateFilter('from', e.target.value ? `${e.target.value}T00:00:00Z` : undefined)}
                      className="w-full text-sm p-3 border border-muted/20 rounded-lg bg-background hover:border-muted focus:border-primary/50 transition-all duration-200"
                      placeholder="From"
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <input
                      type="date"
                      value={filters.to ? filters.to.split('T')[0] : ''}
                      onChange={(e) => updateFilter('to', e.target.value ? `${e.target.value}T23:59:59Z` : undefined)}
                      className="w-full text-sm p-3 border border-muted/20 rounded-lg bg-background hover:border-muted focus:border-primary/50 transition-all duration-200"
                      placeholder="To"
                    />
                  </motion.div>
                </div>
              </motion.div>
                </motion.div>

                {/* Special Filters */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  className="col-span-full flex items-center gap-6 mt-6 pt-6 border-t border-muted/20"
                >
                  <motion.label
                    className="flex items-center gap-3 cursor-pointer group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={filters.onlyExceptions || false}
                        onChange={(e) => updateFilter('onlyExceptions', e.target.checked || undefined)}
                        className="w-4 h-4 rounded border-muted/30 bg-background/60 focus:ring-primary/50 focus:ring-2 transition-all duration-200"
                      />
                      {filters.onlyExceptions && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        </motion.div>
                      )}
                    </div>
                    <span className="text-sm font-medium group-hover:text-foreground transition-colors">Only show exceptions</span>
                  </motion.label>

                  <AnimatePresence>
                    {filters.horizon !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center gap-3"
                      >
                        <label className="text-sm font-medium text-muted-foreground">Horizon (days):</label>
                        <motion.div whileHover={{ scale: 1.05 }}>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={filters.horizon}
                            onChange={(e) => updateFilter('horizon', parseInt(e.target.value) || 30)}
                            className="w-20 text-sm p-2 border border-muted/20 rounded-lg bg-background hover:border-muted focus:border-primary/50 transition-all duration-200 text-center font-medium"
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Display */}
      <AnimatePresence>
        {activeCount > 0 && !showFilters && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap gap-3 mb-6"
          >
            {filters.site?.map((site, index) => (
              <motion.div
                key={site}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
              >
                <Badge variant="secondary" className="gap-2 px-3 py-1.5 bg-primary/10 text-primary border-primary/20 shadow-sm">
                  <span className="font-medium">Site: {site}</span>
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                  >
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-primary/80 transition-colors"
                      onClick={() => toggleArrayFilter('site', site)}
                    />
                  </motion.div>
                </Badge>
              </motion.div>
            ))}
            {filters.status?.map((status, index) => (
              <motion.div
                key={status}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: (filters.site?.length || 0) * 0.05 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
              >
                <Badge variant="secondary" className="gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-700 border-blue-200 shadow-sm">
                  <span className="font-medium">{status}</span>
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                  >
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-blue-600/80 transition-colors"
                      onClick={() => toggleArrayFilter('status', status)}
                    />
                  </motion.div>
                </Badge>
              </motion.div>
            ))}
            {filters.priority && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
              >
                <Badge variant="secondary" className="gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-700 border-amber-200 shadow-sm">
                  <span className="font-medium">{filters.priority}</span>
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                  >
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-amber-600/80 transition-colors"
                      onClick={() => updateFilter('priority', undefined)}
                    />
                  </motion.div>
                </Badge>
              </motion.div>
            )}
            {filters.onlyExceptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
              >
                <Badge variant="secondary" className="gap-2 px-3 py-1.5 bg-red-500/10 text-red-700 border-red-200 shadow-sm">
                  <span className="font-medium">Exceptions only</span>
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                  >
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-600/80 transition-colors"
                      onClick={() => updateFilter('onlyExceptions', undefined)}
                    />
                  </motion.div>
                </Badge>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
