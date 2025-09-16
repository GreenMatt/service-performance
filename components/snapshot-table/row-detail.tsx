import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SnapshotRow, SupplyRow, DemandRow } from '@/lib/types'
import { formatDate, formatRelativeTime } from '@/lib/date'
import { Package, Truck, ShoppingCart, ExternalLink } from 'lucide-react'
import useSWR from 'swr'
import { fetcher, SWR_KEYS } from '@/lib/fetcher'

interface RowDetailProps {
  row: SnapshotRow
}

export function RowDetail({ row }: RowDetailProps) {
  // Fetch supply and demand details for this specific item/site
  const { data: supply = [] } = useSWR<SupplyRow[]>(
    SWR_KEYS.supply({ 
      site: row.Site,
      // Filter by ItemId would be done server-side in a real implementation
    }), 
    fetcher
  )
  
  const { data: demand = [] } = useSWR<DemandRow[]>(
    SWR_KEYS.demand({ 
      site: row.Site,
    }), 
    fetcher
  )

  // Filter to this specific item (in real implementation, this would be server-side)
  const itemSupply = supply.filter(s => s.ItemId === row.ItemId && s.Site === row.Site)
  const itemDemand = demand.filter(d => d.ItemId === row.ItemId && d.Site === row.Site)

  return (
    <div className="p-4 bg-muted/30 border-t">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Supply Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-green-600" />
              Inbound Supply
              <Badge variant="secondary">{itemSupply.length} lines</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {itemSupply.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No inbound supply within horizon
              </p>
            ) : (
              <div className="space-y-3">
                {itemSupply.map((supplyLine, index) => (
                  <div 
                    key={`${supplyLine.Ref}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={supplyLine.Source === 'PO' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {supplyLine.Source}
                        </Badge>
                        <span className="font-medium font-mono text-sm">
                          {supplyLine.Ref}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Qty: <strong>{supplyLine.Qty.toLocaleString()}</strong></span>
                        <span>ETA: <strong>{supplyLine.ETA ? formatDate(supplyLine.ETA) : 'TBD'}</strong></span>
                        {supplyLine.ETA && (
                          <span className="text-blue-600">
                            {formatRelativeTime(supplyLine.ETA)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demand Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              Demand Lines
              <Badge variant="secondary">{itemDemand.length} lines</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {itemDemand.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active demand
              </p>
            ) : (
              <div className="space-y-3">
                {itemDemand.map((demandLine, index) => (
                  <div 
                    key={`${demandLine.Ref}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={demandLine.DemandType === 'WorkOrder' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {demandLine.DemandType}
                        </Badge>
                        <span className="font-medium font-mono text-sm">
                          {demandLine.Ref}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Qty: <strong>{demandLine.Qty.toLocaleString()}</strong></span>
                        <span>Need By: <strong>{demandLine.NeedBy ? formatDate(demandLine.NeedBy) : 'ASAP'}</strong></span>
                        {demandLine.NeedBy && (
                          <span className={`font-medium ${
                            new Date(demandLine.NeedBy) < new Date() ? 'text-red-600' :
                            new Date(demandLine.NeedBy) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {formatRelativeTime(demandLine.NeedBy)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Row */}
      <div className="mt-4 p-3 rounded-lg bg-background border">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Current:</span>
            <div className="font-medium">{row.OnHand.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Safety:</span>
            <div className="font-medium">{row.SafetyStock.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Inbound:</span>
            <div className="font-medium text-green-600">
              {row.InboundQty > 0 ? `+${row.InboundQty.toLocaleString()}` : '0'}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Demand:</span>
            <div className="font-medium text-blue-600">
              {row.DemandQty > 0 ? `-${row.DemandQty.toLocaleString()}` : '0'}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Net Gap:</span>
            <div className={`font-medium ${
              row.Gap > 0 ? 'text-red-600' : 
              row.Gap < 0 ? 'text-green-600' : 
              'text-muted-foreground'
            }`}>
              {row.Gap > 0 ? `${row.Gap.toLocaleString()}` : 
               row.Gap < 0 ? `+${Math.abs(row.Gap).toLocaleString()}` : '0'}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Next ETA:</span>
            <div className="font-medium">
              {row.NextETA ? formatDate(row.NextETA) : 'None'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}