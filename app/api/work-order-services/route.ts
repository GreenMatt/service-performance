import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      workOrderIds: searchParams.get('workOrderIds')?.split(',') || undefined,
      site: searchParams.get('site') || undefined,
    };
    const maxRows = Math.max(1, Math.min(parseInt(searchParams.get('maxRows') || '50000', 10) || 50000, 200000));

    if (process.env.USE_MOCK_DATA === 'true') {
      // Mock data for development
      const mockServices = [
        {
          WorkOrderId: "WO-2024-001245",
          ServiceTaskType: "Repair",
          Duration: 4.5,
          EstimatedDuration: 4.0,
          TaskStatus: "Open",
          PercentComplete: 75,
          IsApproved: false
        },
        {
          WorkOrderId: "WO-2024-001246",
          ServiceTaskType: "Maintenance",
          Duration: 2.0,
          EstimatedDuration: 2.5,
          TaskStatus: "Completed",
          PercentComplete: 100,
          IsApproved: true
        }
      ];

      return NextResponse.json(mockServices);
    }

    // Query work order services from D365FO
    const query = `
      SELECT TOP (@maxRows)
        wos.msdyn_workorder AS WorkOrderId,
        wos.msdyn_name AS ServiceTaskType,
        COALESCE(wos.msdyn_duration, 0) AS Duration,
        COALESCE(wos.msdyn_estimatedduration, 0) AS EstimatedDuration,
        CASE wos.msdyn_linestatus
          WHEN 690970000 THEN 'Estimated'
          WHEN 690970001 THEN 'Open'
          WHEN 690970002 THEN 'Completed'
          WHEN 690970003 THEN 'Canceled'
          ELSE 'Unknown'
        END AS TaskStatus,
        COALESCE(wos.msdyn_percentcomplete, 0) AS PercentComplete,
        CASE
          WHEN wos.msdyn_linestatus = 690970002 THEN CAST(1 AS bit)
          ELSE CAST(0 AS bit)
        END AS IsApproved
      FROM dbo.msdyn_workorderservice wos
      WHERE wos.msdyn_workorderserviceid IS NOT NULL
        AND (@workOrderIds IS NULL OR wos.msdyn_workorder IN (SELECT value FROM STRING_SPLIT(@workOrderIds, ',')))
        AND wos.DataAreaId = 'mau1'
      ORDER BY wos.msdyn_workorder, wos.createdon DESC
    `;

    const params = {
      maxRows,
      workOrderIds: filters.workOrderIds?.join(',') || null,
    };

    const services = await executeQuery(query, params);

    return NextResponse.json(services, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Work Order Services API Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch work order services', details: process.env.NODE_ENV !== 'production' ? message : undefined },
      { status: 500 }
    );
  }
}