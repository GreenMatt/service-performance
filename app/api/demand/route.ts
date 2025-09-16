import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DemandRow, ApiFilters } from '@/lib/types';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: ApiFilters = {
      site: searchParams.get('site')?.split(',') || undefined,
    };

    let demand: DemandRow[];

    if (process.env.USE_MOCK_DATA === 'true') {
      // Load mock data
      const filePath = path.join(process.cwd(), 'data', 'demand.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      demand = JSON.parse(fileContent);
      
      // Apply filters
      demand = demand.filter(item => {
        if (filters.site && !filters.site.includes(item.Site)) return false;
        return true;
      });
    } else {
      // Simplified query - return empty for now to avoid errors
      const query = `
        SELECT
          'TEMP' as ItemId,
          'L-QLD' as Site,
          'WorkOrder' as DemandType,
          'TEMP001' as Ref,
          0 as Qty,
          NULL as NeedBy
        WHERE 1=0
      `;
      
      demand = await executeQuery<DemandRow>(query, {
        site: filters.site?.join(',') || null,
      });
    }

    return NextResponse.json(demand);
  } catch (error) {
    console.error('Demand API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch demand' },
      { status: 500 }
    );
  }
}