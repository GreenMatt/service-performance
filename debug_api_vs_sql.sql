-- Debug query to compare API calls vs your single SQL query for Fairbank

-- === YOUR SINGLE QUERY (CORRECT RESULTS) ===
SELECT
    'YOUR_SINGLE_QUERY' as QueryType,
    COUNT(*) as WorkOrderCount,
    SUM(wo.itw_totalcostlabour) as TotalLabourCost,
    SUM(wo.msdyn_productsservicescost) AS TotalWIPValue,
    SUM(wo.itw_totalcostpart) as TotalPartsCost
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.msdyn_systemstatus IN (
        690970000, -- Unscheduled
        690970002, -- InProgress
        690970001, -- Scheduled
        690970003  -- Completed
    )
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
    AND wo.statecode = 0
GROUP BY 'single';

-- === API CALL 1: Open Work Orders (Unscheduled, InProgress, Scheduled) ===
SELECT
    'API_CALL_1_OPEN' as QueryType,
    COUNT(*) as WorkOrderCount,
    SUM(wo.itw_totalcostlabour) as TotalLabourCost,
    SUM(wo.msdyn_productsservicescost) AS TotalWIPValue,
    SUM(wo.itw_totalcostpart) as TotalPartsCost
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.msdyn_systemstatus IN (
        690970000, -- Unscheduled
        690970002, -- InProgress
        690970001  -- Scheduled
    )
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
    AND wo.statecode = 0
GROUP BY 'api1';

-- === API CALL 2: Completed Work Orders (Completed, Posted) ===
SELECT
    'API_CALL_2_COMPLETED' as QueryType,
    COUNT(*) as WorkOrderCount,
    SUM(wo.itw_totalcostlabour) as TotalLabourCost,
    SUM(wo.msdyn_productsservicescost) AS TotalWIPValue,
    SUM(wo.itw_totalcostpart) as TotalPartsCost
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.msdyn_systemstatus IN (
        690970003, -- Completed
        690970004  -- Posted
    )
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
    AND wo.statecode = 0
GROUP BY 'api2';

-- === COMBINED API CALLS (API1 + API2) ===
SELECT
    'COMBINED_API_CALLS' as QueryType,
    SUM(woc.WorkOrderCount) as WorkOrderCount,
    SUM(woc.TotalLabourCost) as TotalLabourCost,
    SUM(woc.TotalWIPValue) AS TotalWIPValue,
    SUM(woc.TotalPartsCost) as TotalPartsCost
FROM (
    -- API Call 1 data
    SELECT
        COUNT(*) as WorkOrderCount,
        SUM(wo.itw_totalcostlabour) as TotalLabourCost,
        SUM(wo.msdyn_productsservicescost) AS TotalWIPValue,
        SUM(wo.itw_totalcostpart) as TotalPartsCost
    FROM dbo.msdyn_workorder wo
    WHERE wo.msdyn_workorderid IS NOT NULL
        AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001)
        AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
        AND wo.statecode = 0

    UNION ALL

    -- API Call 2 data
    SELECT
        COUNT(*) as WorkOrderCount,
        SUM(wo.itw_totalcostlabour) as TotalLabourCost,
        SUM(wo.msdyn_productsservicescost) AS TotalWIPValue,
        SUM(wo.itw_totalcostpart) as TotalPartsCost
    FROM dbo.msdyn_workorder wo
    WHERE wo.msdyn_workorderid IS NOT NULL
        AND wo.msdyn_systemstatus IN (690970003, 690970004)
        AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
        AND wo.statecode = 0
) woc;

-- === CHECK FOR NULL VALUES IMPACT ===
SELECT
    'NULL_VALUES_CHECK' as QueryType,
    COUNT(*) as TotalRecords,
    COUNT(CASE WHEN wo.msdyn_productsservicescost IS NULL THEN 1 END) as WIP_NULL_Count,
    COUNT(CASE WHEN wo.itw_totalcostpart IS NULL THEN 1 END) as PARTS_NULL_Count,
    SUM(CASE WHEN wo.msdyn_productsservicescost IS NULL THEN 0 ELSE wo.msdyn_productsservicescost END) as WIP_SUM_NULL_AS_ZERO,
    SUM(CASE WHEN wo.itw_totalcostpart IS NULL THEN 0 ELSE wo.itw_totalcostpart END) as PARTS_SUM_NULL_AS_ZERO
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE'
    AND wo.statecode = 0;