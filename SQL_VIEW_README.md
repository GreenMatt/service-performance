
# Service Inventory Snapshot View - Documentation

## Overview
The `vw_ServiceInventorySnapshot_AU` view provides a comprehensive snapshot of inventory performance for service operations. It combines inventory levels, demand patterns, supply pipeline, and coverage settings to give planners everything they need to make informed decisions about stock management.

## What This Query Does (Simple Explanation)

This view answers the critical question: **"What's the current inventory situation for each item at each warehouse, and what actions do I need to take?"**

The query works by:
1. **Gathering demand data** from recent service orders to understand usage patterns
2. **Collecting current inventory** levels from all warehouses
3. **Finding incoming supply** from purchase orders and transfer orders
4. **Retrieving coverage settings** like safety stock and reorder points
5. **Calculating key metrics** and flagging items that need attention
6. **Combining everything** into one comprehensive view per item/warehouse

## Column Explanations

### Item & Location Identity
- **ItemNumber**: The part/item code (e.g., "BRAKE-PAD-001")
- **SiteID**: The business site (e.g., "L-QLD")
- **WarehouseID**: The specific warehouse location within the site

### Current Inventory Position
- **WarehouseOnHand**: Physical qty currently in stock (what you can see on the shelf)
- **WarehouseAvailable**: Qty available for use (OnHand minus reservations)
- **WarehouseReserved**: Qty already allocated to specific orders/jobs

### Coverage Settings (Rules for this item)
- **LeadTimeDays**: How many days it takes to get more stock (default 15 if not set)
- **PrimaryVendor**: Main supplier for this item
- **CurrentSafetyStock**: Minimum qty we should always keep (safety buffer)
- **CurrentReorderQty**: When to reorder (reorder point)
- **CurrentMinOnHand**: Absolute minimum before we're in trouble
- **CurrentMaxOnHand**: Maximum qty we should stock (don't over-order)

### Demand Intelligence (How much do we actually use?)
- **WarehouseAvgDailyDemand**: Average qty used per day based on recent history
- **WarehouseDemandStdDev**: How much demand varies (helps predict uncertainty)
- **WarehouseTotalDemand**: Total qty demanded in the analysis period
- **WarehouseOrderFrequency**: How often this item is ordered

### Supply Pipeline (What's coming in?)
- **InboundQtyWithinHorizon**: Qty coming from POs/TOs in next 30 days
- **NextETAWithinHorizon**: When the next delivery is expected

### Action Flags (What needs attention?)
- **PartsBelowSafety**: TRUE if current stock is below safety level ⚠️
- **HasInboundWithinHorizon**: TRUE if supply is coming soon ✅
- **BelowSafety_NoSupply**: TRUE if below safety AND nothing coming = CRITICAL 🚨

## How to Use This Data

### 1. Daily Exception Management
**Filter for problems first:**
```sql
SELECT * FROM vw_ServiceInventorySnapshot_AU
WHERE BelowSafety_NoSupply = 1
ORDER BY WarehouseAvgDailyDemand DESC
```
**Action**: These items need immediate attention - expedite POs or emergency transfers

### 2. Weekly Stock Review
**Check items approaching reorder points:**
```sql
SELECT * FROM vw_ServiceInventorySnapshot_AU
WHERE PartsBelowSafety = 1 AND BelowSafety_NoSupply = 0
```
**Action**: Review incoming supply dates and consider expediting if needed

### 3. Monthly Planning
**Analyze demand patterns:**
```sql
SELECT ItemNumber, WarehouseAvgDailyDemand, CurrentSafetyStock,
       CASE WHEN WarehouseAvgDailyDemand > 0
            THEN CurrentSafetyStock / WarehouseAvgDailyDemand
            ELSE NULL END AS SafetyStockDays
FROM vw_ServiceInventorySnapshot_AU
WHERE WarehouseAvgDailyDemand > 0
ORDER BY SafetyStockDays ASC
```
**Action**: Items with low safety stock days may need coverage adjustments

### 4. Procurement Planning
**Calculate coverage days:**
```sql
SELECT ItemNumber, WarehouseOnHand, InboundQtyWithinHorizon, WarehouseAvgDailyDemand,
       CASE WHEN WarehouseAvgDailyDemand > 0
            THEN (WarehouseOnHand + InboundQtyWithinHorizon) / WarehouseAvgDailyDemand
            ELSE NULL END AS TotalCoverageDays
FROM vw_ServiceInventorySnapshot_AU
WHERE WarehouseAvgDailyDemand > 0
ORDER BY TotalCoverageDays ASC
```
**Action**: Items with low coverage days need supply planning attention

## Key Performance Indicators (KPIs)

### 1. Stockout Risk
**Critical Items**: `BelowSafety_NoSupply = 1`
- **Target**: 0 critical items
- **Red**: > 5 critical items
- **Amber**: 1-5 critical items

### 2. Service Level
**Below Safety**: `PartsBelowSafety = 1`
- **Target**: < 5% of active items
- **Red**: > 10% below safety
- **Amber**: 5-10% below safety

### 3. Supply Coverage
**Items with Supply**: `HasInboundWithinHorizon = 1` where `PartsBelowSafety = 1`
- **Target**: > 90% of below-safety items have inbound supply
- **Red**: < 70% coverage
- **Amber**: 70-90% coverage

## Filters for Different Use Cases

### Service Manager Dashboard
```sql
-- Focus on high-usage, problematic items
WHERE WarehouseAvgDailyDemand > 0.1
  AND (PartsBelowSafety = 1 OR BelowSafety_NoSupply = 1)
```

### Procurement Dashboard
```sql
-- Focus on items needing supply action
WHERE BelowSafety_NoSupply = 1
   OR (PartsBelowSafety = 1 AND NextETAWithinHorizon IS NULL)
```

### Warehouse Dashboard
```sql
-- Focus on current site only
WHERE SiteID = 'L-QLD'
  AND WarehouseOnHand > 0
```

## Data Refresh & Performance

- **Refresh Frequency**: This view should be refreshed at least daily, ideally every 4-6 hours
- **Performance**: Filtered to L-QLD site only for optimal performance during testing
- **Horizon**: Currently set to 30 days for supply planning (configurable in Params CTE)

## Troubleshooting

**No data appearing?**
- Check that `vw_ItemCoverage` view exists and returns data
- Verify site filter matches your data (currently hardcoded to L-QLD considerations)
- Ensure DataAreaId = 'mau1' matches your environment

**Performance issues?**
- Add indexes on ItemId, InventLocationId, DataAreaId columns
- Consider materialized view for very large datasets
- Reduce horizon days if needed

## Data Quality Notes

- **Missing demand data**: Items with no recent sales history will show 0 for demand metrics
- **Missing coverage**: Items without coverage setup will show NULL values
- **Date handling**: All dates are converted to proper datetime format for calculations
- **Zero handling**: Division by zero is protected with CASE statements

---
*This view is designed for L-QLD site testing. Expand site filter for production use.*