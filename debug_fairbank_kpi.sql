-- Debug query to match exactly what the KPI calculation should show for Fairbank
-- This matches the dashboard's KPI logic

-- === WHAT THE DASHBOARD SHOULD BE CALCULATING ===
SELECT
    'FAIRBANK_KPI_TOTALS' as QueryType,
    wo.itw_sitename,
    COUNT(*) as WorkOrderCount,
    SUM(COALESCE(wo.itw_totalcostlabour, 0)) as TotalLabourCost,
    SUM(COALESCE(wo.msdyn_productsservicescost, 0)) as TotalWIPValue,
    SUM(COALESCE(wo.itw_totalcostpart, 0)) as TotalPartsCost,
    SUM(COALESCE(wo.itw_totalcostlabour, 0)) + SUM(COALESCE(wo.itw_totalcostpart, 0)) as LabourPlusParts
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (
        690970000, -- Unscheduled
        690970002, -- InProgress
        690970001, -- Scheduled
        690970003  -- Completed
    )
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
    AND (COALESCE(wo.itw_totalcostlabour, 0) > 0 OR COALESCE(wo.itw_totalcostpart, 0) > 0)
GROUP BY wo.itw_sitename;

-- === BREAKDOWN BY STATUS FOR FAIRBANK ===
SELECT
    'FAIRBANK_BY_STATUS' as QueryType,
    CASE wo.msdyn_systemstatus
        WHEN 690970000 THEN 'Unscheduled'
        WHEN 690970001 THEN 'Scheduled'
        WHEN 690970002 THEN 'InProgress'
        WHEN 690970003 THEN 'Completed'
        ELSE 'Other'
    END AS Status,
    COUNT(*) as Count,
    SUM(COALESCE(wo.itw_totalcostlabour, 0)) as TotalLabourCost,
    SUM(COALESCE(wo.msdyn_productsservicescost, 0)) as TotalWIPValue,
    SUM(COALESCE(wo.itw_totalcostpart, 0)) as TotalPartsCost
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
    AND (COALESCE(wo.itw_totalcostlabour, 0) > 0 OR COALESCE(wo.itw_totalcostpart, 0) > 0)
GROUP BY wo.msdyn_systemstatus
ORDER BY wo.msdyn_systemstatus;

-- === CHECK IF THERE ARE RECORDS WITHOUT COSTS ===
SELECT
    'FAIRBANK_ALL_RECORDS' as QueryType,
    COUNT(*) as TotalRecords,
    COUNT(CASE WHEN COALESCE(wo.itw_totalcostlabour, 0) > 0 OR COALESCE(wo.itw_totalcostpart, 0) > 0 THEN 1 END) as RecordsWithCosts,
    COUNT(CASE WHEN COALESCE(wo.itw_totalcostlabour, 0) = 0 AND COALESCE(wo.itw_totalcostpart, 0) = 0 THEN 1 END) as RecordsWithoutCosts
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE';

-- === YOUR ORIGINAL QUERY FOR COMPARISON ===
SELECT
    'YOUR_QUERY_TOTALS' as QueryType,
    wo.itw_sitename,
    SUM(wo.itw_totalcostlabour) as TotalLabourCost,
    SUM(wo.msdyn_productsservicescost) AS TotalWIPValue,
    SUM(wo.itw_totalcostpart) as TotalPartsCost
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
    AND wo.statecode = 0
GROUP BY wo.itw_sitename;