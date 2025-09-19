-- Debug why we're getting 7079 instead of 325 work orders

-- === 1. CHECK ALL SITE NAMES ===
SELECT
    'ALL_SITES' as CheckType,
    wo.itw_sitename,
    COUNT(*) as Count
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
GROUP BY wo.itw_sitename
ORDER BY COUNT(*) DESC;

-- === 2. CHECK FAIRBANK VARIATIONS ===
SELECT
    'FAIRBANK_VARIATIONS' as CheckType,
    wo.itw_sitename,
    wo.itw_site,
    COUNT(*) as Count
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND (wo.itw_sitename LIKE '%FAIRBANK%'
         OR wo.itw_site LIKE '%FAIRBANK%'
         OR wo.itw_sitename LIKE '%FBK%'
         OR wo.itw_site LIKE '%FBK%')
GROUP BY wo.itw_sitename, wo.itw_site
ORDER BY COUNT(*) DESC;

-- === 3. CHECK STATUS BREAKDOWN (no site filter) ===
SELECT
    'STATUS_BREAKDOWN_ALL' as CheckType,
    CASE wo.msdyn_systemstatus
        WHEN 690970000 THEN 'Unscheduled'
        WHEN 690970001 THEN 'Scheduled'
        WHEN 690970002 THEN 'InProgress'
        WHEN 690970003 THEN 'Completed'
        ELSE CAST(wo.msdyn_systemstatus AS VARCHAR)
    END AS Status,
    COUNT(*) as Count
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
GROUP BY wo.msdyn_systemstatus
ORDER BY wo.msdyn_systemstatus;

-- === 4. CHECK EXACT FAIRBANK COUNT ===
SELECT
    'EXACT_FAIRBANK_COUNT' as CheckType,
    COUNT(*) as Count
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003)
    AND wo.itw_sitename = 'FAIRBANK SALES & SERVICE';

-- === 5. CHECK IF SITE FILTERING IS WORKING IN DASHBOARD ===
-- This checks if the dashboard is properly filtering by site
SELECT
    'ALL_SITES_COUNTS' as CheckType,
    COUNT(*) as TotalActiveWorkOrders
FROM dbo.msdyn_workorder wo
WHERE wo.msdyn_workorderid IS NOT NULL
    AND wo.statecode = 0
    AND wo.msdyn_systemstatus IN (690970000, 690970002, 690970001, 690970003);