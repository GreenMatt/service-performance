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
      const mockProducts = [
        {
          WorkOrderId: "WO-2024-001245",
          ProductId: "PART-001",
          ProductName: "Hydraulic Filter",
          QtyUsed: 2,
          QtyAllocated: 3,
          UnitCost: 45.50,
          LineValue: 91.00,
          LineStatus: "Used"
        },
        {
          WorkOrderId: "WO-2024-001246",
          ProductId: "PART-002",
          ProductName: "Engine Oil",
          QtyUsed: 5,
          QtyAllocated: 5,
          UnitCost: 12.75,
          LineValue: 63.75,
          LineStatus: "Used"
        }
      ];

      return NextResponse.json(mockProducts);
    }

    // Query work order products from D365FO
    const query = `
      SELECT TOP (@maxRows)
        wop.msdyn_workorder AS WorkOrderId,
        wop.msdyn_product AS ProductId,
        p.msdyn_name AS ProductName,
        COALESCE(wop.msdyn_qtyused, 0) AS QtyUsed,
        COALESCE(wop.msdyn_qtytobill, 0) AS QtyAllocated,
        COALESCE(wop.msdyn_unitcost, 0) AS UnitCost,
        COALESCE(wop.msdyn_lineamount, 0) AS LineValue,
        CASE wop.msdyn_linestatus
          WHEN 690970000 THEN 'Estimated'
          WHEN 690970001 THEN 'Used'
          WHEN 690970002 THEN 'Canceled'
          ELSE 'Unknown'
        END AS LineStatus
      FROM dbo.msdyn_workorderproduct wop
      LEFT JOIN dbo.msdyn_product p
        ON p.msdyn_productid = wop.msdyn_product
        AND p.DataAreaId = wop.DataAreaId
      WHERE wop.msdyn_workorderproductid IS NOT NULL
        AND (@workOrderIds IS NULL OR wop.msdyn_workorder IN (SELECT value FROM STRING_SPLIT(@workOrderIds, ',')))
        AND wop.DataAreaId = 'mau1'
      ORDER BY wop.msdyn_workorder, wop.createdon DESC
    `;

    const params = {
      maxRows,
      workOrderIds: filters.workOrderIds?.join(',') || null,
    };

    const products = await executeQuery(query, params);

    return NextResponse.json(products, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Work Order Products API Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch work order products', details: process.env.NODE_ENV !== 'production' ? message : undefined },
      { status: 500 }
    );
  }
}