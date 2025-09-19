-- Query to debug Open Work Orders KPI count FOR L-FBK SITE
-- This shows exactly what the dashboard is counting for L-FBK

-- === TOTAL COUNT FOR L-FBK (what the KPI shows) ===
SELECT
    'L-FBK_KPI_TOTAL' as QueryType,
    COUNT(*) as TotalWorkOrderCount
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.msdyn_name IS NOT NULL
    AND wo.msdyn_systemstatus IN (
        690970000, -- Unscheduled
        690970002, -- InProgress
        690970001, -- Scheduled
        690970003  -- Completed
    )
    AND (wo.itw_sitename = 'L-FBK' OR wo.itw_site = 'L-FBK');

-- === BREAKDOWN BY STATUS FOR L-FBK ===
SELECT
    'L-FBK_BY_STATUS' as QueryType,
    CASE wo.msdyn_systemstatus
        WHEN 690970000 THEN 'Unscheduled'
        WHEN 690970001 THEN 'Scheduled'
        WHEN 690970002 THEN 'InProgress'
        WHEN 690970003 THEN 'Completed'
        WHEN 690970004 THEN 'Posted'
        WHEN 690970005 THEN 'Canceled'
        ELSE CAST(wo.msdyn_systemstatus AS VARCHAR)
    END AS Status,
    wo.msdyn_systemstatus as StatusCode,
    COUNT(*) as Count
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.msdyn_name IS NOT NULL
    AND (wo.itw_sitename = 'L-FBK' OR wo.itw_site = 'L-FBK')
GROUP BY wo.msdyn_systemstatus
ORDER BY wo.msdyn_systemstatus;

-- === COMPARE: JUST "OPEN" ORDERS FOR L-FBK (excluding Completed) ===
SELECT
      wo.itw_sitename,
      COUNT(wo.itw_SiteName),
      SUM(wo.itw_totalcostlabour) 'Labour and Other Costs',
      SUM(wo.msdyn_productsservicescost) AS OpenWIpValue,
      SUM(wo.itw_totalcostpart) TotalPartCost,
      SUM(msdyn_totalamount)
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    --AND wo.msdyn_name IS NOT NULL
    AND wo.msdyn_systemstatus IN (
        690970000, -- Unscheduled
        690970002, -- InProgress
        690970001,  -- Scheduled
        690970003 -- Completed
    )
    --AND (wo.itw_sitename = 'FAIRBANK SALES & SERVICE')
    --AND wo.statecode =  0 -- 0 = Active 1 Inactive
    GROUP BY wo.itw_sitename
-- === CHECK WHAT SITE VALUES EXIST (in case L-FBK is named differently) ===
SELECT DISTINCT
    wo.itw_sitename,
    wo.itw_site,
    COUNT(*) as Count
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.msdyn_name IS NOT NULL
    AND (wo.itw_sitename LIKE '%FBK%' OR wo.itw_site LIKE '%FBK%'
         OR wo.itw_sitename LIKE '%FAIRBANK%' OR wo.itw_site LIKE '%FAIRBANK%')
GROUP BY wo.itw_sitename, wo.itw_site
ORDER BY COUNT(*) DESC;

SELECT
    'PURCHASE_ORDERS' as SourceType,
    PT.PurchId,
    PL.ItemId,
    PL.PurchQty as OrderedQty,
    PL.RemainPurchPhysical as RemainingQty,
    PL.PurchPrice,
    PL.LineAmount,
    --COALESCE(PL.ConfirmedDlvDate, PL.RequestedDlvDate, PL.DeliveryDate) AS DeliveryDate,
    PT.PurchStatus,
    --PT.VendAccount,
    ID.InventSiteId,
    ID.InventLocationId,
    PL.createddatetime as CreatedDate,
    PL.modifieddatetime as ModifiedDate
FROM dbo.PurchLine PL
JOIN dbo.PurchTable PT ON PT.PurchId = PL.PurchId AND PT.DataAreaId = PL.DataAreaId
LEFT JOIN dbo.InventDim ID ON ID.InventDimId = PL.InventDimId AND ID.DataAreaId = PL.DataAreaId
WHERE PL.ItemId = '157B3999'
    AND PL.DataAreaId = 'mau1'
    AND PT.PurchStatus IN (1, 2, 3, 4) -- Open statuses
ORDER BY PL.createddatetime DESC;

SELECT
    s.ITEMID                         AS [Item],
    d.INVENTSITEID                   AS [Site],
    d.INVENTLOCATIONID               AS [Warehouse],
    d.WMSLOCATIONID                  AS [Location],
    d.CONFIGID                       AS [Configuration],
    d.INVENTSERIALID                 AS [Serial Number],
    SUM(COALESCE(s.PHYSICALINVENT, 0))  AS [Physical Inventory],
    SUM(COALESCE(s.RESERVPHYSICAL, 0))  AS [Physical Reserved],
    SUM(COALESCE(s.AVAILPHYSICAL, 0))   AS [Available Physical],
    CASE IGr.ItemGroupID WHEN 30 THEN 'Body' WHEN 41 THEN 'Chassis' END AS [ItemGroup],
    MAX(so.SalesID) 'SalesID',
    CASE 
      WHEN SUM(s.postedvalue) <> 0
       AND (SUM(s.postedqty) + SUM(s.received) - SUM(s.deducted)) <> 0
      THEN (SUM(s.physicalvalue) + SUM(s.postedvalue))
           / NULLIF(SUM(s.postedqty) + SUM(s.received) - SUM(s.deducted), 0)
      ELSE 0
    END AS CostPrice
FROM dbo.InventSum s
JOIN dbo.InventDim d
  ON d.INVENTDIMID = s.INVENTDIMID
 AND d.DATAAREAID  = s.DATAAREAID
JOIN dbo.InventItemGroupItem IGr
  ON IGr.ItemId = s.ItemId
 AND IGr.ItemDataAreaId = s.DataAreaId
 OUTER APPLY (
    SELECT TOP (1)
        IG.ReferenceId AS SalesID
    FROM dbo.InventTrans IT
    JOIN dbo.InventTransOrigin IG
      ON IG.RecId = IT.InventTransOrigin
    WHERE IT.DataAreaId  = s.DataAreaId
      AND IT.ItemId      = s.ItemId
      AND IT.InventDimId = s.InventDimId
      AND IG.ReferenceId IS NOT NULL
      -- optional tighten-up if you only want sales orders / relevant issues:
      -- AND IG.ReferenceCategory = 0      -- Sales order (check enum in your env)
      -- AND IT.StatusIssue IN (1,2)       -- e.g., ReservPhysical/Sold (verify enum)
    --ORDER BY IT.TransDate DESC, IT.RecId DESC
) AS so
WHERE UPPER(s.DATAAREAID) = 'MAU1'
  AND s.CLOSED = 0
  --AND UPPER(d.WMSLOCATIONID) LIKE 'FINISH%'
  AND IGr.ItemGroupID IN (30,41)
GROUP BY
    s.ITEMID, d.INVENTSITEID, d.INVENTLOCATIONID, d.WMSLOCATIONID,
    d.CONFIGID, d.INVENTSERIALID, IGr.ItemGroupID
HAVING
    -- FinOps On-hand hides zero rows; do the same
    SUM(COALESCE(s.PHYSICALINVENT,0))
  + SUM(COALESCE(s.RESERVPHYSICAL,0))
  + SUM(COALESCE(s.AVAILPHYSICAL,0)) <> 0;
GO
