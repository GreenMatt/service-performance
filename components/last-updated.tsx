'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { formatLastUpdated } from '@/lib/date'
import { cn } from '@/lib/utils'

interface LastUpdatedProps {
  timestamp?: Date
  className?: string
}

export function LastUpdated({ timestamp, className }: LastUpdatedProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={cn("flex items-center text-xs text-muted-foreground", className)}>
        <Clock className="h-3 w-3 mr-1" />
        Last updated: --:--:--
      </div>
    )
  }

  return (
    <div className={cn("flex items-center text-xs text-muted-foreground", className)}>
      <Clock className="h-3 w-3 mr-1" />
      Last updated: {formatLastUpdated(timestamp)}
    </div>
  )
}