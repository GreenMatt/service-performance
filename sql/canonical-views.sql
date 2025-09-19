-- Canonical Views for D365FO + Azure Synapse Integration
-- Based on specifications in CLAUDE.md section 14

-- A) Default Order Settings per Site
CREATE OR ALTER VIEW dbo.vw_DefaultOrderSettings AS
SELECT
  ios.ItemId,
  id.InventSiteId,
  /* Canonical names */
  COALESCE(ios.StdOrderQty, ios.StandardQty)   AS StdOrderQty,
  COALESCE(ios.MinOrderQty, ios.MinQty)        AS MinOrderQty,
  COALESCE(ios.MaxOrderQty, ios.MaxQty)        AS MaxOrderQty,
  COALESCE(ios.MultipleQty, ios.Multiple)      AS MultipleQty,
  ios.DefaultOrderType
FROM dbo.InventItemInventSetup ios
LEFT JOIN dbo.InventDim id
  ON id.InventDimId = ios.InventDimId AND id.DataAreaId = ios.DataAreaId
WHERE ios.DataAreaId = 'mau1';

-- B) Item Coverage at Warehouse (via coverage dimension)
CREATE OR ALTER VIEW dbo.vw_ItemCoverage AS
SELECT 
  r.ItemId,
  id.InventSiteId,
  id.InventLocationId,
  r.LeadTimePurchase      AS LeadTimeDays,
  r.MinInventOnHand       AS SafetyStockQty,   -- aligned to your view
  r.ReorderPoint          AS ReorderQty,
  r.MinInventOnHand       AS MinimumQty,       -- convenience alias
  r.MaxInventOnHand       AS MaximumQty,
  r.VendId                AS PrimaryVendor,
  r.ReqPOType             AS ReqPOType,
  ROW_NUMBER() OVER (
    PARTITION BY r.ItemId, id.InventLocationId
    ORDER BY r.RecId DESC
  ) AS rn
FROM dbo.ReqItemTable r
LEFT JOIN dbo.InventDim id
  ON id.InventDimId = r.CovInventDimId
WHERE r.DataAreaId = 'mau1';

-- C) WHS Open Pick Work (Sales)
CREATE OR ALTER VIEW dbo.vw_OpenPickWork AS
SELECT
  wt.ordernum AS SalesId,
  wt.DataAreaId,
  SUM(CASE WHEN wl.worktype IN (1) THEN wl.qtywork ELSE 0 END) AS PickWorkQty
FROM dbo.WHSWorkTable wt
JOIN dbo.WHSWorkLine  wl
  ON wl.WorkId = wt.WorkId AND wl.DataAreaId = wt.DataAreaId
WHERE wt.DataAreaId = 'mau1'
  AND wt.WorkStatus NOT IN (4,5)   -- Closed/Cancelled
  AND wt.worktranstype = 2         -- Sales order
GROUP BY wt.ordernum, wt.DataAreaId;

-- D) Service Inventory Snapshot (warehouse grain) with inbound horizon
CREATE OR ALTER VIEW bm.vw_ServiceInventorySnapshot_AU AS
WITH Params AS (
  SELECT CAST(30 AS int) AS HorizonDays, CAST('mau1' AS sysname) AS DataAreaId
),
  -- Demand (Service orders only) -- use OPEN physical demand only
  SalesAnalysis AS (
    SELECT SL.ItemId AS ItemNumber,
           CAST(SL.ShippingDateRequested AS date) AS ReqDate,
           COALESCE(SL.RemainInventPhysical, 0) AS OpenQty,
           ID.InventSiteId, ID.InventLocationId, ID.DataAreaId
    FROM dbo.SalesLine SL
    JOIN dbo.SalesTable ST ON ST.SalesId=SL.SalesId AND ST.DataAreaId=SL.DataAreaId
    LEFT JOIN dbo.InventDim ID ON ID.InventDimId=SL.InventDimId AND ID.DataAreaId=SL.DataAreaId
    LEFT JOIN dbo.InventItemGroupItem IG ON IG.ItemId=SL.ItemId AND IG.ItemDataAreaId=SL.DataAreaId
    CROSS JOIN Params P
    WHERE COALESCE(SL.RemainInventPhysical,0) > 0
      AND ST.hsoordertypeid='Service'
      AND IG.ItemGroupId IN ('10','15','20')
      AND LOWER(ST.DataAreaId)=LOWER(P.DataAreaId)
  ),
  DemandStatsByWarehouse AS (
    SELECT SA.ItemNumber, SA.InventLocationId,
         COUNT(*) AS OrderFrequency,
         AVG(SA.OpenQty) AS AvgDemandPerOrder,
         SUM(SA.OpenQty) AS TotalDemand,
         STDEV(SA.OpenQty) AS DemandStdDev,
         DATEDIFF(DAY, MIN(SA.ReqDate), MAX(SA.ReqDate)) AS AnalysisPeriodDays,
         CASE WHEN DATEDIFF(DAY, MIN(SA.ReqDate), MAX(SA.ReqDate))>0
              THEN SUM(SA.OpenQty)/CAST(DATEDIFF(DAY, MIN(SA.ReqDate), MAX(SA.ReqDate)) AS float)
              ELSE 0 END AS AvgDailyDemand
    FROM SalesAnalysis SA
    GROUP BY SA.ItemNumber, SA.InventLocationId
  ),
-- Inventory rollup
InventoryByWarehouse AS (
  SELECT s.ItemId, s.InventLocationId,
         SUM(s.PhysicalInvent) AS OnHandQty,
         SUM(s.ReservPhysical) AS ReservedQty,
         SUM(s.AvailPhysical)  AS AvailableQty
  FROM dbo.InventSum s
  CROSS JOIN Params P
  WHERE LOWER(s.DataAreaId)=LOWER(P.DataAreaId)
  GROUP BY s.ItemId, s.InventLocationId
),
-- Inbound within horizon (PO + Transfer)
InboundPO AS (
  SELECT PL.ItemId, ID.InventLocationId,
         SUM(COALESCE(PL.RemainPurchPhysical,0)) AS InboundQtyHorizon,
         MIN(COALESCE(PL.confirmedshipdate, PL.deliverydate)) AS NextETA
  FROM dbo.PurchLine PL
  JOIN dbo.InventDim ID ON ID.InventDimId=PL.InventDimId AND ID.DataAreaId=PL.DataAreaId
  CROSS JOIN Params P
  WHERE LOWER(PL.DataAreaId)=LOWER(P.DataAreaId) AND COALESCE(PL.RemainPurchPhysical,0)>0
    AND COALESCE(PL.confirmedshipdate, PL.deliverydate)
        <= DATEADD(DAY, P.HorizonDays, CAST(GETDATE() AS date))
  GROUP BY PL.ItemId, ID.InventLocationId
),
InboundTO AS (
  SELECT ITL.ItemId, ITL.ToInventLocationId AS InventLocationId,
         SUM(COALESCE(ITL.QtyRemainReceive,0)) AS InboundQtyHorizon,
         MIN(ITL.receivedate) AS NextETA
  FROM dbo.InventTransferLine ITL
  JOIN dbo.InventTransferTable ITT ON ITT.InventTransferId=ITL.InventTransferId
  CROSS JOIN Params P
  WHERE LOWER(ITL.DataAreaId)=LOWER(P.DataAreaId) AND COALESCE(ITL.QtyRemainReceive,0)>0
    AND ITL.receivedate <= DATEADD(DAY, P.HorizonDays, CAST(GETDATE() AS date))
  GROUP BY ITL.ItemId, ITL.ToInventLocationId
),
InboundHorizon AS (
  SELECT ItemId, InventLocationId,
         SUM(InboundQtyHorizon) AS InboundQtyWithinHorizon,
         MIN(NextETA) AS NextETAWithinHorizon
  FROM (
    SELECT * FROM InboundPO
    UNION ALL
    SELECT * FROM InboundTO
  ) u
  GROUP BY ItemId, InventLocationId
),
AllKeys AS (
  SELECT DISTINCT ItemId AS ItemNumber, InventLocationId FROM InventoryByWarehouse
  UNION SELECT ItemNumber, InventLocationId FROM DemandStatsByWarehouse
  UNION SELECT ItemId, InventLocationId FROM InboundHorizon
  UNION SELECT ItemId, InventLocationId FROM dbo.vw_ItemCoverage WHERE rn=1
)
SELECT
  k.ItemNumber,
  id.InventSiteId AS SiteID,
  k.InventLocationId AS WarehouseID,
  -- Inventory
  ISNULL(iw.OnHandQty,0)     AS WarehouseOnHand,
  ISNULL(iw.AvailableQty,0)  AS WarehouseAvailable,
  ISNULL(iw.ReservedQty,0)   AS WarehouseReserved,
  -- Coverage (warehouse)
  COALESCE(NULLIF(cov.LeadTimeDays,0),15) AS LeadTimeDays,
  cov.PrimaryVendor,
  cov.ReqPOType,
  cov.SafetyStockQty       AS CurrentSafetyStock,
  cov.ReorderQty           AS CurrentReorderQty,
  cov.MinimumQty           AS CurrentMinOnHand,
  cov.MaximumQty           AS CurrentMaxOnHand,
  -- Demand stats
  ISNULL(ds.AvgDailyDemand,0) AS WarehouseAvgDailyDemand,
  ISNULL(ds.DemandStdDev,0)   AS WarehouseDemandStdDev,
  ISNULL(ds.TotalDemand,0)    AS WarehouseTotalDemand,
  ISNULL(ds.OrderFrequency,0) AS WarehouseOrderFrequency,
  -- Horizon supply
  ISNULL(ih.InboundQtyWithinHorizon,0) AS InboundQtyWithinHorizon,
  ih.NextETAWithinHorizon,
  -- KPI flags
  CASE WHEN ISNULL(iw.AvailableQty,0) < COALESCE(NULLIF(cov.SafetyStockQty,0), NULLIF(cov.MinimumQty,0), 0)
       THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS PartsBelowSafety,
  CASE WHEN ISNULL(ih.InboundQtyWithinHorizon,0) > 0 THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasInboundWithinHorizon,
  CASE WHEN (ISNULL(iw.AvailableQty,0) < COALESCE(NULLIF(cov.SafetyStockQty,0), NULLIF(cov.MinimumQty,0), 0))
            AND ISNULL(ih.InboundQtyWithinHorizon,0) = 0
       THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS BelowSafety_NoSupply
FROM AllKeys k
LEFT JOIN InventoryByWarehouse iw ON iw.ItemId=k.ItemNumber AND iw.InventLocationId=k.InventLocationId
LEFT JOIN DemandStatsByWarehouse ds ON ds.ItemNumber=k.ItemNumber AND ds.InventLocationId=k.InventLocationId
LEFT JOIN InboundHorizon ih ON ih.ItemId=k.ItemNumber AND ih.InventLocationId=k.InventLocationId
LEFT JOIN bm.vw_ItemCoverage_AU cov ON cov.ItemId=k.ItemNumber AND cov.InventLocationId=k.InventLocationId AND cov.rn=1
LEFT JOIN dbo.InventLocation il ON il.InventLocationId=k.InventLocationId
LEFT JOIN dbo.InventSite id ON id.InventSiteId=il.InventSiteId;
