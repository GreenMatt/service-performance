'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface EnhancedTableCellProps {
  children: ReactNode
  className?: string
  isNumeric?: boolean
  isCritical?: boolean
  isPositive?: boolean
  isNegative?: boolean
  hasAction?: boolean
  delay?: number
}

export function EnhancedTableCell({
  children,
  className,
  isNumeric = false,
  isCritical = false,
  isPositive = false,
  isNegative = false,
  hasAction = false,
  delay = 0
}: EnhancedTableCellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2, ease: "easeOut" }}
      className={cn(
        "relative transition-all duration-300",
        isNumeric && "font-mono tabular-nums",
        isCritical && "font-semibold",
        isPositive && "text-green-600 dark:text-green-400",
        isNegative && "text-red-600 dark:text-red-400",
        hasAction && "group-hover:scale-105",
        className
      )}
    >
      {/* Background glow for critical cells */}
      {isCritical && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-md -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.1, duration: 0.3 }}
        />
      )}

      {/* Content with micro-interaction */}
      <motion.div
        className="relative z-10"
        whileHover={hasAction ? { scale: 1.05 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {children}
      </motion.div>

      {/* Numeric value indicator */}
      {isNumeric && isCritical && (
        <motion.div
          className="absolute -right-1 -top-1 w-1.5 h-1.5 bg-primary rounded-full"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.2, type: "spring", stiffness: 300 }}
        />
      )}
    </motion.div>
  )
}