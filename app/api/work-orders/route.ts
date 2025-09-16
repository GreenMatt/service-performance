import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { WorkOrder, ApiFilters } from '@/lib/types';
import { mapSitesToNames } from '@/lib/sites';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: ApiFilters = {
      site: searchParams.get('site')?.split(',') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      status: searchParams.get('status')?.split(',') || undefined,
      priority: searchParams.get('priority') || undefined,
    };
    const maxRows = Math.max(1, Math.min(parseInt(searchParams.get('maxRows') || '10000', 10) || 10000, 200000));

    let workOrders: WorkOrder[];

    if (process.env.USE_MOCK_DATA === 'true') {
      // Load mock data
      const filePath = path.join(process.cwd(), 'data', 'work-orders.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      workOrders = JSON.parse(fileContent);
      
      // Apply filters to mock data
      workOrders = workOrders.filter(wo => {
        if (filters.site && !filters.site.includes(wo.Site)) return false;
        if (filters.status && !filters.status.includes(wo.Status)) return false;
        if (filters.priority && wo.Priority !== filters.priority) return false;
        if (filters.from && wo.CreatedDate < filters.from) return false;
        if (filters.to && wo.CreatedDate > filters.to) return false;
        return true;
      });
    } else {
      // Query real work order data from Synapse (use minimal, schema-safe fields)
      const source = process.env.WORK_ORDERS_SOURCE || 'dbo.msdyn_workorder';

      // Map friendly statuses to D365 codes (defaults to open-like statuses)
      const statusMap: Record<string, number> = {
        Unscheduled: 690970000,
        Scheduled: 690970001,
        InProgress: 690970002,
        Completed: 690970003,
        Posted: 690970004,
        Canceled: 690970005,
      };
      const requestedStatuses = (filters.status && filters.status.length > 0)
        ? filters.status
        : ['Unscheduled', 'InProgress', 'Scheduled'];
      const statusCodes = requestedStatuses
        .map(s => statusMap[s] ?? null)
        .filter((v): v is number => typeof v === 'number')
        .join(',');

      // We'll try a few query variants to get Site/Status labels if available, falling back safely.
      const baseSelect = `
        SELECT TOP (@maxRows)
          wo.msdyn_name AS WorkOrderId,
          CASE wo.msdyn_systemstatus
            WHEN 690970000 THEN 'Unscheduled'
            WHEN 690970001 THEN 'Scheduled'
            WHEN 690970002 THEN 'InProgress'
            WHEN 690970003 THEN 'Completed'
            WHEN 690970004 THEN 'Posted'
            WHEN 690970005 THEN 'Canceled'
            ELSE 'Unscheduled'
          END AS Status,
          'Normal' AS Priority,
          'Internal' AS ServiceType,
          {SITE_EXPR} AS Site,
          NULL AS Technician,
          wo.createdon AS CreatedDate,
          NULL AS PromisedDate,
          wo.msdyn_completedon AS ClosedDate,
          DATEDIFF(day, wo.createdon, COALESCE(wo.msdyn_completedon, GETDATE())) AS AgeDays
        FROM ${source} wo
        WHERE wo.msdyn_workorderid IS NOT NULL
          AND wo.msdyn_name IS NOT NULL
          AND (@statusCodes IS NULL OR wo.msdyn_systemstatus IN (SELECT TRY_CAST(value AS int) FROM STRING_SPLIT(@statusCodes, ',')))
          AND (@from IS NULL OR wo.createdon >= @from)
          AND (@to IS NULL OR wo.createdon <= @to)
        ORDER BY wo.createdon DESC`;

      // Preferred site columns to try in order (from your schema)
      const siteColumns = ['wo.itw_sitename', 'wo.itw_site'];
      let query = baseSelect.replace('{SITE_EXPR}', `'UNKNOWN'`);

      const params: Record<string, any> = {
        from: filters.from || null,
        to: filters.to || null,
        maxRows,
        statusCodes: statusCodes || null,
      };

      // Try to select a real site column if available
      for (const siteExpr of siteColumns) {
        const testQuery = baseSelect.replace('{SITE_EXPR}', siteExpr);
        try {
          workOrders = await executeQuery<WorkOrder>(testQuery, params);
          query = testQuery; // success path
          break;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (/Invalid column name/i.test(msg)) {
            continue; // try next candidate
          } else {
            throw e;
          }
        }
      }
      // If we didn't fill workOrders above, run the safe fallback (UNKNOWN site)
      if (!workOrders) {
        workOrders = await executeQuery<WorkOrder>(query, params);
      }

      // If a site filter is provided, attempt to filter by the site name column if available.
      // We optimistically try a version with site filtering; if it fails due to missing column, we retry without it.
      if (filters.site && filters.site.length > 0) {
        const siteNames = mapSitesToNames(filters.site);
        params.site = siteNames?.join(',') || null;
        // try apply site filter to the chosen site expr if it was valid, else skip site filter
        const siteFilterExpr = siteColumns.find(col => query.includes(col)) || 'wo.itw_sitename';
        const withSiteFilter = query.replace(
          'WHERE wo.msdyn_workorderid IS NOT NULL',
          `WHERE wo.msdyn_workorderid IS NOT NULL AND (@site IS NULL OR ${siteFilterExpr} IN (SELECT value FROM STRING_SPLIT(@site, ',')))`
        );
        try {
          workOrders = await executeQuery<WorkOrder>(withSiteFilter, params);
        } catch (e) {
          // If applying filter fails (e.g., invalid column), fall back to unfiltered
          workOrders = await executeQuery<WorkOrder>(query, { ...params, site: null });
        }
      } else {
        // workOrders already populated by prior query attempts
      }
    }

    return NextResponse.json(workOrders, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Work Orders API Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch work orders', details: process.env.NODE_ENV !== 'production' ? message : undefined },
      { status: 500 }
    );
  }
}
