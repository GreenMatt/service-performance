import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { executeQuery } from '@/lib/database'

export async function GET(_req: NextRequest) {
  try {
    if (process.env.USE_MOCK_DATA === 'true') {
      const filePath = path.join(process.cwd(), 'data', 'work-orders.json')
      const fileContent = fs.readFileSync(filePath, 'utf8')
      const rows: Array<{ Site: string }> = JSON.parse(fileContent)
      const names = Array.from(new Set(rows.map(r => r.Site).filter(Boolean))).sort()
      return NextResponse.json(names)
    }

    // Prefer display name column; fallback to itw_site if needed
    const queryPreferred = `
      SELECT DISTINCT LTRIM(RTRIM(wo.itw_sitename)) AS Name
      FROM ${process.env.WORK_ORDERS_SOURCE || 'dbo.msdyn_workorder'} wo
      WHERE wo.itw_sitename IS NOT NULL AND LTRIM(RTRIM(wo.itw_sitename)) <> ''
      ORDER BY Name`;

    let names: Array<{ Name: string }> = []
    try {
      names = await executeQuery<{ Name: string }>(queryPreferred)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/Invalid column name/i.test(msg)) {
        const fallback = `
          SELECT DISTINCT LTRIM(RTRIM(wo.itw_site)) AS Name
          FROM ${process.env.WORK_ORDERS_SOURCE || 'dbo.msdyn_workorder'} wo
          WHERE wo.itw_site IS NOT NULL AND LTRIM(RTRIM(wo.itw_site)) <> ''
          ORDER BY Name`;
        names = await executeQuery<{ Name: string }>(fallback)
      } else {
        throw e
      }
    }

    return NextResponse.json(names.map(n => n.Name))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Failed to fetch sites', details: message }, { status: 500 })
  }
}

