-- Debug WIP and Parts cost differences for Fairbank
-- Compare exact calculations

-- === 1. WORK ORDER COUNT CHECK ===
SELECT
    'WORK_ORDER_COUNT' as CheckType,
    COUNT(*) as TotalCount
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE';

-- === 2. WIP VALUE DETAILED BREAKDOWN ===
SELECT
    'WIP_VALUE_BREAKDOWN' as CheckType,
    CASE wo.msdyn_systemstatus
        WHEN 690970000 THEN 'Unscheduled'
        WHEN 690970001 THEN 'Scheduled'
        WHEN 690970002 THEN 'InProgress'
        WHEN 690970003 THEN 'Completed'
    END AS Status,
    COUNT(*) as Count,
    SUM(COALESCE(wo.msdyn_productsservicescost, 0)) as TotalWIPValue,
    MIN(COALESCE(wo.msdyn_productsservicescost, 0)) as MinWIPValue,
    MAX(COALESCE(wo.msdyn_productsservicescost, 0)) as MaxWIPValue,
    AVG(COALESCE(wo.msdyn_productsservicescost, 0)) as AvgWIPValue
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
GROUP BY wo.msdyn_systemstatus
ORDER BY wo.msdyn_systemstatus;

-- === 3. PARTS COST DETAILED BREAKDOWN ===
SELECT
    'PARTS_COST_BREAKDOWN' as CheckType,
    CASE wo.msdyn_systemstatus
        WHEN 690970000 THEN 'Unscheduled'
        WHEN 690970001 THEN 'Scheduled'
        WHEN 690970002 THEN 'InProgress'
        WHEN 690970003 THEN 'Completed'
    END AS Status,
    COUNT(*) as Count,
    SUM(COALESCE(wo.itw_totalcostpart, 0)) as TotalPartsCost,
    MIN(COALESCE(wo.itw_totalcostpart, 0)) as MinPartsCost,
    MAX(COALESCE(wo.itw_totalcostpart, 0)) as MaxPartsCost,
    AVG(COALESCE(wo.itw_totalcostpart, 0)) as AvgPartsCost
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
GROUP BY wo.msdyn_systemstatus
ORDER BY wo.msdyn_systemstatus;

-- === 4. CHECK FOR NULL vs ZERO VALUES ===
SELECT
    'NULL_ZERO_CHECK' as CheckType,
    COUNT(*) as TotalRecords,
    COUNT(CASE WHEN wo.msdyn_productsservicescost IS NULL THEN 1 END) as WIP_NULL_Count,
    COUNT(CASE WHEN wo.msdyn_productsservicescost = 0 THEN 1 END) as WIP_ZERO_Count,
    COUNT(CASE WHEN wo.msdyn_productsservicescost > 0 THEN 1 END) as WIP_POSITIVE_Count,
    COUNT(CASE WHEN wo.itw_totalcostpart IS NULL THEN 1 END) as PARTS_NULL_Count,
    COUNT(CASE WHEN wo.itw_totalcostpart = 0 THEN 1 END) as PARTS_ZERO_Count,
    COUNT(CASE WHEN wo.itw_totalcostpart > 0 THEN 1 END) as PARTS_POSITIVE_Count
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE';

-- === 5. FINAL TOTALS (should match your query) ===
SELECT
    'FINAL_TOTALS' as CheckType,
    COUNT(*) as WorkOrderCount,
    SUM(COALESCE(wo.itw_totalcostlabour, 0)) as TotalLabourCost,
    SUM(COALESCE(wo.msdyn_productsservicescost, 0)) as TotalWIPValue,
    SUM(COALESCE(wo.itw_totalcostpart, 0)) as TotalPartsCost,
    SUM(COALESCE(wo.itw_totalcostlabour, 0)) + SUM(COALESCE(wo.itw_totalcostpart, 0)) as LabourPlusParts
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE';

-- === 6. CHECK FOR DUPLICATES BY WORK ORDER ID ===
SELECT
    'DUPLICATE_CHECK' as CheckType,
    wo.msdyn_name,
    COUNT(*) as DuplicateCount
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
GROUP BY wo.msdyn_name
HAVING COUNT(*) > 1;