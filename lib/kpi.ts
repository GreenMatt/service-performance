import { WorkOrder, SnapshotRow, AgeingBucket, KpiCardData } from './types';

// KPI calculations as specified in CLAUDE.md section 3

/**
 * Calculate Open Work Orders KPI
 * Count of work orders with Status ∈ {Open, InProgress, WaitingParts, Scheduled}
 */
export function calculateOpenWorkOrders(workOrders: WorkOrder[]): KpiCardData {
  const openStatuses = ['Unscheduled', 'InProgress', 'Scheduled'];
  const openWos = workOrders.filter(wo => openStatuses.includes(wo.Status));
  
  // Breakdown by status
  const breakdown = openWos.reduce((acc, wo) => {
    acc[wo.Status] = (acc[wo.Status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    value: openWos.length,
    breakdown,
    caption: `${openWos.length} open work orders`
  };
}

/**
 * Calculate Ageing of Work Orders KPI
 * AgeDays = DATEDIFF(day, CreatedDate, NOW) with configurable buckets
 */
export function calculateAgeingBuckets(workOrders: WorkOrder[]): AgeingBucket[] {
  const openStatuses = ['Unscheduled', 'InProgress', 'Scheduled'];
  const openWos = workOrders.filter(wo => openStatuses.includes(wo.Status));
  
  const buckets: AgeingBucket[] = [
    { label: '0-2 days', count: 0, minDays: 0, maxDays: 2 },
    { label: '3-7 days', count: 0, minDays: 3, maxDays: 7 },
    { label: '8-14 days', count: 0, minDays: 8, maxDays: 14 },
    { label: '15-30 days', count: 0, minDays: 15, maxDays: 30 },
    { label: '>30 days', count: 0, minDays: 31 }
  ];

  openWos.forEach(wo => {
    const ageDays = wo.AgeDays;
    
    if (ageDays <= 2) buckets[0].count++;
    else if (ageDays <= 7) buckets[1].count++;
    else if (ageDays <= 14) buckets[2].count++;
    else if (ageDays <= 30) buckets[3].count++;
    else buckets[4].count++;
  });

  return buckets;
}

/**
 * Calculate Parts Below Safety KPI
 * A part is Below Safety when OnHand < SafetyStock (per site/warehouse)
 */
export function calculatePartsBelowSafety(snapshot: SnapshotRow[]): KpiCardData {
  const belowSafety = snapshot.filter(row => row.OnHand < row.SafetyStock);
  
  // Breakdown by site
  const breakdown = belowSafety.reduce((acc, row) => {
    acc[row.Site] = (acc[row.Site] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    value: belowSafety.length,
    breakdown,
    caption: `${belowSafety.length} parts below safety stock`
  };
}

/**
 * Calculate Parts Below Safety with No Supply KPI
 * From PBS subset, select items with no inbound supply inside the planning horizon
 */
export function calculateBelowSafetyNoSupply(snapshot: SnapshotRow[]): KpiCardData {
  const belowSafetyNoSupply = snapshot.filter(row => 
    row.OnHand < row.SafetyStock && row.InboundQty === 0
  );
  
  // Breakdown by action type
  const breakdown = belowSafetyNoSupply.reduce((acc, row) => {
    acc[row.Action] = (acc[row.Action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    value: belowSafetyNoSupply.length,
    breakdown,
    caption: `${belowSafetyNoSupply.length} parts need immediate action`
  };
}

/**
 * Calculate Current Position Snapshot metrics
 * Returns summary stats for the CPS table
 */
export function calculateSnapshotSummary(snapshot: SnapshotRow[]): {
  totalItems: number;
  criticalItems: number;
  actionBreakdown: Record<string, number>;
  averageCoverDays: number;
} {
  const criticalItems = snapshot.filter(row => row.Action !== 'OK').length;
  
  const actionBreakdown = snapshot.reduce((acc, row) => {
    acc[row.Action] = (acc[row.Action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const itemsWithCoverDays = snapshot.filter(row => 
    row.CoverDays !== undefined && row.CoverDays !== null && row.CoverDays > 0
  );
  const averageCoverDays = itemsWithCoverDays.length > 0 
    ? itemsWithCoverDays.reduce((sum, row) => sum + (row.CoverDays || 0), 0) / itemsWithCoverDays.length
    : 0;

  return {
    totalItems: snapshot.length,
    criticalItems,
    actionBreakdown,
    averageCoverDays: Math.round(averageCoverDays)
  };
}

/**
 * Get worst ageing bucket value for KPI display
 */
export function getWorstAgeingBucket(buckets: AgeingBucket[]): { label: string; count: number } {
  // Find the bucket with the highest age that has items
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].count > 0) {
      return {
        label: buckets[i].label,
        count: buckets[i].count
      };
    }
  }
  return { label: '0-2 days', count: 0 };
}

/**
 * Calculate 7-day trend for work orders (simplified version for demo)
 * In production, this would compare current vs last week
 */
export function calculateWeeklyTrend(workOrders: WorkOrder[]): { 
  opensThisWeek: number; 
  closedThisWeek: number; 
  netChange: number;
  trendDirection: 'up' | 'down' | 'flat';
} {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const opensThisWeek = workOrders.filter(wo => {
    const createdDate = new Date(wo.CreatedDate);
    return createdDate >= weekAgo && createdDate <= today;
  }).length;

  const closedThisWeek = workOrders.filter(wo => {
    if (!wo.ClosedDate) return false;
    const closedDate = new Date(wo.ClosedDate);
    return closedDate >= weekAgo && closedDate <= today;
  }).length;

  const netChange = opensThisWeek - closedThisWeek;
  
  let trendDirection: 'up' | 'down' | 'flat' = 'flat';
  if (netChange > 0) trendDirection = 'up';
  else if (netChange < 0) trendDirection = 'down';

  return {
    opensThisWeek,
    closedThisWeek,
    netChange,
    trendDirection
  };
}

/**
 * Get color for ageing bucket visualization
 */
export function getAgeingBucketColor(bucketIndex: number): string {
  const colors = [
    '#10b981', // green - 0-2 days
    '#f59e0b', // amber - 3-7 days  
    '#ef4444', // red - 8-14 days
    '#dc2626', // dark red - 15-30 days
    '#991b1b'  // darker red - >30 days
  ];
  return colors[bucketIndex] || '#6b7280';
}

/**
 * Get color for action badge
 */
export function getActionBadgeColor(action: string): string {
  const colors = {
    'OK': '#10b981',
    'Expedite': '#f59e0b', 
    'Transfer': '#06b6d4',
    'RaisePO': '#ef4444',
    'Reallocate': '#8b5cf6'
  };
  return colors[action as keyof typeof colors] || '#6b7280';
}

/**
 * Format cover days for display
 */
export function formatCoverDays(coverDays?: number): string {
  if (coverDays === undefined || coverDays === null) return '-';
  if (coverDays === 0) return '0d';
  if (coverDays > 999) return '∞';
  return `${Math.round(coverDays)}d`;
}

/**
 * Determine priority color
 */
export function getPriorityColor(priority: string): string {
  const colors = {
    'Critical': '#dc2626',
    'High': '#ea580c',
    'Normal': '#65a30d', 
    'Low': '#6b7280'
  };
  return colors[priority as keyof typeof colors] || '#6b7280';
}
