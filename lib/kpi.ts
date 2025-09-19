import { WorkOrder, SnapshotRow, AgeingBucket, KpiCardData } from './types';
import { formatCompactCurrency, formatCompactNumber } from './format';

// KPI calculations as specified in CLAUDE.md section 3

/**
 * Calculate Open Work Orders KPI
 * Count of work orders with Status ∈ {Open, InProgress, WaitingParts, Scheduled}
 */
export function calculateOpenWorkOrders(workOrders: WorkOrder[]): KpiCardData {
  const openStatuses = ['Unscheduled', 'InProgress', 'Scheduled', 'Completed'];
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
  const openStatuses = ['Unscheduled', 'InProgress', 'Scheduled', 'Completed'];
  const openWos = workOrders.filter(wo => openStatuses.includes(wo.Status));

  const buckets: AgeingBucket[] = [
    { label: '0-14d', count: 0, minDays: 0, maxDays: 14 },
    { label: '14-30d', count: 0, minDays: 14, maxDays: 30 },
    { label: '30-60d', count: 0, minDays: 30, maxDays: 60 },
    { label: '>60d', count: 0, minDays: 60 }
  ];

  openWos.forEach(wo => {
    const ageDays = wo.AgeDays;

    if (ageDays < 14) buckets[0].count++;
    else if (ageDays < 30) buckets[1].count++;
    else if (ageDays < 60) buckets[2].count++;
    else buckets[3].count++;
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
 * Calculate Critical Items KPI
 * Count items that actually block work: Gap > 0 AND (InboundQty === 0 OR NextETA > 7 days)
 */
export function calculateCriticalItems(snapshot: SnapshotRow[]): KpiCardData {
  const critical = snapshot.filter(row => {
    const hasGap = row.Gap > 0;
    const noInbound = row.InboundQty === 0;
    const lateInbound = row.NextETA ?
      (new Date(row.NextETA).getTime() - Date.now()) > (7 * 24 * 60 * 60 * 1000) :
      true; // treat null ETA as late

    return hasGap && (noInbound || lateInbound);
  });

  const breakdown = critical.reduce((acc, row) => {
    // Map actions to user-friendly labels
    let label = row.Action;
    if (row.Action === 'RaisePO') label = 'Order';
    if (row.Action === 'Transfer') label = 'Transfer';
    if (row.Action === 'Expedite') label = 'Expedite';
    if (row.Action === 'Reallocate') label = 'Reallocate';

    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    value: critical.length,
    breakdown,
    caption: `${critical.length} items blocking work`,
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
 * Calculate Month-to-Date Revenue from posted work orders
 */
export function calculateMonthToDateRevenue(workOrders: WorkOrder[]): KpiCardData & {
  breakdownByWeek: { week: string; revenue: number }[];
  breakdownBySite: Record<string, { revenue: number; count: number }>;
  breakdownByServiceType: Record<string, { revenue: number; count: number }>;
} {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Only include Posted work orders that were closed this month
  const mtdPostedOrders = workOrders.filter(wo => {
    if (wo.Status !== 'Posted' || !wo.ClosedDate) return false;
    const closedDate = new Date(wo.ClosedDate);
    return closedDate >= startOfMonth && closedDate <= endOfMonth;
  });

  if (mtdPostedOrders.length === 0) {
    return {
      value: 0,
      caption: 'No posted work orders this month',
      breakdownByWeek: [],
      breakdownBySite: {},
      breakdownByServiceType: {}
    };
  }

  const totalRevenue = mtdPostedOrders.reduce((sum, wo) => sum + (wo.TotalAmount || 0), 0);

  // Breakdown by week within the month
  const weeklyBreakdown: { week: string; revenue: number }[] = [];
  const weeksInMonth = Math.ceil((endOfMonth.getDate() - startOfMonth.getDate() + 1) / 7);

  for (let week = 1; week <= weeksInMonth; week++) {
    const weekStart = new Date(startOfMonth.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(Math.min(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000, endOfMonth.getTime()));

    const weekRevenue = mtdPostedOrders
      .filter(wo => {
        const closedDate = new Date(wo.ClosedDate!);
        return closedDate >= weekStart && closedDate <= weekEnd;
      })
      .reduce((sum, wo) => sum + (wo.TotalAmount || 0), 0);

    weeklyBreakdown.push({
      week: `Week ${week}`,
      revenue: weekRevenue
    });
  }

  // Breakdown by site
  const siteBreakdown: Record<string, { revenue: number; count: number }> = {};
  const sites = [...new Set(mtdPostedOrders.map(wo => wo.Site))];
  sites.forEach(site => {
    const siteOrders = mtdPostedOrders.filter(wo => wo.Site === site);
    const siteRevenue = siteOrders.reduce((sum, wo) => sum + (wo.TotalAmount || 0), 0);
    siteBreakdown[site] = {
      revenue: siteRevenue,
      count: siteOrders.length
    };
  });

  // Breakdown by service type
  const serviceTypeBreakdown: Record<string, { revenue: number; count: number }> = {};
  const serviceTypes = [...new Set(mtdPostedOrders.map(wo => wo.ServiceType))];
  serviceTypes.forEach(serviceType => {
    const serviceTypeOrders = mtdPostedOrders.filter(wo => wo.ServiceType === serviceType);
    const serviceTypeRevenue = serviceTypeOrders.reduce((sum, wo) => sum + (wo.TotalAmount || 0), 0);
    serviceTypeBreakdown[serviceType] = {
      revenue: serviceTypeRevenue,
      count: serviceTypeOrders.length
    };
  });

  const monthName = now.toLocaleDateString('en-US', { month: 'long' });

  return {
    value: Math.round(totalRevenue),
    caption: `${monthName} revenue from ${mtdPostedOrders.length} posted orders`,
    breakdownByWeek: weeklyBreakdown,
    breakdownBySite: siteBreakdown,
    breakdownByServiceType: serviceTypeBreakdown
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
  return { label: '0-14 days', count: 0 };
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
    '#10b981', // green - 0-14 days (good)
    '#f59e0b', // amber - 14-30 days (caution)
    '#ef4444', // red - 30-60 days (concerning)
    '#991b1b'  // dark red - >60 days (critical)
  ];
  return colors[bucketIndex] || '#6b7280';
}

/**
 * Calculate Average Resolution Time KPI
 * Mean days from CreatedDate to ClosedDate for completed work orders
 */
export function calculateAverageResolutionTime(workOrders: WorkOrder[]): KpiCardData & {
  trendData: { period: string; avgDays: number }[];
  breakdownByPriority: Record<string, { avgDays: number; count: number }>;
  breakdownBySite: Record<string, { avgDays: number; count: number }>;
  breakdownByTechnician: Record<string, { avgDays: number; count: number }>;
} {
  const completedWos = workOrders.filter(wo =>
    wo.Status === 'Posted' && wo.ClosedDate && wo.CreatedDate
  );

  if (completedWos.length === 0) {
    return {
      value: 0,
      caption: 'No completed work orders',
      trendData: [],
      breakdownByPriority: {},
      breakdownBySite: {},
      breakdownByTechnician: {}
    };
  }

  // Calculate resolution times (must have both StartDate and ClosedDate)
  const workOrdersWithBothDates = completedWos.filter(wo => wo.StartDate && wo.ClosedDate);

  if (workOrdersWithBothDates.length === 0) {
    return {
      value: 0,
      caption: 'No completed work orders with start and end dates',
      breakdown: {},
      trendData: [],
      breakdownByPriority: {},
      breakdownBySite: {},
      breakdownByTechnician: {}
    };
  }

  const resolutionTimes = workOrdersWithBothDates.map(wo => {
    const startDate = new Date(wo.StartDate!);
    const closed = new Date(wo.ClosedDate!);
    const days = Math.max(0, Math.round((closed.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    return { ...wo, resolutionDays: days };
  });

  // Overall average
  const totalDays = resolutionTimes.reduce((sum, wo) => sum + wo.resolutionDays, 0);
  const avgResolutionTime = Math.round((totalDays / resolutionTimes.length) * 10) / 10;

  // Breakdown by Priority
  const breakdownByPriority = resolutionTimes.reduce((acc, wo) => {
    const priority = wo.Priority;
    if (!acc[priority]) acc[priority] = { totalDays: 0, count: 0 };
    acc[priority].totalDays += wo.resolutionDays;
    acc[priority].count += 1;
    return acc;
  }, {} as Record<string, { totalDays: number; count: number }>);

  const priorityBreakdown = Object.entries(breakdownByPriority).reduce((acc, [priority, data]) => {
    acc[priority] = {
      avgDays: Math.round((data.totalDays / data.count) * 10) / 10,
      count: data.count
    };
    return acc;
  }, {} as Record<string, { avgDays: number; count: number }>);

  // Breakdown by Site
  const breakdownBySite = resolutionTimes.reduce((acc, wo) => {
    const site = wo.Site || 'Unknown';
    if (!acc[site]) acc[site] = { totalDays: 0, count: 0 };
    acc[site].totalDays += wo.resolutionDays;
    acc[site].count += 1;
    return acc;
  }, {} as Record<string, { totalDays: number; count: number }>);

  const siteBreakdown = Object.entries(breakdownBySite).reduce((acc, [site, data]) => {
    acc[site] = {
      avgDays: Math.round((data.totalDays / data.count) * 10) / 10,
      count: data.count
    };
    return acc;
  }, {} as Record<string, { avgDays: number; count: number }>);

  // Breakdown by Technician
  const breakdownByTechnician = resolutionTimes.reduce((acc, wo) => {
    const tech = wo.Technician || 'Unassigned';
    if (!acc[tech]) acc[tech] = { totalDays: 0, count: 0 };
    acc[tech].totalDays += wo.resolutionDays;
    acc[tech].count += 1;
    return acc;
  }, {} as Record<string, { totalDays: number; count: number }>);

  const technicianBreakdown = Object.entries(breakdownByTechnician).reduce((acc, [tech, data]) => {
    acc[tech] = {
      avgDays: Math.round((data.totalDays / data.count) * 10) / 10,
      count: data.count
    };
    return acc;
  }, {} as Record<string, { avgDays: number; count: number }>);

  // Trend analysis - last 4 weeks
  const today = new Date();
  const trendData = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(today.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000);

    const weekWos = resolutionTimes.filter(wo => {
      const closedDate = new Date(wo.ClosedDate!);
      return closedDate >= weekStart && closedDate < weekEnd;
    });

    if (weekWos.length > 0) {
      const weekAvg = weekWos.reduce((sum, wo) => sum + wo.resolutionDays, 0) / weekWos.length;
      trendData.push({
        period: `Week ${4 - i}`,
        avgDays: Math.round(weekAvg * 10) / 10
      });
    }
  }

  // Calculate trend direction
  let deltaType: 'increase' | 'decrease' | undefined;
  let delta: number | undefined;
  if (trendData.length >= 2) {
    const latest = trendData[trendData.length - 1].avgDays;
    const previous = trendData[trendData.length - 2].avgDays;
    delta = Math.round((latest - previous) * 10) / 10;
    deltaType = delta > 0 ? 'increase' : delta < 0 ? 'decrease' : undefined;
  }

  return {
    value: avgResolutionTime,
    delta,
    deltaType,
    caption: `${avgResolutionTime} days average (${completedWos.length} completed)`,
    breakdown: priorityBreakdown,
    trendData,
    breakdownByPriority: priorityBreakdown,
    breakdownBySite: siteBreakdown,
    breakdownByTechnician: technicianBreakdown
  };
}

/**
 * Calculate Labour and Other Costs Percentage KPI
 * Percentage of WIP value that is labour cost vs parts cost
 */
export function calculateLabourAndOtherCosts(workOrders: WorkOrder[]): KpiCardData & {
  breakdownByStatus: Record<string, { totalValue: number; labourValue: number; partsValue: number; labourPercentage: number }>;
  breakdownBySite: Record<string, { totalValue: number; labourValue: number; partsValue: number; labourPercentage: number }>;
} {
  // Include only true WIP statuses - exclude Posted and Cancelled (must match SQL: 690970000, 690970002, 690970001, 690970003)
  const wipStatuses = ['Unscheduled', 'InProgress', 'Scheduled', 'Completed'];
  const wipOrders = workOrders.filter(wo => wipStatuses.includes(wo.Status));

  if (wipOrders.length === 0) {
    return {
      value: 0,
      caption: 'No work orders in progress with costs',
      breakdownByStatus: {},
      breakdownBySite: {}
    };
  }

  // Calculate totals - use Labour + Parts as the base for percentage calculation
  // since WIP value (msdyn_productsservicescost) should equal Labour + Parts
  const totalLabourValue = wipOrders.reduce((sum, wo) => sum + (wo.TotalLabourCost || 0), 0);
  const totalPartsValue = wipOrders.reduce((sum, wo) => sum + (wo.TotalPartsCost || 0), 0);
  const totalCostBase = totalLabourValue + totalPartsValue;


  const labourPercentage = totalCostBase > 0 ? Math.round((totalLabourValue / totalCostBase) * 100) : 0;

  // Breakdown by Status
  const statusBreakdown = wipStatuses.reduce((acc, status) => {
    const statusOrders = wipOrders.filter(wo => wo.Status === status);
    if (statusOrders.length > 0) {
      const statusLabourValue = statusOrders.reduce((sum, wo) => sum + (wo.TotalLabourCost || 0), 0);
      const statusPartsValue = statusOrders.reduce((sum, wo) => sum + (wo.TotalPartsCost || 0), 0);
      const statusCostBase = statusLabourValue + statusPartsValue;

      acc[status] = {
        totalValue: statusCostBase,
        labourValue: statusLabourValue,
        partsValue: statusPartsValue,
        labourPercentage: statusCostBase > 0 ? Math.round((statusLabourValue / statusCostBase) * 100) : 0
      };
    }
    return acc;
  }, {} as Record<string, { totalValue: number; labourValue: number; partsValue: number; labourPercentage: number }>);

  // Breakdown by Site
  const sites = [...new Set(wipOrders.map(wo => wo.Site).filter(Boolean))];
  const siteBreakdown = sites.reduce((acc, site) => {
    const siteOrders = wipOrders.filter(wo => wo.Site === site);
    const siteLabourValue = siteOrders.reduce((sum, wo) => sum + (wo.TotalLabourCost || 0), 0);
    const sitePartsValue = siteOrders.reduce((sum, wo) => sum + (wo.TotalPartsCost || 0), 0);
    const siteCostBase = siteLabourValue + sitePartsValue;

    acc[site] = {
      totalValue: siteCostBase,
      labourValue: siteLabourValue,
      partsValue: sitePartsValue,
      labourPercentage: siteCostBase > 0 ? Math.round((siteLabourValue / siteCostBase) * 100) : 0
    };
    return acc;
  }, {} as Record<string, { totalValue: number; labourValue: number; partsValue: number; labourPercentage: number }>);

  return {
    value: Math.round(totalLabourValue),
    caption: `${labourPercentage}% of WIP value`,
    breakdown: statusBreakdown,
    breakdownByStatus: statusBreakdown,
    breakdownBySite: siteBreakdown
  };
}

/**
 * Calculate Parts Cost KPI
 * Total cost of parts for work orders in progress
 */
export function calculatePartsCost(workOrders: WorkOrder[]): KpiCardData & {
  breakdownByStatus: Record<string, { count: number; value: number }>;
  breakdownBySite: Record<string, { count: number; value: number }>;
  breakdownByPriority: Record<string, { count: number; value: number }>;
} {
  // Include only true WIP statuses - exclude Posted and Cancelled (must match SQL: 690970000, 690970002, 690970001, 690970003)
  const wipStatuses = ['Unscheduled', 'InProgress', 'Scheduled', 'Completed'];
  const wipOrders = workOrders.filter(wo => wipStatuses.includes(wo.Status));

  const totalPartsCost = wipOrders.reduce((sum, wo) => sum + (wo.TotalPartsCost || 0), 0);

  // Breakdown by status
  const breakdownByStatus: Record<string, { count: number; value: number }> = {};
  wipStatuses.forEach(status => {
    const statusOrders = wipOrders.filter(wo => wo.Status === status);
    const statusPartsCost = statusOrders.reduce((sum, wo) => sum + (wo.TotalPartsCost || 0), 0);

    breakdownByStatus[status] = {
      count: statusOrders.length,
      value: statusPartsCost
    };
  });

  // Breakdown by site
  const breakdownBySite: Record<string, { count: number; value: number }> = {};
  const sites = [...new Set(wipOrders.map(wo => wo.Site))];
  sites.forEach(site => {
    const siteOrders = wipOrders.filter(wo => wo.Site === site);
    const sitePartsCost = siteOrders.reduce((sum, wo) => sum + (wo.TotalPartsCost || 0), 0);

    breakdownBySite[site] = {
      count: siteOrders.length,
      value: sitePartsCost
    };
  });

  // Breakdown by priority
  const breakdownByPriority: Record<string, { count: number; value: number }> = {};
  const priorities = [...new Set(wipOrders.map(wo => wo.Priority))];
  priorities.forEach(priority => {
    const priorityOrders = wipOrders.filter(wo => wo.Priority === priority);
    const priorityPartsCost = priorityOrders.reduce((sum, wo) => sum + (wo.TotalPartsCost || 0), 0);

    breakdownByPriority[priority] = {
      count: priorityOrders.length,
      value: priorityPartsCost
    };
  });

  // Calculate percentage using Labour + Parts as base (should equal 100% together)
  const totalLabourCost = wipOrders.reduce((sum, wo) => sum + (wo.TotalLabourCost || 0), 0);
  const totalCostBase = totalLabourCost + totalPartsCost;
  const partsPercentage = totalCostBase > 0 ? Math.round((totalPartsCost / totalCostBase) * 100) : 0;

  return {
    value: Math.round(totalPartsCost),
    caption: `${partsPercentage}% of WIP value`,
    breakdownByStatus,
    breakdownBySite,
    breakdownByPriority
  };
}

/**
 * Calculate Average Gross Margin KPI for Posted Orders
 * Average gross margin percentage from itw_grossmargin2 field
 */
export function calculateAverageGrossMargin(workOrders: WorkOrder[]): KpiCardData & {
  breakdownByStatus: Record<string, { count: number; margin: number }>;
  breakdownBySite: Record<string, { count: number; margin: number }>;
  breakdownByPriority: Record<string, { count: number; margin: number }>;
  currentMonthMargin: number;
  currentMonthCount: number;
} {
  const postedOrders = workOrders.filter(wo => wo.Status === 'Posted' && wo.GrossMargin !== undefined);

  if (postedOrders.length === 0) {
    return {
      value: 0,
      caption: 'No posted orders',
      breakdownByStatus: {},
      breakdownBySite: {},
      breakdownByPriority: {},
      currentMonthMargin: 0,
      currentMonthCount: 0
    };
  }

  // Calculate overall average
  const totalMargin = postedOrders.reduce((sum, wo) => sum + (wo.GrossMargin || 0), 0);
  const averageMargin = totalMargin / postedOrders.length;

  // Calculate current month average
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthOrders = postedOrders.filter(wo => {
    if (!wo.ClosedDate) return false;
    const closedDate = new Date(wo.ClosedDate);
    return closedDate >= currentMonthStart;
  });

  const currentMonthMargin = currentMonthOrders.length > 0
    ? currentMonthOrders.reduce((sum, wo) => sum + (wo.GrossMargin || 0), 0) / currentMonthOrders.length
    : 0;

  // Breakdown by status (though should mostly be 'Posted')
  const breakdownByStatus: Record<string, { count: number; margin: number }> = {};
  const statuses = [...new Set(postedOrders.map(wo => wo.Status))];
  statuses.forEach(status => {
    const statusOrders = postedOrders.filter(wo => wo.Status === status);
    const statusMargin = statusOrders.reduce((sum, wo) => sum + (wo.GrossMargin || 0), 0) / statusOrders.length;

    breakdownByStatus[status] = {
      count: statusOrders.length,
      margin: statusMargin
    };
  });

  // Breakdown by site
  const breakdownBySite: Record<string, { count: number; margin: number }> = {};
  const sites = [...new Set(postedOrders.map(wo => wo.Site))];
  sites.forEach(site => {
    const siteOrders = postedOrders.filter(wo => wo.Site === site);
    const siteMargin = siteOrders.reduce((sum, wo) => sum + (wo.GrossMargin || 0), 0) / siteOrders.length;

    breakdownBySite[site] = {
      count: siteOrders.length,
      margin: siteMargin
    };
  });

  // Breakdown by priority
  const breakdownByPriority: Record<string, { count: number; margin: number }> = {};
  const priorities = [...new Set(postedOrders.map(wo => wo.Priority))];
  priorities.forEach(priority => {
    const priorityOrders = postedOrders.filter(wo => wo.Priority === priority);
    const priorityMargin = priorityOrders.reduce((sum, wo) => sum + (wo.GrossMargin || 0), 0) / priorityOrders.length;

    breakdownByPriority[priority] = {
      count: priorityOrders.length,
      margin: priorityMargin
    };
  });

  return {
    value: Math.round(averageMargin * 100) / 100, // Round to 2 decimal places
    caption: currentMonthOrders.length > 0
      ? `${Math.round(currentMonthMargin * 100) / 100}% this month (${currentMonthOrders.length} orders)`
      : `${Math.round(averageMargin * 100) / 100}% avg from ${postedOrders.length} posted orders`,
    breakdownByStatus,
    breakdownBySite,
    breakdownByPriority,
    currentMonthMargin: Math.round(currentMonthMargin * 100) / 100,
    currentMonthCount: currentMonthOrders.length
  };
}

/**
 * Calculate Open WIP Value KPI
 * Sum of value for work orders currently in progress
 */
export function calculateOpenWIPValue(workOrders: WorkOrder[]): KpiCardData & {
  breakdownByStatus: Record<string, { count: number; value: number }>;
  breakdownBySite: Record<string, { count: number; value: number }>;
  breakdownByPriority: Record<string, { count: number; value: number }>;
} {
  // Define what statuses constitute "WIP" - include Completed but exclude Posted/Cancelled (must match SQL: 690970000, 690970002, 690970001, 690970003)
  const wipStatuses = ['Unscheduled', 'InProgress', 'Scheduled', 'Completed'];
  const wipOrders = workOrders.filter(wo => wipStatuses.includes(wo.Status));

  if (wipOrders.length === 0) {
    return {
      value: 0,
      caption: 'No work orders in progress',
      breakdownByStatus: {},
      breakdownBySite: {},
      breakdownByPriority: {}
    };
  }

  // WIP Value = msdyn_productsservicescost (cost of products and services used on jobs)
  const wipWithValues = wipOrders.map(wo => {
    return { ...wo, estimatedValue: wo.WIPValue || 0 };
  });

  const totalValue = wipWithValues.reduce((sum, wo) => sum + wo.estimatedValue, 0);

  // Breakdown by Status
  const statusBreakdown = wipWithValues.reduce((acc, wo) => {
    const status = wo.Status;
    if (!acc[status]) acc[status] = { count: 0, value: 0 };
    acc[status].count += 1;
    acc[status].value += wo.estimatedValue;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  // Breakdown by Site
  const siteBreakdown = wipWithValues.reduce((acc, wo) => {
    const site = wo.Site || 'Unknown';
    if (!acc[site]) acc[site] = { count: 0, value: 0 };
    acc[site].count += 1;
    acc[site].value += wo.estimatedValue;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  // Breakdown by Priority
  const priorityBreakdown = wipWithValues.reduce((acc, wo) => {
    const priority = wo.Priority;
    if (!acc[priority]) acc[priority] = { count: 0, value: 0 };
    acc[priority].count += 1;
    acc[priority].value += wo.estimatedValue;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  // Trend calculation (week over week WIP value)
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const thisWeekCreated = wipOrders.filter(wo => {
    const created = new Date(wo.CreatedDate);
    return created >= lastWeek;
  });

  const wipGrowth = thisWeekCreated.length;
  let deltaType: 'increase' | 'decrease' | undefined;
  if (wipGrowth > 0) deltaType = 'increase';

  return {
    value: Math.round(totalValue),
    delta: wipGrowth > 0 ? wipGrowth : undefined,
    deltaType,
    caption: `$${Math.round(totalValue).toLocaleString()} in progress (${wipOrders.length} orders)`,
    breakdown: statusBreakdown,
    breakdownByStatus: statusBreakdown,
    breakdownBySite: siteBreakdown,
    breakdownByPriority: priorityBreakdown
  };
}

/**
 * Calculate SLA Performance KPI
 * Compare PromisedDate vs actual ClosedDate for completed work orders
 */
export function calculateSLAPerformance(workOrders: WorkOrder[]): KpiCardData & {
  onTimeCount: number;
  delayedCount: number;
  averageDelayDays: number;
  breakdownByPriority: Record<string, { onTime: number; delayed: number; onTimePercent: number }>;
  breakdownBySite: Record<string, { onTime: number; delayed: number; onTimePercent: number }>;
} {
  const completedWithPromised = workOrders.filter(wo =>
    (wo.Status === 'Completed' || wo.Status === 'Posted') &&
    wo.ClosedDate &&
    wo.PromisedDate
  );


  if (completedWithPromised.length === 0) {
    return {
      value: 0,
      caption: 'No completed work orders with promised dates',
      onTimeCount: 0,
      delayedCount: 0,
      averageDelayDays: 0,
      breakdownByPriority: {},
      breakdownBySite: {}
    };
  }

  // Calculate SLA performance
  const slaResults = completedWithPromised.map(wo => {
    const promisedDate = new Date(wo.PromisedDate!);
    const closedDate = new Date(wo.ClosedDate!);
    const delayDays = Math.round((closedDate.getTime() - promisedDate.getTime()) / (1000 * 60 * 60 * 24));
    const onTime = delayDays <= 0; // On time if closed on or before promised date


    return { ...wo, delayDays, onTime };
  });

  // Overall metrics
  const onTimeCount = slaResults.filter(r => r.onTime).length;
  const delayedCount = slaResults.length - onTimeCount;
  const onTimePercent = Math.round((onTimeCount / slaResults.length) * 100);

  // Average delay for delayed items only
  const delayedItems = slaResults.filter(r => !r.onTime);
  const averageDelayDays = delayedItems.length > 0
    ? Math.round((delayedItems.reduce((sum, r) => sum + r.delayDays, 0) / delayedItems.length) * 10) / 10
    : 0;

  // Breakdown by Priority
  const priorityBreakdown = slaResults.reduce((acc, r) => {
    const priority = r.Priority;
    if (!acc[priority]) acc[priority] = { onTime: 0, delayed: 0 };
    if (r.onTime) acc[priority].onTime++;
    else acc[priority].delayed++;
    return acc;
  }, {} as Record<string, { onTime: number; delayed: number }>);

  const priorityBreakdownWithPercent = Object.entries(priorityBreakdown).reduce((acc, [priority, data]) => {
    const total = data.onTime + data.delayed;
    acc[priority] = {
      ...data,
      onTimePercent: Math.round((data.onTime / total) * 100)
    };
    return acc;
  }, {} as Record<string, { onTime: number; delayed: number; onTimePercent: number }>);

  // Breakdown by Site
  const siteBreakdown = slaResults.reduce((acc, r) => {
    const site = r.Site || 'Unknown';
    if (!acc[site]) acc[site] = { onTime: 0, delayed: 0 };
    if (r.onTime) acc[site].onTime++;
    else acc[site].delayed++;
    return acc;
  }, {} as Record<string, { onTime: number; delayed: number }>);

  const siteBreakdownWithPercent = Object.entries(siteBreakdown).reduce((acc, [site, data]) => {
    const total = data.onTime + data.delayed;
    acc[site] = {
      ...data,
      onTimePercent: Math.round((data.onTime / total) * 100)
    };
    return acc;
  }, {} as Record<string, { onTime: number; delayed: number; onTimePercent: number }>);

  // Trend calculation (week over week)
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeekResults = slaResults.filter(r => {
    const closedDate = new Date(r.ClosedDate!);
    return closedDate >= lastWeek;
  });

  const lastWeekResults = slaResults.filter(r => {
    const closedDate = new Date(r.ClosedDate!);
    return closedDate >= twoWeeksAgo && closedDate < lastWeek;
  });

  let delta: number | undefined;
  let deltaType: 'increase' | 'decrease' | undefined;

  if (thisWeekResults.length > 0 && lastWeekResults.length > 0) {
    const thisWeekPercent = (thisWeekResults.filter(r => r.onTime).length / thisWeekResults.length) * 100;
    const lastWeekPercent = (lastWeekResults.filter(r => r.onTime).length / lastWeekResults.length) * 100;
    delta = Math.round((thisWeekPercent - lastWeekPercent) * 10) / 10;
    deltaType = delta > 0 ? 'increase' : delta < 0 ? 'decrease' : undefined;
  }

  return {
    value: onTimePercent,
    delta,
    deltaType,
    caption: `${onTimePercent}% on-time delivery (${onTimeCount}/${slaResults.length})`,
    breakdown: priorityBreakdownWithPercent,
    onTimeCount,
    delayedCount,
    averageDelayDays,
    breakdownByPriority: priorityBreakdownWithPercent,
    breakdownBySite: siteBreakdownWithPercent
  };
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
