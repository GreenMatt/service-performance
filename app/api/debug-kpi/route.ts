import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const site = searchParams.get('site') || 'FAIRBANK SALES & SERVICE';

    console.log('Debug KPI API called with site:', site);

    // Your exact SQL query for comparison
    const yourQuery = `
      SELECT
        'YOUR_SQL' as QueryType,
        COUNT(*) as WorkOrderCount,
        SUM(wo.itw_totalcostlabour) as TotalLabourCost,
        SUM(wo.msdyn_productsservicescost) AS TotalWIPValue,
        SUM(wo.itw_totalcostpart) as TotalPartsCost
      FROM dbo.msdyn_workorder wo
      WHERE wo.msdyn_workorderid IS NOT NULL
        AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
        AND wo.itw_sitename = @site
        AND wo.statecode = 0
    `;

    // API equivalent query
    const apiQuery = `
      SELECT
        'API_EQUIVALENT' as QueryType,
        COUNT(*) as WorkOrderCount,
        SUM(COALESCE(wo.itw_totalcostlabour, 0)) as TotalLabourCost,
        SUM(COALESCE(wo.msdyn_productsservicescost, 0)) AS TotalWIPValue,
        SUM(COALESCE(wo.itw_totalcostpart, 0)) as TotalPartsCost
      FROM dbo.msdyn_workorder wo
      WHERE wo.msdyn_workorderid IS NOT NULL
        AND wo.statecode = 0
        AND wo.msdyn_systemstatus IN (690970000, 690970001, 690970002, 690970003)
        AND wo.itw_sitename = @site
    `;

    // Individual records for detailed analysis
    const detailQuery = `
      SELECT TOP 10
        wo.msdyn_name as WorkOrderId,
        wo.msdyn_systemstatus,
        wo.itw_totalcostlabour,
        wo.msdyn_productsservicescost,
        wo.itw_totalcostpart,
        wo.itw_sitename
      FROM dbo.msdyn_workorder wo
      WHERE wo.msdyn_workorderid IS NOT NULL
        AND wo.statecode = 0
        AND wo.msdyn_systemstatus IN (690970000, 690970001, 690970002, 690970003)
        AND wo.itw_sitename = @site
      ORDER BY wo.msdyn_productsservicescost DESC
    `;

    const params = { site };

    console.log('Executing queries with params:', params);

    const [yourResults, apiResults, detailResults] = await Promise.all([
      executeQuery(yourQuery, params),
      executeQuery(apiQuery, params),
      executeQuery(detailQuery, params)
    ]);

    console.log('Query results:', {
      yourResults: yourResults[0],
      apiResults: apiResults[0],
      sampleRecords: detailResults.length
    });

    return NextResponse.json({
      comparison: [yourResults[0], apiResults[0]],
      sampleRecords: detailResults,
      parameters: params
    });

  } catch (error) {
    console.error('Debug KPI API Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to debug KPI', details: message },
      { status: 500 }
    );
  }
}