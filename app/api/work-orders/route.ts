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
        : ['Unscheduled', 'InProgress', 'Scheduled', 'Completed'];
      const statusCodes = requestedStatuses
        .map(s => statusMap[s] ?? null)
        .filter((v): v is number => typeof v === 'number')
        .join(',');

      // Use the exact query pattern that matches the user's SQL
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
          {PROMISED_DATE_EXPR} AS PromisedDate,
          wo.msdyn_completedon AS ClosedDate,
          wo.msdyn_firstarrivedon AS StartDate,
          COALESCE(wo.msdyn_productsservicescost, 0) AS WIPValue,
          COALESCE(wo.itw_totalcostpart, 0) AS TotalPartsCost,
          COALESCE(wo.itw_totalcostlabour, 0) AS TotalLabourCost,
          COALESCE(wo.itw_grossmargin2, 0) AS GrossMargin,
          COALESCE(wo.msdyn_totalamount, 0) AS TotalAmount,
          DATEDIFF(day, wo.createdon, COALESCE(wo.msdyn_completedon, GETDATE())) AS AgeDays
        FROM ${source} wo
        WHERE wo.msdyn_workorderid IS NOT NULL
          AND wo.statecode = 0
          AND (@statusCodes IS NULL OR wo.msdyn_systemstatus IN (SELECT TRY_CAST(value AS int) FROM STRING_SPLIT(@statusCodes, ',')))
          AND (@from IS NULL OR wo.createdon >= @from)
          AND (@to IS NULL OR wo.createdon <= @to)
        ORDER BY wo.createdon DESC`;

      // Preferred site columns to try in order (from your schema)
      const siteColumns = ['wo.itw_sitename', 'wo.itw_site'];

      // Preferred promised date columns to try in order
      const promisedDateColumns = [
        'wo.msdyn_datewindowend',         // D365FO Work Order target completion date (try this first)
        'wo.msdyn_targetresolutiondate',  // Target resolution date
        'wo.msdyn_duedate',              // Due date
        'wo.buc_scheduledend',            // Bucher scheduled end date (may get updated on completion)
        'wo.msdyn_datewindowstart',       // D365FO Work Order earliest start date
        'wo.msdyn_estimatedcompletiondate' // Estimated completion date
      ];

      let query = baseSelect
        .replace('{SITE_EXPR}', `'UNKNOWN'`)
        .replace('{PROMISED_DATE_EXPR}', 'NULL');

      const params: Record<string, any> = {
        from: filters.from || null,
        to: filters.to || null,
        maxRows,
        statusCodes: statusCodes || null,
      };

      // Try to select real site and promised date columns if available
      let foundSiteColumn = 'UNKNOWN';
      let foundPromisedDateColumn = 'NULL';

      // Test site columns first
      for (const siteExpr of siteColumns) {
        const testQuery = baseSelect
          .replace('{SITE_EXPR}', siteExpr)
          .replace('{PROMISED_DATE_EXPR}', 'NULL');
        try {
          await executeQuery<WorkOrder>(`${testQuery.split('ORDER BY')[0]} AND 1=0`, params); // Test query syntax only
          foundSiteColumn = siteExpr;
          break;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!/Invalid column name/i.test(msg)) {
            throw e; // Non-column errors should still be thrown
          }
        }
      }

      // Test promised date columns
      for (const promisedDateExpr of promisedDateColumns) {
        const testQuery = baseSelect
          .replace('{SITE_EXPR}', foundSiteColumn)
          .replace('{PROMISED_DATE_EXPR}', promisedDateExpr);
        try {
          await executeQuery<WorkOrder>(`${testQuery.split('ORDER BY')[0]} AND 1=0`, params); // Test query syntax only
          foundPromisedDateColumn = promisedDateExpr;
          break;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!/Invalid column name/i.test(msg)) {
            throw e; // Non-column errors should still be thrown
          }
        }
      }

      // Build final query with discovered columns
      query = baseSelect
        .replace('{SITE_EXPR}', foundSiteColumn)
        .replace('{PROMISED_DATE_EXPR}', foundPromisedDateColumn);

      // Execute the final query
      workOrders = await executeQuery<WorkOrder>(query, params);

      // If a site filter is provided, apply it using the exact same approach as the user's query
      if (filters.site && filters.site.length > 0 && foundSiteColumn !== 'UNKNOWN') {
        const siteNames = mapSitesToNames(filters.site);
        params.site = siteNames?.join(',') || null;

        // Debug logging
        console.log('Site filter debug:', {
          originalSite: filters.site,
          mappedSiteNames: siteNames,
          foundSiteColumn,
          paramsSite: params.site
        });

        const withSiteFilter = query.replace(
          'AND (@statusCodes IS NULL OR wo.msdyn_systemstatus IN (SELECT TRY_CAST(value AS int) FROM STRING_SPLIT(@statusCodes, \',\')))',
          `AND (@statusCodes IS NULL OR wo.msdyn_systemstatus IN (SELECT TRY_CAST(value AS int) FROM STRING_SPLIT(@statusCodes, ',')))
          AND (@site IS NULL OR ${foundSiteColumn} IN (SELECT value FROM STRING_SPLIT(@site, ',')))`
        );

        console.log('Final query with site filter:', withSiteFilter);
        console.log('Query params:', params);

        try {
          workOrders = await executeQuery<WorkOrder>(withSiteFilter, params);
          console.log(`Query returned ${workOrders.length} work orders for site filter`);
        } catch (e) {
          console.error('Site filter query failed:', e);
          // If applying filter fails, fall back to unfiltered
          workOrders = await executeQuery<WorkOrder>(query, { ...params, site: null });
          console.log(`Fallback query returned ${workOrders.length} work orders (no site filter)`);
        }
      } else {
        console.log('No site filter applied:', {
          hasSiteFilter: Boolean(filters.site && filters.site.length > 0),
          foundSiteColumn,
          filters
        });
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
