import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { SnapshotRow, ApiFilters } from '@/lib/types';
import { mapSitesToCodes } from '@/lib/sites';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: ApiFilters = {
      site: searchParams.get('site')?.split(',') || undefined,
      horizon: parseInt(searchParams.get('horizon') || '30'),
      onlyExceptions: searchParams.get('onlyExceptions') === 'true',
    };
    const debug = searchParams.get('debug') === '1';

    let snapshot: SnapshotRow[];

    if (process.env.USE_MOCK_DATA === 'true') {
      // Load mock data
      const filePath = path.join(process.cwd(), 'data', 'snapshot.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      snapshot = JSON.parse(fileContent);
      
      // Apply filters
      snapshot = snapshot.filter(item => {
        if (filters.site && !filters.site.includes(item.Site)) return false;
        if (filters.onlyExceptions && item.Action === 'OK') return false;
        return true;
      });
    } else {
      const schema = process.env.SNAPSHOT_SCHEMA || 'bm';
      const view = process.env.SNAPSHOT_VIEW || `${schema}.vw_ServiceInventorySnapshot_AU`;
      // Query Azure Synapse using the canonical snapshot view (bm schema)
      let query = `
        SELECT
          s.ItemNumber as ItemId,
          s.SiteID as Site,
          s.WarehouseID as Warehouse,
          s.WarehouseOnHand as OnHand,
          s.WarehouseAvailable as Available,
          s.CurrentSafetyStock as SafetyStock,
          s.CurrentMinOnHand as MinOnHand,
          s.InboundQtyWithinHorizon as InboundQty,
          s.NextETAWithinHorizon as NextETA,
          s.WarehouseTotalDemand as DemandQty,
          CASE 
            WHEN s.WarehouseTotalDemand - (s.WarehouseOnHand + s.InboundQtyWithinHorizon) > 0 
            THEN s.WarehouseTotalDemand - (s.WarehouseOnHand + s.InboundQtyWithinHorizon)
            ELSE 0
          END as Gap,
          CASE
            WHEN s.WarehouseAvgDailyDemand > 0
            THEN (s.WarehouseOnHand + s.InboundQtyWithinHorizon) / s.WarehouseAvgDailyDemand
            ELSE NULL
          END as CoverDays,
          s.PartsBelowSafety,
          s.HasInboundWithinHorizon,
          s.BelowSafety_NoSupply
        FROM ${view} s
        WHERE (@site IS NULL OR s.SiteID IN (SELECT value FROM STRING_SPLIT(@site, ',')))
      `;

      if (filters.onlyExceptions) {
        query += ` AND (s.BelowSafety_NoSupply = 1 OR s.PartsBelowSafety = 1)`;
      }

      query += ` ORDER BY s.ItemNumber, s.SiteID`;

      const siteCodes = mapSitesToCodes(filters.site);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Snapshot API] Incoming site:', filters.site, 'Resolved codes:', siteCodes, 'horizon:', filters.horizon, 'onlyExceptions:', filters.onlyExceptions);
      }
      const raw = await executeQuery<any>(query, {
        site: siteCodes?.join(',') || null,
        horizon: filters.horizon || 30,
      });
      // Planner guardrail: suppress false Expedite; classify as:
      // - OK when not below safety or no real need (threshold=0 and demand=0)
      // - Expedite when below safety AND inbound exists (can expedite)
      // - RaisePO when below safety AND no inbound (needs order)
      snapshot = raw.map((r: any) => {
        const safety = (r.SafetyStock && r.SafetyStock !== 0) ? r.SafetyStock : (r.MinOnHand || 0)
        const available = (typeof r.Available === 'number') ? r.Available : (r.OnHand || 0)
        const demand = r.DemandQty || 0
        const hasInbound = (r.InboundQty || 0) > 0
        const belowSafety = available < safety
        const gap = r.Gap || 0
        // Treat any real shortage (gap>0) as below-safety for action purposes
        const shortage = belowSafety || (gap > 0)
        const needsStock = (safety > 0) || (demand > 0)
        let action: 'OK'|'Expedite'|'Transfer'|'RaisePO'|'Reallocate' = 'OK'
        if (shortage && needsStock) {
          action = hasInbound ? 'Expedite' : 'RaisePO'
        }
        return {
          ItemId: r.ItemId,
          Site: r.Site,
          Warehouse: r.Warehouse,
          OnHand: r.OnHand,
          Available: r.Available,
          SafetyStock: r.SafetyStock,
          MinOnHand: r.MinOnHand,
          InboundQty: r.InboundQty,
          NextETA: r.NextETA,
          DemandQty: r.DemandQty,
          Gap: r.Gap,
          CoverDays: r.CoverDays,
          Action: action,
        } as SnapshotRow
      })
    }

    if (debug && process.env.NODE_ENV !== 'production') {
      const metrics = {
        total: snapshot.length,
        belowSafety: snapshot.filter(r => (r.OnHand ?? 0) < ((r.SafetyStock ?? r.MinOnHand ?? 0) as number)).length,
        inboundRows: snapshot.filter(r => (r.InboundQty ?? 0) > 0).length,
        inboundSum: snapshot.reduce((s, r) => s + (r.InboundQty ?? 0), 0),
        demandRows: snapshot.filter(r => (r.DemandQty ?? 0) > 0).length,
        demandSum: snapshot.reduce((s, r) => s + (r.DemandQty ?? 0), 0),
        gapRows: snapshot.filter(r => (r.Gap ?? 0) > 0).length,
        coverRows: snapshot.filter(r => (r.CoverDays ?? 0) > 0).length,
      }
      return NextResponse.json({
        data: snapshot,
        debug: {
          siteParam: filters.site,
          resolvedSiteCodes: mapSitesToCodes(filters.site),
          horizon: filters.horizon,
          onlyExceptions: filters.onlyExceptions,
          metrics,
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Snapshot API Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshot', details: process.env.NODE_ENV !== 'production' ? message : undefined },
      { status: 500 }
    );
  }
}
