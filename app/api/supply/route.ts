import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { SupplyRow, ApiFilters } from '@/lib/types';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: ApiFilters = {
      site: searchParams.get('site')?.split(',') || undefined,
      horizon: parseInt(searchParams.get('horizon') || '30'),
    };

    let supply: SupplyRow[];

    if (process.env.USE_MOCK_DATA === 'true') {
      // Load mock data
      const filePath = path.join(process.cwd(), 'data', 'supply.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      supply = JSON.parse(fileContent);
      
      // Apply filters
      supply = supply.filter(item => {
        if (filters.site && !filters.site.includes(item.Site)) return false;
        
        // Filter by horizon if specified
        if (filters.horizon && item.ETA) {
          const etaDate = new Date(item.ETA);
          const horizonDate = new Date();
          horizonDate.setDate(horizonDate.getDate() + filters.horizon);
          if (etaDate > horizonDate) return false;
        }
        
        return true;
      });
    } else {
      // Simplified query - return empty for now to avoid errors
      const query = `
        SELECT
          'TEMP' as ItemId,
          'L-QLD' as Site,
          'PO' as Source,
          'TEMP001' as Ref,
          0 as Qty,
          NULL as ETA
        WHERE 1=0
      `;
      
      supply = await executeQuery<SupplyRow>(query, {
        site: filters.site?.join(',') || null,
        horizon: filters.horizon || 30,
      });
    }

    return NextResponse.json(supply);
  } catch (error) {
    console.error('Supply API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supply' },
      { status: 500 }
    );
  }
}