import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const woId = searchParams.get('id') || 'WO-18142';

    const source = process.env.WORK_ORDERS_SOURCE || 'dbo.msdyn_workorder';

    const query = `
      SELECT
        wo.msdyn_name AS WorkOrderId,
        CASE wo.msdyn_systemstatus
          WHEN 690970000 THEN 'Unscheduled'
          WHEN 690970001 THEN 'Scheduled'
          WHEN 690970002 THEN 'InProgress'
          WHEN 690970003 THEN 'Completed'
          WHEN 690970004 THEN 'Posted'
          WHEN 690970005 THEN 'Canceled'
          ELSE 'Unknown'
        END AS Status,
        COALESCE(wo.itw_sitename, wo.itw_site, 'UNKNOWN') AS Site,
        wo.createdon AS CreatedDate,
        wo.msdyn_completedon AS ClosedDate,
        wo.msdyn_firstarrivedon AS StartDate,
        COALESCE(wo.msdyn_productsservicescost, 0) AS WIPValue,
        COALESCE(wo.itw_totalcostpart, 0) AS TotalPartsCost,
        COALESCE(wo.itw_totalcostlabour, 0) AS TotalLabourCost,
        COALESCE(wo.itw_grossmargin2, 0) AS GrossMargin
      FROM ${source} wo
      WHERE wo.msdyn_name = '${woId}'
        AND wo.msdyn_workorderid IS NOT NULL
    `;

    const params = {};
    const result = await executeQuery(query, params);

    return NextResponse.json({
      workOrder: result[0] || null,
      query,
      params,
      found: result.length > 0
    });

  } catch (error) {
    console.error('Debug WO API Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch work order', details: message },
      { status: 500 }
    );
  }
}