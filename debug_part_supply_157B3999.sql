-- Debug inbound supply for part 157B3999
-- Investigation query for supply discrepancy

-- === 1. PURCHASE ORDER LINES ===
SELECT
    'PURCHASE_ORDERS' as SourceType,
    PT.PurchId,
    PL.ItemId,
    PL.PurchQty as OrderedQty,
    PL.RemainPurchPhysical as RemainingQty,
    PL.PurchPrice,
    PL.LineAmount,
    COALESCE(PL.ConfirmedDlvDate, PL.RequestedDlvDate, PL.DeliveryDate) AS DeliveryDate,
    PT.PurchStatus,
    PT.VendAccount,
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

-- === 2. TRANSFER ORDER LINES (INBOUND) ===
SELECT
    'TRANSFER_ORDERS_IN' as SourceType,
    ITT.InventTransferId,
    ITL.ItemId,
    ITL.QtyTransfer as OrderedQty,
    ITL.QtyRemainReceive as RemainingQty,
    NULL as PurchPrice,
    NULL as LineAmount,
    COALESCE(ITL.ConfirmedDlvDate, ITL.DlvDate) AS DeliveryDate,
    ITT.InventTransferStatus,
    ITL.FromInventLocationId,
    ITL.ToInventLocationId,
    ITL.createddatetime as CreatedDate,
    ITL.modifieddatetime as ModifiedDate
FROM dbo.InventTransferLine ITL
JOIN dbo.InventTransferTable ITT ON ITT.InventTransferId = ITL.InventTransferId AND ITT.DataAreaId = ITL.DataAreaId
WHERE ITL.ItemId = '157B3999'
    AND ITL.DataAreaId = 'mau1'
    AND ITT.InventTransferStatus IN (1, 2, 3) -- Open statuses
ORDER BY ITL.createddatetime DESC;

-- === 3. CURRENT INVENTORY POSITION ===
SELECT
    'CURRENT_INVENTORY' as SourceType,
    s.ItemId,
    s.InventLocationId,
    il.Name as WarehouseName,
    SUM(s.PhysicalInvent) AS OnHandQty,
    SUM(s.ReservPhysical) AS ReservedQty,
    SUM(s.AvailPhysical) AS AvailableQty,
    SUM(s.OnOrder) AS OnOrderQty
FROM dbo.InventSum s
LEFT JOIN dbo.InventLocation il ON il.InventLocationId = s.InventLocationId
WHERE s.ItemId = '157B3999'
    AND s.DataAreaId = 'mau1'
GROUP BY s.ItemId, s.InventLocationId, il.Name
ORDER BY s.InventLocationId;

-- === 4. RECENT TRANSACTIONS ===
SELECT TOP 20
    'RECENT_TRANSACTIONS' as SourceType,
    IT.ItemId,
    IT.Qty,
    IT.Direction,
    IT.TransType,
    IT.Reference,
    IT.DatePhysical,
    IT.InventLocationId,
    IT.StatusIssue,
    IT.StatusReceipt,
    IT.createddatetime as CreatedDate
FROM dbo.InventTrans IT
WHERE IT.ItemId = '157B3999'
    AND IT.DataAreaId = 'mau1'
    AND IT.createddatetime >= DATEADD(DAY, -30, GETDATE()) -- Last 30 days
ORDER BY IT.createddatetime DESC;

-- === 5. ITEM COVERAGE SETTINGS ===
SELECT
    'ITEM_COVERAGE' as SourceType,
    r.ItemId,
    id.InventSiteId,
    id.InventLocationId,
    r.LeadTimePurchase,
    r.MinInventOnHand as SafetyStock,
    r.ReorderPoint,
    r.VendId as PrimaryVendor,
    r.ReqPOType
FROM dbo.ReqItemTable r
LEFT JOIN dbo.InventDim id ON id.InventDimId = r.CovInventDimId
WHERE r.ItemId = '157B3999'
    AND r.DataAreaId = 'mau1';

-- === 6. SUMMARY FOR HORIZON CALCULATION ===
WITH InboundPO AS (
    SELECT
        SUM(COALESCE(PL.RemainPurchPhysical, 0)) AS InboundQtyPO,
        MIN(COALESCE(PL.ConfirmedDlvDate, PL.RequestedDlvDate, PL.DeliveryDate)) AS NextETAPO
    FROM dbo.PurchLine PL
    JOIN dbo.PurchTable PT ON PT.PurchId = PL.PurchId AND PT.DataAreaId = PL.DataAreaId
    WHERE PL.ItemId = '157B3999'
        AND PL.DataAreaId = 'mau1'
        AND PT.PurchStatus IN (1, 2, 3, 4)
        AND COALESCE(PL.ConfirmedDlvDate, PL.RequestedDlvDate, PL.DeliveryDate) <= DATEADD(DAY, 30, GETDATE())
),
InboundTO AS (
    SELECT
        SUM(COALESCE(ITL.QtyRemainReceive, 0)) AS InboundQtyTO,
        MIN(COALESCE(ITL.ConfirmedDlvDate, ITL.DlvDate)) AS NextETATO
    FROM dbo.InventTransferLine ITL
    JOIN dbo.InventTransferTable ITT ON ITT.InventTransferId = ITL.InventTransferId AND ITT.DataAreaId = ITL.DataAreaId
    WHERE ITL.ItemId = '157B3999'
        AND ITL.DataAreaId = 'mau1'
        AND ITT.InventTransferStatus IN (1, 2, 3)
        AND COALESCE(ITL.ConfirmedDlvDate, ITL.DlvDate) <= DATEADD(DAY, 30, GETDATE())
)
SELECT
    'HORIZON_SUMMARY' as SourceType,
    '157B3999' as ItemId,
    ISNULL(po.InboundQtyPO, 0) as InboundQtyPO_30Days,
    ISNULL(to_.InboundQtyTO, 0) as InboundQtyTO_30Days,
    ISNULL(po.InboundQtyPO, 0) + ISNULL(to_.InboundQtyTO, 0) as TotalInbound_30Days,
    po.NextETAPO,
    to_.NextETATO
FROM InboundPO po
CROSS JOIN InboundTO to_;