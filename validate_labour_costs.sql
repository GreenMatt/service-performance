-- Query to validate labour costs for WO-18142 and other work orders
-- Run this directly in your SQL environment

-- 1. Check specific work order WO-18142
SELECT
    wo.msdyn_name AS WorkOrderId,
    wo.msdyn_systemstatus,
    CASE wo.msdyn_systemstatus
        WHEN 690970000 THEN 'Unscheduled'
        WHEN 690970001 THEN 'Scheduled'
        WHEN 690970002 THEN 'InProgress'
        WHEN 690970003 THEN 'Completed'
        WHEN 690970004 THEN 'Posted'
        WHEN 690970005 THEN 'Canceled'
        ELSE 'Unknown'
    END AS Status,
    wo.itw_sitename,
    wo.itw_site,
    wo.createdon,
    -- All possible labour cost fields to check
    wo.itw_totalcostlabour,
    wo.msdyn_estimatedlabourcost,
    wo.msdyn_actualcost,
    wo.msdyn_productsservicescost AS WIPValue,
    wo.itw_totalcostpart,
    wo.itw_grossmargin2
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_name = 'WO-18142';

-- 2. Check if ANY work orders have labour costs > 0
SELECT TOP 10
    wo.msdyn_name AS WorkOrderId,
    wo.itw_sitename,
    wo.itw_totalcostlabour,
    wo.msdyn_estimatedlabourcost,
    wo.msdyn_actualcost,
    wo.msdyn_productsservicescost,
    wo.itw_totalcostpart
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND (wo.itw_totalcostlabour > 0
         OR wo.msdyn_estimatedlabourcost > 0
         OR wo.msdyn_actualcost > 0)
ORDER BY wo.createdon DESC;

-- 3. Check column existence and data types
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'msdyn_workorder'
    AND COLUMN_NAME IN (
        'itw_totalcostlabour',
        'msdyn_estimatedlabourcost',
        'msdyn_actualcost',
        'msdyn_productsservicescost',
        'itw_totalcostpart'
    );

-- 4. Sample of recent work orders with costs
SELECT TOP 20
    wo.msdyn_name,
    wo.itw_sitename,
    wo.itw_totalcostlabour,
    wo.itw_totalcostpart,
    wo.msdyn_productsservicescost,
    wo.createdon
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.createdon >= DATEADD(day, -30, GETDATE())
ORDER BY wo.createdon DESC;