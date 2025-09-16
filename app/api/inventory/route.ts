import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { InventoryRow, ApiFilters } from '@/lib/types';
import { mapSitesToCodes } from '@/lib/sites';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: ApiFilters = {
      site: searchParams.get('site')?.split(',') || undefined,
    };

    let inventory: InventoryRow[];

    if (process.env.USE_MOCK_DATA === 'true') {
      // Load mock data
      const filePath = path.join(process.cwd(), 'data', 'inventory.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      inventory = JSON.parse(fileContent);
      
      // Apply filters
      inventory = inventory.filter(item => {
        if (filters.site && !filters.site.includes(item.Site)) return false;
        return true;
      });
    } else {
      const schema = process.env.SNAPSHOT_SCHEMA || 'bm';
      const view = process.env.SNAPSHOT_VIEW || `${schema}.vw_ServiceInventorySnapshot_AU`;
      // Query Azure Synapse via canonical view
      const query = `
        SELECT
          s.ItemNumber as ItemId,
          s.ItemNumber as ItemName,
          s.SiteID as Site,
          s.WarehouseID as Warehouse,
          s.WarehouseOnHand as OnHand,
          s.CurrentSafetyStock as SafetyStock,
          s.CurrentMinOnHand as MinOnHand,
          s.WarehouseAvgDailyDemand as AvgDailyDemand
        FROM ${view} s
        WHERE (@site IS NULL OR s.SiteID IN (SELECT value FROM STRING_SPLIT(@site, ',')))
      `;
      
      const siteCodes = mapSitesToCodes(filters.site);
      inventory = await executeQuery<InventoryRow>(query, {
        site: siteCodes?.join(',') || null,
      });
    }

    return NextResponse.json(inventory, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Inventory API Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory', details: process.env.NODE_ENV !== 'production' ? message : undefined },
      { status: 500 }
    );
  }
}
